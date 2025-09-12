from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
import uuid
import shutil
from pathlib import Path

from model import User, Attachment
from db import get_db
from routers.auth import get_current_user
from entity.response import Response

# Create router instance
router = APIRouter(
    prefix="/attachments",
    tags=["attachments"],
    responses={404: {"description": "Not found"}},
)

# Configuration for file uploads
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}


# Pydantic models
class AttachmentCreate(BaseModel):
    user_id: int
    description: Optional[str] = None


class AttachmentResponse(BaseModel):
    attachment_id: str
    user_id: int
    url: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Helper function to validate file
def validate_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file selected")

    # Check file extension
    file_ext = Path(str(file.filename)).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
        )


# Helper function to save file
def save_file(file: UploadFile) -> str:
    """Save uploaded file and return URL"""
    # Generate unique filename
    file_ext = Path(str(file.filename)).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return str(file_path)


# Upload attachment endpoint
@router.post(
    "/upload/", response_model=Response[AttachmentResponse], status_code=status.HTTP_201_CREATED
)
async def upload_attachment(
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a file attachment for a collection
    """
    # Validate file
    validate_file(file)

    try:
        # Save file
        file_url = save_file(file)

        # Create attachment record
        db_attachment = Attachment(user_id=current_user.id, url=file_url, description=description)

        db.add(db_attachment)
        await db.commit()
        await db.refresh(db_attachment)

        return Response(data=db_attachment)

    except Exception as e:
        # Clean up file if database operation fails
        if "file_url" in locals():
            file_path = UPLOAD_DIR / Path(file_url).name
            if file_path.exists():
                file_path.unlink()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}",
        )


# Get attachment by ID
@router.get("/{attachment_id}", response_model=Response[AttachmentResponse])
async def get_attachment(
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific attachment by ID (only if owned by current user)
    """
    attachment_query = select(Attachment).where(
        Attachment.attachment_id == attachment_id, Attachment.user_id == current_user.id
    )
    attachment_result = await db.execute(attachment_query)
    attachment = attachment_result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attachment with id {attachment_id} not found or access denied",
        )
    return Response(data=attachment)


@router.get("/file/{attachment_id}")
async def get_attachment_file(attachment_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get the file of a specific attachment by ID
    """
    attachment_query = select(Attachment).where(Attachment.attachment_id == attachment_id)
    attachment_result = await db.execute(attachment_query)
    attachment = attachment_result.scalar_one_or_none()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attachment with id {attachment_id} not found",
        )

    file_path = UPLOAD_DIR / Path(attachment.url).name  # type: ignore
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return FileResponse(file_path, media_type="application/octet-stream", filename=file_path.name)


# Delete attachment
@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete an attachment by ID (only if owned by current user)
    """
    attachment_query = select(Attachment).where(
        Attachment.attachment_id == attachment_id, Attachment.user_id == current_user.id
    )
    attachment_result = await db.execute(attachment_query)
    attachment = attachment_result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attachment with id {attachment_id} not found or access denied",
        )

    # Delete file from filesystem
    try:
        file_path = UPLOAD_DIR / Path(str(attachment.url)).name
        if file_path.exists():
            file_path.unlink()
    except Exception:
        pass  # Continue even if file deletion fails

    # Delete database record
    await db.delete(attachment)
    await db.commit()

    return None
