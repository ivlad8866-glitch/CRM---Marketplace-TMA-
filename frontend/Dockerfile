# ── Base ──────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Dependencies ─────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json frontend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod=false

# ── Build ────────────────────────────────────────────
FROM deps AS build
COPY packages/shared/ packages/shared/
COPY frontend/ frontend/
RUN cd packages/shared && pnpm build
RUN cd frontend && pnpm build

# ── Nginx ────────────────────────────────────────────
FROM nginx:1.27-alpine AS production
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s \
  CMD wget -qO- http://localhost/health || exit 1
