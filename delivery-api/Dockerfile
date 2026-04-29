# syntax=docker/dockerfile:1.7

# ---- deps: full install (incl. dev deps) for the build stage --------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- build: run nest build → dist ----------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime: prod-only deps + dist --------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Install only production deps to keep the image small. The cache mount
# lives in BuildKit's cache backend, not the final image layer, so we
# don't need to npm-cache-clean afterwards.
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Drop root.
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 4001
CMD ["node", "dist/main.js"]
