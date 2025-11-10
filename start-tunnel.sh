#!/usr/bin/env bash

set -euo pipefail

# Script to start backend with cloudflared tunnel and configure Expo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/trailmix"
TUNNEL_LOG="${SCRIPT_DIR}/.tunnel-url.log"
TUNNEL_URL_FILE="${SCRIPT_DIR}/.tunnel-url"

echo "Starting TrailMix with Cloudflared Tunnel..."

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "cloudflared is not installed or not in PATH"
    echo "Please install it from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
fi

# Function to extract tunnel URL from cloudflared output
extract_tunnel_url() {
    local log_file="$1"
    local max_attempts=30
    local attempt=0
    
    echo "Waiting for tunnel URL..."
    
    while [ $attempt -lt $max_attempts ]; do
        if [ -f "$log_file" ]; then
            # Try to extract URL from cloudflared output
            # Cloudflared typically outputs: "https://xxxx-xxxx-xxxx.trycloudflare.com"
            local url=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$log_file" 2>/dev/null | head -1)
            
            if [ -n "$url" ]; then
                echo "$url"
                return 0
            fi
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Cleanup function
cleanup() {
    echo ""
    echo "Cleaning up..."
    if [ -n "${CLOUDFLARED_PID:-}" ]; then
        kill $CLOUDFLARED_PID 2>/dev/null || true
    fi
    docker-compose down 2>/dev/null || true
    rm -f "$TUNNEL_LOG" "$TUNNEL_URL_FILE"
    exit 0
}

trap cleanup INT TERM EXIT

# Start backend in Docker
echo "Starting backend container..."
cd "$SCRIPT_DIR"
docker-compose up -d backend

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if docker-compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/docs')" 2>/dev/null; then
        echo "Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Backend failed to start"
        docker-compose logs backend
        exit 1
    fi
    sleep 1
done

# Start cloudflared tunnel
echo "Starting Cloudflared tunnel..."
cd "$SCRIPT_DIR"

# Clean up old log file
rm -f "$TUNNEL_LOG" "$TUNNEL_URL_FILE"

# Run cloudflared in background and capture output
cloudflared tunnel --url http://localhost:8000 > "$TUNNEL_LOG" 2>&1 &
CLOUDFLARED_PID=$!

# Wait a bit for tunnel to initialize
sleep 3

# Extract tunnel URL
TUNNEL_URL=$(extract_tunnel_url "$TUNNEL_LOG")

if [ -z "$TUNNEL_URL" ]; then
    echo "Failed to get tunnel URL. Check $TUNNEL_LOG for details."
    cat "$TUNNEL_LOG" 2>/dev/null || true
    exit 1
fi

echo "Tunnel URL: $TUNNEL_URL"
echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"

# Set environment variable for Expo
export EXPO_PUBLIC_API_BASE_URL="${TUNNEL_URL}/api/v1"
echo "API Base URL: $EXPO_PUBLIC_API_BASE_URL"
echo ""

# Start Expo (don't use --tunnel flag, we're using cloudflared)
echo "Starting Expo frontend..."
echo "   The app will use the cloudflared tunnel URL: ${TUNNEL_URL}/api/v1"
echo "   Press Ctrl+C to stop all services."
echo ""
cd "$FRONTEND_DIR"
# Don't use --tunnel flag - we're using cloudflared, not Expo's ngrok
EXPO_PUBLIC_API_BASE_URL="${TUNNEL_URL}/api/v1" npx expo start

