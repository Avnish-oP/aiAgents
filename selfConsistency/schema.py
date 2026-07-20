from pydantic import BaseModel

class ProviderResult(BaseModel):
    provider: str
    model: str
    response_text: str | None = None
    success: bool
    error: str | None = None
    latency: float | None = None

class QueryRequest(BaseModel):
    prompt: str

class QueryResponse(BaseModel):
    results: list[ProviderResult]
    prompt: str
    final_response: str | None = None
    success: bool
    error: str | None = None
    latency: float | None = None
