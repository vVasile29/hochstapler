# ---- Stage 1: Build the client ----
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Stage 2: Production image ----
FROM node:20-alpine
WORKDIR /app

# Copy server deps (include tsx since we run via tsx)
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

# Copy server source
COPY server/ ./server/

# Copy built client
COPY --from=client-builder /app/client/dist ./client/dist

EXPOSE 3001

WORKDIR /app/server
CMD ["npx", "tsx", "index.ts"]
