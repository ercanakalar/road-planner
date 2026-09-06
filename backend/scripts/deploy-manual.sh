#!/usr/bin/env bash
# Deploys the backend to the Cloud Run service/job that already exist
# (travel-routes-backend / travel-routes-migrate), using the secrets in
# Secret Manager.
#
# This is the same flow as the old scripts/deploy-cloudrun.sh, written out
# flat and commented so each step is visible instead of hidden behind a
# single command. Run it from the backend/ directory: ./scripts/deploy-manual.sh
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.production}"
if [ ! -f "${ENV_FILE}" ]; then
  echo "${ENV_FILE} not found. Copy the template and fill it in:" >&2
  echo "  cp .env.production.example ${ENV_FILE}" >&2
  exit 1
fi

set -a; source "${ENV_FILE}"; set +a

# Everything the rest of this script interpolates, checked here. `set -u`
# would otherwise abort with "JOB: unbound variable" at step 5 — after two
# image builds and pushes have already been paid for.
: "${PROJECT_ID:?set PROJECT_ID in ${ENV_FILE}}"
: "${REGION:?set REGION in ${ENV_FILE}}"
: "${SERVICE:?set SERVICE in ${ENV_FILE} — the Cloud Run service name}"
: "${JOB:?set JOB in ${ENV_FILE} — the Cloud Run migration job name}"
: "${MAX_INSTANCES:?set MAX_INSTANCES in ${ENV_FILE}}"
: "${SERVICE_ACCOUNT:?set SERVICE_ACCOUNT in ${ENV_FILE}}"
: "${SA_EMAIL:?set SA_EMAIL in ${ENV_FILE}}"

REPO="travel-routes"
BUCKET="${PROJECT_ID}-travel-routes-uploads"

say() { printf '\n=== %s\n' "$1"; }
warn() { printf '\n!!! %s\n' "$1" >&2; }

# The identity both the API and the migration job run as. Cloud Run's default
# compute identity is <project-number>-compute@developer.gserviceaccount.com,
# and the project number differs per project — so it is read from the project
# rather than written down here, where it would silently be another project's.
# SERVICE_ACCOUNT in the env file overrides it.
if [ -z "${SERVICE_ACCOUNT:-}" ]; then
  PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
fi

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

secret_exists() {
  gcloud secrets describe "$1" --project "${PROJECT_ID}" >/dev/null 2>&1
}

# Stores a value from the env file as a secret and grants the runtime service
# account read access. Both halves matter: a secret Cloud Run cannot read
# fails the same way a missing one does, only later, at container start.
create_secret_from_env() {
  local name="$1"
  local value="$2"
  printf '%s' "${value}" \
    | gcloud secrets create "${name}" \
        --project "${PROJECT_ID}" \
        --replication-policy=automatic \
        --data-file=- >/dev/null
  gcloud secrets add-iam-policy-binding "${name}" \
    --project "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role=roles/secretmanager.secretAccessor >/dev/null
  echo "  created ${name}"
}

# Adds a new version when the env file and the stored secret disagree.
#
# Without this, editing a value in ${ENV_FILE} and re-running looks like it
# worked — every step is green — while Cloud Run keeps resolving :latest to the
# old version. That is how MAP_API_KEY ended up holding a key that had been
# deleted from the project: rotating it in the env file changed nothing here.
#
# Secret Manager keeps the old version, so this is additive and reversible:
#   gcloud secrets versions list NAME --project ${PROJECT_ID}
update_secret_from_env() {
  local name="$1"
  local value="$2"
  local current

  # A read failure is not a mismatch — no access, or every version disabled.
  # Saying so and moving on beats pushing a version to paper over it.
  if ! current="$(gcloud secrets versions access latest \
      --secret "${name}" --project "${PROJECT_ID}" 2>/dev/null)"; then
    warn "Cannot read the current value of ${name}; leaving it alone."
    return 0
  fi

  [ "${current}" = "${value}" ] && return 0

  printf '%s' "${value}" \
    | gcloud secrets versions add "${name}" \
        --project "${PROJECT_ID}" \
        --data-file=- >/dev/null
  echo "  updated ${name} from ${ENV_FILE} (new version added)"
}

say "1/7 Checking the secrets this deploy references"
# Both `gcloud run deploy` and `gcloud run jobs deploy` resolve every name in
# --set-secrets against Secret Manager and reject the whole revision if one is
# missing:
#
#   spec.template.spec.containers[0].env[0].value_from.secret_key_ref.name:
#   Secret projects/<n>/secrets/DATABASE_URL_UNPOOLED/versions/latest was not found
#
# Discovering that here costs a second. Discovering it at step 5 costs two
# image builds and pushes first.
missing=()
for name in DATABASE_URL ACCESS_KEY REFRESH_KEY ROAD_SHARE_KEY \
            MAIL_PASSWORD GOOGLE_CLIENT_SECRET MAP_API_KEY; do
  # A value present in the env file is one this script can store itself. The
  # three signing keys are generated rather than configured, so they are never
  # in that file and a missing one has to be created deliberately below.
  eval "value=\${${name}:-}"

  if secret_exists "${name}"; then
    # The secret exists, but existing is not the same as current: an env file
    # edited since the last deploy has to reach Secret Manager or it never
    # reaches the running service.
    [ -n "${value}" ] && update_secret_from_env "${name}" "${value}"
    continue
  fi

  if [ -n "${value}" ]; then
    create_secret_from_env "${name}" "${value}"
  else
    missing+=("${name}")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  warn "These secrets do not exist in ${PROJECT_ID}, and ${ENV_FILE} has no value for them:"
  for name in "${missing[@]}"; do printf '  %s\n' "${name}" >&2; done
  cat >&2 <<MSG

ACCESS_KEY, REFRESH_KEY and ROAD_SHARE_KEY are generated, not configured, and
scripts/setup-project.sh creates them along with the rest of a new project's
setup. Run that first. To create one by hand instead — three *different*
random values, so that an access token cannot be replayed as a refresh token:

  openssl rand -base64 48 \\
    | gcloud secrets create ACCESS_KEY --data-file=- --project ${PROJECT_ID}

Anything else is a value that belongs in ${ENV_FILE}: fill it in there and
re-run, or store it directly:

  printf '%s' 'THE VALUE' \\
    | gcloud secrets create NAME --data-file=- --project ${PROJECT_ID}

Either way the runtime identity has to be allowed to read it:

  gcloud secrets add-iam-policy-binding NAME --project ${PROJECT_ID} \\
    --member=serviceAccount:${SA_EMAIL} \\
    --role=roles/secretmanager.secretAccessor
MSG
  exit 1
fi

# DATABASE_URL_UNPOOLED, not DATABASE_URL, for the migration job: Prisma
# Migrate over Neon's pooled (PgBouncer transaction-mode) endpoint is a
# documented failure mode — prepared statements and SET do not persist across
# statements. The job gets the direct URL; the API keeps the pooled one.
#
# Falling back to DATABASE_URL when there is no unpooled URL mirrors what
# docker-entrypoint.sh already does with ${DATABASE_URL_UNPOOLED:-${DATABASE_URL}}.
# The fallback is deliberately *not* a DATABASE_URL_UNPOOLED secret holding
# the pooled URL: that would read as configured-and-correct forever after.
MIGRATE_SECRET="DATABASE_URL_UNPOOLED"
if ! secret_exists DATABASE_URL_UNPOOLED; then
  if [ -n "${DATABASE_URL_UNPOOLED:-}" ]; then
    create_secret_from_env DATABASE_URL_UNPOOLED "${DATABASE_URL_UNPOOLED}"
  else
    MIGRATE_SECRET="DATABASE_URL"
    warn "No DATABASE_URL_UNPOOLED secret, and none set in ${ENV_FILE}.
Migrating over the pooled DATABASE_URL instead. That is fine against a direct
Postgres, and is the documented way for Prisma Migrate to fail against a
PgBouncer transaction-mode pooler such as Neon's. Put the direct (unpooled)
connection string in ${ENV_FILE} and re-run to fix it properly."
  fi
fi
echo "  migrations will run against the ${MIGRATE_SECRET} secret"

say "2/7 Authorizing Docker to push to Artifact Registry"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

say "3/7 Building and pushing the API image (Dockerfile target: production)"
docker build --target production -t "${API_IMAGE}" .
docker push "${API_IMAGE}"

say "4/7 Building and pushing the migrator image (Dockerfile target: migrator)"
# Same Dockerfile, different stage: this one only runs `prisma migrate deploy`
# and exits — migrations run once, as their own step, not on every API boot.
docker build --target migrator -t "${MIGRATOR_IMAGE}" .
docker push "${MIGRATOR_IMAGE}"

say "5/7 Pointing the migration Job at the new image"
gcloud run jobs deploy "${JOB}" \
  --image="${MIGRATOR_IMAGE}" \
  --region="${REGION}" \
  --project "${PROJECT_ID}" \
  --service-account="${SA_EMAIL}" \
  --set-secrets="DATABASE_URL=${MIGRATE_SECRET}:latest" \
  --max-retries=0 \
  --task-timeout=10m

say "6/7 Running the migration and waiting for it to finish"
gcloud run jobs execute "${JOB}" \
  --region="${REGION}" \
  --project "${PROJECT_ID}" \
  --wait

say "7/7 Deploying the API service"
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

# A deploy can succeed and change nothing: if traffic is pinned to a named
# revision rather than tracking the latest, the new revision is built, started
# and then never given a request. See docs/CLOUD_RUN_SOURCE_DEPLOY.md.
TRAFFIC="$(gcloud run services describe "${SERVICE}" --region "${REGION}" \
  --project "${PROJECT_ID}" --format='value(spec.traffic)')"
case "${TRAFFIC}" in
  *latestRevision*) ;;
  *)
    warn "Traffic is pinned to a specific revision, so this deploy is not serving anyone:
  ${TRAFFIC}
Move it with:
  gcloud run services update-traffic ${SERVICE} --to-latest --region ${REGION} --project ${PROJECT_ID}"
    ;;
esac

URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" \
  --project "${PROJECT_ID}" --format='value(status.url)')"

say "Deployed: ${URL}"
curl -fsS "${URL}/api/health" && echo || echo "health check did not pass — check the logs"
