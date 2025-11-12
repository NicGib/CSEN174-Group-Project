import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import Message
from .api.v1 import events as events_router
from .api.v1 import accounts as accounts_router
from .api.v1 import maps as maps_router
from .api.v1 import matching as matching_router
from .api.v1 import messaging as messaging_router
from .messaging.database import init_db

app = FastAPI(
    title="TrailMix API",
    version="1.0.0",
    description="API documentation for TrailMix - a hiking event management system",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


class CacheRequestBodyMiddleware(BaseHTTPMiddleware):
    """
    Middleware to cache request body so it can be read multiple times.
    This fixes the "body is unusable: Body has already been read" error.
    """
    async def dispatch(self, request: Request, call_next):
        # Cache the body for requests that have a body
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            body = await request.body()
            
            async def receive() -> Message:
                return {"type": "http.request", "body": body}
            
            request._receive = receive
        
        response = await call_next(request)
        return response


# Add body caching middleware first (before CORS)
app.add_middleware(CacheRequestBodyMiddleware)

# CORS (tune for your frontend origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

app.include_router(events_router.router, prefix="/api/v1")
app.include_router(accounts_router.router, prefix="/api/v1")
app.include_router(maps_router.router, prefix="/api/v1")
app.include_router(matching_router.router, prefix="/api/v1")
app.include_router(messaging_router.router, prefix="/api/v1")
