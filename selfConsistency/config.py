from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    openrouter_api_key: str
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    request_timeout: int = 30
    max_tokens: int = 1024
    provider_models: str = (
        "openai/gpt-4o-mini,"
        "anthropic/claude-3-haiku,"
        "google/gemini-2.5-flash"
    )
    evaluator_model: str = "anthropic/claude-3-haiku"
    model_config = SettingsConfigDict(env_file=".env")

    @property
    def provider_model_list(self) -> list[str]:
        return [model.strip() for model in self.provider_models.split(",") if model.strip()]

settings = Settings()
