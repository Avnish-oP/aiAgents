from abc import ABC, abstractmethod

from schema import ProviderResult


class ModelProvider(ABC):
    name: str
    model: str

    @abstractmethod
    async def generate(self, prompt: str) -> ProviderResult:
        ...
