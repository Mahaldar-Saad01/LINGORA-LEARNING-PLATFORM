# import json
# import os

# from huggingface_hub import InferenceClient


# DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct"


# class LessonGenerationError(RuntimeError):
#     pass


# def generate_json(messages, schema=None, max_tokens=5000, temperature=0.35):
#     token =os.getenv('HUGGINGFACEHUB_API_TOKEN')
        
#     if not token:
#         raise LessonGenerationError(
#             'A Hugging Face token is not configured. Set HF_TOKEN in Backend_app/app/.env.'
#         )

#     model = os.getenv('HF_LESSON_MODEL', DEFAULT_MODEL)
#     client = InferenceClient(
#         provider="auto",
#         api_key=token,
#     )
#     response_format = (
#         {'type': 'json_schema', 'json_schema': schema}
#         if schema else {'type': 'json_object'}
#     )
#     try:
#         response = client.chat_completion(
#             model=model,
#             messages=messages,
#             response_format=response_format,
#             max_tokens=max_tokens,
#             temperature=temperature,
#         )
#         content = response.choices[0].message.content
#         return json.loads(content), model
#     except Exception as exc:
#         error_text = str(exc)
#         if 'token not valid' in error_text.lower() or 'unauthorized' in error_text.lower() or '401' in error_text:
#             raise LessonGenerationError(
#                 'Hugging Face rejected the configured token. Create a new user access token, '
#                 'set it as HF_TOKEN in Backend_app/app/.env, and restart the backend.'
#             ) from exc
#         raise LessonGenerationError(f'Hugging Face lesson generation failed: {exc}') from exc
import json
import os
import re

from huggingface_hub import InferenceClient


# DEFAULT_MODEL = 'Qwen/Qwen2.5-7B-Instruct'


class LessonGenerationError(RuntimeError):
    """Raised when Hugging Face cannot generate a usable JSON response."""


def _extract_json_object(content):
    """
    Extract and decode a JSON object from the model response.

    Structured-output mode should normally return clean JSON. The code-fence
    cleanup protects against providers that still wrap the response in
    Markdown.
    """
    if not content:
        raise LessonGenerationError(
            'Hugging Face returned an empty response.'
        )

    if isinstance(content, dict):
        return content

    text = str(content).strip()

    if text.startswith('```'):
        text = re.sub(
            r'^```(?:json)?\\s*',
            '',
            text,
            flags=re.IGNORECASE,
        )
        text = re.sub(r'\\s*```$', '', text)

    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LessonGenerationError(
            'Hugging Face returned invalid JSON. '
            f'Parsing failed at line {exc.lineno}, '
            f'column {exc.colno}: {exc.msg}'
        ) from exc

    if not isinstance(payload, dict):
        raise LessonGenerationError(
            'Hugging Face must return a JSON object.'
        )

    return payload


def _build_response_format(schema):
    """
    Build the response_format accepted by Hugging Face chat completion.

    The function accepts either a wrapped structured-output schema:

        {
            "name": "generated_language_lesson",
            "strict": True,
            "schema": {...}
        }

    or a plain JSON Schema:

        {
            "type": "object",
            "properties": {...}
        }

    When no schema is supplied, JSON-object mode is used.
    """
    if schema is None:
        return {
            'type': 'json_object',
        }

    if not isinstance(schema, dict):
        raise LessonGenerationError(
            'The structured-output schema must be a dictionary.'
        )

    if 'schema' in schema:
        schema_definition = schema.get('schema')
        schema_name = schema.get(
            'name',
            'generated_language_lesson',
        )
        strict = schema.get('strict', True)
    else:
        schema_definition = schema
        schema_name = 'generated_language_lesson'
        strict = True

    if not isinstance(schema_definition, dict):
        raise LessonGenerationError(
            'The schema definition must be a dictionary.'
        )

    return {
        'type': 'json_schema',
        'json_schema': {
            'name': schema_name,
            'strict': strict,
            'schema': schema_definition,
        },
    }


def _get_token():
    """Support both commonly used Hugging Face token variable names."""
    return (
        os.getenv('HF_TOKEN')
        or os.getenv('HUGGINGFACEHUB_API_TOKEN')
    )


def generate_json(
    messages,
    schema=None,
    max_tokens=5000,
    temperature=0.15,
):
    """
    Generate and decode a JSON object through Hugging Face.

    Pass the small GENERATION_JSON_SCHEMA here, not the full oneOf-based
    validation schema. The detailed lesson payload should still be validated
    afterward with validate_lesson_payload().
    """
    token = _get_token()

    if not token:
        raise LessonGenerationError(
            'A Hugging Face token is not configured. '
            'Set HF_TOKEN or HUGGINGFACEHUB_API_TOKEN in '
            'Backend_app/app/.env and restart the backend.'
        )

    model = os.getenv(
        'HF_LESSON_MODEL',
        DEFAULT_MODEL,
    )

    provider = os.getenv(
        'HF_INFERENCE_PROVIDER',
        'auto',
    )

    client = InferenceClient(
        provider=provider,
        api_key=token,
    )

    response_format = _build_response_format(schema)

    try:
        response = client.chat_completion(
            model=model,
            messages=messages,
            response_format=response_format,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        if not response.choices:
            raise LessonGenerationError(
                'Hugging Face returned no completion choices.'
            )

        message = response.choices[0].message
        content = getattr(message, 'content', None)
        payload = _extract_json_object(content)

        return payload, model

    except LessonGenerationError:
        raise

    except Exception as exc:
        error_text = str(exc)
        lower_error = error_text.lower()

        if (
            'token not valid' in lower_error
            or 'unauthorized' in lower_error
            or '401' in lower_error
        ):
            raise LessonGenerationError(
                'Hugging Face rejected the configured token. '
                'Create a valid user access token, set it as HF_TOKEN '
                'or HUGGINGFACEHUB_API_TOKEN, and restart the backend.'
            ) from exc

        if (
            'grammar is not valid' in lower_error
            or 'failed to compile grammar' in lower_error
        ):
            raise LessonGenerationError(
                'The selected Hugging Face provider could not compile the '
                'structured-output schema. Pass the small '
                'GENERATION_JSON_SCHEMA to generate_json(), not the full '
                'oneOf-based LESSON_JSON_SCHEMA. '
                f'Original error: {error_text}'
            ) from exc

        if '422' in lower_error:
            raise LessonGenerationError(
                'Hugging Face rejected the generation request with HTTP 422. '
                'Check that the selected provider supports structured output '
                'and that generate_json() receives the simplified generation '
                f'schema. Original error: {error_text}'
            ) from exc

        if (
            'model' in lower_error
            and (
                'not supported' in lower_error
                or 'not found' in lower_error
                or 'unavailable' in lower_error
            )
        ):
            raise LessonGenerationError(
                f'The model "{model}" is unavailable through provider '
                f'"{provider}". Choose a supported model/provider combination. '
                f'Original error: {error_text}'
            ) from exc

        raise LessonGenerationError(
            f'Hugging Face lesson generation failed: {error_text}'
        ) from exc
