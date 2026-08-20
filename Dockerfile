# syntax=docker/dockerfile:1

# Vite build served by nginx. Built on the deployment VM by the CI/CD pipeline
# (.github/workflows/ci-cd.yml) and run as the `web` service of the stack defined
# in the backend repo's docker-compose.yml.

ARG NODE_IMAGE=node:24-alpine
ARG NGINX_IMAGE=nginx:1.27-alpine

# ---- Dependencies ----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Vite inlines this at build time, so the image is specific to one origin: to
# point the app at a different API you rebuild, you do not restart. It is the
# API's *origin* only — the app appends /api/... itself.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN if [ -z "$VITE_API_URL" ]; then \
      echo "WARNING: VITE_API_URL is empty — the bundle will fall back to http://localhost:3000"; \
    fi
RUN npm run build

# ---- Runtime ----
FROM ${NGINX_IMAGE} AS runner
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
