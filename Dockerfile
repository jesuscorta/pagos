# Stage 1: install and build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Astro preview uses static output; adjust if you switch to SSR/adapter-node
EXPOSE 4321
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4321"]
