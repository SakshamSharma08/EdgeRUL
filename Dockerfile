# Multi-stage Dockerfile for EdgeRUL Full-Stack Avionics Gateway & HUD
# Stage 1: Build the React 19 Cockpit HUD Frontend
FROM node:22-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Edge Gateway Runtime
FROM node:22-bookworm-slim
WORKDIR /app

# Install runtime dependencies for ONNX runtime C++ bindings if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy project backend, models, dataset, and built frontend
WORKDIR /app
COPY backend ./backend
COPY data/raw ./data/raw
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "backend/src/index.js"]
