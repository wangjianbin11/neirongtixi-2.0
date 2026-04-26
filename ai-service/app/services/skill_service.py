from typing import Dict, Any, Optional
from app.services.ai_service import ai_service
from app.core.logger import logger


class SkillService:
    """技能执行服务"""

    def __init__(self):
        # 这里可以从数据库加载技能模板
        self.skill_templates = {}

    async def execute_skill(
        self,
        skill_code: str,
        input_data: Dict[str, Any],
        options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        执行技能

        Args:
            skill_code: 技能代码
            input_data: 输入数据
            options: 执行选项

        Returns:
            执行结果
        """
        # 获取技能模板
        template = await self._get_skill_template(skill_code)
        if not template:
            raise ValueError(f"Skill not found: {skill_code}")

        # 构建提示词
        prompt = self._build_prompt(template["prompt_template"], input_data)

        # 执行AI生成
        result = await ai_service.generate(
            prompt=prompt,
            provider=options.get("provider", "openai"),
            model=options.get("model", template.get("default_model")),
            temperature=options.get("temperature", 0.7),
            max_tokens=options.get("max_tokens", 2000),
        )

        # 计算成本
        cost = ai_service.calculate_cost(
            result["provider"], result["model"], result["usage"]
        )

        # 记录日志
        logger.info(
            f"Skill executed: {skill_code}, "
            f"provider: {result['provider']}, "
            f"model: {result['model']}, "
            f"tokens: {result['usage']['total_tokens']}, "
            f"cost: ${cost:.4f}"
        )

        return {
            "skill_code": skill_code,
            "output_data": {"text": result["text"]},
            "usage": result["usage"],
            "cost": cost,
            "provider": result["provider"],
            "model": result["model"],
        }

    async def _get_skill_template(self, skill_code: str) -> Optional[Dict[str, Any]]:
        """获取技能模板"""
        # TODO: 从数据库加载
        return {
            "prompt_template": "You are a helpful assistant. {input}",
            "default_model": "gpt-4",
        }

    def _build_prompt(self, template: str, input_data: Dict[str, Any]) -> str:
        """构建提示词"""
        try:
            return template.format(**input_data)
        except KeyError as e:
            raise ValueError(f"Missing input parameter: {e}")


# 全局技能服务实例
skill_service = SkillService()
