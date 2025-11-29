#!/usr/bin/env bash

set -euo pipefail

# Script to start backend in Docker (with cloudflared tunnel), Expo locally with LAN mode

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${SCRIPT_DIR}/trailmix"
TUNNEL_URL_FILE="${SCRIPT_DIR}/.tunnel-url"

echo "Starting TrailMix with Docker (LAN mode)..."

# Function to extract tunnel URL from cloudflared container logs
extract_tunnel_url() {
    local max_attempts=30
    local attempt=0
    
    echo "Waiting for tunnel URL..."
    
    while [ $attempt -lt $max_attempts ]; do
        # Get logs from cloudflared container and extract URL
        local url=$(docker logs trailmix-cloudflared 2>&1 | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | head -1)
        
        if [ -n "$url" ]; then
            echo "$url"
            return 0
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
    docker-compose down
    rm -f "$TUNNEL_URL_FILE"
    rm -f "${FRONTEND_DIR}/.tunnel-url"
    exit 0
}

trap cleanup INT TERM EXIT

# Start all services in Docker
echo "Starting Docker containers..."
cd "$SCRIPT_DIR"
docker-compose down --remove-orphans >/dev/null 2>&1
# Clean up old tunnel URL files to ensure fresh start
rm -f "$TUNNEL_URL_FILE"
rm -f "${FRONTEND_DIR}/.tunnel-url"
docker-compose up -d backend cloudflared

# Wait for backend to be ready (healthcheck handles this, but we'll wait a bit)
echo "Waiting for backend to be ready..."
sleep 5

# Extract tunnel URL from cloudflared logs
TUNNEL_URL=$(extract_tunnel_url)

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Failed to get tunnel URL. Check cloudflared logs:"
    docker logs trailmix-cloudflared
    exit 1
fi

echo "Tunnel URL: $TUNNEL_URL"
echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
# Also update trailmix/.tunnel-url for app.config.js
echo "$TUNNEL_URL" > "${FRONTEND_DIR}/.tunnel-url"

# Set environment variable for Expo
export EXPO_PUBLIC_API_BASE_URL="${TUNNEL_URL}/api/v1"
echo "API Base URL: $EXPO_PUBLIC_API_BASE_URL"
echo "Updated tunnel URL files: $TUNNEL_URL_FILE and ${FRONTEND_DIR}/.tunnel-url"
echo ""

# Option 1: Start frontend container in Docker
# Uncomment the lines below if you want the frontend to run in Docker
# echo "Starting frontend container..."
# docker-compose up -d frontend
# echo "Frontend container started. View logs with: docker-compose logs -f frontend"

# Option 2: Start Expo locally (better for development - hot reload, easier debugging)
echo "Starting Expo frontend locally..."
echo "   The app will use the cloudflared tunnel URL: ${TUNNEL_URL}/api/v1"
echo "   Press Ctrl+C to stop all services."
echo ""
cd "$FRONTEND_DIR"
# Don't use --tunnel flag - we're using cloudflared, not Expo's ngrok
EXPO_PUBLIC_API_BASE_URL="${TUNNEL_URL}/api/v1" npx expo start --lan -c

