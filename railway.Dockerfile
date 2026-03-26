FROM node:22-bullseye-slim

WORKDIR /app

# Install system dependencies required for native node modules and git submodules
RUN apt-get update && apt-get install -y git python3 build-essential && rm -rf /var/lib/apt/lists/*

# Copy the entire Ghost mono-repo
COPY . .

# Initialize submodules explicitly in case Railway's checkout misses them
RUN git submodule update --init --recursive

# Run the standard Ghost setup script (installs deps and builds Admin)
RUN yarn setup

# Switch to production mode
ENV NODE_ENV=production

# The ghost server entrypoint
WORKDIR /app/ghost/core

# Railway port binding
EXPOSE 8080
CMD ["node", "index.js"]
