from fastapi import APIRouter
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Create router for static files
static_router = APIRouter()


# Mount static files
def mount_static_files(app):
    """Mount static file serving for uploads"""
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
