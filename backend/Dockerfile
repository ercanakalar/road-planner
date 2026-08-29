# Stage 1: Dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci


# Stage 2: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# Required by prisma.config.ts during build.
# This is NOT a real database connection.
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS
RUN npm run build


# Stage 3: Production dependencies
FROM node:20-alpine AS production-deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev


# Stage 4: Development
# What docker-compose.yml builds (`target: development`). The source is bind
# mounted over /app there, so only node_modules and the generated client come
# from the image.
FROM node:20-alpine AS development

WORKDIR /app

ENV NODE_ENV=development

COPY --from=dependencies /app/node_modules ./node_modules

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

USER node

EXPOSE 3000

CMD ["npm", "run", "start:dev"]


# Stage 5: Migrator
# Applies migrations and exits. For a deploy that migrates as a separate step —
# a Cloud Run Job, a Kubernetes Job — instead of letting each instance do it.
FROM node:20-alpine AS migrator

WORKDIR /app

ENV NODE_ENV=production

COPY --from=production-deps /app/node_modules ./node_modules

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

USER node

CMD ["npx", "--no-install", "prisma", "migrate", "deploy"]


# Stage 6: Production
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=production-deps /app/node_modules ./node_modules

COPY --from=build /app/dist ./dist

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]