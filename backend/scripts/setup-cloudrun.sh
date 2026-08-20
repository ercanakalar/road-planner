#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-$(dirname "$0")/../.env.production}"
if [ -f "${ENV_FILE}" ]; then
  ALREADY_SET="$(export -p)"
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a
  eval "${ALREADY_SET}"
  echo "read ${ENV_FILE}"
fi

: "${PROJECT_ID:?set PROJECT_ID}"
: "${REGION:=us-central1}"
: "${DB_USER:=roadplanner}"
: "${DB_NAME:=roaddb}"

if [ -z "${DATABASE_URL:-}" ]; then
  : "${CLOUD_SQL_INSTANCE:?set CLOUD_SQL_INSTANCE (or set DATABASE_URL to use a database outside Google Cloud)}"
  : "${DB_PASSWORD:?set DB_PASSWORD for the application database user}"
fi

SERVICE="${SERVICE:-travel-routes-api}"
JOB="${JOB:-travel-routes-migrate}"
REPO="${REPO:-travel-routes}"
BUCKET="${BUCKET:-${PROJECT_ID}-travel-routes-uploads}"
SA="${SA:-travel-routes-api}"
SA_EMAIL="${SA}@${PROJECT_ID}.iam.gserviceaccount.com"

say() { printf '\n=== %s\n' "$1"; }

UNFILLED=()
for name in PROJECT_ID REGION CLOUD_SQL_INSTANCE DB_NAME DB_USER DB_PASSWORD \
            DATABASE_URL MAIL_PASSWORD GOOGLE_CLIENT_SECRET \
            GOOGLE_NATIVE_CLIENT_IDS GOOGLE_CLIENT_ID MAIL_USERNAME MAIL_FROM \
            MAIL_HOST MAP_API_KEY; do
  case "${!name:-}" in
    '<'*'>') UNFILLED+=("${name}") ;;
  esac
done

if [ ${#UNFILLED[@]} -gt 0 ]; then
  cat >&2 <<UNFILLED_VALUES
Still placeholders in ${ENV_FILE}: ${UNFILLED[*]}

Each is wrapped in angle brackets, which the shell treats as an ordinary
string rather than as something to fill in. Replace them with real values, or
empty them if they do not apply.
UNFILLED_VALUES
  exit 1
fi

say "Enabling the APIs this needs"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  --project "${PROJECT_ID}"

say "Artifact Registry"
gcloud artifacts repositories create "${REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --project "${PROJECT_ID}" 2>/dev/null || echo "already exists"

say "Bucket for uploaded avatars"
gcloud storage buckets create "gs://${BUCKET}" \
  --location="${REGION}" \
  --uniform-bucket-level-access \
  --project "${PROJECT_ID}" 2>/dev/null || echo "already exists"

say "Service account"
gcloud iam service-accounts create "${SA}" \
  --display-name="Road Planner API" \
  --project "${PROJECT_ID}" 2>/dev/null || echo "already exists"

if [ -z "${DATABASE_URL:-}" ]; then
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role=roles/cloudsql.client \
    --condition=None > /dev/null
fi

gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role=roles/storage.objectAdmin \
  --project "${PROJECT_ID}" > /dev/null

DEPLOYER="$(gcloud config get-value account 2>/dev/null)"
if [ -n "${DEPLOYER}" ]; then
  gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
    --member="user:${DEPLOYER}" \
    --role=roles/iam.serviceAccountUser \
    --project "${PROJECT_ID}" > /dev/null
  echo "  ${DEPLOYER} may deploy as ${SA}"
fi

say "Secrets"
put_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "${name}" --project "${PROJECT_ID}" > /dev/null 2>&1; then
    printf '%s' "${value}" | gcloud secrets versions add "${name}" \
      --data-file=- --project "${PROJECT_ID}" > /dev/null
    echo "  ${name}: new version"
  else
    printf '%s' "${value}" | gcloud secrets create "${name}" \
      --data-file=- --replication-policy=automatic --project "${PROJECT_ID}" > /dev/null
    echo "  ${name}: created"
  fi

  gcloud secrets add-iam-policy-binding "${name}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role=roles/secretmanager.secretAccessor \
    --project "${PROJECT_ID}" > /dev/null
}

urlencode() {
  local string="$1" i c out=''
  for (( i = 0; i < ${#string}; i++ )); do
    c="${string:i:1}"
    case "$c" in
      [a-zA-Z0-9.~_-]) out+="$c" ;;
      *) out+="$(printf '%%%02X' "'$c")" ;;
    esac
  done
  printf '%s' "$out"
}

if [ -z "${DATABASE_URL:-}" ]; then
  DATABASE_URL="postgresql://$(urlencode "${DB_USER}"):$(urlencode "${DB_PASSWORD}")@localhost/${DB_NAME}?schema=public&host=/cloudsql/${CLOUD_SQL_INSTANCE}&connection_limit=3"
  echo "  DATABASE_URL: built for Cloud SQL ${CLOUD_SQL_INSTANCE}"
else
  echo "  DATABASE_URL: taken as given, no Cloud SQL wiring"
fi

put_secret DATABASE_URL "${DATABASE_URL}"

for key in ACCESS_KEY REFRESH_KEY ROAD_SHARE_KEY; do
  if gcloud secrets describe "${key}" --project "${PROJECT_ID}" > /dev/null 2>&1; then
    echo "  ${key}: already set, left alone"
    gcloud secrets add-iam-policy-binding "${key}" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role=roles/secretmanager.secretAccessor \
      --project "${PROJECT_ID}" > /dev/null
  else
    put_secret "${key}" "$(openssl rand -base64 48)"
  fi
done

for optional in MAIL_PASSWORD GOOGLE_CLIENT_SECRET MAP_API_KEY; do
  if [ -n "${!optional:-}" ]; then
    put_secret "${optional}" "${!optional}"
  else
    echo "  ${optional}: not provided, skipped"
  fi
done

say "Done"
cat <<SUMMARY
Service account   ${SA_EMAIL}
Bucket            gs://${BUCKET}
Registry          ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}
Database          ${CLOUD_SQL_INSTANCE:-external, from DATABASE_URL}
${CLOUD_SQL_INSTANCE:+
Create the database and its user on the instance if you have not already.}
Then deploy:

  backend/scripts/deploy-cloudrun.sh

The first deploy prints the service URL. Set FRONTEND_URL, SHARE_LINK_BASE_URL
and GOOGLE_REDIRECT_URL to it and deploy once more — they are baked into emailed
links and OAuth redirects, so they cannot be known before the service exists.
SUMMARY
