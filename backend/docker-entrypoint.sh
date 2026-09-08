#!/bin/sh
set -e

# `docker run --env-file` passes a value exactly as written, quotes included,
# while a shell sourcing the same file strips them. backend/.env.production is
# read both ways and needs the quotes for the shell — the URL contains an `&`,
# which unquoted would background the command — so they are stripped here
# instead. A value wrapped in matching quotes never meant to keep them.
unquote() {
  eval "value=\${$1-}"
  case "${value}" in
    '"'*'"' | "'"*"'")
      eval "$1=\$(printf '%s' \"\${value}\" | cut -c2- | rev | cut -c2- | rev)"
      eval "export $1"
      ;;
  esac
}

for name in DATABASE_URL DATABASE_URL_UNPOOLED FRONTEND_URL SHARE_LINK_BASE_URL \
            GOOGLE_REDIRECT_URL ACCESS_KEY REFRESH_KEY ROAD_SHARE_KEY ACCESS_EXPIRES_IN \
            REFRESH_EXPIRES_IN ROAD_SHARE_EXPIRE_IN CORS_ORIGINS UPLOAD_DIR \
            MAIL_HOST MAIL_PORT MAIL_USERNAME MAIL_PASSWORD MAIL_FROM \
            MAIL_TLS_REJECT_UNAUTHORIZED GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET \
            GOOGLE_NATIVE_CLIENT_IDS GOOGLE_SCOPES_API MAP_API_KEY \
            NODE_ENV PORT RUN_MIGRATIONS; do
  unquote "${name}"
done

# A command on the `docker run` line is a one-off — `env`, a shell, a prisma
# command — and runs instead of the API, with the values above normalised but
# without migrating first. Without this an ENTRYPOINT swallows it as an
# argument, so `docker run <image> env` prints nothing and looks broken.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

if [ -z "${DATABASE_URL}" ]; then
  echo "DATABASE_URL is not set." >&2
  echo "The container needs it to reach the database, for example:" >&2
  echo "  docker run --env-file .env.production <image>" >&2
  exit 1
fi

case "${DATABASE_URL}" in
  postgresql://* | postgres://*) ;;
  *)
    echo "DATABASE_URL must start with postgresql:// or postgres://" >&2
    echo "  it begins: $(printf '%s' "${DATABASE_URL}" | cut -c1-10)..." >&2
    exit 1
    ;;
esac

# Migrating here is a convenience for `docker run` and compose, where there is
# nowhere else to put the step. A deploy that migrates as its own step should
# set RUN_MIGRATIONS=false: this runs on the serving path, so on a scale-to-zero
# platform every cold start waits for the Prisma CLI to boot and connect before
# the API listens, and a history that will not apply stops the container
# starting at all rather than just failing the deploy.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Applying migrations..."

  # Prisma Migrate over Neon's pooled (PgBouncer transaction-mode) endpoint is
  # a documented failure mode - prepared statements and SET don't persist
  # across statements. DATABASE_URL_UNPOOLED, when set, is used for this one
  # command only; the app itself keeps running on the pooled DATABASE_URL.
  if ! env DATABASE_URL="${DATABASE_URL_UNPOOLED:-${DATABASE_URL}}" \
        npx --no-install prisma migrate deploy; then
    # Inside a container `localhost` is the container, so a database that is
    # anywhere else is unreachable by that name. A Cloud SQL socket is the one
    # case where localhost is right, and it carries host=/cloudsql/... instead.
    case "${DATABASE_URL}" in
      *host=/*) ;;
      *@localhost[:/]* | *@127.0.0.1[:/]*)
        echo >&2
        echo "DATABASE_URL points at localhost. Inside a container that is the" >&2
        echo "container itself, not the machine running Docker." >&2
        echo >&2
        echo "  another compose service : @db:5432 in docker-compose.prod.yml," >&2
        echo "                            @test-db:5432 in docker-compose.yml" >&2
        echo "  the host machine        : @host.docker.internal:5432" >&2
        echo "                            (Linux also needs" >&2
        echo "                             --add-host=host.docker.internal:host-gateway)" >&2
        echo "  a managed database      : the host your provider gave you" >&2
        ;;
    esac
    echo >&2
    echo "If the error above is P3009 or P3018, one migration is recorded as" >&2
    echo "failed and no later one can apply until that record is cleared." >&2
    echo "If DATABASE_URL points at a pooled endpoint (Neon's -pooler host)," >&2
    echo "migrations cannot run over it at all — set DATABASE_URL_UNPOOLED." >&2
    echo "Either way see docs/MIGRATION_DRIFT.md, and set RUN_MIGRATIONS=false" >&2
    echo "so a migration problem stops the deploy rather than the API." >&2
    exit 1
  fi

  echo "Migrations applied."
fi

echo "Starting the API..."
exec node dist/main
