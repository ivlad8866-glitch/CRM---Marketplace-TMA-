# ── Build stage ───────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

RUN npm install -g pnpm@10

# Copy workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --no-frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY backend/ backend/

RUN cd packages/shared && pnpm build || true
RUN cd backend && npx prisma generate && pnpm build

# ── Production stage ──────────────────────────────────
FROM node:20-alpine AS production
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
WORKDIR /app

# Copy everything from build (node_modules + compiled output)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/packages/shared/src ./packages/shared/src
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-workspace.yaml ./

USER app
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "backend/dist/main.js"]
