from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logger import logger, setup_logger
from app.api import api_router

# 创建应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered content generation service for ASG Content System"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/")
async def root():
    """根路径"""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "service": "ai-service",
        "version": settings.APP_VERSION
    }


@app.on_event("startup")
async def startup_event():
    """启动事件"""
    logger.info(f"🤖 {settings.APP_NAME} starting up...")
    logger.info(f"📝 Version: {settings.APP_VERSION}")
    logger.info(f"🔗 API: http://{settings.HOST}:{settings.PORT}{settings.API_PREFIX}")


@app.on_event("shutdown")
async def shutdown_event():
    """关闭事件"""
    logger.info(f"🤖 {settings.APP_NAME} shutting down...")


if __name__ == "__main__":
    import uvicorn

    setup_logger()
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
