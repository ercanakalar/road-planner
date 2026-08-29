# Wiring up `MAP_API_KEY` after the fact

`MAP_API_KEY` is optional at boot (`src/config/env.validation.ts`) — without
it, `/api/maps/*` and `/api/road/:id/route|durations` answer 503 and the rest
of the API is unaffected. It wasn't set when the service was first deployed
via `--source .` (see `CLOUD_RUN_SOURCE_DEPLOY.md`), so once a real key was
added to `.env.production` it had to be pushed to the running service
separately, as its own small change rather than a full redeploy.

Placeholders in angle brackets stand for values specific to one project.

```bash
# 1. Store the key in Secret Manager (it didn't exist there yet)
printf '%s' "$MAP_API_KEY" | gcloud secrets create MAP_API_KEY \
  --data-file=- --replication-policy=automatic --project <PROJECT_ID>

# 2. Let the service's identity read it
gcloud secrets add-iam-policy-binding MAP_API_KEY \
  --member="serviceAccount:<SERVICE_ACCOUNT_EMAIL>" \
  --role=roles/secretmanager.secretAccessor \
  --project <PROJECT_ID>

# 3. Attach it to the running service
gcloud run services update <SERVICE_NAME> \
  --region <REGION> --project <PROJECT_ID> \
  --update-secrets="MAP_API_KEY=MAP_API_KEY:latest"
```

**What each step means:**

1. `gcloud secrets create` makes a new secret in Secret Manager and stores
   the key as its first version, read from stdin (`--data-file=-`) rather
   than as a command-line argument, so it never ends up in shell history.
2. A secret is unreadable by default. `add-iam-policy-binding` grants one
   specific identity — the service's own service account — permission to
   read this one secret's value. Without this step the container would fail
   to start once the secret is attached, unable to resolve it.
3. `gcloud run services update ... --update-secrets` attaches the secret to
   the service as an environment variable, resolved from Secret Manager each
   time a new container instance starts.

`--update-secrets` matters here, not `--set-secrets`: `--set-secrets`
replaces the **entire** secret list a service has, so using it would have
silently dropped every other secret already attached (the database URL, the
signing keys, and so on). `--update-secrets` only adds or overwrites the one
name given, leaving everything else untouched.

Verified after deploying: traffic landed on the new revision at 100% (the
traffic-pinning issue from `CLOUD_RUN_SOURCE_DEPLOY.md` did not recur), and
a reverse-geocoding request against the maps endpoint returned a resolved
address instead of a 503.

## Rotating an existing key

If the secret already exists and only its value is changing, skip step 1
and add a new version instead:

```bash
printf '%s' "$NEW_VALUE" | gcloud secrets versions add MAP_API_KEY \
  --data-file=- --project <PROJECT_ID>
```

**What this means:** this adds a new version to an existing secret; `:latest`
always points at whichever version was added most recently. On its own,
though, this does nothing to containers that are already running — the
value is resolved once, at container start, so a running instance keeps the
old key until it restarts. Force that with the same `--update-secrets`
command from step 3 above (or any new deploy), which starts a fresh
revision and re-resolves every secret it references.
