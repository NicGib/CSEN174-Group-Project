"""
Configuration loader for backend services.
Reads from secrets/.env file (same as other backend modules).
Uses environment variables with sensible defaults.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from secrets/.env
# Try multiple paths to handle different execution contexts
_env_paths = [
    Path(__file__).parent.parent / "secrets" / ".env",  # From backend/ directory
    Path("/app/secrets/.env"),  # Docker container path
    Path(os.getcwd()) / "secrets" / ".env",  # Current working directory
]

_env_loaded = False

def _ensure_env_loaded():
    """Load .env file if not already loaded."""
    global _env_loaded
    if _env_loaded:
        return
    
    for env_path in _env_paths:
        if env_path.exists():
            load_dotenv(env_path, override=False)
            _env_loaded = True
            break
    
    _env_loaded = True  # Mark as loaded even if file not found (to avoid repeated checks)


def get_database_url() -> str:
    """
    Get database connection URL.
    Priority: DATABASE_URL env var (from secrets/.env or docker-compose) > default
    """
    _ensure_env_loaded()
    
    # Check environment variable (loaded from secrets/.env or set by docker-compose)
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url
    
    # Fallback default (for local development without docker-compose or .env)
    return "postgresql://trailmix:trailmix_password@localhost:5432/trailmix_db"


def get_redis_url() -> str:
    """
    Get Redis connection URL.
    Priority: REDIS_URL env var (from secrets/.env or docker-compose) > default
    """
    _ensure_env_loaded()
    
    # Check environment variable (loaded from secrets/.env or set by docker-compose)
    env_url = os.getenv("REDIS_URL")
    if env_url:
        return env_url
    
    # Fallback default (for local development without docker-compose or .env)
    return "redis://localhost:6379/0"


def get_api_base_url() -> str:
    """
    Get API base URL (for reference, mainly used by frontend).
    Priority: API_BASE_URL env var > default
    """
    env_url = os.getenv("API_BASE_URL")
    if env_url:
        return env_url
    
    return "http://localhost:8000/api/v1"

