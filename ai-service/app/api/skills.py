from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.skill_service import skill_service

router = APIRouter()


class ExecuteSkillRequest(BaseModel):
    """执行技能请求"""
    inputData: Dict[str, Any]
    options: Optional[Dict[str, Any]] = None


class ExecuteSkillResponse(BaseModel):
    """执行技能响应"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.post("/{skill_code}/execute", response_model=ExecuteSkillResponse)
async def execute_skill(
    skill_code: str,
    request: ExecuteSkillRequest
):
    """
    执行技能

    Args:
        skill_code: 技能代码 (如 Skill-01, Skill-02)
        request: 执行请求

    Returns:
        执行结果
    """
    try:
        result = await skill_service.execute_skill(
            skill_code=skill_code,
            input_data=request.inputData,
            options=request.options,
        )

        return ExecuteSkillResponse(
            success=True,
            data=result
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skill execution failed: {str(e)}")
