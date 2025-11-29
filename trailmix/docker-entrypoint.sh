#!/bin/sh
set -e

echo "Starting Expo frontend container..."

# Wait for tunnel URL to be available (written by tunnel-url-extractor service)
echo "Waiting for tunnel URL..."
MAX_ATTEMPTS=60
ATTEMPT=0
TUNNEL_URL=""

# Try to read from the .tunnel-url file first (written by tunnel-url-extractor)
# Check multiple possible locations
TUNNEL_URL_FILES="/app/../../.tunnel-url /app/.tunnel-url /.tunnel-url"

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    # Try reading from file first (preferred method - written by extractor service)
    for TUNNEL_FILE in $TUNNEL_URL_FILES; do
        if [ -f "$TUNNEL_FILE" ]; then
            TUNNEL_URL=$(cat "$TUNNEL_FILE" 2>/dev/null | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | head -1 || true)
            if [ -n "$TUNNEL_URL" ]; then
                echo "Found tunnel URL from file: $TUNNEL_FILE"
                break
            fi
        fi
    done
    
    # If not found in file, try extracting from cloudflared logs as fallback
    if [ -z "$TUNNEL_URL" ]; then
        TUNNEL_URL=$(timeout 5 docker logs trailmix-cloudflared 2>&1 | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | head -1 || true)
        if [ -n "$TUNNEL_URL" ]; then
            echo "Found tunnel URL from cloudflared logs: $TUNNEL_URL"
            # Write to file for app.config.js
            echo "$TUNNEL_URL" > /app/.tunnel-url 2>/dev/null || true
        fi
    fi
    
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
    
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
    if [ $((ATTEMPT % 5)) -eq 0 ]; then
        echo "Still waiting for tunnel URL... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    fi
done

if [ -z "$TUNNEL_URL" ]; then
    echo "Warning: Could not find tunnel URL"
    echo "   Using fallback: EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL:-http://localhost:8000/api/v1}"
    TUNNEL_URL=""
else
    # Set the API base URL to use the tunnel
    export EXPO_PUBLIC_API_BASE_URL="${TUNNEL_URL}/api/v1"
    echo "API Base URL: $EXPO_PUBLIC_API_BASE_URL"
    
    # Ensure the file exists in /app/.tunnel-url for app.config.js
    echo "$TUNNEL_URL" > /app/.tunnel-url
    echo "Tunnel URL written to /app/.tunnel-url"
    
    echo ""
    echo "=========================================="
    echo "API Configuration:"
    echo "  Cloudflared Tunnel: $TUNNEL_URL"
    echo "  API Base URL: $EXPO_PUBLIC_API_BASE_URL"
    echo "=========================================="
    echo ""
fi

# Ensure node_modules are installed (in case package.json changed)
# The anonymous volume /app/node_modules might be out of sync, so check and install if needed
if [ ! -d "/app/node_modules" ] || [ ! -f "/app/node_modules/.package-lock.json" ]; then
    echo "Installing dependencies..."
    cd /app
    npm install
    echo "Dependencies installed."
    echo ""
fi

# Start Expo with flags to ensure QR code is visible
echo "=========================================="
echo "Starting Expo..."
echo "=========================================="
echo ""
echo "Expo is starting..."
echo ""
echo "IMPORTANT: QR codes may not display in Docker logs due to Unicode limitations."
echo ""
echo "To connect your device:"
echo "1. View the connection URL in the logs below (look for 'exp://...')"
echo "2. OR open Expo DevTools in your browser: http://localhost:8081"
echo "   (The QR code will be visible there)"
echo "3. OR run: ./get-expo-url.sh (or get-expo-url.bat on Windows)"
echo ""
echo "API will use cloudflared tunnel: ${EXPO_PUBLIC_API_BASE_URL:-http://localhost:8000/api/v1}"
echo ""
echo "=========================================="
echo ""

# Start Expo with --tunnel flag (creates Expo's tunnel for mobile devices)
# Note: QR codes use Unicode block characters that may not render properly in Docker logs
# The connection URL (exp://...) will still be visible in the logs
# Force unbuffered output and ensure colors/Unicode work
export FORCE_COLOR=1
export EXPO_NO_DOTENV=1
# Use stdbuf to ensure unbuffered output (if available)
if command -v stdbuf >/dev/null 2>&1; then
    exec stdbuf -oL -eL npx expo start --tunnel
else
    exec npx expo start --tunnel
fi
