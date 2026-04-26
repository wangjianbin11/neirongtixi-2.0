from typing import Optional, Dict, Any
from openai import OpenAI
from anthropic import Anthropic
from app.core.config import settings
from app.core.logger import logger


class AIService:
    """AI服务基类"""

    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None

        if settings.OPENAI_API_KEY:
            self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)

        if settings.ANTHROPIC_API_KEY:
            self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def generate(
        self,
        prompt: str,
        provider: str = "openai",
        model: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None,
    ) -> Dict[str, Any]:
        """
        生成AI响应

        Args:
            prompt: 提示词
            provider: AI提供商 (openai, anthropic)
            model: 模型名称
            temperature: 温度参数
            max_tokens: 最大token数

        Returns:
            包含生成结果和使用信息的字典
        """
        if provider == "openai":
            return await self._generate_openai(
                prompt, model, temperature, max_tokens
            )
        elif provider == "anthropic":
            return await self._generate_anthropic(
                prompt, model, temperature, max_tokens
            )
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def _generate_openai(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """使用OpenAI生成"""
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized")

        model = model or settings.DEFAULT_MODEL
        temperature = temperature if temperature is not None else settings.DEFAULT_TEMPERATURE
        max_tokens = max_tokens if max_tokens is not None else settings.DEFAULT_MAX_TOKENS

        try:
            response = self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )

            return {
                "text": response.choices[0].message.content,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                },
                "model": model,
                "provider": "openai",
            }
        except Exception as e:
            logger.error(f"OpenAI generation error: {e}")
            raise

    async def _generate_anthropic(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """使用Anthropic生成"""
        if not self.anthropic_client:
            raise ValueError("Anthropic client not initialized")

        model = model or "claude-3-opus-20240229"
        temperature = temperature if temperature is not None else settings.DEFAULT_TEMPERATURE
        max_tokens = max_tokens if max_tokens is not None else settings.DEFAULT_MAX_TOKENS

        try:
            response = self.anthropic.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {"role": "user", "content": prompt}
                ],
            )

            return {
                "text": response.content[0].text,
                "usage": {
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
                },
                "model": model,
                "provider": "anthropic",
            }
        except Exception as e:
            logger.error(f"Anthropic generation error: {e}")
            raise

    def calculate_cost(self, provider: str, model: str, usage: Dict[str, int]) -> float:
        """计算成本"""
        # 简化的成本计算
        rates = {
            "openai": {
                "gpt-4": {"input": 0.03, "output": 0.06},
                "gpt-3.5-turbo": {"input": 0.0015, "output": 0.002},
            },
            "anthropic": {
                "claude-3-opus-20240229": {"input": 0.015, "output": 0.075},
                "claude-3-sonnet-20240229": {"input": 0.003, "output": 0.015},
            },
        }

        if provider not in rates or model not in rates[provider]:
            return 0.0

        rate = rates[provider][model]
        input_cost = (usage["prompt_tokens"] / 1000) * rate["input"]
        output_cost = (usage["completion_tokens"] / 1000) * rate["output"]

        return input_cost + output_cost


# 全局AI服务实例
ai_service = AIService()
