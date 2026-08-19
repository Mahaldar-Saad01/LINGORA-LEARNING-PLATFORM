import json
import os
import re

try:
    from groq import Groq
except ImportError:  # Keeps management commands usable before optional client installation.
    Groq = None


DEFAULT_MODEL = 'llama-3.3-70b-versatile'


class LessonGenerationError(RuntimeError):
    """Raised when Groq cannot generate a usable JSON response."""


def _extract_json_object(content):
    if not content:
        raise LessonGenerationError('Groq returned an empty response.')
    if isinstance(content, dict):
        return content

    text = str(content).strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\s*```$', '', text)
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LessonGenerationError(
            f'Groq returned invalid JSON at line {exc.lineno}, '
            f'column {exc.colno}: {exc.msg}'
        ) from exc
    if not isinstance(payload, dict):
        raise LessonGenerationError('Groq must return a JSON object.')
    return payload


def generate_json(messages, schema=None, max_tokens=5000, temperature=0.15):
    if Groq is None:
        raise LessonGenerationError('The Groq client is not installed. Run pip install -r requirements.txt.')
    # GROK_API_KEY is accepted for compatibility with the existing .env typo.
    api_key = os.getenv('GROQ_API_KEY') or os.getenv('GROK_API_KEY')
    if not api_key:
        raise LessonGenerationError(
            'A Groq API key is not configured. Set GROQ_API_KEY in '
            'Backend_app/app/.env and restart the backend.'
        )

    model = os.getenv('GROQ_LESSON_MODEL', DEFAULT_MODEL)
    request_messages = list(messages)
    if schema:
        request_messages = [
            *request_messages,
            {
                'role': 'system',
                'content': (
                    'Return only one valid JSON object. The response must '
                    f'conform to this JSON schema: {json.dumps(schema)}'
                ),
            },
        ]

    try:
        response = Groq(api_key=api_key).chat.completions.create(
            model=model,
            messages=request_messages,
            response_format={'type': 'json_object'},
            max_tokens=max_tokens,
            temperature=temperature,
        )
        if not response.choices:
            raise LessonGenerationError('Groq returned no completion choices.')
        payload = _extract_json_object(response.choices[0].message.content)
        return payload, model
    except LessonGenerationError:
        raise
    except Exception as exc:
        error_text = str(exc)
        if '401' in error_text or 'unauthorized' in error_text.lower():
            raise LessonGenerationError(
                'Groq rejected the configured API key. Check GROQ_API_KEY '
                'and restart the backend.'
            ) from exc
        raise LessonGenerationError(
            f'Groq lesson generation failed: {error_text}'
        ) from exc
