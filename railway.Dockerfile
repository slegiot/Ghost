# Production Dockerfile for Ghost (Railway deployment)
#
# Build context: extracted `yarn archive` tarball output from ghost/core
# This is the same approach as the official Dockerfile.production

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim

ENV NODE_ENV=production

# Runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 build-essential ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /home/ghost

# Copy the pre-built ghost core (from extracted yarn archive tarball)
COPY . .

# Install production dependencies only (matching official Dockerfile.production flags)
RUN yarn install --production --frozen-lockfile --ignore-scripts --prefer-offline --network-timeout 600000 || \
    yarn install --production --ignore-scripts --network-timeout 600000 || true

# Rebuild native modules for this platform
RUN cd node_modules/sqlite3 && npm run install || true

# Clean up build tools
RUN apt-get purge -y build-essential && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Create content directories
RUN mkdir -p content/data content/logs content/themes content/images && \
    cp -R content/themes/casper content/themes/casper-backup 2>/dev/null || true

EXPOSE 2368

# Railway injects dynamic PORT env var — bridge it to Ghost's config format
# Also force stdout-only logging for container environments
CMD ["sh", "-c", "export server__port=${PORT:-2368} && export logging__transports='[\"stdout\"]' && exec node index.js"]
