FROM node:slim AS development

WORKDIR /app

COPY package*.json ./
COPY .env ./
COPY /prisma/* ./prisma/

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
