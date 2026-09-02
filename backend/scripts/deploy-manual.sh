#!/usr/bin/env bash
# Deploys the backend to the Cloud Run service/job that already exist
# (travel-routes-backend / travel-routes-migrate), using the secrets that
# setup-cloudrun.sh already created in Secret Manager.
#
# This is the same 7 steps as scripts/deploy-cloudrun.sh, written out flat
# and commented so each one is visible instead of hidden behind a single
# command. Run it from the backend/ directory: ./scripts/deploy-manual.sh
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env.production; set +a
: "${PROJECT_ID:?set PROJECT_ID in .env.production}"
: "${REGION:?set REGION in .env.production}"

REPO="travel-routes"
SA_EMAIL="816558178760-compute@developer.gserviceaccount.com"
BUCKET="${PROJECT_ID}-travel-routes-uploads"

# Cloud Run can only pull images from a registry its service account has IAM
# access to — that's Google Artifact Registry, not Docker Hub. This is that
# registry's address for this project: region / project / repo-name.
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"

# The tag identifies exactly which build this is. Using the git commit hash
# instead of "latest" means every deploy is traceable back to the code that
# produced it, and nothing gets silently overwritten.
TAG="$(git rev-parse --short HEAD)"
API_IMAGE="${REGISTRY}/api:${TAG}"
MIGRATOR_IMAGE="${REGISTRY}/migrator:${TAG}"

say() { printf '\n=== %s\n' "$1"; }

say "1/6 Authorizing Docker to push to Artifact Registry"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

say "2/6 Building and pushing the API image (Dockerfile target: production)"
docker build --target production -t "${API_IMAGE}" .
docker push "${API_IMAGE}"

say "3/6 Building and pushing the migrator image (Dockerfile target: migrator)"
# Same Dockerfile, different stage: this one only runs `prisma migrate deploy`
# and exits — migrations run once, as their own step, not on every API boot.
docker build --target migrator -t "${MIGRATOR_IMAGE}" .
docker push "${MIGRATOR_IMAGE}"

say "4/6 Pointing the migration Job at the new image"
# DATABASE_URL_UNPOOLED, not DATABASE_URL: Prisma Migrate over Neon's pooled
# (PgBouncer transaction-mode) connection is a documented failure mode —
# prepared statements and SET not persisting across statements.
gcloud run jobs deploy "${JOB}" \
  --image="${MIGRATOR_IMAGE}" \
  --region="${REGION}" \
  --project "${PROJECT_ID}" \
  --service-account="${SA_EMAIL}" \
  --set-secrets=DATABASE_URL=DATABASE_URL_UNPOOLED:latest \
  --max-retries=0 \
  --task-timeout=10m

say "5/6 Running the migration and waiting for it to finish"
gcloud run jobs execute "${JOB}" \
  --region="${REGION}" \
  --project "${PROJECT_ID}" \
  --wait

say "6/6 Deploying the API service"
gcloud run deploy "${SERVICE}" \
  --image="${API_IMAGE}" \
  --region="${REGION}" \
  --project "${PROJECT_ID}" \
  --service-account="${SA_EMAIL}" \
  --allow-unauthenticated \
  --execution-environment=gen2 \
  --set-env-vars="NODE_ENV=production,UPLOAD_DIR=/mnt/uploads,CORS_ORIGINS=${CORS_ORIGINS},FRONTEND_URL=${FRONTEND_URL},SHARE_LINK_BASE_URL=${SHARE_LINK_BASE_URL},GOOGLE_REDIRECT_URL=${GOOGLE_REDIRECT_URL},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},GOOGLE_NATIVE_CLIENT_IDS=${GOOGLE_NATIVE_CLIENT_IDS},MAIL_HOST=${MAIL_HOST},MAIL_PORT=${MAIL_PORT},MAIL_USERNAME=${MAIL_USERNAME},MAIL_FROM=${MAIL_FROM}" \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,ACCESS_KEY=ACCESS_KEY:latest,REFRESH_KEY=REFRESH_KEY:latest,ROAD_SHARE_KEY=ROAD_SHARE_KEY:latest,MAIL_PASSWORD=MAIL_PASSWORD:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,MAP_API_KEY=MAP_API_KEY:latest" \
  --add-volume=name=uploads,type=cloud-storage,bucket="${BUCKET}" \
  --add-volume-mount=volume=uploads,mount-path=/mnt/uploads \
  --min-instances=0 \
  --max-instances="${MAX_INSTANCES}" \
  --memory=512Mi \
  --cpu=1 \
  --timeout=60s

URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" \
  --project "${PROJECT_ID}" --format='value(status.url)')"

say "Deployed: ${URL}"
curl -fsS "${URL}/api/health" && echo || echo "health check did not pass — check the logs"
