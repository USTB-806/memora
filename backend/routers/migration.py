from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from entity.response import Response
from loguru import logger
from datetime import datetime, timezone

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
                    "emoji": category.emoji,
                    "knowledge_base_id": category.knowledge_base_id,
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
                    "tags": collection.tags,
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
                    "filename": attachment.description or "",  # Use description as filename
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


@router.post("/import", response_model=Response)
async def import_data(
    import_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Import data for migration purposes.
    Uses upsert logic to avoid duplicates.
    """
    try:
        logger.info(f"Importing data for user {current_user.id}")

        # Import users (only current user)
        if "users" in import_data:
            for user_data in import_data["users"]:
                if user_data["id"] == current_user.id:
                    # Update current user if needed
                    await db.execute(
                        update(User).where(User.id == user_data["id"]).values(
                            username=user_data["username"],
                            email=user_data["email"],
                            updated_at=datetime.now(timezone.utc)
                        )
                    )

        # Import categories
        if "categories" in import_data:
            for category_data in import_data["categories"]:
                stmt = sqlite_insert(Category).values(
                    id=category_data["id"],
                    user_id=category_data["user_id"],
                    name=category_data["name"],
                    emoji=category_data.get("emoji"),
                    knowledge_base_id=category_data.get("knowledge_base_id")
                ).on_conflict_do_update(
                    index_elements=['id'],
                    set_={
                        'name': category_data["name"],
                        'emoji': category_data.get("emoji"),
                        'knowledge_base_id': category_data.get("knowledge_base_id")
                    }
                )
                await db.execute(stmt)

        # Import collections
        if "collections" in import_data:
            for collection_data in import_data["collections"]:
                stmt = sqlite_insert(Collection).values(
                    id=collection_data["id"],
                    user_id=collection_data["user_id"],
                    category_id=collection_data.get("category_id"),
                    tags=collection_data.get("tags"),
                    created_at=collection_data.get("created_at"),
                    updated_at=collection_data.get("updated_at")
                ).on_conflict_do_update(
                    index_elements=['id'],
                    set_={
                        'category_id': collection_data.get("category_id"),
                        'tags': collection_data.get("tags"),
                        'updated_at': datetime.now(timezone.utc)
                    }
                )
                await db.execute(stmt)

        # Import collection details
        if "collection_details" in import_data:
            for detail_data in import_data["collection_details"]:
                stmt = sqlite_insert(CollectionDetail).values(
                    id=detail_data["id"],
                    collection_id=detail_data["collection_id"],
                    key=detail_data["key"],
                    value=detail_data["value"],
                    created_at=detail_data.get("created_at"),
                    updated_at=detail_data.get("updated_at")
                ).on_conflict_do_update(
                    index_elements=['id'],
                    set_={
                        'value': detail_data["value"],
                        'updated_at': datetime.now(timezone.utc)
                    }
                )
                await db.execute(stmt)

        # Import attachments
        if "attachments" in import_data:
            for attachment_data in import_data["attachments"]:
                stmt = sqlite_insert(Attachment).values(
                    id=attachment_data["id"],
                    user_id=attachment_data["user_id"],
                    url=attachment_data["file_path"],  # Use file_path as url
                    description=attachment_data.get("filename", ""),
                    created_at=attachment_data.get("created_at")
                ).on_conflict_do_update(
                    index_elements=['id'],
                    set_={
                        'url': attachment_data["file_path"],
                        'description': attachment_data.get("filename", "")
                    }
                )
                await db.execute(stmt)

        # Import posts
        if "posts" in import_data:
            for post_data in import_data["posts"]:
                stmt = sqlite_insert(Post).values(
                    id=post_data["id"],
                    user_id=post_data["user_id"],
                    refer_collection_id=post_data["collection_id"],
                    description=post_data.get("content", ""),
                    created_at=post_data.get("created_at"),
                    updated_at=post_data.get("updated_at")
                ).on_conflict_do_update(
                    index_elements=['id'],
                    set_={
                        'description': post_data.get("content", ""),
                        'updated_at': datetime.now(timezone.utc)
                    }
                )
                await db.execute(stmt)

        # Import comments
        if "comments" in import_data:
            for comment_data in import_data["comments"]:
                stmt = sqlite_insert(Comment).values(
                    id=comment_data["id"],
                    post_id=comment_data["post_id"],
                    user_id=comment_data["user_id"],
                    content=comment_data["content"],
                    created_at=comment_data.get("created_at"),
                    updated_at=comment_data.get("updated_at")
                ).on_conflict_do_update(
                    index_elements=['id'],
                    set_={
                        'content': comment_data["content"],
                        'updated_at': datetime.now(timezone.utc)
                    }
                )
                await db.execute(stmt)

        # Import likes
        if "likes" in import_data:
            for like_data in import_data["likes"]:
                stmt = sqlite_insert(Like).values(
                    id=like_data["id"],
                    user_id=like_data["user_id"],
                    asset_id=like_data["asset_id"],
                    asset_type=like_data["asset_type"],
                    created_at=like_data.get("created_at")
                ).on_conflict_do_nothing()  # Likes are unique, don't update
                await db.execute(stmt)

        await db.commit()
        logger.info(f"Successfully imported data for user {current_user.id}")
        return Response(data={"message": "Data imported successfully"})

    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to import data for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import data: {str(e)}"
        )