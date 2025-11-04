import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1 import events as events_router
from api.v1 import accounts as accounts_router
from api.v1 import maps as maps_router

app = FastAPI(
    title="TrailMix API",
    version="1.0.0",
    description="API documentation for TrailMix - a hiking event management system",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS (tune for your frontend origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events_router.router, prefix="/api/v1")
app.include_router(accounts_router.router, prefix="/api/v1")
app.include_router(maps_router.router, prefix="/api/v1")
