# Self-Consistency GenAI API

This project is a FastAPI-based GenAI application that uses the self-consistency technique to produce a stronger final answer for a user prompt.

Instead of asking one model and returning its answer directly, the app sends the same prompt to multiple models, collects their responses, and then asks a separate evaluator model to synthesize the best final answer. The final answer is intended to combine the strongest parts of the model outputs instead of copying one response as-is.

The project includes:

- FastAPI backend
- CLI client
- Multi-model orchestration
- Final evaluator model
- Streaming final-answer output for better CLI UX
- Error handling for failed provider calls
- Clear JSON API output for debugging and inspection

## Project Type

This is an API-based FastAPI project with a CLI client.

There is no separate web UI. The app can be used through:

- Swagger docs at `http://127.0.0.1:8000/docs`
- JSON API endpoints
- Streaming CLI via `cli.py`

## Self-Consistency Flow

The app follows this flow:

1. User enters a question or prompt.
2. The backend sends the same prompt to multiple configured models.
3. All model calls run concurrently to reduce waiting time.
4. Each model returns its own answer.
5. Failed model calls are recorded as errors, but the request continues if at least one model succeeds.
6. Successful model responses are passed to an evaluator model.
7. The evaluator compares the responses internally and produces one improved final answer.
8. The user sees the final synthesized answer.

For the CLI, only the final synthesized answer is displayed. This keeps the command-line experience clean and avoids printing long intermediate model responses.

## Models and Provider

This project uses OpenRouter as a provider gateway with the OpenAI Python SDK.

OpenRouter exposes an OpenAI-compatible API, so the app uses:

```python
AsyncOpenAI(
    api_key=settings.openrouter_api_key,
    base_url=settings.openrouter_base_url,
)
```

Default provider models:

- `openai/gpt-4o-mini`
- `anthropic/claude-3-haiku`
- `google/gemini-2.5-flash`

Default evaluator model:

- `anthropic/claude-3-haiku`

These can be changed from environment variables without editing the code.

## Project Structure

```text
.
├── main.py                         # FastAPI app and API routes
├── cli.py                          # Streaming CLI client
├── config.py                       # Environment-based settings
├── schema.py                       # Pydantic request/response models
├── orchestrator.py                 # Concurrent provider execution
├── evaluator.py                    # Evaluator prompt and streaming parser
├── exceptions.py                   # Custom exceptions
├── providers/
│   ├── base.py                     # Provider interface
│   └── openrouter_provider.py      # OpenRouter provider using OpenAI SDK
├── requirements.txt
└── README.md
```

## Setup

Create and activate a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key
```

Optional `.env` configuration:

```bash
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
REQUEST_TIMEOUT=30
MAX_TOKENS=1024
PROVIDER_MODELS=openai/gpt-4o-mini,anthropic/claude-3-haiku,google/gemini-2.5-flash
EVALUATOR_MODEL=anthropic/claude-3-haiku
```

## Run the API

Start the FastAPI server:

```bash
uvicorn main:app --port 8000
```

For local development, you can also use reload:

```bash
uvicorn main:app --reload --port 8000
```

Open Swagger docs:

```text
http://127.0.0.1:8000/docs
```

## CLI Usage

The CLI streams only the final synthesized answer.

Start the API first:

```bash
uvicorn main:app --port 8000
```

Then run:

```bash
python3 cli.py "Explain self-consistency prompting in simple terms"
```

Example output:

```text
Final Answer

Self-consistency prompting is a technique where the same question is answered multiple times, often by different models or different reasoning paths. The responses are then compared and combined to produce a more reliable final answer.
```

The CLI does not print individual model responses. This is intentional because the CLI is optimized for a cleaner user experience.

## API Endpoints

### `POST /query`

Returns the full non-streaming JSON response.

Use this endpoint when you want to inspect:

- Original prompt
- Individual model responses
- Individual model errors
- Final synthesized answer
- Total latency

Example request:

```bash
curl -X POST http://127.0.0.1:8000/query \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain self-consistency prompting in simple terms"}'
```

Example response shape:

```json
{
  "results": [
    {
      "provider": "openai",
      "model": "openai/gpt-4o-mini",
      "response_text": "Model answer...",
      "success": true,
      "error": null,
      "latency": 1.23
    }
  ],
  "prompt": "Explain self-consistency prompting in simple terms",
  "final_response": "Synthesized final answer...",
  "success": true,
  "error": null,
  "latency": 5.42
}
```

### `POST /query/stream`

Streams only the final synthesized answer as Markdown text.

Use this endpoint for better UX when the user only needs the final answer.

Example request:

```bash
curl -N -X POST http://127.0.0.1:8000/query/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain self-consistency prompting in simple terms"}'
```

The streaming endpoint still runs the full self-consistency flow internally:

1. Calls all provider models.
2. Sends successful responses to the evaluator.
3. Streams the evaluator's final answer.

## Error Handling

The app handles provider failures gracefully.

If one model fails:

- The failure is included in `results` for `/query`.
- The evaluator still runs using successful model responses.
- The final answer can still be generated.

If all provider models fail:

- `/query` returns `success: false`.
- `/query/stream` streams a user-readable failure message.

Provider error messages are sanitized to avoid leaking sensitive OpenRouter dashboard URLs.

## Important Implementation Details

### Concurrent provider calls

`orchestrator.py` uses `asyncio.gather` so model calls happen concurrently.

This is faster than calling each model one by one.

### Provider abstraction

`providers/base.py` defines a `ModelProvider` interface.

This keeps the app extensible. More providers can be added later by creating new classes that implement:

```python
async def generate(self, prompt: str) -> ProviderResult:
    ...
```

### OpenAI SDK with OpenRouter

`providers/openrouter_provider.py` uses the OpenAI SDK with OpenRouter's base URL. This avoids manually building HTTP requests and keeps the provider implementation cleaner.

### Streaming final answer

The evaluator is instructed to wrap the final answer in internal tags:

```text
<final_answer>
...
</final_answer>
```

The server strips those tags while streaming so the CLI only displays the final answer. This prevents evaluator preambles or comparison notes from leaking into the user-facing output.

## Requirements Checklist

This project satisfies the assignment requirements:

- User input prompt: yes, through API and CLI
- Responses from different AI models: yes, available in `/query`
- Final synthesized answer: yes
- Proper orchestration of API calls: yes, concurrent async orchestration
- Loading and error handling: yes
- Clear output formatting: yes
- CLI or UI-based app: CLI plus FastAPI API
- README explaining the project: yes

## Current Limitations

This is intentionally not production-grade.

Known limitations:

- No web frontend
- No persistent request history
- No authentication for the FastAPI app
- No rate limiting
- No retry/backoff logic
- No automated test suite yet
- Streaming starts after provider responses are collected because the evaluator needs those responses first

## Deployment Notes

For assignment submission, provide:

- Public GitHub repository link
- Live deployed project link if deployed

This app can be deployed on services that support Python web apps, such as Render, Railway, Fly.io, or a VPS.

The deployment command is typically:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Make sure the deployment environment has:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key
```

and any optional model configuration you want to override.
