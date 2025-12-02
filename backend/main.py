import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import Message
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from .api.v1 import events as events_router
from .api.v1 import accounts as accounts_router
from .api.v1 import maps as maps_router
from .api.v1 import matching as matching_router
from .api.v1 import messaging as messaging_router
from .api.v1 import uploads as uploads_router
from .messaging.database import init_db
from .events.schedule import cleanup_expired_events

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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


class RouteTracingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to trace all incoming requests and log routing information.
    """
    async def dispatch(self, request: Request, call_next):
        # Log incoming request
        logger.info(f"🔵 INCOMING REQUEST: {request.method} {request.url.path}")
        logger.info(f"   Full URL: {request.url}")
        logger.info(f"   Query params: {dict(request.query_params)}")
        logger.info(f"   Path segments: {request.url.path.split('/')}")
        
        # Check which routes match this path
        matching_routes = []
        for route in request.app.routes:
            if hasattr(route, 'methods') and hasattr(route, 'path'):
                # Simple path matching check
                route_path = route.path
                request_path = request.url.path
                
                # Check if path pattern matches
                if route_path == request_path or self._path_matches(route_path, request_path):
                    matching_routes.append({
                        'path': route_path,
                        'methods': sorted(route.methods),
                        'has_delete': 'DELETE' in route.methods,
                        'supports_request_method': request.method in route.methods
                    })
        
        if matching_routes:
            logger.info(f"   Matching routes: {matching_routes}")
            # Check if any matching route supports the request method
            supports_method = any(r['supports_request_method'] for r in matching_routes)
            if not supports_method:
                logger.error(f"   ❌ NO MATCHING ROUTE SUPPORTS {request.method} METHOD!")
                logger.error(f"   Available methods: {[r['methods'] for r in matching_routes]}")
        else:
            logger.warning(f"   ⚠️ NO MATCHING ROUTES FOUND!")
        
        # Process request
        response = await call_next(request)
        
        # Log response
        logger.info(f"🟢 RESPONSE: {request.method} {request.url.path} -> {response.status_code}")
        if response.status_code == 405:
            logger.error(f"   ❌ 405 METHOD NOT ALLOWED - Check if DELETE method is registered for this path")
        
        return response
    
    def _path_matches(self, pattern: str, path: str) -> bool:
        """Simple check if a path pattern matches a request path"""
        pattern_parts = pattern.split('/')
        path_parts = path.split('/')
        
        if len(pattern_parts) != len(path_parts):
            return False
        
        for p, r in zip(pattern_parts, path_parts):
            if p.startswith('{') and p.endswith('}'):
                continue  # Path parameter matches anything
            if p != r:
                return False
        return True


# Add body caching middleware first (before CORS)
app.add_middleware(CacheRequestBodyMiddleware)
# Add route tracing middleware
app.add_middleware(RouteTracingMiddleware)

# CORS configuration for the frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers BEFORE startup event
logger.info("Registering routers...")
app.include_router(events_router.router, prefix="/api/v1")
logger.info(f"✅ Registered events router with {len(events_router.router.routes)} routes")
app.include_router(accounts_router.router, prefix="/api/v1")
app.include_router(maps_router.router, prefix="/api/v1")
app.include_router(matching_router.router, prefix="/api/v1")
app.include_router(messaging_router.router, prefix="/api/v1")
app.include_router(uploads_router.router, prefix="/api/v1")

# Initialize scheduler for background tasks
scheduler = BackgroundScheduler()

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()
    
    # Log all registered routes
    logger.info("=" * 80)
    logger.info("REGISTERED ROUTES:")
    logger.info("=" * 80)
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            methods = ', '.join(sorted(route.methods))
            route_info = f"  {methods:20} {route.path}"
            logger.info(route_info)
        elif hasattr(route, 'path'):
            route_info = f"  {'*':20} {route.path}"
            logger.info(route_info)
    logger.info("=" * 80)
    
    # Log events router routes specifically
    logger.info("EVENTS ROUTER ROUTES:")
    delete_routes_found = []
    for route in events_router.router.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            methods = ', '.join(sorted(route.methods))
            full_path = f"/api/v1{route.path}"
            route_info = f"  {methods:20} {full_path}"
            logger.info(route_info)
            if 'DELETE' in route.methods and route.path == "/{event_id}":
                delete_routes_found.append(full_path)
                success_msg = f"    FOUND DELETE /{{event_id}} ROUTE!"
                logger.info(success_msg)
    logger.info("=" * 80)
    
    if not delete_routes_found:
        error_msg = "WARNING: DELETE /{event_id} route NOT FOUND in events router!"
        logger.error(error_msg)
    else:
        success_msg = f"Found {len(delete_routes_found)} DELETE /{{event_id}} route(s)"
        logger.info(success_msg)
    
    # Start the scheduler for automatic event cleanup
    # Run cleanup every 10 minutes
    scheduler.add_job(
        cleanup_expired_events,
        trigger=IntervalTrigger(minutes=10),
        id='cleanup_expired_events',
        name='Clean up events that started more than 1 hour ago',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Event cleanup scheduler started (runs every 10 minutes)")

@app.on_event("shutdown")
async def shutdown_event():
    # Shutdown scheduler on app shutdown
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Event cleanup scheduler stopped")
