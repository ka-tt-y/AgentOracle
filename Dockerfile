# Multi-stage build for AgentOracle Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files and install all deps (including tsx)
COPY package*.json ./
RUN npm ci

# Copy source files needed by the backend
COPY offchain ./offchain
COPY artifacts ./artifacts
COPY tsconfig.json ./

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy everything from builder (node_modules includes tsx runtime)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/offchain ./offchain
COPY --from=builder /app/artifacts ./artifacts
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/tsconfig.json ./

# Copy .env so dotenv loads all config (secrets, API keys, contract addresses)
COPY .env ./.env

# Set environment
ENV NODE_ENV=production
ENV API_PORT=4000

# Expose API port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start
CMD ["npx", "tsx", "offchain/agent_oracle.ts"]
