# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_OPTIONS=--max-old-space-size=384

RUN npx prisma generate
RUN npx nx build server --parallel=1

# ── Stage 2: Production ────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

# Copy built output
COPY --from=builder /app/dist/apps/server ./

# Copy Prisma client, schema, and CLI for migrations
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma
RUN npm install --no-save prisma@5

ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

CMD ["node", "main.js"]
