FROM node:22-bullseye-slim

WORKDIR /app

# Install system dependencies for native node modules (sharp, sqlite3, etc.)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy the entire Ghost monorepo (respects .dockerignore)
COPY . .

# Install all dependencies (including workspace packages)
RUN yarn install --frozen-lockfile --ignore-optional

# Build all packages (admin, shade, framework, etc.) via Nx
RUN yarn build

# Clean up build tooling to reduce image size
RUN apt-get purge -y python3 build-essential && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

WORKDIR /app/ghost/core

EXPOSE 8080
CMD ["node", "index.js"]
