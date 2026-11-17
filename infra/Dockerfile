# One image, three entrypoints: server.js (API + web), worker.js, migrate.js.
# ---------- build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/game-core/package.json packages/game-core/
COPY packages/db/package.json packages/db/
COPY packages/server-kit/package.json packages/server-kit/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @realms/web build \
 && pnpm --filter @realms/server build \
 && pnpm --filter @realms/worker build \
 && node scripts/build-node.mjs packages/db/scripts/migrate.ts dist/migrate.js
# Production-only node_modules for the few externalized (native) packages.
RUN pnpm --filter @realms/server deploy --prod --legacy /out

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/server/dist/main.js ./server.js
COPY --from=build /repo/apps/worker/dist/main.js ./worker.js
COPY --from=build /repo/dist/migrate.js ./migrate.js
COPY --from=build /repo/packages/db/migrations ./migrations
COPY --from=build /repo/apps/web/dist ./web
ENV MIGRATIONS_DIR=/app/migrations
USER node
EXPOSE 3000
CMD ["node", "server.js"]
