# syntax=docker/dockerfile:1.7

# ── Stage 1: dependencies (cached unless package.json changes) ────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ── Stage 2: build (cached unless source changes) ────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ── Stage 3: runtime (standalone — ~10x smaller than full build) ──────────────
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/public                  ./public
COPY --from=builder /app/.next/standalone        ./
COPY --from=builder /app/.next/static            ./.next/static
EXPOSE 3001
ENV PORT=3001
CMD ["node", "server.js"]
