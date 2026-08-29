# Releasing: the backend on Google Cloud

A first release, start to finish, for someone who has not done one before.
Every command is meant to be pasted as written once the placeholder values are
filled in.

The shape of it: **Cloud Run** runs the API, **Secret Manager** holds anything
that must not leak, and the database lives wherever you choose in step 3. Two
scripts in `backend/scripts/` do the work; most of this document is the
accounts and keys they need first.

---

## What it costs

Cloud Run scales to zero. Nobody using the app means no instances running,
which means nothing to pay — the free allowance covers a new app's traffic
several times over. The cost of this stack is not the compute.

| Piece                             | Free allowance                                                    | Realistic bill                |
| --------------------------------- | ----------------------------------------------------------------- | ----------------------------- |
| Cloud Run (the API)               | Generous monthly request and CPU-second allowance; scales to zero | **£0** while small            |
| Cloud Build (builds the image)    | Free build-minutes each day                                       | **£0**                        |
| Artifact Registry (stores images) | 0.5 GB                                                            | Pennies, less with step 10    |
| Cloud Storage (uploaded avatars)  | 5 GB in US regions                                                | Pennies                       |
| Secret Manager                    | A handful of secret versions                                      | ~£0.10 / month                |
| **Postgres — see step 3**         | Depends entirely on the choice                                    | **£0 or ~£10 / month**        |
| **Google Maps APIs**              | A monthly allowance per API                                       | **£0, or a lot — see step 5** |

Two of those rows decide whether this is free or not.

**The database.** Cloud SQL, Google's managed Postgres, has **no free tier**.
The smallest instance bills by the hour whether or not a single person opens
the app — roughly £8–10 a month to sit idle. Step 3 offers a free Postgres
instead, which is the difference between a £0 bill and a £10 one.

**The Maps APIs.** These are billed per request and this app can make a lot of
them: one "search along the route" fans out into as many as twelve Places
calls. Step 5 caps that. Do not skip it.

> Prices and free allowances change, and they differ by region. Check the
> [pricing calculator](https://cloud.google.com/products/calculator) for
> current figures rather than trusting the numbers above. The protection that
> actually works is the budget alert in step 2 and the quotas in step 5.

---

## Before you start

- A Google account.
- A payment card. Google asks for one even for free-tier usage. It is not
  charged unless you exceed the free allowances or upgrade the account.
- The **gcloud** CLI: [install it](https://cloud.google.com/sdk/docs/install),
  then `gcloud --version` should answer.
- This repository cloned, and a terminal open at its root.

You do **not** need Docker locally. Cloud Build builds the image in the cloud.

---

## Step 1 — Create the project

```bash
gcloud auth login

# Project ids are globally unique, so add something of your own to the end.
gcloud projects create travel-routes-prod-1234 --name="Road Planner"
gcloud config set project travel-routes-prod-1234
```

Then link a billing account, in the console:
**Billing → Link a billing account**. Nothing below works without it — even
free-tier usage requires an active billing account attached.

**Pick a region and keep it.** Everything must agree on one.
`europe-west1` (Belgium) or `europe-west3` (Frankfurt) are the closest to
Turkey; `us-central1` is where the small always-free storage allowance lives.
Latency matters more to your users than pennies of storage, so prefer Europe.

---

## Step 2 — Set a budget alert, before anything else

This is the step that means a mistake costs you an email rather than a bill.
Do it now, while the project is still empty.

Console → **Billing → Budgets & alerts → Create budget**:

- Scope: this project
- Amount: something small and specific — **$5** is a sensible first budget
- Alert thresholds: 50%, 90%, 100%
- Tick **Email alerts to billing admins**

A budget does not cap spending; it tells you. The caps come in step 5.

---

## Step 3 — The database

Pick one. The scripts support both, and the choice is one line in a file.

### Option A — a free managed Postgres (recommended)

[Neon](https://neon.tech) has a free tier that suits this well: it suspends
when idle and wakes on the next connection, so an app nobody is using costs
nothing. [Supabase](https://supabase.com) is comparable, though its free
projects pause after a stretch of inactivity and need waking by hand.

1. Sign up and create a project. Choose the region nearest the Cloud Run
   region you picked in step 1.
2. Copy the **pooled** connection string — the one with `-pooler` in the
   hostname. A service that scales to zero and back opens connections in
   bursts, which is what the pooler is for.
3. Add `&connection_limit=3` to the end.

You should end up with something shaped like:

```
postgresql://user:password@ep-xxx-pooler.eu-central-1.aws.neon.tech/roaddb?sslmode=require&connection_limit=3
```

Keep `sslmode=require`. The connection crosses the public internet, unlike
Option B.

**The first request after an idle spell will be slow** — a second or two while
the database wakes, on top of the Cloud Run cold start. That is the trade for
free.

### Option B — Cloud SQL (~£10/month, no free tier)

Choose this if you would rather everything sat inside Google Cloud, or if you
outgrow the free tier.

```bash
gcloud sql instances create travel-routes \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=europe-west1

gcloud sql databases create roaddb --instance=travel-routes
gcloud sql users create roadplanner --instance=travel-routes --password='PICK-A-STRONG-ONE'
```

The instance name for the next step is `PROJECT_ID:REGION:INSTANCE`, e.g.
`travel-routes-prod-1234:europe-west1:travel-routes`.

Cloud Run mounts this as a Unix socket inside the container rather than
connecting to an address, and the connection is authorised by the service
account's `cloudsql.client` role. So leave the **authorised networks list
empty** — no IP needs allowing, and adding one only widens what can reach the
instance.

---

## Step 4 — Email

The app **will not start** without working mail settings: password reset is
built on them, so they are validated at boot rather than at first use.

For a real release, use a transactional email provider rather than a personal
Gmail account — [Brevo](https://www.brevo.com) and
[Resend](https://resend.com) both have free tiers big enough for a new app.
Sign up, find the SMTP credentials, and note four things:

| Value           | Example                       |
| --------------- | ----------------------------- |
| `MAIL_HOST`     | `smtp-relay.brevo.com`        |
| `MAIL_PORT`     | `587`                         |
| `MAIL_USERNAME` | the SMTP login they give you  |
| `MAIL_PASSWORD` | the SMTP key they give you    |
| `MAIL_FROM`     | the address mail is sent from |

`MAIL_FROM` usually has to be a domain you have verified with the provider,
or the mail will be rejected or land in spam.

---

## Step 5 — The Maps key, and capping it

Two different keys are involved, and confusing them is the usual mistake:

| Key                       | Used by                                               | Restricted to                                                      |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| `MAP_API_KEY`             | the **backend**, for directions, geocoding and places | those three APIs, no referrer restriction                          |
| `EXPO_PUBLIC_MAP_API_KEY` | the **app**, to draw the map itself                   | Maps SDK for Android/iOS, plus your package name and signing SHA-1 |

Enable what the backend needs:

```bash
gcloud services enable \
  directions-backend.googleapis.com \
  geocoding-backend.googleapis.com \
  places-backend.googleapis.com
```

Then, in the console under **APIs & Services → Credentials**, create an API
key for the backend and set **API restrictions** on it to exactly those three.
Leave application restrictions as _None_: it is called from a server, so there
is no referrer or app to restrict it to. Its safety comes from never leaving
Secret Manager.

### Now cap it

This is the one place where a bug or a bored stranger can cost real money.
Route search turns one tap into up to twelve billed Places requests, and the
API endpoints are public by design — a shared road has to open without an
account.

Console → **APIs & Services → [each API] → Quotas & System Limits**. Set a
daily request cap on each of Directions, Geocoding and Places that you would
be comfortable paying for. A few thousand a day is far above what a new app
uses and far below what an unattended loop can spend.

The app already helps: the backend caches every answer, and rate-limits each
caller — twelve route searches a minute, sixty directions, ninety places. The
quota is the backstop for everything those do not catch.

---

## Step 6 — Fill in the configuration

```bash
cd backend
cp .env.production.example .env.production
```

`.env.production` is **git-ignored** — it is listed in `backend/.gitignore`,
so it cannot be committed by accident. It never reaches the server either: the
scripts read it locally, put the sensitive values in Secret Manager, and pass
the rest as ordinary environment variables. Nothing secret is ever baked into
the image.

Open it and fill in:

```bash
PROJECT_ID="travel-routes-prod-1234"
REGION="europe-west1"

# Step 3, Option A — paste the pooled URL and leave CLOUD_SQL_INSTANCE empty
DATABASE_URL="postgresql://...?sslmode=require&connection_limit=3"
CLOUD_SQL_INSTANCE=""

# ...or step 3, Option B — leave DATABASE_URL empty and fill these instead
# CLOUD_SQL_INSTANCE="travel-routes-prod-1234:europe-west1:travel-routes"
# DB_PASSWORD="the password you set"

# Step 4
MAIL_HOST="smtp-relay.brevo.com"
MAIL_USERNAME="..."
MAIL_PASSWORD="..."
MAIL_FROM="noreply@yourdomain.com"

# Step 5
MAP_API_KEY="..."
```

Leave `FRONTEND_URL`, `SHARE_LINK_BASE_URL` and `GOOGLE_REDIRECT_URL` empty.
They are the service's own address, which does not exist yet; the deploy
discovers it and fills them in for you.

Google sign-in is optional. Leave `GOOGLE_CLIENT_ID`,
`GOOGLE_NATIVE_CLIENT_IDS` and `GOOGLE_CLIENT_SECRET` empty and email sign-in
still works.

You do not set `ACCESS_KEY`, `REFRESH_KEY` or `ROAD_SHARE_KEY`. Setup
generates three different random values and leaves them alone on later runs —
different on purpose, so an access token cannot be replayed as a refresh
token, and left alone so re-running does not sign every user out.

---

## Step 7 — Deploy

```bash
# Once per project: APIs, registry, bucket, service account, secrets.
scripts/setup-cloudrun.sh

# Every release: build, migrate, deploy — in that order.
scripts/deploy-cloudrun.sh
```

`setup-cloudrun.sh` is safe to re-run; a half-finished attempt can be resumed
rather than unpicked.

`deploy-cloudrun.sh` builds two images, runs the database migrations as a job
and **waits for them**, then deploys. The order matters: a revision that goes
live before its migrations serves requests against a schema it does not
expect, and the failure looks like unrelated 500s.

It ends by printing the service URL and calling its own health endpoint. Check
it yourself too:

```bash
curl https://YOUR-SERVICE-URL/api/health
```

---

## Step 8 — Save the address

The first deploy prints three lines. Paste them into `.env.production`:

```bash
FRONTEND_URL="https://travel-routes-api-xxxx.europe-west1.run.app"
SHARE_LINK_BASE_URL="https://travel-routes-api-xxxx.europe-west1.run.app"
GOOGLE_REDIRECT_URL="https://travel-routes-api-xxxx.europe-west1.run.app/api/auth/google/callback"
```

The deploy sets these for you the first time, but writing them down means
later deploys do not rediscover them — and it is where a custom domain goes
when you have one.

---

## Step 9 — Point the app at it

```bash
cd ../mobile-react-native
cp .env.example .env
cp src/constants/appConfig.example.ts src/constants/appConfig.ts
```

In `.env`:

```bash
EXPO_PUBLIC_BASE_URL="https://travel-routes-api-xxxx.europe-west1.run.app"
```

No `/api` on the end — the client adds that itself.

Check it against the real backend before building:

```bash
npm start
```

Then build a release:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```

`EXPO_PUBLIC_*` values are **inlined into the JS bundle**, so treat everything
in that file as public. That is exactly why the directions, geocoding and
places key lives on the server instead: the app asks `/api/maps/*` and never
holds a key that is billed per request.

---

## Step 10 — Keeping the bill near zero

A short checklist, worth running through a week after release:

- **Budget alert exists** and points at an address you read (step 2).
- **Maps quotas are set** on all three APIs (step 5). Check
  **APIs & Services → Dashboard** for what actual usage looks like.
- **`min-instances` is 0.** It is, by default. Setting it above zero keeps an
  instance warm and turns a £0 bill into a monthly one.
- **`MAX_INSTANCES` is small.** It defaults to 4, which bounds both the bill
  and the database connections — each instance opens `connection_limit` of its
  own.
- **Old images are cleaned up.** Every deploy pushes two, and Artifact Registry
  is free only to 0.5 GB. Add a cleanup policy that keeps the most recent few:

  ```bash
  cat > /tmp/cleanup.json <<'POLICY'
  [
    {
      "name": "keep-recent",
      "action": {"type": "Keep"},
      "mostRecentVersions": {"keepCount": 5}
    },
    {
      "name": "delete-old",
      "action": {"type": "Delete"},
      "condition": {"olderThan": "30d"}
    }
  ]
  POLICY

  gcloud artifacts repositories set-cleanup-policies travel-routes \
    --location=europe-west1 --policy=/tmp/cleanup.json
  ```

- **Check the bill once.** Console → **Billing → Reports**, a week in. It is
  the only way to be sure of what any of this actually costs you.

---

## When something goes wrong

**The deploy fails and the revision "never became healthy."**
The app validates its whole configuration at boot and refuses to start if
anything is missing, so this is almost always a configuration problem rather
than a broken image. The reason is in the logs:

```bash
gcloud logging read \
  'resource.type=cloud_run_revision AND
   resource.labels.service_name=travel-routes-api AND
   severity>=WARNING' \
  --limit=50 --format='value(textPayload)'
```

Or read them in the console under **Cloud Run → travel-routes-api → Logs**,
which is easier the first few times.

**`Permission 'iam.serviceaccounts.actAs' denied`.**
Deploying a service that _runs as_ another identity needs permission to act as
it. `setup-cloudrun.sh` grants this to whoever is logged in when it runs — so
re-run it as the account that is deploying.

**The migration job fails.**
Almost always the database URL. For Neon, check that `sslmode=require` is
present and that you copied the pooled string. For Cloud SQL, check that the
database and user in `.env.production` match what actually exists on the
instance.

**The app cannot reach the backend.**
Open `https://YOUR-SERVICE-URL/api/health` in the phone's own browser. If that
answers and the app does not, the address in `.env` is wrong or the app was
built before it was set — `EXPO_PUBLIC_*` values are baked in at build time,
so changing one means building again.

**`/api/maps/*` answers 503.**
`MAP_API_KEY` is missing or was not stored. Everything else keeps working;
this is deliberate. Re-run `scripts/setup-cloudrun.sh` with the key filled in.

**The deploy reports success but nothing actually changes.**
Check whether traffic is pinned to a specific revision instead of tracking
latest:

```bash
gcloud run services describe <SERVICE_NAME> --region <REGION> \
  --format="value(spec.traffic)"
```

`spec.traffic` is the service's traffic split. If this names a
`revisionName` instead of showing `latestRevision: True`, every new deploy
builds and ships fine but never receives traffic — a specific, previously
pinned revision keeps serving every request, however old its config is.
Fix with:

```bash
gcloud run services update-traffic <SERVICE_NAME> --to-latest \
  --region <REGION>
```

See [`CLOUD_RUN_SOURCE_DEPLOY.md`](./CLOUD_RUN_SOURCE_DEPLOY.md) for the
incident this was written from.
