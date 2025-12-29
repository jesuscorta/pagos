# Stage 1: install and build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime (serve static build)
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Minimal deps to serve static files
RUN npm install -g serve
COPY --from=builder /app/dist ./dist

EXPOSE 4321
CMD ["serve", "-s", "dist", "-l", "4321"]
