from contextlib import asynccontextmanager
from db import create_tables
from fastapi import FastAPI, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from routers.collection import router as collection_router, collections_router
from routers.attachment import router as attachment_router
from routers.category import router as category_router
from routers.auth import router as auth_router
from routers.community import router as community_router
from routers.static import mount_static_files
from entity.response import Response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan event handler.
    """
    await create_tables()
    yield


app = FastAPI(title="Memora API", description="Collection management API", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许前端开发服务器访问
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有HTTP方法
    allow_headers=["*"],  # 允许所有请求头
)

# Include routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(collection_router, prefix="/api/v1")
app.include_router(collections_router, prefix="/api/v1")
app.include_router(attachment_router, prefix="/api/v1")
app.include_router(category_router, prefix="/api/v1")
app.include_router(community_router, prefix="/api/v1")


# 添加异常处理器
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(resquest: Request, exc: RequestValidationError):
    """捕获所有 Pydantic 验证错误，以统一格式返回错误位置"""
    errors_list = []
    for err in exc.errors():
        field_path = "->".join(map(str, err["loc"]))
        error_message = err["msg"]

        errors_list.append({"loc": field_path, "msg": error_message})

    # 返回 JSONResponse
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation Error", "errors": errors_list},
    )


# Mount static files for uploads
mount_static_files(app)


# Add root endpoint
@app.get("/api/v1/health", response_model=Response[dict])
async def root():
    """
    Root endpoint
    """
    return Response(data={"message": "Memora API", "status": "running", "version": "1.0.0"})


# Add health check endpoint
@app.get("/api/v1/health", response_model=Response[dict])
async def health_check():
    """
    Simple health check endpoint
    """
    return Response(data={"status": "healthy", "message": "Memora API is running"})
