# ── Base ──────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Dependencies ─────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod=false

# ── Build ────────────────────────────────────────────
FROM deps AS build
COPY packages/shared/ packages/shared/
COPY backend/ backend/
RUN cd packages/shared && pnpm build
RUN cd backend && npx prisma generate && pnpm build

# ── Production ───────────────────────────────────────
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/packages/shared/src ./packages/shared/src
COPY backend/package.json ./backend/
COPY packages/shared/package.json ./packages/shared/
COPY package.json pnpm-workspace.yaml ./

USER app
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "backend/dist/main.js"]
