# Stage 1: Dependencies
FROM node:20-alpine AS deps

# Install necessary build tools for native modules (better-sqlite3)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Enable Corepack for Yarn Berry
RUN corepack enable

WORKDIR /app

# Copy package manager files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install dependencies (includes building native modules)
RUN yarn install --immutable

# Stage 2: Builder
FROM node:20-alpine AS builder

# Enable Corepack
RUN corepack enable

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarn ./.yarn

# Copy source code and config files
COPY package.json yarn.lock .yarnrc.yml ./
COPY app ./app
COPY public ./public
COPY next.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY tailwind.config.ts ./

# Set production environment
ENV NODE_ENV=production

# Build Next.js application
RUN yarn build

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner

# Install necessary runtime libraries for better-sqlite3
RUN apk add --no-cache libc6-compat

# Enable Corepack
RUN corepack enable

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/.yarnrc.yml ./
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy database schema and migration files for Drizzle
COPY --from=builder /app/app/lib/db ./app/lib/db
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./

# Create db directory for volume mount
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app/db

# Switch to non-root user
USER nextjs

# Expose Next.js port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Next.js
CMD ["yarn", "start"]
