import time
import re

from openai import AsyncOpenAI

from config import settings
from providers.base import ModelProvider
from schema import ProviderResult


def safe_error_message(error: Exception) -> str:
    message = str(error)
    message = re.sub(r"https://openrouter\.ai/\S+", "[openrouter-url-redacted]", message)
    return message


class OpenRouterProvider(ModelProvider):
    def __init__(self, model: str):
        self.name = model.split("/", 1)[0]
        self.model = model
        self.client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            timeout=settings.request_timeout,
        )

    async def generate(self, prompt: str) -> ProviderResult:
        start = time.perf_counter()
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=settings.max_tokens,
            )
            text = response.choices[0].message.content
            return ProviderResult(
                provider=self.name,
                model=self.model,
                response_text=text,
                success=True,
                latency=time.perf_counter() - start,
            )
        except Exception as e:
            return ProviderResult(
                provider=self.name,
                model=self.model,
                response_text=None,
                success=False,
                error=safe_error_message(e),
                latency=time.perf_counter() - start,
            )

    async def stream_generate(self, prompt: str):
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=settings.max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if not chunk.choices:
                continue
            content = chunk.choices[0].delta.content
            if content:
                yield content
