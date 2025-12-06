# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app

# Install deps with cache
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
# Package.json has "build": "ng build"
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim AS runtime
WORKDIR /app

# Only prod deps
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Start Angular SSR server
CMD ["node", "dist/msse692-frontend/server/server.mjs"]
