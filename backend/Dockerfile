# syntax=docker/dockerfile:1.7

# ── Stage 1: dependencies (cached unless package.json changes) ────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ── Stage 2: build (cached unless source changes) ────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && \
    node node_modules/@nestjs/cli/bin/nest.js build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache openssl postgresql-client
WORKDIR /app
COPY --from=deps   /app/node_modules            ./node_modules
COPY --from=builder /app/node_modules/.prisma   ./node_modules/.prisma
COPY --from=builder /app/dist                   ./dist
COPY --from=builder /app/prisma                 ./prisma
COPY --from=builder /app/src/database           ./src/database
COPY scripts/entrypoint.sh                      ./scripts/entrypoint.sh
RUN chmod +x ./scripts/entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./scripts/entrypoint.sh"]
