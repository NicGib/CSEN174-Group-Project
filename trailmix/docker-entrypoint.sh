#!/bin/sh
set -e

echo "Starting Expo frontend container..."

# Wait for cloudflared to be ready and extract tunnel URL
echo "Waiting for cloudflared tunnel URL..."
MAX_ATTEMPTS=60
ATTEMPT=0
TUNNEL_URL=""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    # Extract URL from cloudflared container logs
    # Use docker logs with timeout to avoid hanging
    TUNNEL_URL=$(timeout 5 docker logs trailmix-cloudflared 2>&1 | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | head -1 || true)
    
    if [ -n "$TUNNEL_URL" ]; then
        echo "Found tunnel URL: $TUNNEL_URL"
        break
    fi
    
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
    if [ $((ATTEMPT % 5)) -eq 0 ]; then
        echo "Still waiting for tunnel URL... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    fi
done

if [ -z "$TUNNEL_URL" ]; then
    echo "Warning: Could not extract tunnel URL from cloudflared logs"
    echo "   Using fallback: EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL:-http://localhost:8000/api/v1}"
    TUNNEL_URL=""
else
    # Set the API base URL to use the tunnel
    export EXPO_PUBLIC_API_BASE_URL="${TUNNEL_URL}/api/v1"
    echo "API Base URL: $EXPO_PUBLIC_API_BASE_URL"
fi

# Write tunnel URL to file for app.config.js to read (multiple locations)
if [ -n "$TUNNEL_URL" ]; then
    echo "$TUNNEL_URL" > /app/.tunnel-url
    echo "$TUNNEL_URL" > /app/../../.tunnel-url 2>/dev/null || true
    echo "Tunnel URL written to /app/.tunnel-url"
    
    # Set environment variable (though app.config.js will read from file)
    export EXPO_PUBLIC_API_BASE_URL="${TUNNEL_URL}/api/v1"
    echo ""
    echo "=========================================="
    echo "API Configuration:"
    echo "  Cloudflared Tunnel: $TUNNEL_URL"
    echo "  API Base URL: $EXPO_PUBLIC_API_BASE_URL"
    echo "=========================================="
    echo ""
fi

# Start Expo with flags to ensure QR code is visible
echo "=========================================="
echo "Starting Expo..."
echo "=========================================="
echo ""
echo "Expo is starting..."
echo ""
echo "The QR code and connection URL will appear in the logs below."
echo ""
echo "If the QR code doesn't render, you can:"
echo "1. View logs: docker-compose logs -f frontend"
echo "2. Extract URL: ./get-expo-url.sh (or get-expo-url.bat on Windows)"
echo "3. Open Expo DevTools: http://localhost:8081"
echo ""
echo "=========================================="
echo ""

# Start Expo with --tunnel flag (creates Expo's tunnel for mobile devices)
# The QR code uses special characters that may not render in all terminals
# But the connection URL will be visible in the logs
echo "Starting Expo with tunnel mode..."
echo "API will use cloudflared tunnel: ${EXPO_PUBLIC_API_BASE_URL:-http://localhost:8000/api/v1}"
echo ""
exec npx expo start --tunnel
