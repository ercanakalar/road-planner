FROM node:slim AS development

WORKDIR /app

# Install missing system packages required by ts-node-dev and Prisma
RUN apt-get update -y && apt-get install -y \
  procps \
  openssl \
  && rm -rf /var/lib/apt/lists/*

# Copy only necessary files for installing dependencies
COPY package*.json ./
COPY .env ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy the rest of the application
COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
