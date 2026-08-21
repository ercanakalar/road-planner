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


# Stage 4: Production
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=production-deps /app/node_modules ./node_modules

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY --from=build /app/dist ./dist

COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

COPY package*.json ./

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]