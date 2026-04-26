from fastapi import APIRouter
from app.api import skills, health

api_router = APIRouter()

# Health check
api_router.include_router(health.router, tags=["health"])

# Skills
api_router.include_router(
    skills.router,
    prefix="/skills",
    tags=["skills"]
)
