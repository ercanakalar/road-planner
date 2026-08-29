# Deploying with `gcloud run deploy --source .`, and the incident it surfaced

`DEPLOY.md` documents the two-script flow (`setup-cloudrun.sh` /
`deploy-cloudrun.sh`, since replaced by `scripts/deploy-manual.sh`), which
builds the API and migrator images separately, pushes them, runs migrations
as a one-off Cloud Run Job, then deploys the service.

`gcloud run deploy --source .` is a different, simpler path: one command
builds the image with Cloud Build and deploys it directly, no separate
push or Job. Two things follow from that:

- It cannot select a Dockerfile `--target`, so it always builds the **last**
  stage in the Dockerfile — `production` in this repo's Dockerfile.
- There is no separate migration Job, so the app's own
  `docker-entrypoint.sh` has to run `prisma migrate deploy` on every boot
  instead (`RUN_MIGRATIONS=true`, already the default).

## What had to change to make that path safe

Migrating over Neon's pooled (PgBouncer transaction-mode) endpoint is a
documented Prisma failure mode — prepared statements and `SET` don't persist
across statements. `deploy-manual.sh` already worked around this by pointing
its separate migrator Job at `DATABASE_URL_UNPOOLED`. The self-contained
`--source .` path has no separate Job, so `docker-entrypoint.sh` now does the
same thing for the one migrate command it runs at boot, while the app itself
keeps using the pooled `DATABASE_URL`:

```sh
if ! env DATABASE_URL="${DATABASE_URL_UNPOOLED:-${DATABASE_URL}}" \
      npx --no-install prisma migrate deploy; then
```

**What this means:** run `prisma migrate deploy` with `DATABASE_URL`
temporarily swapped for `DATABASE_URL_UNPOOLED`, but only for this one
command — the `env VAR=value command` form sets the variable for that child
process alone. Everything after this line (`exec node dist/main`) still sees
the original, pooled `DATABASE_URL`. If `DATABASE_URL_UNPOOLED` was never
set, it falls back to `DATABASE_URL` and behaves exactly as before.

`DATABASE_URL_UNPOOLED` was also added to the script's `unquote` list
alongside `DATABASE_URL`, so a quoted value from an `--env-file` gets the
same quote-stripping treatment the other variables already get.

## A template for this deploy path

Placeholders in angle brackets stand for values specific to one project —
fill them in from `.env.production` and `gcloud config list` rather than
copying real values into a shared document.

```bash
gcloud run deploy <SERVICE_NAME> \
  --source . \
  --project <PROJECT_ID> \
  --region <REGION> \
  --service-account <SERVICE_ACCOUNT_EMAIL> \
  --allow-unauthenticated \
  --execution-environment gen2 \
  --min-instances 0 \
  --max-instances 4 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60s \
  --set-env-vars "NODE_ENV=production,CORS_ORIGINS=<CORS_ORIGINS>,UPLOAD_DIR=/mnt/uploads,MAIL_HOST=<MAIL_HOST>,MAIL_USERNAME=<MAIL_USERNAME>,MAIL_FROM=<MAIL_FROM>,GOOGLE_CLIENT_ID=<GOOGLE_CLIENT_ID>,FRONTEND_URL=<FRONTEND_URL>,SHARE_LINK_BASE_URL=<SHARE_LINK_BASE_URL>,GOOGLE_REDIRECT_URL=<GOOGLE_REDIRECT_URL>" \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,DATABASE_URL_UNPOOLED=DATABASE_URL_UNPOOLED:latest,ACCESS_KEY=ACCESS_KEY:latest,REFRESH_KEY=REFRESH_KEY:latest,ROAD_SHARE_KEY=ROAD_SHARE_KEY:latest,MAIL_PASSWORD=MAIL_PASSWORD:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest" \
  --add-volume name=uploads,type=cloud-storage,bucket=<UPLOAD_BUCKET_NAME> \
  --add-volume-mount volume=uploads,mount-path=/mnt/uploads
```

**What each part means:**

| Flag | What it does |
| --- | --- |
| `--source .` | Build the image from the current directory with Cloud Build, then deploy it — no manual `docker build`/`push` step. |
| `--execution-environment gen2` | Required for `--add-volume` with `type=cloud-storage` (Cloud Storage FUSE volumes need the gen2 sandbox). |
| `--set-env-vars "..."` | Plain, readable-in-the-console values. **Replaces the entire list** on every run — a variable left out here is a variable that gets removed, not left alone. |
| `--set-secrets "APP_NAME=SECRET_NAME:latest,..."` | Values resolved from Secret Manager at container start, never shown in plain text in the console. Also fully replaces the existing list, same caveat as above. |
| `--add-volume` / `--add-volume-mount` | Mounts a Cloud Storage bucket as a filesystem path, so files written there (avatar uploads, via `UPLOAD_DIR=/mnt/uploads`) survive past a single container instance instead of living on ephemeral local disk. |

## The incident: a clean deploy that changed nothing

A deploy using the template above ran successfully — build, revision
creation and IAM policy all reported green, and `gcloud` printed a revision
as "serving 100 percent of traffic." A request that should have worked still
failed with a 500, and the logs showed Prisma talking to a database that
this deploy was specifically meant to stop using — an old, separately hosted
Postgres instance rather than the one the new configuration pointed at.

The new revision's own configuration was confirmed correct — describing the
service showed the database variable correctly wired to the right secret,
and reading that secret's value confirmed it held the right connection
string. The new revision had, in fact, built and started fine. **Cloud Run
had simply never routed any traffic to it.**

### Root cause

```bash
gcloud run services describe <SERVICE_NAME> --region <REGION> \
  --format="yaml(spec.traffic)"
```

**What this means:** `spec.traffic` is the service's traffic configuration —
who gets requests, and by how much. Describing it here showed traffic
pinned at 100% to one specific, named revision from several days earlier,
rather than tracking `latestRevision: true`.

A plain `gcloud run deploy` builds and ships a new revision either way, but
when traffic is pinned to a specific name like this, it never cuts over to
the new one automatically. Every subsequent deploy was silently shipping a
working revision into the void, while the pinned revision — still pointed at
the old database — kept serving every real request.

### Fix

```bash
gcloud run services update-traffic <SERVICE_NAME> \
  --to-latest --region <REGION> --project <PROJECT_ID>
```

**What this means:** re-point the service's traffic configuration at
whichever revision is newest, instead of a fixed name, and move 100% of
traffic there immediately.

Confirmed after: the service's traffic configuration showed
`latestRevision: true` at 100%, the health endpoint reported the database as
reachable, and a real end-to-end request (a sign-up) succeeded, returning a
created user and issued tokens.

### Checking for this in future

Before trusting any `gcloud run deploy` result, confirm traffic isn't
pinned:

```bash
gcloud run services describe <SERVICE_NAME> --region <REGION> \
  --format="value(spec.traffic)"
```

A result naming `'latestRevision': True` is the healthy state — new deploys
will take effect immediately. A result naming a specific `revisionName`
instead means deploys keep succeeding while changing nothing user-visible,
until traffic is explicitly moved with `--to-latest` (or via the console's
"Manage traffic" screen).
