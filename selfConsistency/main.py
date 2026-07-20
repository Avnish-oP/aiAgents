import time

import fastapi
from fastapi.responses import StreamingResponse
from schema import QueryRequest, QueryResponse
from orchestrator import run_providers
from evaluator import evaluate_responses, stream_evaluation
from providers.openrouter_provider import OpenRouterProvider
from config import settings
from exceptions import AllProvidersFailedException

app = fastapi.FastAPI(title="Self-Consistency GenAI API")


@app.post("/query")
async def query(request: QueryRequest) -> QueryResponse:
    started = time.perf_counter()
    prompt = request.prompt.strip()
    if not prompt:
        raise fastapi.HTTPException(status_code=400, detail="Prompt is required")

    providers = [OpenRouterProvider(model) for model in settings.provider_model_list]

    try:
        results = await run_providers(providers, prompt)
        evaluator_result = await evaluate_responses(
            prompt,
            results,
            OpenRouterProvider(settings.evaluator_model),
        )
    except AllProvidersFailedException as exc:
        return QueryResponse(
            results=exc.results,
            prompt=prompt,
            final_response=None,
            success=False,
            error="All provider calls failed",
            latency=time.perf_counter() - started,
        )
    except Exception as exc:
        raise fastapi.HTTPException(status_code=502, detail=str(exc)) from exc

    return QueryResponse(
        results=results,
        prompt=prompt,
        final_response=evaluator_result.response_text,
        success=True,
        error=None,
        latency=time.perf_counter() - started,
    )


@app.post("/query/stream")
async def query_stream(request: QueryRequest) -> StreamingResponse:
    prompt = request.prompt.strip()
    if not prompt:
        raise fastapi.HTTPException(status_code=400, detail="Prompt is required")

    async def stream_final_answer():
        providers = [OpenRouterProvider(model) for model in settings.provider_model_list]
        try:
            results = await run_providers(providers, prompt)
            evaluator = OpenRouterProvider(settings.evaluator_model)
            async for chunk in stream_evaluation(prompt, results, evaluator):
                yield chunk
        except AllProvidersFailedException:
            yield "All provider calls failed, so a final answer could not be synthesized.\n"
        except Exception as exc:
            yield f"Error while generating final answer: {exc}\n"

    return StreamingResponse(stream_final_answer(), media_type="text/markdown")
