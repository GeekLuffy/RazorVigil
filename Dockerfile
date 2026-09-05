# ==============================================================================
# Stage 1: Build React Production Frontend
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Production Python API & ML Runtime
# ==============================================================================
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system utilities and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python ML dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code, docs, tests, and scripts
COPY backend/ ./backend/
COPY docs/ ./docs/
COPY tests/ ./tests/
COPY scripts/ ./scripts/
RUN mkdir -p data

# Copy compiled React UI from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose live gateway port
EXPOSE 8000

# Healthcheck to verify gateway responsiveness
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Launch production ASGI server
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
