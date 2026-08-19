import json
import logging
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.utils import timezone


logger = logging.getLogger(__name__)

REDACTED = '[REDACTED]'
SENSITIVE_KEYS = {
    'token',
    'api_key',
    'authorization',
    'headers',
    'request_headers',
    'password',
    'access_token',
    'refresh_token',
    'secret',
}


def _safe_value(value):
    """Return a JSON-safe copy with secret-like dictionary fields redacted."""
    if isinstance(value, dict):
        safe = {}
        for key, item in value.items():
            key_text = str(key)
            if key_text.lower() in SENSITIVE_KEYS:
                safe[key_text] = REDACTED
            else:
                safe[key_text] = _safe_value(item)
        return safe

    if isinstance(value, (list, tuple, set)):
        return [_safe_value(item) for item in value]

    if value is None or isinstance(value, (str, int, float, bool)):
        return value

    return str(value)


def log_lesson_generation(
    *,
    user,
    lesson,
    attempt,
    model_name=None,
    provider=None,
    messages=None,
    raw_response=None,
    normalized_payload=None,
    validation_status=None,
    validation_error=None,
    succeeded=False,
    generated_lesson_id=None,
):
    """Write one safe diagnostic record, without affecting generation."""
    if not getattr(settings, 'LLM_GENERATION_LOGGING_ENABLED', True):
        return None

    try:
        now = timezone.now()
        day_directory = (
            Path(settings.BASE_DIR)
            / 'llm_logs'
            / 'lesson_generations'
            / now.strftime('%Y-%m-%d')
        )
        day_directory.mkdir(parents=True, exist_ok=True)

        user_id = getattr(user, 'pk', None)
        lesson_id = getattr(lesson, 'pk', None)
        filename = (
            f'lesson_{lesson_id}'
            f'_user_{user_id}_attempt_{attempt}_'
            f'{now.strftime("%Y%m%d_%H%M%S_%f")}_{uuid4().hex[:8]}.json'
        )
        path = day_directory / filename

        logged_messages = messages
        if not getattr(settings, 'LLM_GENERATION_LOG_PROMPTS', True):
            logged_messages = '[prompt logging disabled]'

        record = _safe_value({
            'timestamp': now.isoformat(),
            'attempt': attempt,
            'user': {'id': user_id},
            'lesson': {
                'id': lesson_id,
                'title': getattr(lesson, 'title', None),
            },
            'model': {
                'name': model_name,
                'provider': provider,
            },
            'messages': logged_messages,
            'raw_response': raw_response,
            'normalized_payload': normalized_payload,
            'validation': {
                'status': validation_status,
                'error': validation_error,
            },
            'succeeded': succeeded,
            'generated_lesson_id': generated_lesson_id,
        })

        with path.open('x', encoding='utf-8') as log_file:
            json.dump(
                record,
                log_file,
                ensure_ascii=False,
                indent=2,
                default=str,
            )
        return path
    except Exception:
        logger.exception('Unable to write lesson generation log.')
        return None
