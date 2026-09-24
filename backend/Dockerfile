FROM python:3.11-slim

# Prevent Python from creating .pyc files and buffer logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Application directory
WORKDIR /app

# ------------------------------------------------------------
# System dependencies
# ------------------------------------------------------------

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    chromium \
    fonts-noto-core \
    fonts-noto-extra \
    git \
    build-essential \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------
# Python dependencies
# ------------------------------------------------------------

COPY requirements.txt .

RUN python -m pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ------------------------------------------------------------
# Application files
# ------------------------------------------------------------

COPY main.py .
COPY live_translation.py .
COPY auth.py .
COPY database.py .
COPY setup_database.py .

# Create directories used by the application
RUN mkdir -p /app/_chromium_profile

# ------------------------------------------------------------
# Chromium path
# ------------------------------------------------------------

ENV CHROMIUM_PATH=/usr/bin/chromium

# ------------------------------------------------------------
# FastAPI
# ------------------------------------------------------------

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
