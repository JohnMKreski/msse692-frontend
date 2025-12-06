# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build-time config (API + Firebase) 
ARG API_BASE_URL=https://api.arkvalleyevents.com
ARG API_PATH_PREFIX=/api
ARG API_VERSION=v1

ARG FB_API_KEY="AIzaSyDP0SBD0azkB7rabUFfwpGCAPN6Tr9dBlA"
ARG FB_AUTH_DOMAIN="ave-prod-1.firebaseapp.com"
ARG FB_PROJECT_ID="ave-prod-1"
ARG FB_APP_ID="1:717675093243:web:e5e07c69fe626c5642645e"
ARG FB_STORAGE_BUCKET="ave-prod-1.firebasestorage.app"
ARG FB_MESSAGING_SENDER_ID="717675093243"
ARG FB_MEASUREMENT_ID="G-RQRRFH8F4J"

# Generate Angular env files  
RUN mkdir -p src/environments && \
    printf "export const environment = {\n  production: false,\n  apiBaseUrl: '%s',\n  apiPathPrefix: '%s',\n  apiVersion: '%s',\n  firebase: { apiKey: '%s', authDomain: '%s', projectId: '%s', appId: '%s', storageBucket: '%s', messagingSenderId: '%s', measurementId: '%s' }\n};\n" \
      "$API_BASE_URL" "$API_PATH_PREFIX" "$API_VERSION" \
      "$FB_API_KEY" "$FB_AUTH_DOMAIN" "$FB_PROJECT_ID" "$FB_APP_ID" "$FB_STORAGE_BUCKET" "$FB_MESSAGING_SENDER_ID" "$FB_MEASUREMENT_ID" \
      > src/environments/environment.ts && \
    printf "export const environment = {\n  production: true,\n  apiBaseUrl: '%s',\n  apiPathPrefix: '%s',\n  apiVersion: '%s',\n  firebase: { apiKey: '%s', authDomain: '%s', projectId: '%s', appId: '%s', storageBucket: '%s', messagingSenderId: '%s', measurementId: '%s' }\n};\n" \
      "$API_BASE_URL" "$API_PATH_PREFIX" "$API_VERSION" \
      "$FB_API_KEY" "$FB_AUTH_DOMAIN" "$FB_PROJECT_ID" "$FB_APP_ID" "$FB_STORAGE_BUCKET" "$FB_MESSAGING_SENDER_ID" "$FB_MEASUREMENT_ID" \
      > src/environments/environment.prod.ts

# Build Angular  <<< keep this after the generator
RUN npm run build

# ---- Runtime config ----
ENV PORT=4000
EXPOSE 4000

# Adjust the path below if your dist structure is slightly different
CMD ["node", "dist/msse692-frontend/server/server.mjs"]
