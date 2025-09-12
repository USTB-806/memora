from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, select, and_, func
from entity.response import Response
from pydantic import BaseModel
from typing import Optional
from datetime import timezone

from model import (
    User,
    Collection,
    Category,
    CollectionDetail,
    Post,
    Comment,
    Like,
    AssetType,
)
from db import get_db
from routers.auth import get_current_user

# Create router instance
router = APIRouter(
    prefix="/community",
    tags=["community"],
    responses={404: {"description": "Not found"}},
)


# Request/Response Models
class CreatePostRequest(BaseModel):
    refer_collection_id: int
    description: Optional[str] = None


class CreateCommentRequest(BaseModel):
    content: str


class LikeRequest(BaseModel):
    asset_id: int
    asset_type: str  # 'post' or 'comment'


class UserInfo(BaseModel):
    id: int
    username: str
    avatar_attachment_id: Optional[str] = None


class CommentResponse(BaseModel):
    id: int
    content: str
    user_id: int
    username: str
    avatar_attachment_id: Optional[str] = None
    likes_count: int
    is_liked_by_me: bool
    created_at: str
    updated_at: str
    user: Optional[UserInfo] = None


class PostResponse(BaseModel):
    id: int
    post_id: str  # UUID
    description: Optional[str]
    user_id: int
    username: str
    avatar_attachment_id: Optional[str] = None
    refer_collection_id: int
    collection_details: dict
    category_id: Optional[int]
    category_name: Optional[str]
    tags: Optional[str]
    likes_count: int
    comments_count: int
    is_liked_by_me: bool
    created_at: str
    updated_at: str
    user: Optional[UserInfo] = None


@router.post("/posts", response_model=Response)
async def create_post(
    request: CreatePostRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    创建推文（发布收藏到社区）
    支持同一收藏多次分享
    """
    # 检查收藏是否属于当前用户
    collection_query = select(Collection).where(
        Collection.id == request.refer_collection_id, Collection.user_id == current_user.id
    )
    collection_result = await db.execute(collection_query)
    collection = collection_result.scalar_one_or_none()

    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="收藏不存在或您无权访问")

    # 创建推文（允许同一收藏多次分享）
    new_post = Post(
        user_id=current_user.id,
        refer_collection_id=request.refer_collection_id,
        description=request.description,
    )
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)

    return Response(
        code=200,
        message="推文发布成功",
        data={
            "post_id": new_post.post_id,
            "refer_collection_id": new_post.refer_collection_id,
            "description": new_post.description,
        },
    )


@router.delete("/posts/{post_id}", response_model=Response)
async def delete_post(
    post_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),  # 使用UUID字符串
):
    """
    删除推文（只能删除自己的推文）
    """
    post_query = select(Post).where(Post.post_id == post_id, Post.user_id == current_user.id)
    post_result = await db.execute(post_query)
    post = post_result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="推文不存在或您无权删除")

    await db.delete(post)
    await db.commit()

    return Response(code=200, message="推文删除成功", data={"post_id": post_id})


@router.get("/posts", response_model=Response)
async def get_posts(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    获取社区推文列表
    """
    offset = (page - 1) * limit

    # 获取推文列表，包含用户信息、收藏信息、分类信息、点赞数、评论数
    posts_query = (
        select(
            Post,
            User,
            Collection,
            Category.name.label("category_name"),
            func.count(Like.id.distinct()).label("likes_count"),
            func.count(Comment.id.distinct()).label("comments_count"),
        )
        .join(User, Post.user_id == User.id)
        .join(Collection, Post.refer_collection_id == Collection.id)
        .outerjoin(Category, Collection.category_id == Category.id)
        .outerjoin(Like, and_(Like.asset_id == Post.id, Like.asset_type == AssetType.post))
        .outerjoin(Comment, Comment.post_id == Post.id)
        .group_by(
            Post.id, User.id, User.username, User.avatar_attachment_id, Collection.id, Category.name
        )
        .order_by(desc(Post.created_at))
        .offset(offset)
        .limit(limit)
    )

    posts_result = await db.execute(posts_query)
    posts_data = posts_result.all()

    posts = []
    for row in posts_data:
        post = row[0]
        user = row[1]
        collection = row[2]
        category_name = row[3]
        likes_count = row[4]
        comments_count = row[5]

        # 检查当前用户是否已点赞
        like_query = select(Like).where(
            and_(
                Like.asset_id == post.id,
                Like.asset_type == AssetType.post,
                Like.user_id == current_user.id,
            )
        )
        like_result = await db.execute(like_query)
        is_liked_by_me = like_result.scalar_one_or_none() is not None

        # 获取收藏详情
        details_query = select(CollectionDetail).where(
            CollectionDetail.collection_id == collection.id
        )
        details_result = await db.execute(details_query)
        details = details_result.scalars().all()

        posts.append(
            PostResponse(
                id=post.id,
                post_id=post.post_id,
                description=post.description,
                user_id=post.user_id,
                username=user.username,
                avatar_attachment_id=user.avatar_attachment_id,
                refer_collection_id=post.refer_collection_id,
                collection_details={detail.key: detail.value for detail in details},
                category_id=collection.category_id,
                category_name=category_name,
                tags=collection.tags,
                likes_count=likes_count,
                comments_count=comments_count,
                is_liked_by_me=is_liked_by_me,
                created_at=post.created_at.replace(tzinfo=timezone.utc).isoformat(),
                updated_at=post.updated_at.replace(tzinfo=timezone.utc).isoformat(),
                user=UserInfo(
                    id=user.id,
                    username=user.username,
                    avatar_attachment_id=user.avatar_attachment_id,
                ),
            )
        )

    return Response(
        code=200, message="推文列表获取成功", data={"posts": posts, "page": page, "limit": limit}
    )


@router.get("/my-posts", response_model=Response)
async def get_my_posts(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    获取当前用户发送的推文列表
    """
    offset = (page - 1) * limit

    posts_query = (
        select(
            Post,
            User,
            Collection,
            Category.name.label("category_name"),
            func.count(Like.id.distinct()).label("likes_count"),
            func.count(Comment.id.distinct()).label("comments_count"),
        )
        .join(User, Post.user_id == User.id)
        .join(Collection, Post.refer_collection_id == Collection.id)
        .outerjoin(Category, Collection.category_id == Category.id)
        .outerjoin(Like, and_(Like.asset_id == Post.id, Like.asset_type == AssetType.post))
        .outerjoin(Comment, Comment.post_id == Post.id)
        .where(Post.user_id == current_user.id)
        .group_by(
            Post.id, User.id, User.username, User.avatar_attachment_id, Collection.id, Category.name
        )
        .order_by(desc(Post.created_at))
        .offset(offset)
        .limit(limit)
    )

    posts_result = await db.execute(posts_query)
    posts_data = posts_result.all()

    posts = []
    for row in posts_data:
        post = row[0]
        user = row[1]
        collection = row[2]
        category_name = row[3]
        likes_count = row[4]
        comments_count = row[5]

        # 检查当前用户是否已点赞
        like_query = select(Like).where(
            and_(
                Like.asset_id == post.id,
                Like.asset_type == AssetType.post,
                Like.user_id == current_user.id,
            )
        )
        like_result = await db.execute(like_query)
        is_liked_by_me = like_result.scalar_one_or_none() is not None

        # 获取收藏详情
        details_query = select(CollectionDetail).where(
            CollectionDetail.collection_id == collection.id
        )
        details_result = await db.execute(details_query)
        details = details_result.scalars().all()

        posts.append(
            PostResponse(
                id=post.id,
                post_id=post.post_id,
                description=post.description,
                user_id=post.user_id,
                username=user.username,
                avatar_attachment_id=user.avatar_attachment_id,
                refer_collection_id=post.refer_collection_id,
                collection_details={detail.key: detail.value for detail in details},
                category_id=collection.category_id,
                category_name=category_name,
                tags=collection.tags,
                likes_count=likes_count,
                comments_count=comments_count,
                is_liked_by_me=is_liked_by_me,
                created_at=post.created_at.replace(tzinfo=timezone.utc).isoformat(),
                updated_at=post.updated_at.replace(tzinfo=timezone.utc).isoformat(),
                user=UserInfo(
                    id=user.id,
                    username=user.username,
                    avatar_attachment_id=user.avatar_attachment_id,
                ),
            )
        )

    return Response(
        code=200,
        message="当前用户推文列表获取成功",
        data={"posts": posts, "page": page, "limit": limit},
    )


@router.post("/like", response_model=Response)
async def like_asset(
    request: LikeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    点赞推文或评论
    """
    # 验证 asset_type
    if request.asset_type not in ["post", "comment"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="资产类型必须是 'post' 或 'comment'"
        )

    asset_type = AssetType(request.asset_type)

    # 验证资产是否存在
    if asset_type == AssetType.post:
        asset_query = select(Post).where(Post.id == request.asset_id)
    else:
        asset_query = select(Comment).where(Comment.id == request.asset_id)

    asset_result = await db.execute(asset_query)
    asset = asset_result.scalar_one_or_none()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{'推文' if asset_type == AssetType.post else '评论'}不存在",
        )

    # 检查是否已点赞
    existing_like_query = select(Like).where(
        and_(
            Like.asset_id == request.asset_id,
            Like.asset_type == asset_type,
            Like.user_id == current_user.id,
        )
    )
    existing_like_result = await db.execute(existing_like_query)
    existing_like = existing_like_result.scalar_one_or_none()

    if existing_like:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="您已经点赞过该内容")

    # 创建点赞记录
    new_like = Like(user_id=current_user.id, asset_id=request.asset_id, asset_type=asset_type)
    db.add(new_like)
    await db.commit()

    return Response(
        code=200,
        message="点赞成功",
        data={"asset_id": request.asset_id, "asset_type": request.asset_type},
    )


@router.delete("/like", response_model=Response)
async def unlike_asset(
    request: LikeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    取消点赞推文或评论
    """
    # 验证 asset_type
    if request.asset_type not in ["post", "comment"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="资产类型必须是 'post' 或 'comment'"
        )

    asset_type = AssetType(request.asset_type)

    # 查找现有点赞记录
    like_query = select(Like).where(
        and_(
            Like.asset_id == request.asset_id,
            Like.asset_type == asset_type,
            Like.user_id == current_user.id,
        )
    )
    like_result = await db.execute(like_query)
    like = like_result.scalar_one_or_none()

    if not like:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="您还未点赞该内容")

    # 删除点赞记录
    await db.delete(like)
    await db.commit()

    return Response(
        code=200,
        message="取消点赞成功",
        data={"asset_id": request.asset_id, "asset_type": request.asset_type},
    )


@router.post("/posts/{post_id}/comment", response_model=Response)
async def create_comment(
    post_id: str,  # 使用UUID字符串
    request: CreateCommentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    为推文添加评论
    """
    # 检查推文是否存在
    post_query = select(Post).where(Post.post_id == post_id)
    post_result = await db.execute(post_query)
    post = post_result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="推文不存在")

    # 创建评论
    new_comment = Comment(
        post_id=post.id, user_id=current_user.id, content=request.content
    )  # 使用数据库ID
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)

    return Response(
        code=200,
        message="评论添加成功",
        data={
            "comment": CommentResponse(
                id=new_comment.id,
                content=new_comment.content,
                user_id=new_comment.user_id,
                username=current_user.username,
                avatar_attachment_id=current_user.avatar_attachment_id,
                likes_count=0,
                is_liked_by_me=False,
                created_at=new_comment.created_at.replace(tzinfo=timezone.utc).isoformat(),
                updated_at=new_comment.updated_at.replace(tzinfo=timezone.utc).isoformat(),
                user=UserInfo(
                    id=current_user.id,
                    username=current_user.username,
                    avatar_attachment_id=current_user.avatar_attachment_id,
                ),
            )
        },
    )


@router.get("/posts/{post_id}/comments", response_model=Response)
async def get_post_comments(
    post_id: str,  # 使用UUID字符串
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    获取推文的评论列表
    """
    # 检查推文是否存在
    post_query = select(Post).where(Post.post_id == post_id)
    post_result = await db.execute(post_query)
    post = post_result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="推文不存在")

    offset = (page - 1) * limit

    # 获取评论列表
    comments_query = (
        select(Comment, User, func.count(Like.id).label("likes_count"))
        .join(User, Comment.user_id == User.id)
        .outerjoin(Like, and_(Like.asset_id == Comment.id, Like.asset_type == AssetType.comment))
        .where(Comment.post_id == post.id)
        .group_by(Comment.id, User.id, User.username, User.avatar_attachment_id)
        .order_by(desc(Comment.created_at))
        .offset(offset)
        .limit(limit)
    )
    comments_result = await db.execute(comments_query)
    comments_data = comments_result.all()

    comments = []
    for row in comments_data:
        comment = row[0]
        user = row[1]
        likes_count = row[2]

        # 检查当前用户是否已点赞该评论
        like_query = select(Like).where(
            and_(
                Like.asset_id == comment.id,
                Like.asset_type == AssetType.comment,
                Like.user_id == current_user.id,
            )
        )
        like_result = await db.execute(like_query)
        is_liked_by_me = like_result.scalar_one_or_none() is not None

        comments.append(
            CommentResponse(
                id=comment.id,
                content=comment.content,
                user_id=comment.user_id,
                username=user.username,
                avatar_attachment_id=user.avatar_attachment_id,
                likes_count=likes_count,
                is_liked_by_me=is_liked_by_me,
                created_at=comment.created_at.replace(tzinfo=timezone.utc).isoformat(),
                updated_at=comment.updated_at.replace(tzinfo=timezone.utc).isoformat(),
                user=UserInfo(
                    id=user.id,
                    username=user.username,
                    avatar_attachment_id=user.avatar_attachment_id,
                ),
            )
        )

    return Response(
        code=200,
        message="评论列表获取成功",
        data={"comments": comments, "page": page, "limit": limit},
    )


@router.delete("/comments/{comment_id}", response_model=Response)
async def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    删除评论（只能删除自己的评论）
    """
    # 查找评论
    comment_query = select(Comment).where(
        Comment.id == comment_id, Comment.user_id == current_user.id
    )
    comment_result = await db.execute(comment_query)
    comment = comment_result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评论不存在或您无权删除")

    # 删除评论
    await db.delete(comment)
    await db.commit()

    return Response(code=200, message="评论删除成功", data={"comment_id": comment_id})


@router.get("/posts/{post_id}/collection", response_model=Response)
async def get_post_collection_details(
    post_id: str, db: AsyncSession = Depends(get_db)
):  # 使用UUID字符串
    """
    获取推文关联的收藏详情（公共接口，无需登录）
    """
    # 检查推文是否存在
    post_query = select(Post).where(Post.post_id == post_id)
    post_result = await db.execute(post_query)
    post = post_result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="推文不存在")

    # 获取收藏信息
    collection_query = select(Collection).where(Collection.id == post.refer_collection_id)
    collection_result = await db.execute(collection_query)
    collection = collection_result.scalar_one_or_none()

    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="收藏不存在")

    # 获取收藏详情
    details_query = select(CollectionDetail).where(CollectionDetail.collection_id == collection.id)
    details_result = await db.execute(details_query)
    details = details_result.scalars().all()

    # 获取分类信息
    category_name = None
    if collection.category_id:
        category_query = select(Category).where(Category.id == collection.category_id)
        category_result = await db.execute(category_query)
        category = category_result.scalar_one_or_none()
        if category:
            category_name = category.name

    return Response(
        code=200,
        message="收藏详情获取成功",
        data={
            "collection": {
                "id": collection.id,
                "category_id": collection.category_id,
                "category_name": category_name,
                "tags": collection.tags,
                "details": {detail.key: detail.value for detail in details},
                "created_at": collection.created_at.replace(tzinfo=timezone.utc).isoformat(),
                "updated_at": collection.updated_at.replace(tzinfo=timezone.utc).isoformat(),
            }
        },
    )
