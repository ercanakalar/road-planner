#!/usr/bin/env bash
# Prepares a brand-new Google Cloud project for scripts/deploy-manual.sh:
# the APIs, the image registry, the uploads bucket, the signing keys and the
# IAM that ties them together. Run it once per project — it is idempotent, so
# a half-finished attempt is resumed by running it again rather than unpicked.
#
# Everything here is one-time. Run it from the backend/ directory:
#   ./scripts/setup-project.sh
# then ./scripts/deploy-manual.sh for this and every later release.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.production}"
if [ ! -f "${ENV_FILE}" ]; then
  echo "${ENV_FILE} not found. Copy the template and fill it in:" >&2
  echo "  cp .env.production.example ${ENV_FILE}" >&2
  exit 1
fi

set -a; source "${ENV_FILE}"; set +a

: "${PROJECT_ID:?set PROJECT_ID in ${ENV_FILE}}"
: "${REGION:?set REGION in ${ENV_FILE}}"

REPO="travel-routes"
BUCKET="${PROJECT_ID}-travel-routes-uploads"

say() { printf '\n=== %s\n' "$1"; }
warn() { printf '\n!!! %s\n' "$1" >&2; }

say "1/6 Enabling the APIs this project needs"
# Nothing below can be created until its API is on, and a fresh project has
# almost all of them off. Enabling one already enabled is a no-op.
APIS="run.googleapis.com artifactregistry.googleapis.com
      secretmanager.googleapis.com storage.googleapis.com iam.googleapis.com"
# Only Cloud SQL projects need this one, and it is the API that bills.
if [ -n "${CLOUD_SQL_INSTANCE:-}" ]; then
  APIS="${APIS} sqladmin.googleapis.com"
fi
# shellcheck disable=SC2086
gcloud services enable ${APIS} --project "${PROJECT_ID}"

say "2/6 Working out which identity the service will run as"
# Cloud Run's default compute identity is <project-number>-compute@..., and
# the project number is assigned by Google when the project is created — so it
# is read from the project rather than assumed. SERVICE_ACCOUNT in the env
# file overrides it.
if [ -z "${SERVICE_ACCOUNT:-}" ]; then
  PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
  SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi
SA_EMAIL="${SERVICE_ACCOUNT}"
echo "  ${SA_EMAIL}"

say "3/6 Creating the image registry"
# Cloud Run pulls only from a registry it has IAM access to, which means
# Artifact Registry rather than Docker Hub. deploy-manual.sh pushes the API
# and migrator images here, tagged with the git commit they were built from.
if gcloud artifacts repositories describe "${REPO}" \
     --location="${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "  ${REPO} already exists in ${REGION}"
else
  gcloud artifacts repositories create "${REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --project "${PROJECT_ID}" \
    --description="Travel Routes API and migrator images"
  echo "  created ${REPO}"
fi

say "4/6 Creating the uploads bucket"
# Avatar uploads are mounted into the container at /mnt/uploads as a Cloud
# Storage FUSE volume, so that a file outlives the instance that received it —
# a container's own disk is gone the moment it scales back to zero.
if gcloud storage buckets describe "gs://${BUCKET}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "  gs://${BUCKET} already exists"
else
  gcloud storage buckets create "gs://${BUCKET}" \
    --location="${REGION}" \
    --project "${PROJECT_ID}" \
    --uniform-bucket-level-access
  echo "  created gs://${BUCKET}"
fi

# objectAdmin, not objectViewer: the app writes avatars as well as reading
# them, and deletes the old one when a user replaces it.
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role=roles/storage.objectAdmin \
  --project "${PROJECT_ID}" >/dev/null
echo "  ${SA_EMAIL} can read and write it"

case "${REGION}" in
  us-west1 | us-central1 | us-east1) ;;
  *)
    echo "  note: the 5 GB always-free storage allowance covers only us-west1,"
    echo "        us-central1 and us-east1. In ${REGION} this bucket is billed"
    echo "        from the first byte — pennies at this size, but not zero."
    ;;
esac

say "5/6 Generating the token signing keys"
# Three different random values, never written down in the env file: one
# secret shared across token classes would let an access token be replayed as
# a refresh token. Generated here and left alone afterwards — regenerating one
# signs every user out, so a later run of this script must not touch them.
for name in ACCESS_KEY REFRESH_KEY ROAD_SHARE_KEY; do
  if gcloud secrets describe "${name}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    echo "  ${name} already exists — left alone"
    continue
  fi
  openssl rand -base64 48 | tr -d '\n' \
    | gcloud secrets create "${name}" \
        --project "${PROJECT_ID}" \
        --replication-policy=automatic \
        --data-file=- >/dev/null
  gcloud secrets add-iam-policy-binding "${name}" \
    --project "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role=roles/secretmanager.secretAccessor >/dev/null
  echo "  created ${name}"
done

say "6/6 Granting the rest of the IAM"
# Deploying a service that *runs as* another identity requires permission to
# act as it. Without this the first deploy fails with
# "Permission 'iam.serviceaccounts.actAs' denied".
DEPLOYER="$(gcloud config get-value account 2>/dev/null)"
if [ -n "${DEPLOYER}" ] && [ "${DEPLOYER}" != "(unset)" ]; then
  gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
    --member="user:${DEPLOYER}" \
    --role=roles/iam.serviceAccountUser \
    --project "${PROJECT_ID}" >/dev/null
  echo "  ${DEPLOYER} can deploy services that run as ${SA_EMAIL}"
else
  warn "No active gcloud account, so the actAs grant was skipped. Run
'gcloud auth login' and re-run this script, or the first deploy will fail with
\"Permission 'iam.serviceaccounts.actAs' denied\"."
fi

# Cloud SQL is reached over a Unix socket that the service account's own
# cloudsql.client role authorises — which is why no IP has to be allowed.
if [ -n "${CLOUD_SQL_INSTANCE:-}" ]; then
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role=roles/cloudsql.client >/dev/null
  echo "  ${SA_EMAIL} can connect to Cloud SQL"
fi

say "Project ready"
cat <<NEXT
The remaining secrets (DATABASE_URL and friends) come from ${ENV_FILE}, and
the deploy stores them on its way past. The Cloud Run service and job do not
exist yet either — the first deploy creates both:

  scripts/deploy-manual.sh
NEXT
