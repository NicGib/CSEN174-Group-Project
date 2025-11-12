# Configuration Files

This directory contains configuration files that allow components to auto-configure themselves when starting up.

## Files

### `api-url.txt`
Automatically created by the frontend when it detects a tunnel URL or API base URL. This allows the frontend to remember the API URL for future startups.

**Location:** `secrets/api-url.txt`

**Usage:**
- Automatically written when tunnel URL is detected
- Automatically written when `EXPO_PUBLIC_API_BASE_URL` is set
- Automatically read on frontend startup if no tunnel URL or env var is found

## How It Works

### Backend
When the backend starts:
1. It reads `DATABASE_URL` and `REDIS_URL` from `secrets/.env` file (same as other backend modules)
2. Docker-compose also loads `secrets/.env` via `env_file`, so variables are available in containers
3. Falls back to sensible defaults if environment variables are not set
4. **All configuration comes from `secrets/.env`** - no hardcoded values in docker-compose.yml

### Required Environment Variables in `secrets/.env`
Add these to your `secrets/.env` file:
```bash
# Database connection (for Docker Compose, use service names)
DATABASE_URL=postgresql://trailmix:trailmix_password@postgres:5432/trailmix_db

# Redis connection (for Docker Compose, use service name)
REDIS_URL=redis://redis:6379/0

# For local development (without Docker), use:
# DATABASE_URL=postgresql://trailmix:trailmix_password@localhost:5432/trailmix_db
# REDIS_URL=redis://localhost:6379/0
```

### Frontend
When the frontend starts:
1. Checks for tunnel URL file (`.tunnel-url`)
2. Checks for `EXPO_PUBLIC_API_BASE_URL` environment variable
3. Checks for persisted `secrets/api-url.txt` file
4. Falls back to default localhost URL
5. Automatically saves the detected URL to `secrets/api-url.txt` for future use

## Customization

To customize your setup:
1. Edit `secrets/.env` with your database/Redis credentials (see Required Environment Variables above)
2. The frontend will automatically persist API URLs when detected
3. You can manually create `secrets/api-url.txt` with your API URL if needed

