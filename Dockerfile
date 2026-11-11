# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# A one-shot service applies versioned Drizzle migrations before the app starts.
FROM dependencies AS migrations
COPY drizzle.config.ts tsconfig.json ./
COPY src/db/schema.ts ./src/db/schema.ts
COPY src/lib/resume.ts ./src/lib/resume.ts
COPY drizzle ./drizzle
CMD ["./node_modules/.bin/drizzle-kit", "migrate", "--config=drizzle.config.ts"]

FROM dependencies AS builder
ENV DEVFOLIO_DOCKER_BUILD=true
COPY . .
# Dynamic pages only access PostgreSQL at runtime. This non-secret URL makes
# configuration imports possible without injecting real credentials into a build.
RUN DATABASE_URL=postgresql://build-only.invalid/devfolio npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health', {signal: AbortSignal.timeout(4000)}).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
