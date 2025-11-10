FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code - preserve the backend package structure
# We'll copy everything to /app/backend so it can be imported as a package
COPY . /app/backend

# Set PYTHONPATH to include /app so we can import backend as a package
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8000

# Run the application as a module
# Import backend.main which will work with relative imports
# Use --log-level warning to reduce noise (only show warnings and errors)
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "warning"]

