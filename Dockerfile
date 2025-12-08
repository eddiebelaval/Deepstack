# DeepStack Trading Backend - Production Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
# TA-Lib requires build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install TA-Lib C library
RUN wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz && \
    tar -xzf ta-lib-0.4.0-src.tar.gz && \
    cd ta-lib/ && \
    ./configure --prefix=/usr && \
    make && \
    make install && \
    cd .. && \
    rm -rf ta-lib ta-lib-0.4.0-src.tar.gz

# Copy requirements first for better caching
COPY requirements-prod.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY core/ ./core/
COPY config/ ./config/
COPY market_api.py .

# Create non-root user for security
RUN useradd -m -u 1000 deepstack && chown -R deepstack:deepstack /app
USER deepstack

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV API_HOST=0.0.0.0
# PORT is provided by Railway at runtime, default to 8000 for local dev
ENV PORT=8000

# Expose port (Railway will override with its own port)
EXPOSE 8000

# Health check - uses $PORT for flexibility
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/health')" || exit 1

# Run the server - use shell form so $PORT gets expanded
CMD uvicorn core.api_server:app --host 0.0.0.0 --port ${PORT}
