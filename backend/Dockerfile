FROM python:3.11-slim

ENV ENV_MODE production
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl git build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Install Python dependencies
COPY pyproject.toml uv.lock ./
ENV UV_LINK_MODE=copy
ENV UV_CACHE_DIR=/tmp/uv-cache
RUN --mount=type=cache,target=/tmp/uv-cache \
    uv sync --locked --quiet --no-cache || \
    (echo "Fallback: installing without lock file..." && \
     uv sync --quiet --no-cache)

# Copy application code
COPY . .

# Calculate optimal worker count based on 16 vCPUs
# Using (2*CPU)+1 formula for CPU-bound applications
ENV WORKERS=7
ENV THREADS=2
ENV WORKER_CONNECTIONS=2000

ENV PYTHONPATH=/app
EXPOSE 8000

# Gunicorn configuration
CMD ["sh", "-c", "uv run gunicorn api:app \
  --workers $WORKERS \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 1800 \
  --graceful-timeout 600 \
  --keep-alive 1800 \
  --max-requests 0 \
  --max-requests-jitter 0 \
  --forwarded-allow-ips '*' \
  --worker-connections $WORKER_CONNECTIONS \
  --worker-tmp-dir /dev/shm \
  --preload \
  --log-level info \
  --access-logfile - \
  --error-logfile - \
  --capture-output \
  --enable-stdio-inheritance \
  --threads $THREADS"]
