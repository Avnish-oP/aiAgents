from providers.base import ModelProvider
from schema import ProviderResult

START_TAG = "<final_answer>"
END_TAG = "</final_answer>"


def format_evaluator_prompt(original_prompt: str, results: list[ProviderResult]) -> str:
    successful_results = [result for result in results if result.success]
    sections = "\n\n".join(
        f"--- {result.provider} ({result.model}) answer ---\n{result.response_text}"
        for result in successful_results
    )
    return f"""
You are evaluating multiple AI responses to a given prompt.

Original prompt:
{original_prompt}

Candidate responses:
{sections}

Compare the responses. Note where they agree and where they diverge.
Identify which parts of each response are strongest.
Write one final answer that synthesizes the best reasoning from the responses.
Do not simply copy one response; produce a genuinely improved answer.
Return only the final synthesized answer to the original prompt.
Do not include comparison notes, model names, synthesis commentary, or an explanation of why the answer was chosen.
Answer as if you are responding directly to the user's original prompt.
Use clean Markdown formatting when it helps readability.

Wrap the answer exactly like this:
<final_answer>
your direct answer here
</final_answer>
"""


def strip_final_answer_tags(text: str) -> str:
    if START_TAG in text:
        text = text.split(START_TAG, 1)[1]
    if END_TAG in text:
        text = text.split(END_TAG, 1)[0]
    return text.strip()


async def evaluate_responses(
    original_prompt: str,
    results: list[ProviderResult],
    evaluator_model: ModelProvider,
) -> ProviderResult:
    evaluator_prompt = format_evaluator_prompt(original_prompt, results)
    evaluator_result = await evaluator_model.generate(evaluator_prompt)
    if not evaluator_result.success:
        raise Exception(f"Evaluator model failed: {evaluator_result.error}")
    evaluator_result.response_text = strip_final_answer_tags(evaluator_result.response_text or "")
    return evaluator_result


async def stream_evaluation(
    original_prompt: str,
    results: list[ProviderResult],
    evaluator_model: ModelProvider,
):
    evaluator_prompt = format_evaluator_prompt(original_prompt, results)
    buffer = ""
    inside_answer = False
    saw_start_tag = False
    tail_length = len(END_TAG) - 1

    async for chunk in evaluator_model.stream_generate(evaluator_prompt):
        buffer += chunk

        if not inside_answer:
            if START_TAG not in buffer:
                continue
            saw_start_tag = True
            inside_answer = True
            buffer = buffer.split(START_TAG, 1)[1]

        if END_TAG in buffer:
            answer_part, _ = buffer.split(END_TAG, 1)
            if answer_part:
                yield answer_part
            return

        if len(buffer) > tail_length:
            yield buffer[:-tail_length]
            buffer = buffer[-tail_length:]

    if not saw_start_tag and buffer.strip():
        yield strip_final_answer_tags(buffer)
    elif saw_start_tag and buffer.strip():
        yield strip_final_answer_tags(buffer)
