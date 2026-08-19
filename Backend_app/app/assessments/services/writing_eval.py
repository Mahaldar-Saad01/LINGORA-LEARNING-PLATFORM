# services/writing_evaluator.py

import json
import os

def evaluate_writing(
    target_language: str,
    question: str,
    answer: str,
    evaluation_metrics: list[str] | None = None,
) -> dict:
    if not answer.strip():
        raise ValueError("The answer cannot be empty.")

    evaluation_metrics = evaluation_metrics or [
        "task completion",
        "grammar",
        "vocabulary",
        "clarity",
    ]
    metrics = ", ".join(evaluation_metrics)

    prompt = f"""
You are a strict but fair language-writing evaluator.

Target language: {target_language}
question: {question}
Student answer:
{answer}

Evaluate only these metrics:
{metrics}

Rules:
- Give every metric a score from 0 to 10 for diagnostic feedback.
- Give an overall_score from 0 to 10. This is the mark awarded for the question.
- Check whether the answer is actually written in the target language.
- Do not reward unrelated content.
- Briefly identify important mistakes.
- Do not invent mistakes.
- Return valid JSON only.

Required JSON format:
{{
  "language_detected": "string",
  "is_target_language": true,
  "scores": {{
    "metric_name": 0
  }},
  "overall_score": 0,
  "max_score": 10,
  "feedback": "string",
  "corrected_answer": "string"
}}
"""

    api_key = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACEHUB_API_TOKEN")
    if not api_key:
        raise RuntimeError("Hugging Face API token is not configured.")

    try:
        from huggingface_hub import InferenceClient
    except ImportError as exc:
        raise RuntimeError(
            "huggingface_hub is not installed. Install the backend requirements."
        ) from exc

    client = InferenceClient(provider="auto", api_key=api_key)
    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-7B-Instruct",
        messages=[
            {
                "role": "system",
                "content": (
                    "You evaluate language-learning answers and always "
                    "return valid JSON without markdown."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.1,
        max_tokens=500,
    )

    raw_result = response.choices[0].message.content

    try:
        result = json.loads(raw_result)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"The model returned invalid JSON: {raw_result}"
        ) from exc

    try:
        result["overall_score"] = max(0, min(10, round(float(result["overall_score"]), 1)))
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("The model response is missing a valid overall_score.") from exc

    result["max_score"] = 10
    return result
