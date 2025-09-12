from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, select
from sqlalchemy.orm import selectinload
from entity.response import Response
from pydantic import BaseModel
from loguru import logger
from utils.web_parser import get_web_title

from model import (
    User,
    Collection,
    Category,
    CollectionDetail,
)
from db import get_db
from routers.auth import get_current_user
from ai.PROMPTS import (
    PROMPT_PARSE_CATEGORY_AND_TAGS,
    PROMPT_SUMMARIZE_CONTENT,
    ADDITIONAL_PROMPT_USER_LANGUAGE_PREFERENCE,
    parse_json,
)
from ai.openai_provider import provider_openai
from utils.markdownit_content import markdownit_helper

from typing import Optional

# Create router instance
router = APIRouter(
    prefix="/collection",
    tags=["collections"],
    responses={404: {"description": "Not found"}},
)


class CollectionDetailUpdate(BaseModel):
    value: Optional[str] = None


class CollectionTagsUpdate(BaseModel):
    tags: list[str]


class CollectionUrlCreate(BaseModel):
    url: str


class CollectionPictureCreate(BaseModel):
    attachment_id: str
    category: str


class CollectionUrlResponseDelta(BaseModel):
    type: str
    data: dict


async def streaming_create_collection_url(
    collection: CollectionUrlCreate, current_user: User, db: AsyncSession
):
    """
    Create a new collection which type is url reference
    """
    # 不是哥们，这样手搓流式函数是吧...
    # step 1: created to collection table
    user_id = current_user.id

    db_collection = Collection(user_id=user_id)
    db.add(db_collection)
    await db.commit()
    await db.refresh(db_collection)

    url_detail = CollectionDetail(collection_id=db_collection.id, key="url", value=collection.url)
    db.add(url_detail)

    yield CollectionUrlResponseDelta(
        type="collection_created",
        data={
            "id": db_collection.id,
            "user_id": db_collection.user_id,
            "created_at": db_collection.created_at.isoformat(),
            "updated_at": db_collection.updated_at.isoformat(),
        },
    )

    # step 2: fetching the content of the url
    content = await markdownit_helper.markdownit(collection.url)

    # step 2.1: get url title
    title = await get_web_title(collection.url)

    content_detail = CollectionDetail(collection_id=db_collection.id, key="content", value=content)
    db.add(content_detail)
    content_title = CollectionDetail(collection_id=db_collection.id, key="title", value=title)
    db.add(content_title)

    logger.info(f"Fetched content from {collection.url}, length: {len(content)}: {content[:50]}...")

    yield CollectionUrlResponseDelta(
        type="content_fetched",
        data={
            "url": collection.url,
            "content": f"{content[:100]}...",
            "title": title,
        },
    )

    # step 2.5: get categories from db (only user's categories)
    categories_query = (
        select(Category.name, Category.emoji)
        .where(Category.user_id == user_id)
        .order_by(Category.name)
    )
    categories_result = await db.execute(categories_query)
    categories = [row[0] for row in categories_result.all()]
    category_emojis = [row[1] for row in categories_result.all()]

    categories_str = ", ".join(
        [f"{cat}({emoji})" for cat, emoji in zip(categories, category_emojis)]
    )
    cate_sys_prompt = PROMPT_PARSE_CATEGORY_AND_TAGS.format(categories=categories_str)

    cate_sys_prompt += f"\n\n{ADDITIONAL_PROMPT_USER_LANGUAGE_PREFERENCE}"

    # step 3: llm analyze the category and tags
    cate_llm_resp = await provider_openai.text_chat(
        prompt=content,
        system_prompt=cate_sys_prompt,
    )
    cate_json = parse_json(cate_llm_resp.completion_text)
    category: str = cate_json.get("category", "")
    category_emoji: str = cate_json.get("category_emoji", "")
    tags: list = cate_json.get("tags", [])

    # save to category if not exists
    db_category = await db.execute(
        select(Category).where(Category.name == category, Category.user_id == user_id)
    )
    if category and not db_category.scalar_one_or_none():
        new_category = Category(name=category, emoji=category_emoji, user_id=user_id)
        db.add(new_category)
        await db.commit()
        await db.refresh(new_category)
        logger.info(f"New category created: {new_category.name}")

    yield CollectionUrlResponseDelta(
        type="category_analyzed",
        data={
            "category": category,
            "tags": tags,
        },
    )

    # 看笑了...

    # get category_id
    category_query = select(Category.id).where(
        Category.name == category, Category.user_id == user_id
    )
    category_result = await db.execute(category_query)
    category_id = category_result.scalar_one_or_none()

    # step 3.5: update collection with category and tags
    if not category_id:
        category_id = -1

    db_collection.category_id = category_id  # type: ignore
    db_collection.tags = ",".join(tags)  # type: ignore
    db.add(db_collection)

    await db.commit()

    # step 4: llm summarize the content, using streaming
    summary_sys_prompt = PROMPT_SUMMARIZE_CONTENT
    summary_sys_prompt += f"\n\n{ADDITIONAL_PROMPT_USER_LANGUAGE_PREFERENCE}"
    summary_llm_resp = provider_openai.text_chat_stream(
        prompt=content,
        system_prompt=summary_sys_prompt,
    )
    full_summary = ""
    async for chunk in summary_llm_resp:
        full_summary += chunk.completion_text
        yield CollectionUrlResponseDelta(
            type="summary_chunk",
            data={
                "summary": chunk.completion_text,
            },
        )

    full_summary = parse_json(full_summary).get("summary", "")

    summary_detail = CollectionDetail(
        collection_id=db_collection.id, key="summary", value=full_summary
    )
    db.add(summary_detail)
    await db.commit()

    yield CollectionUrlResponseDelta(
        type="index_completed",
        data={
            "collection_id": db_collection.id,
        },
    )


@router.post(
    "/url",
    response_model=CollectionUrlResponseDelta,
    status_code=status.HTTP_201_CREATED,
)
async def create_collection_url(
    event: CollectionUrlCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new collection which type is url reference
    """

    async def steaming():
        async for delta in streaming_create_collection_url(event, current_user, db):
            data = delta.model_dump_json()
            yield f"data: {data}\n\n"

    return StreamingResponse(steaming(), media_type="text/event-stream")


# @router.post(
#     "/picture",
#     response_model=Response,
#     status_code=status.HTTP_201_CREATED,
# )
# # upload file
# async def create_collection_picture(
#     event: CollectionPictureCreate,
#     db: AsyncSession = Depends(get_db),
# ):
#     """
#     Create a new collection which type is picture reference
#     """
#     user_id = 1

#     # step 1. check if the category exists
#     category_query = select(Category).where(Category.name == event.category)
#     category_result = await db.execute(category_query)
#     category_result = category_result.first()
#     if not category_result:
#         # create new category if not exists
#         new_category = Category(
#             name=event.category, user_id=user_id
#         )  # TODO: Replace with actual user_id from request context or authentication
#         db.add(new_category)
#         await db.commit()
#         category_id = new_category.id
#     else:
#         logger.debug(f"Category {category_result} already exists.")
#         category_id = category_result[0].id
#     logger.debug(f"Category ID: {str(category_id)} for category {event.category}")

#     # step 2. call the llm

#     # find the attachment by id
#     attachment_query = select(Attachment).where(
#         Attachment.attachment_id == event.attachment_id
#     )
#     attachment_result = await db.execute(attachment_query)
#     attachment = attachment_result.scalar_one_or_none()
#     if not attachment:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"Attachment with id {event.attachment_id} not found",
#         )
#     # convert to base64
#     # async with anyio.open_file(attachment.url, "rb") as file:  # type: ignore
#     #     file_base64 = base64.b64encode(await file.read()).decode("utf-8")
#     with open(attachment.url, "rb") as file:  # type: ignore
#         file_base64 = (
#             f"data:image/jpeg;base64,{base64.b64encode(file.read()).decode('utf-8')}"
#         )

#     system_prompt = f"{PICTURE_PROMPT.format(category=event.category)}\n\n{ADDITIONAL_PROMPT_USER_LANGUAGE_PREFERENCE}"
#     llm_response = await provider_openai.text_chat(
#         prompt="Please describe the image.",
#         images=[file_base64],
#         system_prompt=system_prompt,
#     )

#     llm_json = parse_json(llm_response.completion_text)
#     tags = llm_json.get("tags", [])

#     logger.info(f"LLM generated tags: {tags} for category {event.category}")

#     db_collection = Collection(
#         user_id=user_id, category_id=category_id, tags=",".join(tags)
#     )
#     db.add(db_collection)
#     await db.commit()
#     await db.refresh(db_collection)

#     # update collection_attachaments table
#     collection_attachment = CollectionAttachment(
#         collection_id=db_collection.id,
#         attachment_id=attachment.attachment_id,  # type: ignore
#     )
#     db.add(collection_attachment)
#     await db.commit()

#     # update collection details
#     detail = CollectionDetail(
#         collection_id=db_collection.id, key="attachment", value=attachment.attachment_id
#     )
#     db.add(detail)
#     await db.commit()

#     return Response(
#         code=200,
#         message="Collection created successfully",
#         data={
#             "collection_id": db_collection.id,
#             "category_id": db_collection.category_id,
#             "tags": db_collection.tags,
#             "created_at": db_collection.created_at.isoformat(),
#             "updated_at": db_collection.updated_at.isoformat(),
#         },
#     )

# Create user collections router
collections_router = APIRouter(
    prefix="/collections",
    tags=["collections"],
    responses={404: {"description": "Not found"}},
)


@collections_router.get("/", response_model=Response)
async def get_current_user_collections(
    category_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all collections for the current authenticated user
    """
    # Get user's collections
    collections_query = (
        select(Collection)
        .where(Collection.user_id == current_user.id)
        .options(selectinload(Collection.details))
        .order_by(desc(Collection.created_at))
    )

    if category_id:
        collections_query = collections_query.where(Collection.category_id == category_id)

    collections_result = await db.execute(collections_query)
    collections = collections_result.scalars().unique().all()

    return Response(
        code=200,
        message="Collections retrieved successfully",
        data={
            "collections": [
                {
                    "id": collection.id,
                    "category_id": collection.category_id,
                    "tags": collection.tags,
                    "details": {detail.key: detail.value for detail in collection.details},
                    "created_at": collection.created_at.isoformat(),
                    "updated_at": collection.updated_at.isoformat(),
                }
                for collection in collections
            ]
        },
    )


# 通过category_id获取所有collection
@router.get("/by_category/{category_id}", response_model=Response)
async def get_collections_by_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    根据category_id获取当前用户的collection
    """
    collections_query = (
        select(Collection)
        .where(Collection.category_id == category_id, Collection.user_id == current_user.id)
        .options(selectinload(Collection.details))
        .order_by(desc(Collection.created_at))
    )
    collections_result = await db.execute(collections_query)
    collections = collections_result.scalars().unique().all()

    # get category
    category_query = select(Category).where(
        Category.id == category_id, Category.user_id == current_user.id
    )
    category_result = await db.execute(category_query)
    category = category_result.scalar_one_or_none()

    return Response(
        code=200,
        message="Collections fetched by category successfully",
        data={
            "category": (
                {
                    "id": category.id,
                    "name": category.name,
                    "emoji": category.emoji,
                    "knowledge_base_id": category.knowledge_base_id,
                }
                if category
                else None
            ),
            "collections": [
                {
                    "id": collection.id,
                    "category_id": collection.category_id,
                    "tags": collection.tags,
                    "details": {detail.key: detail.value for detail in collection.details},
                    "created_at": collection.created_at.isoformat(),
                    "updated_at": collection.updated_at.isoformat(),
                }
                for collection in collections
            ],
        },
    )


# 全文搜索，找到匹配的 collection
@router.get("/search", response_model=Response)
async def search_collections(query: str, db: AsyncSession = Depends(get_db)):
    """
    全文搜索，找到匹配的 collection
    """
    # 搜索 Collection 的 details 中的内容
    collections_query = (
        select(Collection)
        .join(Collection.details)
        .where(CollectionDetail.value.ilike(f"%{query}%"))
        .options(selectinload(Collection.details))
        .order_by(desc(Collection.created_at))
    )
    collections_result = await db.execute(collections_query)
    collections = collections_result.scalars().unique().all()
    return Response(
        code=200,
        message="Collections searched successfully",
        data={
            "collections": [
                {
                    "id": collection.id,
                    "category_id": collection.category_id,
                    "tags": collection.tags,
                    "details": {detail.key: detail.value for detail in collection.details},
                    "created_at": collection.created_at.isoformat(),
                    "updated_at": collection.updated_at.isoformat(),
                }
                for collection in collections
            ]
        },
    )


# 详情相关路由
@router.get("/{collection_id}/details", response_model=Response)
async def get_collection_details(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 验证收藏是否属于当前用户
    collection_query = select(Collection).where(
        Collection.id == collection_id, Collection.user_id == current_user.id
    )
    collection_result = await db.execute(collection_query)
    collection = collection_result.scalar_one_or_none()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found or access denied"
        )

    details_query = select(CollectionDetail).where(CollectionDetail.collection_id == collection_id)
    details_result = await db.execute(details_query)
    details = details_result.scalars().all()
    return Response(
        code=200,
        message="Collection details fetched successfully",
        data={"details": {d.key: d.value for d in details}},
    )


@router.get("/{collection_id}/details/{key}", response_model=Response)
async def get_collection_detail(
    collection_id: int,
    key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 验证收藏是否属于当前用户
    collection_query = select(Collection).where(
        Collection.id == collection_id, Collection.user_id == current_user.id
    )
    collection_result = await db.execute(collection_query)
    collection = collection_result.scalar_one_or_none()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found or access denied"
        )

    detail_query = select(CollectionDetail).where(
        CollectionDetail.collection_id == collection_id, CollectionDetail.key == key
    )
    detail_result = await db.execute(detail_query)
    detail = detail_result.scalar_one_or_none()
    if not detail:
        raise HTTPException(status_code=404, detail="Detail not found")
    return Response(
        code=200,
        message="Collection detail fetched successfully",
        data={"key": detail.key, "value": detail.value},
    )


@router.put("/{collection_id}/details/{key}", response_model=Response)
async def update_collection_detail(
    collection_id: int,
    key: str,
    update: CollectionDetailUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 验证收藏是否属于当前用户
    collection_query = select(Collection).where(
        Collection.id == collection_id, Collection.user_id == current_user.id
    )
    collection_result = await db.execute(collection_query)
    collection = collection_result.scalar_one_or_none()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found or access denied"
        )

    detail_query = select(CollectionDetail).where(
        CollectionDetail.collection_id == collection_id, CollectionDetail.key == key
    )
    detail_result = await db.execute(detail_query)
    detail = detail_result.scalar_one_or_none()
    if detail:
        detail.value = update.value  # type: ignore
        db.add(detail)
        await db.commit()
        await db.refresh(detail)
        msg = "Detail updated successfully"
    else:
        detail = CollectionDetail(collection_id=collection_id, key=key, value=update.value)
        db.add(detail)
        await db.commit()
        await db.refresh(detail)
        msg = "Detail created successfully"
    return Response(code=200, message=msg, data={"key": detail.key, "value": detail.value})


@router.delete("/{collection_id}/details/{key}", response_model=Response)
async def delete_collection_detail(
    collection_id: int,
    key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 验证收藏是否属于当前用户
    collection_query = select(Collection).where(
        Collection.id == collection_id, Collection.user_id == current_user.id
    )
    collection_result = await db.execute(collection_query)
    collection = collection_result.scalar_one_or_none()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found or access denied"
        )

    detail_query = select(CollectionDetail).where(
        CollectionDetail.collection_id == collection_id, CollectionDetail.key == key
    )
    detail_result = await db.execute(detail_query)
    detail = detail_result.scalar_one_or_none()
    if not detail:
        raise HTTPException(status_code=404, detail="Detail not found")
    await db.delete(detail)
    await db.commit()
    return Response(code=200, message="Detail deleted successfully", data={"key": key})


@router.get("/{collection_id}/tags", response_model=Response)
async def get_collection_tags(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    collection_query = select(Collection).where(
        Collection.id == collection_id, Collection.user_id == current_user.id
    )
    collection_result = await db.execute(collection_query)
    collection = collection_result.scalar_one_or_none()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found or access denied"
        )
    tags = collection.tags.split(",") if collection.tags else []  # type: ignore
    return Response(code=200, message="Collection tags fetched successfully", data={"tags": tags})


@router.get("/public/{collection_id}/details", response_model=Response)
async def get_public_collection_details(collection_id: int, db: AsyncSession = Depends(get_db)):
    """
    获取收藏详情（公共接口，无需登录）
    用于推文中的收藏详情展示
    """
    # 检查收藏是否存在
    collection_query = select(Collection).where(Collection.id == collection_id)
    collection_result = await db.execute(collection_query)
    collection = collection_result.scalar_one_or_none()

    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    # 获取收藏详情
    details_query = select(CollectionDetail).where(CollectionDetail.collection_id == collection_id)
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
        message="Collection details fetched successfully",
        data={
            "collection": {
                "id": collection.id,
                "category_id": collection.category_id,
                "category_name": category_name,
                "tags": collection.tags,
                "details": {detail.key: detail.value for detail in details},
                "created_at": collection.created_at.isoformat(),
                "updated_at": collection.updated_at.isoformat(),
            }
        },
    )


@router.put("/{collection_id}/tags", response_model=Response)
async def update_collection_tags(
    collection_id: int,
    update: CollectionTagsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    collection_query = select(Collection).where(
        Collection.id == collection_id, Collection.user_id == current_user.id
    )
    collection_result = await db.execute(collection_query)
    collection = collection_result.scalar_one_or_none()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found or access denied"
        )
    collection.tags = ",".join(update.tags)  # type: ignore
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    return Response(
        code=200, message="Collection tags updated successfully", data={"tags": update.tags}
    )


@router.delete("/{collection_id}", response_model=Response)
async def delete_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    通过ID删除一个收藏
    """
    collection_query = select(Collection).where(
        Collection.id == collection_id, Collection.user_id == current_user.id
    )
    collection_result = await db.execute(collection_query)
    collection = collection_result.scalar_one_or_none()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found or access denied"
        )

    await db.delete(collection)
    await db.commit()

    return Response(
        code=200, message="Collection deleted successfully", data={"collection_id": collection_id}
    )
