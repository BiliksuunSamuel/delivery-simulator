# syntax=docker/dockerfile:1.7
#
# Worker uses glibc images (`node:22-slim`, Debian) instead of alpine because
# @temporalio/core-bridge ships pre-built native bindings linked against
# glibc. Loading them on musl (alpine) blows up at startup with
# `__register_atfork: symbol not found`.

# ---- deps ----------------------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- build ---------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime -------------------------------------------------------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

COPY --from=build /app/dist ./dist

RUN groupadd --system app && useradd --system --gid app app
USER app

# The worker is headless — it connects to Temporal, no HTTP listener.
CMD ["node", "dist/main.js"]
