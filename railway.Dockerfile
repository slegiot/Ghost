# ---- Stage 1: Build ----
FROM node:22-bullseye-slim AS builder

WORKDIR /app

# Install system dependencies for native modules (sharp, sqlite3, etc.)
RUN apt-get update && \
    apt-get install -y --no-install-recommends git ca-certificates python3 build-essential && \
    rm -rf /var/lib/apt/lists/*

# Skip Husky git hooks
ENV HUSKY=0

# Copy package manifests first for better layer caching
# (yarn install only re-runs when these change, not on every code change)
COPY package.json yarn.lock nx.json ./
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

# Install dependencies — skip native compilation to avoid hangs
RUN yarn install --frozen-lockfile --ignore-optional --ignore-scripts --network-timeout 600000

# Rebuild only the native modules Ghost actually needs
RUN cd node_modules/sqlite3 && npm run install || true

# Now copy the rest of the source code
COPY . .

# Build all packages (admin, shade, framework, etc.) via Nx
# - Limit parallelism to 1 to avoid OOM on constrained runners
# - Verbose logging so build progress is visible
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NX_VERBOSE_LOGGING=true
RUN npx nx run-many -t build --parallel=1 --verbose

# ---- Stage 2: Runtime ----
FROM node:22-bullseye-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Copy the full built monorepo (yarn workspaces needs the structure)
COPY --from=builder /app /app

WORKDIR /app/ghost/core

# Railway sets PORT dynamically
EXPOSE ${PORT:-2368}
CMD ["node", "index.js"]
