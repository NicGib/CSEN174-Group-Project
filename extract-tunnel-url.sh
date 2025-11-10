#!/usr/bin/env bash

# Helper script to extract cloudflared tunnel URL from Docker logs
# Useful when running docker-compose up directly

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TUNNEL_URL_FILE="${SCRIPT_DIR}/.tunnel-url"

echo "Extracting tunnel URL from cloudflared container..."

# Wait a bit for tunnel to be ready
sleep 3

# Extract URL from docker logs
TUNNEL_URL=$(docker logs trailmix-cloudflared 2>&1 | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | head -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Failed to get tunnel URL. Make sure cloudflared container is running:"
    echo "   docker-compose up -d cloudflared"
    exit 1
fi

echo "✅ Tunnel URL: $TUNNEL_URL"
echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
echo "📝 Written to: $TUNNEL_URL_FILE"
echo ""
echo "API Base URL: ${TUNNEL_URL}/api/v1"
echo ""
echo "You can now start Expo with:"
echo "  cd trailmix"
echo "  EXPO_PUBLIC_API_BASE_URL=${TUNNEL_URL}/api/v1 npx expo start"

