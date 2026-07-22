# Production Dockerfile for Hadirq Backend
# Multi-stage build for smaller image size

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Install frontend dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy frontend source and build
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Install build dependencies for native modules (canvas)
RUN apk add --no-cache \
    build-base \
    python3 \
    pkgconfig \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    pixman-dev \
    freetype-dev \
    libpng-dev

# Set Python for node-gyp
ENV PYTHON=/usr/bin/python3

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# Copy backend source and compile
COPY backend/ ./backend/
RUN cd backend && npm run build

# Stage 3: Production Runtime
FROM node:20-alpine AS production

# Install runtime dependencies for canvas and TensorFlow
RUN apk add --no-cache \
    curl \
    dumb-init \
    libc6-compat \
    fontconfig \
    font-freefont \
    cairo \
    pango \
    jpeg \
    giflib \
    pixman

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S hadirq -u 1001 -G nodejs

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy compiled backend from stage 2
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/

# Install production dependencies only
WORKDIR /app/backend
RUN npm ci --only=production

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && \
    chown -R hadirq:nodejs /app

WORKDIR /app

# Copy templates if they exist
COPY --from=backend-builder /app/backend/uploads/templates ./backend/uploads/templates 2>/dev/null || true

# Set ownership
RUN chown -R hadirq:nodejs /app

# Expose backend port
EXPOSE 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the backend
USER hadirq
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "backend/dist/index.js"]