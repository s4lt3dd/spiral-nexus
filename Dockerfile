# syntax=docker/dockerfile:1.7
# Spiral Nexus web image. Built in CI, never on the VPS (next build wants
# ~2 GB RAM). Three stages keep the runtime image small (~150 MB) and free of
# build tooling. See docs/TARGET-ARCHITECTURE.md §6.

ARG NODE_VERSION=24

# ---- deps: install exactly the lockfile -----------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
# .npmrc carries ignore-scripts=true and engine-strict=true, so install
# behaviour in the image matches local dev and CI.
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- builder: next build --------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so
# they are build args, not runtime env. Both are public by design (the anon
# key is the browser key; RLS is the boundary). Server-only secrets are NEVER
# build args - they arrive as runtime env from Kamal.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
RUN npm run build

# ---- runner: minimal, non-root --------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Dedicated unprivileged user; nothing here needs root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
# Kamal-proxy probes /up too; this one is for `docker ps` and compose.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/up >/dev/null || exit 1
CMD ["node", "server.js"]
