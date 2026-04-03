"""
FastAPI application entry point for VAULT MVP backend.
"""
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.routers import upload, pipeline, registry, compliance, chat, translate, logs
from backend.minio_client import ensure_bucket_exists

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# LangSmith tracing environment
os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
os.environ.setdefault("LANGCHAIN_PROJECT", "vault-mvp")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info("VAULT backend starting up...")

    # Ensure MinIO bucket exists
    try:
        ensure_bucket_exists()
        logger.info("MinIO bucket verified")
    except Exception as e:
        logger.warning(f"MinIO bucket check failed (will retry): {e}")

    yield

    logger.info("VAULT backend shutting down...")


app = FastAPI(
    title="VAULT MVP — COBOL Modernization Platform",
    description=(
        "Value-Aware Unified Legacy Transformation (VAULT) — "
        "AI-powered COBOL analysis, regulatory compliance mapping, and dependency graph."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(upload.router)
app.include_router(pipeline.router)
app.include_router(registry.router)
app.include_router(compliance.router)
app.include_router(chat.router)
app.include_router(translate.router)
app.include_router(logs.router)


@app.get("/", tags=["health"])
async def root():
    return {
        "service": "VAULT MVP Backend",
        "version": "1.0.0",
        "status": "healthy",
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
