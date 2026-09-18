# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# Docker CLI for the real ECS deployment pipeline. The container talks to the
# host Docker daemon through /var/run/docker.sock (mounted in docker-compose);
# images are built/pushed there, never simulated.
RUN apk add --no-cache docker-cli

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4000

CMD ["node", "server.js"]
