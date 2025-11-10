#!/usr/bin/env bash

# Helper script to extract Expo connection URL from frontend container logs

echo "Extracting Expo connection URL from frontend logs..."
echo ""

# Wait a moment for Expo to start
sleep 5

# Extract exp:// URL from logs
EXPO_URL=$(docker logs trailmix-frontend 2>&1 | grep -oE "exp://[a-zA-Z0-9.-]+:[0-9]+" | head -1)

if [ -z "$EXPO_URL" ]; then
    echo "Expo connection URL not found yet. Make sure the frontend container is running:"
    echo "  docker-compose up -d frontend"
    echo ""
    echo "Waiting for Expo to start... (this may take 30-60 seconds)"
    echo "Run this script again in a moment, or check logs with:"
    echo "  docker-compose logs -f frontend"
    exit 1
fi

echo "=========================================="
echo ">>> EXPO CONNECTION URL <<<"
echo "=========================================="
echo ""
echo "Connection URL: $EXPO_URL"
echo ""
echo "To connect:"
echo "1. Open Expo Go app on your phone"
echo "2. Scan the QR code in the logs (run: docker-compose logs frontend)"
echo "   OR enter this URL manually in Expo Go: $EXPO_URL"
echo ""
echo "To view the QR code in logs:"
echo "  docker-compose logs frontend | grep -A 20 'QR'"
echo ""
echo "Or view all frontend logs:"
echo "  docker-compose logs -f frontend"
echo "=========================================="

