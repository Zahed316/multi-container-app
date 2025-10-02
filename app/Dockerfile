# syntax=docker/dockerfile:1

# Build arg for Node.js version (override at build time if needed)
ARG NODE_VERSION=20.17.0

# Base image used for all stages
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /usr/src/app

# Install only production dependencies in a separate layer
FROM base AS deps
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Final runtime image
FROM base AS runner
ENV NODE_ENV=production

# Copy node_modules from deps stage first to leverage layer caching
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy application source
COPY . .

# Adjust ownership and drop privileges
RUN chown -R node:node /usr/src/app
USER node

# App listens on port 3000
EXPOSE 3000

# Start the app in production mode
CMD ["npm", "start"]
