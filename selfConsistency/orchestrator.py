import asyncio

from exceptions import AllProvidersFailedException
from providers.base import ModelProvider
from schema import ProviderResult


async def run_providers(providers: list[ModelProvider], prompt: str) -> list[ProviderResult]:
    results = await asyncio.gather(
        *[provider.generate(prompt) for provider in providers],
        return_exceptions=True,
    )
    normalized_results = [
        result if isinstance(result, ProviderResult)
        else ProviderResult(
            provider="unknown",
            model="unknown",
            success=False,
            error=str(result),
        )
        for result in results
    ]

    if all(not result.success for result in normalized_results):
        raise AllProvidersFailedException(normalized_results)

    return normalized_results
