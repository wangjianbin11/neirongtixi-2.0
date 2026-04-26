import sys
from loguru import logger
from app.core.config import settings


def setup_logger():
    """配置日志"""
    # 移除默认的handler
    logger.remove()

    # 添加控制台输出
    logger.add(
        sys.stdout,
        colorize=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="DEBUG" if settings.DEBUG else "INFO",
    )

    # 添加文件输出
    logger.add(
        "logs/ai_service.log",
        rotation="500 MB",
        retention="10 days",
        level="DEBUG" if settings.DEBUG else "INFO",
        encoding="utf-8",
    )

    # 添加错误日志
    logger.add(
        "logs/error.log",
        rotation="500 MB",
        retention="30 days",
        level="ERROR",
        encoding="utf-8",
    )


# 初始化日志
setup_logger()
