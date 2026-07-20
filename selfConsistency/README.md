# Self-Consistency GenAI API

FastAPI app that sends one user prompt to multiple OpenRouter models, collects their answers, and asks a separate evaluator model to synthesize a stronger final response.

## Type

UI/CLI: API-based FastAPI app with an optional CLI client in `cli.py`.

## Models and providers

This project uses OpenRouter as the provider gateway. By default it is configured to call:

- `openai/gpt-4o-mini`
- `anthropic/claude-3-haiku`
- `google/gemini-2.5-flash`

The evaluator defaults to `anthropic/claude-3-haiku`.

You can override these with environment variables:

```bash
OPENROUTER_API_KEY=your_key
PROVIDER_MODELS=openai/gpt-4o-mini,anthropic/claude-3-haiku,google/gemini-2.5-flash
EVALUATOR_MODEL=anthropic/claude-3-haiku
MAX_TOKENS=1024
```

## How it works

1. The user sends a prompt to `POST /query`.
2. The orchestrator calls all configured models concurrently.
3. Failed provider calls are preserved in the output instead of crashing the whole request.
4. If at least one provider succeeds, the evaluator receives the original prompt plus all successful model answers.
5. The evaluator compares the answers, identifies strong parts, and returns a synthesized final answer.

## Run locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

API request:

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain self-consistency prompting in simple terms"}'
```

CLI request, after the API is running:

```bash
python cli.py "Explain self-consistency prompting in simple terms"
```

The CLI streams only the final synthesized answer. It does not print the individual provider responses.

## Output

The API returns:

- `prompt`
- `results`: raw responses or errors from each model
- `final_response`: synthesized evaluator answer
- `success`
- `error`
- `latency`

## Submission notes

This is not yet deployed. For the assignment submission, add:

- Public GitHub repository link
- Live deployed API/UI link, if you deploy it
