"""ResQMap AI — FastAPI Backend Entry Point."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import get_settings
from .database import init_db
from .routers import auth, incidents, reports, resources, routes

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print(f"\n🚨 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    print(f"   Database: {settings.DATABASE_URL}")
    print(f"   Uploads:  {settings.UPLOAD_DIR}/\n")
    yield
    print(f"\n🛑 {settings.APP_NAME} shutting down.\n")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Disaster Management & Emergency Response API",
    lifespan=lifespan,
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
if os.path.isdir(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(reports.router)
app.include_router(resources.router)
app.include_router(routes.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "healthy"}
