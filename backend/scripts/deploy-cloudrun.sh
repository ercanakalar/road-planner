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

CLOUD_SQL_FLAG=""
if [ -n "${CLOUD_SQL_INSTANCE:-}" ]; then
  CLOUD_SQL_FLAG="--set-cloudsql-instances=${CLOUD_SQL_INSTANCE}"
fi

SERVICE="${SERVICE:-travel-routes-api}"
JOB="${JOB:-travel-routes-migrate}"
REPO="${REPO:-travel-routes}"
BUCKET="${BUCKET:-${PROJECT_ID}-travel-routes-uploads}"
SA_EMAIL="${SA_EMAIL:-travel-routes-api@${PROJECT_ID}.iam.gserviceaccount.com}"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%s)}"
API_IMAGE="${REGISTRY}/api:${TAG}"
MIGRATOR_IMAGE="${REGISTRY}/migrator:${TAG}"

FRONTEND_URL="${FRONTEND_URL:-}"
SHARE_LINK_BASE_URL="${SHARE_LINK_BASE_URL:-}"
GOOGLE_REDIRECT_URL="${GOOGLE_REDIRECT_URL:-}"

BOOTSTRAP_URL=""

say() { printf '\n=== %s\n' "$1"; }

cd "$(dirname "$0")/.."

say "Checking the secrets the app refuses to start without"
MISSING=()
for required in DATABASE_URL ACCESS_KEY REFRESH_KEY ROAD_SHARE_KEY MAIL_PASSWORD; do
  gcloud secrets describe "${required}" --project "${PROJECT_ID}" > /dev/null 2>&1 \
    || MISSING+=("${required}")
done

if [ ${#MISSING[@]} -gt 0 ]; then
  cat >&2 <<MISSING_SECRETS
Not in Secret Manager: ${MISSING[*]}

The application validates its whole configuration at boot and will not start
without them. Fill them into backend/.env.production and run setup again:

  backend/scripts/setup-cloudrun.sh
MISSING_SECRETS
  exit 1
fi

say "Building both images"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "${BUILD_DIR}"' EXIT
cat > "${BUILD_DIR}/cloudbuild.yaml" <<BUILD
steps:
  - name: gcr.io/cloud-builders/docker
    args: ['build', '--target', 'production', '-t', '${API_IMAGE}', '.']
  - name: gcr.io/cloud-builders/docker
    args: ['build', '--target', 'migrator', '-t', '${MIGRATOR_IMAGE}', '.']
images:
  - '${API_IMAGE}'
  - '${MIGRATOR_IMAGE}'
options:
  logging: CLOUD_LOGGING_ONLY
BUILD

gcloud builds submit \
  --project "${PROJECT_ID}" \
  --config="${BUILD_DIR}/cloudbuild.yaml" \
  .

say "Migrating"
# shellcheck disable=SC2086
gcloud run jobs deploy "${JOB}" \
  --image="${MIGRATOR_IMAGE}" \
  --region="${REGION}" \
  --project "${PROJECT_ID}" \
  --service-account="${SA_EMAIL}" \
  ${CLOUD_SQL_FLAG} \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest \
  --max-retries=0 \
  --task-timeout=10m

gcloud run jobs execute "${JOB}" \
  --region="${REGION}" \
  --project "${PROJECT_ID}" \
  --wait

say "Deploying the service"
if [ -z "${FRONTEND_URL}" ]; then
  FRONTEND_URL="$(gcloud run services describe "${SERVICE}" \
    --region "${REGION}" --project "${PROJECT_ID}" \
    --format='value(status.url)' 2>/dev/null || true)"
fi

if [ -z "${FRONTEND_URL}" ]; then
  BOOTSTRAP_URL="https://pending.invalid"
  FRONTEND_URL="${BOOTSTRAP_URL}"
  echo "  no service yet, booting on a placeholder address"
fi

ENV_VARS="NODE_ENV=production,UPLOAD_DIR=/mnt/uploads,CORS_ORIGINS=${CORS_ORIGINS:-*}"
[ -n "${FRONTEND_URL}" ] && ENV_VARS="${ENV_VARS},FRONTEND_URL=${FRONTEND_URL}"
[ -n "${SHARE_LINK_BASE_URL}" ] && ENV_VARS="${ENV_VARS},SHARE_LINK_BASE_URL=${SHARE_LINK_BASE_URL}"
[ -n "${GOOGLE_REDIRECT_URL}" ] && ENV_VARS="${ENV_VARS},GOOGLE_REDIRECT_URL=${GOOGLE_REDIRECT_URL}"
[ -n "${GOOGLE_NATIVE_CLIENT_IDS:-}" ] && ENV_VARS="${ENV_VARS},GOOGLE_NATIVE_CLIENT_IDS=${GOOGLE_NATIVE_CLIENT_IDS}"
[ -n "${GOOGLE_CLIENT_ID:-}" ] && ENV_VARS="${ENV_VARS},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}"
[ -n "${GOOGLE_SCOPES_API:-}" ] && ENV_VARS="${ENV_VARS},GOOGLE_SCOPES_API=${GOOGLE_SCOPES_API}"
[ -n "${MAIL_HOST:-}" ] && ENV_VARS="${ENV_VARS},MAIL_HOST=${MAIL_HOST},MAIL_PORT=${MAIL_PORT:-587},MAIL_USERNAME=${MAIL_USERNAME:-},MAIL_FROM=${MAIL_FROM:-}"

SECRETS="DATABASE_URL=DATABASE_URL:latest,ACCESS_KEY=ACCESS_KEY:latest,REFRESH_KEY=REFRESH_KEY:latest,ROAD_SHARE_KEY=ROAD_SHARE_KEY:latest,MAIL_PASSWORD=MAIL_PASSWORD:latest"
gcloud secrets describe GOOGLE_CLIENT_SECRET --project "${PROJECT_ID}" > /dev/null 2>&1 \
  && SECRETS="${SECRETS},GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest"

gcloud secrets describe MAP_API_KEY --project "${PROJECT_ID}" > /dev/null 2>&1 \
  && SECRETS="${SECRETS},MAP_API_KEY=MAP_API_KEY:latest"

# shellcheck disable=SC2086
gcloud run deploy "${SERVICE}" \
  --image="${API_IMAGE}" \
  --region="${REGION}" \
  --project "${PROJECT_ID}" \
  --service-account="${SA_EMAIL}" \
  --allow-unauthenticated \
  --execution-environment=gen2 \
  ${CLOUD_SQL_FLAG} \
  --set-env-vars="${ENV_VARS}" \
  --set-secrets="${SECRETS}" \
  --add-volume=name=uploads,type=cloud-storage,bucket="${BUCKET}" \
  --add-volume-mount=volume=uploads,mount-path=/mnt/uploads \
  --min-instances=0 \
  --max-instances="${MAX_INSTANCES:-4}" \
  --memory=512Mi \
  --cpu=1 \
  --timeout=60s

URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" \
  --project "${PROJECT_ID}" --format='value(status.url)')"

if [ -z "${URL}" ]; then
  echo "deployed, but could not read the service URL — check the Cloud Run console" >&2
  exit 1
fi

if [ -n "${BOOTSTRAP_URL}" ]; then
  say "Setting the service's own address, now that it has one"
  UPDATES="FRONTEND_URL=${URL}"
  [ -z "${SHARE_LINK_BASE_URL}" ] && UPDATES="${UPDATES},SHARE_LINK_BASE_URL=${URL}"
  [ -z "${GOOGLE_REDIRECT_URL}" ] && UPDATES="${UPDATES},GOOGLE_REDIRECT_URL=${URL}/api/auth/google/callback"

  gcloud run services update "${SERVICE}" \
    --region="${REGION}" \
    --project "${PROJECT_ID}" \
    --update-env-vars="${UPDATES}" > /dev/null
  echo "  ${URL}"
fi

say "Deployed"
echo "${URL}"
echo
curl -fsS "${URL}/api/health" && echo || echo "health check did not pass — check the logs"

if [ -n "${BOOTSTRAP_URL}" ]; then
  cat <<NEXT

That address was discovered and set for you. Put it in backend/.env.production
so later deploys do not have to rediscover it, and so a custom domain can
replace it:

  FRONTEND_URL="${URL}"
  SHARE_LINK_BASE_URL="${URL}"
  GOOGLE_REDIRECT_URL="${URL}/api/auth/google/callback"
NEXT
fi
