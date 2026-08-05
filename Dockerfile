# syntax=docker/dockerfile:1

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Vite embeds these at build time — must be present before `npm run build`
ARG VITE_BACKEND_URL=http://localhost:8000
ARG VITE_FRONTEND_URL=http://localhost:3000
ARG VITE_DEVCLUB_CLIENT_ID=
ARG VITE_DEVCLUB_OAUTH_BASE_URL=https://oauth.devclub.in
ARG VITE_DEMO_MODE=false

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL \
    VITE_FRONTEND_URL=$VITE_FRONTEND_URL \
    VITE_DEVCLUB_CLIENT_ID=$VITE_DEVCLUB_CLIENT_ID \
    VITE_DEVCLUB_OAUTH_BASE_URL=$VITE_DEVCLUB_OAUTH_BASE_URL \
    VITE_DEMO_MODE=$VITE_DEMO_MODE

# Install dependencies first (better layer caching)
COPY package-lock.json package.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our SPA-aware nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
