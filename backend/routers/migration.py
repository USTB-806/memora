from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from entity.response import Response
from loguru import logger

from model import (
    User,
    Collection,
    Category,
    CollectionDetail,
    Post,
    Comment,
    Attachment,
    Like
)
from db import get_db
from routers.auth import get_current_user

# Create router instance
router = APIRouter(
    prefix="/migration",
    tags=["migration"],
    responses={404: {"description": "Not found"}},
)


@router.get("/export", response_model=Response)
async def export_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export current user's data for migration purposes.
    Returns data in a format suitable for importing into another system.
    """
    try:
        logger.info(f"Exporting data for user {current_user.id}")

        # Export current user only
        users = [current_user]

        # Export categories for current user
        categories_query = select(Category).where(Category.user_id == current_user.id)
        categories_result = await db.execute(categories_query)
        categories = categories_result.scalars().all()

        # Export collections for current user
        collections_query = select(Collection).where(Collection.user_id == current_user.id)
        collections_result = await db.execute(collections_query)
        collections = collections_result.scalars().all()

        # Export collection details for current user's collections
        collection_ids = [c.id for c in collections]
        if collection_ids:
            collection_details_query = select(CollectionDetail).where(
                CollectionDetail.collection_id.in_(collection_ids)
            )
            collection_details_result = await db.execute(collection_details_query)
            collection_details = collection_details_result.scalars().all()
        else:
            collection_details = []

        # Export posts for current user
        posts_query = select(Post).where(Post.user_id == current_user.id)
        posts_result = await db.execute(posts_query)
        posts = posts_result.scalars().all()

        # Export comments for current user's posts
        post_ids = [p.id for p in posts]
        if post_ids:
            comments_query = select(Comment).where(
                Comment.post_id.in_(post_ids)
            )
            comments_result = await db.execute(comments_query)
            comments = comments_result.scalars().all()
        else:
            comments = []

        # Export attachments for current user
        attachments_query = select(Attachment).where(Attachment.user_id == current_user.id)
        attachments_result = await db.execute(attachments_query)
        attachments = attachments_result.scalars().all()

        # Export likes for current user
        likes_query = select(Like).where(Like.user_id == current_user.id)
        likes_result = await db.execute(likes_query)
        likes = likes_result.scalars().all()

        # Convert to dictionaries for JSON serialization
        export_data = {
            "users": [
                {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "full_name": user.username,  # Use username as full_name since it's not in the model
                    "bio": "",  # Add empty bio since it's not in the model
                    "avatar_url": "",  # Add empty avatar_url since it's not directly accessible
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "updated_at": user.updated_at.isoformat() if user.updated_at else None,
                }
                for user in users
            ],
            "categories": [
                {
                    "id": category.id,
                    "name": category.name,
                    "description": "",  # Category model doesn't have description
                    "user_id": category.user_id,
                    "created_at": None,  # Category model doesn't have timestamps
                    "updated_at": None,
                }
                for category in categories
            ],
            "collections": [
                {
                    "id": collection.id,
                    "name": f"Collection {collection.id}",  # Collection model doesn't have name, use generic name
                    "description": "",  # Collection model doesn't have description
                    "category_id": collection.category_id,
                    "user_id": collection.user_id,
                    "is_public": False,  # Collection model doesn't have is_public, default to False
                    "created_at": collection.created_at.isoformat() if collection.created_at else None,
                    "updated_at": collection.updated_at.isoformat() if collection.updated_at else None,
                }
                for collection in collections
            ],
            "collection_details": [
                {
                    "id": detail.id,
                    "collection_id": detail.collection_id,
                    "key": detail.key,
                    "value": detail.value,
                    "created_at": detail.created_at.isoformat() if detail.created_at else None,
                    "updated_at": detail.updated_at.isoformat() if detail.updated_at else None,
                }
                for detail in collection_details
            ],
            "posts": [
                {
                    "id": post.id,
                    "post_id": post.post_id,
                    "title": "",  # Post model doesn't have title, use empty string
                    "content": post.description or "",  # Use description as content
                    "summary": "",  # Post model doesn't have summary
                    "user_id": post.user_id,
                    "collection_id": post.refer_collection_id,  # Use refer_collection_id
                    "is_private": False,  # Post model doesn't have is_private, default to False
                    "created_at": post.created_at.isoformat() if post.created_at else None,
                    "updated_at": post.updated_at.isoformat() if post.updated_at else None,
                }
                for post in posts
            ],
            "comments": [
                {
                    "id": comment.id,
                    "content": comment.content,
                    "user_id": comment.user_id,
                    "post_id": comment.post_id,
                    "created_at": comment.created_at.isoformat() if comment.created_at else None,
                    "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
                }
                for comment in comments
            ],
            "attachments": [
                {
                    "id": attachment.id,
                    "filename": attachment.attachment_id,  # Use attachment_id as filename
                    "file_path": attachment.url,  # Use url as file_path
                    "file_size": 0,  # Attachment model doesn't have file_size, use 0
                    "mime_type": "",  # Attachment model doesn't have mime_type, use empty string
                    "user_id": attachment.user_id,
                    "created_at": attachment.created_at.isoformat() if attachment.created_at else None,
                    "updated_at": attachment.created_at.isoformat() if attachment.created_at else None,  # No updated_at, use created_at
                }
                for attachment in attachments
            ],
            "likes": [
                {
                    "id": like.id,
                    "user_id": like.user_id,
                    "asset_id": like.asset_id,
                    "asset_type": like.asset_type,
                    "created_at": like.created_at.isoformat() if like.created_at else None,
                }
                for like in likes
            ],
            # Note: Knowledge base documents are not stored in the main database
            # They are handled separately by the ChromaDB vector store
            "knowledge_documents": []
        }

        logger.info(f"Successfully exported data for user {current_user.id}")
        return Response(data=export_data)

    except Exception as e:
        logger.error(f"Failed to export data for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export data: {str(e)}"
        )