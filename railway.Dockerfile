# Production Dockerfile for Ghost (Railway deployment)
# Uses the official ghost:archive build approach
#
# Strategy: build ghost core + admin, then pack into production layout

ARG NODE_VERSION=22

# ---- Builder: compile everything ----
FROM node:${NODE_VERSION}-bullseye AS builder

WORKDIR /app

# System deps for native modules
RUN apt-get update && \
    apt-get install -y --no-install-recommends git ca-certificates python3 build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy workspace config first for caching
COPY package.json yarn.lock nx.json ./

# Copy ALL workspace package.json files (yarn workspaces needs them all)
COPY ghost/core/package.json ghost/core/
COPY ghost/admin/package.json ghost/admin/
COPY ghost/i18n/package.json ghost/i18n/
COPY ghost/parse-email-address/package.json ghost/parse-email-address/
COPY apps/shade/package.json apps/shade/
COPY apps/admin-x-design-system/package.json apps/admin-x-design-system/
COPY apps/admin-x-framework/package.json apps/admin-x-framework/
COPY apps/admin-x-settings/package.json apps/admin-x-settings/
COPY apps/admin/package.json apps/admin/
COPY apps/portal/package.json apps/portal/
COPY apps/comments-ui/package.json apps/comments-ui/
COPY apps/signup-form/package.json apps/signup-form/
COPY apps/sodo-search/package.json apps/sodo-search/
COPY apps/announcement-bar/package.json apps/announcement-bar/
COPY apps/posts/package.json apps/posts/
COPY apps/stats/package.json apps/stats/
COPY apps/activitypub/package.json apps/activitypub/
COPY apps/seo-copilot/package.json apps/seo-copilot/

# Install deps (skip native module scripts to prevent hanging)
RUN yarn install --frozen-lockfile --ignore-optional --ignore-scripts --network-timeout 600000

# Rebuild only sqlite3 (needed for production)
RUN cd node_modules/sqlite3 && npm run install || true

# Copy all source code
COPY . .

# Build ONLY what Ghost core needs for production:
# 1. ghost:build:assets - CSS/JS minification for frontend
# 2. ghost:build:tsc - TypeScript compilation
# 3. @tryghost/admin:build - Admin UI (this pulls in its deps via Nx)
#
# Use --parallel=2 with memory limit to prevent OOM
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npx nx run ghost:build:assets && \
    npx nx run ghost:build:tsc && \
    npx nx run @tryghost/admin:build --parallel=2

# ---- Production: slim runtime ----
FROM node:${NODE_VERSION}-bullseye-slim

ENV NODE_ENV=production

WORKDIR /app

# Copy everything from builder
COPY --from=builder /app /app

# Install production-only deps (skip devDeps)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 build-essential && \
    cd ghost/core && \
    yarn install --production --frozen-lockfile --ignore-optional --ignore-scripts --network-timeout 600000 || true && \
    apt-get purge -y build-essential && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app/ghost/core

EXPOSE 2368

CMD ["node", "index.js"]
