# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build for the road planner API.
#
# Replaces a single-stage image that:
#
#   * ran `COPY .env ./`, embedding live secrets in a layer (H10). Deleting the file
#     in a later stage would not help — every layer is recoverable from the image, so
#     a secret committed to one is disclosed to anyone who can pull it. Secrets belong
#     in the environment at run time, which `docker-compose.yml` already provides.
#   * ran `npm install` rather than `npm ci`, so the image did not necessarily match
#     `package-lock.json`.
#   * ran `npm run start:dev` — the watching, recompiling dev server — as **root**,
#     with the whole toolchain and every devDependency present.
#
# Two real stages: `builder` compiles with the dev toolchain, `production` carries
# only `dist/`, production dependencies and the Prisma client. `development` stays a
# separate target for docker-compose, which bind-mounts the source.
# ─────────────────────────────────────────────────────────────────────────────

# Pinned to a major line. `node:slim` floats across major versions, so an image built
# today and one built next year could differ by a Node major.
ARG NODE_VERSION=22-slim

# ── Base ─────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS base

# openssl: required by Prisma's query engine.
# procps: `nest start --watch` needs `ps` to manage its child process.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl procps \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Dependencies ─────────────────────────────────────────────────────────────
# Split from the build so a source change does not re-resolve the dependency tree.
FROM base AS deps

COPY package*.json ./
# `npm ci` installs exactly what the lockfile says and fails when the two disagree,
# which is the property a reproducible image needs.
RUN npm ci

# ── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma/
# Before the source copy: the generated client is an input to the type check.
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src/
RUN npm run build

# Drops devDependencies from the tree copied forward. A fresh `npm ci --omit=dev`
# would work too, but re-resolves what is already installed here.
RUN npm prune --omit=dev

# ── Development ──────────────────────────────────────────────────────────────
# The docker-compose target. Source arrives by bind mount, so nothing is copied
# beyond what `npm ci` and `prisma generate` need.
FROM base AS development

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma/
RUN npx prisma generate

# Non-root even here: a container that only reads its bind mount has no reason to run
# privileged, and matching production keeps root-owned build artefacts from appearing
# in the developer's working tree.
USER node

EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ── Production ───────────────────────────────────────────────────────────────
FROM base AS production

ENV NODE_ENV=production

# `node` (uid 1000) ships with the image. Ownership is set on copy rather than by a
# later `chown`, which would duplicate every file into a second layer.
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node package*.json ./
# Carried so `prisma migrate deploy` can run from this image: the migration history is
# the only way to bring a database up to the schema this code expects.
COPY --chown=node:node prisma ./prisma/

USER node

EXPOSE 3000

# The health endpoint issues a real query, so an unreachable database marks the
# container unhealthy rather than merely logging.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Exec form, so the process is PID 1 and receives SIGTERM directly. Under `npm` the
# signal reaches npm instead, `enableShutdownHooks` never runs, and Prisma's pool is
# torn down by the kernel rather than closed.
CMD ["node", "dist/main"]
