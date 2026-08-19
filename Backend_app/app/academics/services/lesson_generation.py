# from django.db.models import Avg, Count, Q

# from academics.models import ActivityAttempt, GeneratedLesson

# from .huggingface_client import generate_json
# from .lesson_schema import LESSON_JSON_SCHEMA, validate_lesson_payload
# from .prompts import LESSON_SYSTEM_PROMPT, build_lesson_prompt


# def _float_or_none(value):
#     return float(value) if value is not None else None


# def build_user_context(user):
#     profile = getattr(user, 'learner_profile', None)
#     attempts = ActivityAttempt.objects.filter(user=user)
#     incorrect = attempts.filter(is_correct=False).order_by('-updated_at')[:20]
#     skill_rows = attempts.values('skill').annotate(
#         total=Count('id'), correct=Count('id', filter=Q(is_correct=True))
#     )
#     skill_scores = {
#         row['skill'] or 'general': round((row['correct'] / row['total']) * 100)
#         for row in skill_rows if row['total']
#     }
#     ordered_skills = sorted(skill_scores, key=skill_scores.get)
#     aggregates = attempts.aggregate(
#         average_response_time=Avg('response_time_ms'),
#         speaking_score=Avg('pronunciation_score'),
#         writing_score=Avg('writing_score'),
#     )
#     return {
#         'known_language': getattr(getattr(profile, 'known_language', None), 'name', user.preferred_language),
#         'target_language': getattr(getattr(profile, 'target_language', None), 'name', user.target_language),
#         'motivation': user.get_motivation_display(),
#         'study_time_per_day': user.get_study_time_display(),
#         'completed_lessons': GeneratedLesson.objects.filter(user=user, completed_at__isnull=False).count(),
#         'weak_skills': ordered_skills[:2], 'strong_skills': list(reversed(ordered_skills[-2:])),
#         'skill_scores': skill_scores,
#         'previous_mistakes': [
#             {'activity_type': item.activity_type, 'answer': item.user_answer, 'correction': item.correct_answer, 'feedback': item.mistake_feedback}
#             for item in incorrect
#         ],
#         'average_response_time_ms': round(aggregates['average_response_time'] or 0),
#         'speaking_score': _float_or_none(aggregates['speaking_score']),
#         'writing_score': _float_or_none(aggregates['writing_score']),
#         'hint_usage_count': attempts.filter(hint_used=True).count(),
#         'audio_replay_count': sum(attempts.values_list('audio_replay_count', flat=True)),
#     }


# def build_lesson_context(lesson):
#     curriculum = lesson.category.curriculum
#     return {
#         'lesson_id': lesson.id, 'curriculum': curriculum.title,
#         'category': lesson.category.name, 'lesson_title': lesson.title,
#         'lesson_description': lesson.description,
#         'lesson_objectives': [lesson.description] if lesson.description else [],
#         'target_vocabulary': [], 'grammar_concepts': [],
#         'estimated_duration_minutes': lesson.estimated_minutes,
#         'lesson_difficulty': lesson.category.level.name,
#         'target_language': curriculum.target_language.name,
#         'target_language_code': curriculum.target_language.code,
#         'explanation_language': curriculum.explanation_language.name,
#         'explanation_language_code': curriculum.explanation_language.code,
#     }


# def generate_lesson(user, lesson):
#     lesson_context = build_lesson_context(lesson)
#     payload, model = generate_json(
#         messages=[
#             {'role': 'system', 'content': LESSON_SYSTEM_PROMPT},
#             {'role': 'user', 'content': build_lesson_prompt(build_user_context(user), lesson_context)},
#         ],
#         schema=LESSON_JSON_SCHEMA,
#     )
#     payload['lesson_id'] = lesson.id
#     validate_lesson_payload(payload)
#     return GeneratedLesson.objects.create(user=user, lesson=lesson, payload=payload, model_name=model)
# import copy
# import os
# import re

# from django.db.models import Avg, Count, Q, Sum

# from academics.models import ActivityAttempt, GeneratedLesson

# from .huggingface_client import generate_json, LessonGenerationError
# from .llm_generation_logger import log_lesson_generation
# from .lesson_schema import LESSON_JSON_SCHEMA, validate_lesson_payload, GENERATION_JSON_SCHEMA
# from .prompts import LESSON_SYSTEM_PROMPT, build_lesson_prompt

# RTL_LANGUAGE_CODES = {
#     'ar',
#     'fa',
#     'he',
#     'ur',
#     'ps',
#     'sd',
# }


# AUDIO_LOCALE_MAP = {
#     'en': 'en-US',
#     'hi': 'hi-IN',
#     'te': 'te-IN',
#     'ta': 'ta-IN',
#     'kn': 'kn-IN',
#     'ml': 'ml-IN',
#     'mr': 'mr-IN',
#     'bn': 'bn-IN',
#     'gu': 'gu-IN',
#     'pa': 'pa-IN',
#     'ur': 'ur-IN',
#     'de': 'de-DE',
#     'fr': 'fr-FR',
#     'es': 'es-ES',
#     'it': 'it-IT',
#     'pt': 'pt-PT',
#     'ja': 'ja-JP',
#     'ko': 'ko-KR',
#     'zh': 'zh-CN',
#     'ar': 'ar-SA',
#     'ru': 'ru-RU',
# }


# SUPPORTED_ACTIVITY_TYPES = [
#     'lesson_overview',
#     'fill_in_the_blank',
#     'listen_and_select',
#     'sentence_completion',
#     'matching_words',
#     'word_arrangement',
#     'speaking_practice',
#     'translate_sentence',
# ]


# BLANK_ACTIVITY_TYPES = {
#     'fill_in_the_blank',
#     'sentence_completion',
# }


# def _normalise_blank_placeholders(payload):
#     activities = payload.get('activities', [])

#     if not isinstance(activities, list):
#         return payload

#     for activity in activities:
#         if not isinstance(activity, dict):
#             continue

#         if activity.get('activity_type') not in BLANK_ACTIVITY_TYPES:
#             continue

#         content = activity.get('content')

#         if not isinstance(content, dict):
#             continue

#         sentence = content.get('sentence')

#         if not isinstance(sentence, str):
#             continue

#         sentence = sentence.strip()

#         blank_count = sentence.count('{{blank}}')

#         if blank_count == 1:
#             continue

#         # Replace common LLM blank formats.
#         patterns = [
#             r'\[\s*blank\s*\]',
#             r'\{\s*blank\s*\}',
#             r'<\s*blank\s*>',
#             r'\(\s*blank\s*\)',
#             r'_{2,}',
#             r'\.{3,}',
#         ]

#         replaced = False

#         for pattern in patterns:
#             if re.search(pattern, sentence, flags=re.IGNORECASE):
#                 sentence = re.sub(
#                     pattern,
#                     '{{blank}}',
#                     sentence,
#                     count=1,
#                     flags=re.IGNORECASE,
#                 )
#                 replaced = True
#                 break

#         # If several valid placeholders were generated, keep only the first.
#         if sentence.count('{{blank}}') > 1:
#             first_placeholder = True

#             def remove_extra_placeholders(match):
#                 nonlocal first_placeholder

#                 if first_placeholder:
#                     first_placeholder = False
#                     return '{{blank}}'

#                 return ''

#             sentence = re.sub(
#                 r'\{\{blank\}\}',
#                 remove_extra_placeholders,
#                 sentence,
#             )

#         content['sentence'] = sentence

#     return payload

    
# def _float_or_none(value):
#     """
#     Convert Decimal or another numeric value to float.

#     JSON serialization can fail when Decimal values are returned directly.
#     """
#     return float(value) if value is not None else None


# def _language_name(value, fallback=None):
#     """
#     Return a readable language name from either:
#     - a Language model instance,
#     - a string,
#     - or None.
#     """
#     if value is None:
#         return fallback

#     return getattr(value, 'name', str(value))


# def _normalise_language_code(code):
#     """
#     Convert language codes such as hi-IN, EN_us and de-DE
#     into their base codes: hi, en and de.
#     """
#     if not code:
#         return ''

#     return str(code).strip().lower().replace('_', '-').split('-')[0]


# def _get_text_direction(language_code):
#     """
#     Return the writing direction for the target language.
#     """
#     code = _normalise_language_code(language_code)

#     return 'rtl' if code in RTL_LANGUAGE_CODES else 'ltr'


# def _get_audio_locale(language_code):
#     """
#     Return a browser-compatible speech synthesis locale.

#     Unknown language codes are returned unchanged instead of incorrectly
#     falling back to English.
#     """
#     base_code = _normalise_language_code(language_code)

#     return AUDIO_LOCALE_MAP.get(base_code, str(language_code))


# def _get_display_value(instance, field_name):
#     """
#     Return the display label for a Django choices field when available.

#     For example:
#         motivation='career'
#         get_motivation_display() -> 'Career Growth'

#     Falls back to the raw field value if no display method exists.
#     """
#     display_method = getattr(
#         instance,
#         f'get_{field_name}_display',
#         None,
#     )

#     if callable(display_method):
#         return display_method()

#     return getattr(instance, field_name, None)


# def build_user_context(user):
#     """
#     Build the learner context sent to the LLM.

#     This function is compatible with the provided ActivityAttempt and
#     GeneratedLesson models.
#     """
#     profile = getattr(user, 'learner_profile', None)

#     attempts = ActivityAttempt.objects.filter(user=user)

#     incorrect_attempts = list(
#         attempts
#         .filter(is_correct=False, skipped=False)
#         .order_by('-updated_at')[:20]
#     )

#     skill_rows = (
#         attempts
#         .exclude(skill='')
#         .values('skill')
#         .annotate(
#             total=Count('id'),
#             correct=Count(
#                 'id',
#                 filter=Q(is_correct=True),
#             ),
#         )
#     )

#     skill_scores = {
#         row['skill'] or 'general': round(
#             (row['correct'] / row['total']) * 100
#         )
#         for row in skill_rows
#         if row['total']
#     }

#     ordered_skills = sorted(
#         skill_scores,
#         key=skill_scores.get,
#     )

#     weak_skills = ordered_skills[:2]

#     strong_skills = [
#         skill
#         for skill in reversed(ordered_skills)
#         if skill not in weak_skills
#     ][:2]

#     aggregates = attempts.aggregate(
#         average_response_time=Avg('response_time_ms'),
#         speaking_score=Avg('pronunciation_score'),
#         writing_score=Avg('writing_score'),
#         audio_replay_count=Sum('audio_replay_count'),
#     )

#     total_attempts = attempts.count()
#     skipped_attempts = attempts.filter(skipped=True).count()
#     hint_usage_count = attempts.filter(hint_used=True).count()

#     average_response_time = aggregates['average_response_time']

#     profile_known_language = getattr(
#         profile,
#         'known_language',
#         None,
#     )
#     profile_target_language = getattr(
#         profile,
#         'target_language',
#         None,
#     )

#     user_known_language = getattr(
#         user,
#         'preferred_language',
#         None,
#     )
#     user_target_language = getattr(
#         user,
#         'target_language',
#         None,
#     )

#     return {
#         'known_language': _language_name(
#             profile_known_language,
#             fallback=_language_name(user_known_language),
#         ),
#         'target_language': _language_name(
#             profile_target_language,
#             fallback=_language_name(user_target_language),
#         ),
#         'motivation': _get_display_value(
#             user,
#             'motivation',
#         ),
#         'study_time_per_day': _get_display_value(
#             user,
#             'study_time',
#         ),
#         'completed_lessons': (
#             GeneratedLesson.objects
#             .filter(
#                 user=user,
#                 completed_at__isnull=False,
#             )
#             .values('lesson_id')
#             .distinct()
#             .count()
#         ),
#         'total_attempts': total_attempts,
#         'skipped_attempts': skipped_attempts,
#         'weak_skills': weak_skills,
#         'strong_skills': strong_skills,
#         'skill_scores': skill_scores,
#         'previous_mistakes': [
#             {
#                 'activity_id': item.activity_id,
#                 'activity_type': item.activity_type,
#                 'skill': item.skill or 'general',
#                 'user_answer': item.user_answer,
#                 'correct_answer': item.correct_answer,
#                 'feedback': item.mistake_feedback,
#                 'attempt_count': item.attempt_count,
#                 'concept_mastery': item.concept_mastery,
#             }
#             for item in incorrect_attempts
#         ],
#         'average_response_time_ms': (
#             round(average_response_time)
#             if average_response_time is not None
#             else None
#         ),
#         'speaking_score': _float_or_none(
#             aggregates['speaking_score']
#         ),
#         'writing_score': _float_or_none(
#             aggregates['writing_score']
#         ),
#         'hint_usage_count': hint_usage_count,
#         'hint_usage_rate': (
#             round((hint_usage_count / total_attempts) * 100, 2)
#             if total_attempts
#             else None
#         ),
#         'audio_replay_count': (
#             aggregates['audio_replay_count'] or 0
#         ),
#     }


# def build_lesson_context(lesson):
#     """
#     Build trusted lesson and curriculum information from the database.

#     Compatible relationships:
#         Lesson -> LessonCategory -> Curriculum
#         LessonCategory -> DifficultyLevel
#         Curriculum -> target_language
#         Curriculum -> explanation_language
#     """
#     category = lesson.category
#     curriculum = category.curriculum

#     target_language = curriculum.target_language
#     explanation_language = curriculum.explanation_language

#     target_language_code = target_language.code
#     explanation_language_code = explanation_language.code

#     lesson_contents = list(
#         lesson.contents
#         .filter(
#             target_language=target_language,
#             explanation_language=explanation_language,
#         )
#         .values(
#             'title',
#             'content_text',
#             'explanation_text',
#             'example_text',
#             'audio_url',
#             'video_url',
#             'image_url',
#         )
#     )

#     return {
#         'lesson_id': lesson.id,
#         'curriculum': curriculum.title,
#         'curriculum_description': curriculum.description or '',
#         'category': category.name,
#         'category_description': category.description or '',
#         'lesson_title': lesson.title,
#         'lesson_description': lesson.description or '',
#         'lesson_objectives': (
#             [lesson.description]
#             if lesson.description
#             else []
#         ),
#         'target_vocabulary': [],
#         'grammar_concepts': [],
#         'reference_contents': lesson_contents,
#         'estimated_duration_minutes': lesson.estimated_minutes,
#         'lesson_difficulty': category.level.name,
#         'difficulty_order': category.level.order_no,
#         'target_language': target_language.name,
#         'target_language_code': target_language_code,
#         'explanation_language': explanation_language.name,
#         'explanation_language_code': explanation_language_code,
#         'direction': _get_text_direction(
#             target_language_code
#         ),
#         'audio_locale': _get_audio_locale(
#             target_language_code
#         ),
#         'supported_activity_types': SUPPORTED_ACTIVITY_TYPES,
#     }


# def _apply_trusted_lesson_metadata(payload, lesson_context):
#     """
#     Replace LLM-generated metadata with trusted database values.

#     The LLM should generate activity content, but it must not control:
#     - database IDs,
#     - language identity,
#     - language codes,
#     - text direction,
#     - or speech locale.
#     """
#     payload['lesson_id'] = lesson_context['lesson_id']
#     payload['title'] = lesson_context['lesson_title']
#     payload['target_language'] = lesson_context['target_language']
#     payload['explanation_language'] = (
#         lesson_context['explanation_language']
#     )
#     payload['target_language_code'] = (
#         lesson_context['target_language_code']
#     )
#     payload['explanation_language_code'] = (
#         lesson_context['explanation_language_code']
#     )
#     payload['direction'] = lesson_context['direction']
#     payload['audio_locale'] = lesson_context['audio_locale']

#     return payload


# def _normalise_option_ids(payload):
#     activities = payload.get('activities', [])

#     if not isinstance(activities, list):
#         return payload

#     for activity in activities:
#         if not isinstance(activity, dict):
#             continue

#         content = activity.get('content')

#         if not isinstance(content, dict):
#             continue

#         options = content.get('options')

#         if not isinstance(options, list):
#             continue

#         normalised_options = []

#         for index, option in enumerate(options, start=1):
#             option_id = f'option_{index}'

#             # Convert a simple string option into an object.
#             if isinstance(option, str):
#                 normalised_options.append({
#                     'id': option_id,
#                     'text': option,
#                 })
#                 continue

#             if not isinstance(option, dict):
#                 continue

#             normalised_option = {
#                 **option,
#                 'id': str(option.get('id') or option_id),
#             }

#             normalised_options.append(normalised_option)

#         content['options'] = normalised_options

#         # Repair correct_option_id when the model used an index,
#         # answer text, or omitted the ID.
#         correct_option_id = content.get('correct_option_id')

#         if isinstance(correct_option_id, int):
#             option_index = correct_option_id

#             # Support both 0-based and 1-based values.
#             if 1 <= option_index <= len(normalised_options):
#                 content['correct_option_id'] = (
#                     normalised_options[option_index - 1]['id']
#                 )
#             elif 0 <= option_index < len(normalised_options):
#                 content['correct_option_id'] = (
#                     normalised_options[option_index]['id']
#                 )

#         elif isinstance(correct_option_id, str):
#             valid_ids = {
#                 option['id']
#                 for option in normalised_options
#             }

#             if correct_option_id not in valid_ids:
#                 matching_option = next(
#                     (
#                         option
#                         for option in normalised_options
#                         if option.get('text') == correct_option_id
#                     ),
#                     None,
#                 )

#                 if matching_option:
#                     content['correct_option_id'] = (
#                         matching_option['id']
#                     )

#     return payload

# def generate_lesson(user, lesson):
#     user_context = build_user_context(user)
#     lesson_context = build_lesson_context(lesson)

#     last_error = None
#     provider = os.getenv('HF_INFERENCE_PROVIDER', 'auto')

#     for attempt_number in range(1, 4):
#         model_name = None
#         raw_payload = None
#         normalized_payload = None
#         messages = None
#         try:
#             retry_instruction = ''

#             if last_error:
#                 retry_instruction = (
#                     '\n\nYour previous response was invalid.\n'
#                     f'Validation error: {last_error}\n'
#                     'Correct the structure and use only the supported '
#                     'activity types.'
#                 )

#             prompt = (
#                 build_lesson_prompt(user_context, lesson_context)
#                 + retry_instruction
#             )
#             messages = [
#                 {'role': 'system', 'content': LESSON_SYSTEM_PROMPT},
#                 {'role': 'user', 'content': prompt},
#             ]

#             payload, model_name = generate_json(
#                 messages,
#                 schema=GENERATION_JSON_SCHEMA,
#                 max_tokens=5000,
#                 temperature=0.15,
#             )
#             raw_payload = copy.deepcopy(payload)

#             payload = _apply_trusted_lesson_metadata(
#                 payload,
#                 lesson_context,
#             )

#             # Repair predictable LLM formatting mistakes.
#             payload = _normalise_blank_placeholders(payload)
#             payload = _normalise_option_ids(payload)
#             normalized_payload = copy.deepcopy(payload)

#             # Perform strict validation after normalization.
#             validate_lesson_payload(payload)

#             generated = GeneratedLesson.objects.create(
#                 user=user,
#                 lesson=lesson,
#                 payload=payload,
#                 model_name=model_name,
#             )
#             log_lesson_generation(
#                 user=user, lesson=lesson, attempt=attempt_number,
#                 model_name=model_name, provider=provider, messages=messages,
#                 raw_response=raw_payload,
#                 normalized_payload=normalized_payload,
#                 validation_status='passed', validation_error=None,
#                 succeeded=True, generated_lesson_id=generated.id,
#             )
#             return generated

#         except ValueError as exc:
#             last_error = exc
#             log_lesson_generation(
#                 user=user, lesson=lesson, attempt=attempt_number,
#                 model_name=model_name, provider=provider, messages=messages,
#                 raw_response=raw_payload,
#                 normalized_payload=normalized_payload,
#                 validation_status='failed', validation_error=str(exc),
#                 succeeded=False,
#             )
#         except LessonGenerationError as exc:
#             log_lesson_generation(
#                 user=user, lesson=lesson, attempt=attempt_number,
#                 model_name=model_name, provider=provider, messages=messages,
#                 raw_response=raw_payload, normalized_payload=None,
#                 validation_status='generation_failed',
#                 validation_error=str(exc), succeeded=False,
#             )
#             raise

#     raise LessonGenerationError(
#         'The model returned an invalid lesson after 3 attempts. '
#         f'Last validation error: {last_error}'
#     )
import copy
import os
import re

from django.db.models import Avg, Count, Q, Sum

from academics.models import ActivityAttempt, DEFAULT_ACTIVITY_TYPES, GeneratedLesson

# Previous Hugging Face provider (kept for easy rollback):
# from .huggingface_client import LessonGenerationError, generate_json
from .groq_client import LessonGenerationError, generate_json
from .llm_generation_logger import log_lesson_generation
from .lesson_schema import GENERATION_JSON_SCHEMA, validate_lesson_payload
from .lesson_semantics import (
    TOPIC_ACTIVITY_GUIDANCE,
    classify_lesson_topic,
    validate_lesson_semantics,
)
from .prompts import LESSON_SYSTEM_PROMPT, build_lesson_prompt


RTL_LANGUAGE_CODES = {
    'ar', 'fa', 'he', 'ur', 'ps', 'sd',
}

AUDIO_LOCALE_MAP = {
    'en': 'en-US', 'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN',
    'kn': 'kn-IN', 'ml': 'ml-IN', 'mr': 'mr-IN', 'bn': 'bn-IN',
    'gu': 'gu-IN', 'pa': 'pa-IN', 'ur': 'ur-IN', 'de': 'de-DE',
    'fr': 'fr-FR', 'es': 'es-ES', 'it': 'it-IT', 'pt': 'pt-PT',
    'ja': 'ja-JP', 'ko': 'ko-KR', 'zh': 'zh-CN', 'ar': 'ar-SA',
    'ru': 'ru-RU',
}

SUPPORTED_ACTIVITY_TYPES = DEFAULT_ACTIVITY_TYPES

BLANK_ACTIVITY_TYPES = {
    'fill_in_the_blank',
    'sentence_completion',
}


def _float_or_none(value):
    return float(value) if value is not None else None


def _language_name(value, fallback=None):
    if value is None:
        return fallback
    return getattr(value, 'name', str(value))


def _normalise_language_code(code):
    if not code:
        return ''
    return str(code).strip().lower().replace('_', '-').split('-')[0]


def _get_text_direction(language_code):
    return 'rtl' if _normalise_language_code(language_code) in RTL_LANGUAGE_CODES else 'ltr'


def _get_audio_locale(language_code):
    base_code = _normalise_language_code(language_code)
    return AUDIO_LOCALE_MAP.get(base_code, str(language_code))


def _get_display_value(instance, field_name):
    display_method = getattr(instance, f'get_{field_name}_display', None)
    if callable(display_method):
        return display_method()
    return getattr(instance, field_name, None)


def build_user_context(user):
    profile = getattr(user, 'learner_profile', None)
    attempts = ActivityAttempt.objects.filter(user=user)

    incorrect_attempts = list(
        attempts.filter(is_correct=False, skipped=False).order_by('-updated_at')[:20]
    )

    skill_rows = (
        attempts.exclude(skill='').values('skill').annotate(
            total=Count('id'),
            correct=Count('id', filter=Q(is_correct=True)),
        )
    )

    skill_scores = {
        row['skill'] or 'general': round((row['correct'] / row['total']) * 100)
        for row in skill_rows
        if row['total']
    }

    ordered_skills = sorted(skill_scores, key=skill_scores.get)
    weak_skills = ordered_skills[:2]
    strong_skills = [s for s in reversed(ordered_skills) if s not in weak_skills][:2]

    aggregates = attempts.aggregate(
        average_response_time=Avg('response_time_ms'),
        speaking_score=Avg('pronunciation_score'),
        writing_score=Avg('writing_score'),
        audio_replay_count=Sum('audio_replay_count'),
    )

    total_attempts = attempts.count()
    skipped_attempts = attempts.filter(skipped=True).count()
    hint_usage_count = attempts.filter(hint_used=True).count()
    average_response_time = aggregates['average_response_time']

    profile_known_language = getattr(profile, 'known_language', None)
    profile_target_language = getattr(profile, 'target_language', None)
    user_known_language = getattr(user, 'preferred_language', None)
    user_target_language = getattr(user, 'target_language', None)

    context = {
        'known_language': _language_name(
            profile_known_language,
            fallback=_language_name(user_known_language),
        ),
        'target_language': _language_name(
            profile_target_language,
            fallback=_language_name(user_target_language),
        ),
        'motivation': _get_display_value(user, 'motivation'),
        'study_time_per_day': _get_display_value(user, 'study_time'),
        'completed_lessons': (
            GeneratedLesson.objects.filter(user=user, completed_at__isnull=False)
            .values('lesson_id').distinct().count()
        ),
        'total_attempts': total_attempts,
        'skipped_attempts': skipped_attempts,
        'weak_skills': weak_skills,
        'strong_skills': strong_skills,
        'skill_scores': skill_scores,
        'previous_mistakes': [
            {
                'activity_id': item.activity_id,
                'activity_type': item.activity_type,
                'skill': item.skill or 'general',
                'user_answer': item.user_answer,
                'correct_answer': item.correct_answer,
                'feedback': item.mistake_feedback,
                'attempt_count': item.attempt_count,
                'concept_mastery': item.concept_mastery,
            }
            for item in incorrect_attempts
        ],
        'average_response_time_ms': round(average_response_time) if average_response_time is not None else None,
        'speaking_score': _float_or_none(aggregates['speaking_score']),
        'writing_score': _float_or_none(aggregates['writing_score']),
        'hint_usage_count': hint_usage_count,
        'hint_usage_rate': round((hint_usage_count / total_attempts) * 100, 2) if total_attempts else None,
        'audio_replay_count': aggregates['audio_replay_count'] or 0,
    }
    return context


def build_lesson_context(lesson):
    category = lesson.category
    curriculum = category.curriculum
    target_language = curriculum.target_language
    explanation_language = curriculum.explanation_language

    lesson_contents = list(
        lesson.contents.filter(
            target_language=target_language,
            explanation_language=explanation_language,
        ).values(
            'title', 'content_text', 'explanation_text', 'example_text',
            'audio_url', 'video_url', 'image_url',
        )
    )

    context = {
        'lesson_id': lesson.id,
        'curriculum': curriculum.title,
        'curriculum_description': curriculum.description or '',
        'category': category.name,
        'category_description': category.description or '',
        'lesson_title': lesson.title,
        'lesson_description': lesson.description or '',
        'lesson_objectives': lesson.learning_objectives or ([lesson.description] if lesson.description else []),
        'target_vocabulary': lesson.vocabulary,
        'grammar_concepts': lesson.grammar_topics,
        'skills': lesson.skills,
        'generation_instructions': lesson.generation_instructions,
        'minimum_activities': lesson.minimum_activities,
        'maximum_activities': lesson.maximum_activities,
        'reference_contents': lesson_contents,
        'estimated_duration_minutes': lesson.estimated_minutes,
        'lesson_difficulty': category.level.name,
        'difficulty_order': category.level.order_no,
        'target_language': target_language.name,
        'target_language_code': target_language.code,
        'explanation_language': explanation_language.name,
        'explanation_language_code': explanation_language.code,
        'direction': _get_text_direction(target_language.code),
        'audio_locale': _get_audio_locale(target_language.code),
        'supported_activity_types': [
            value for value in lesson.allowed_activity_types if value in SUPPORTED_ACTIVITY_TYPES
        ],
    }
    topic = classify_lesson_topic(context)
    context['lesson_topic'] = topic
    context['preferred_activity_types'] = TOPIC_ACTIVITY_GUIDANCE[topic]['preferred']
    context['disallowed_activity_types'] = TOPIC_ACTIVITY_GUIDANCE[topic]['disallowed']
    context['supported_activity_types'] = [
        value for value in context['supported_activity_types']
        if value not in context['disallowed_activity_types']
    ] or list(lesson.allowed_activity_types)
    return context


def _apply_trusted_lesson_metadata(payload, lesson_context):
    if not isinstance(payload, dict):
        raise ValueError('Generated lesson payload must be an object.')

    payload['lesson_id'] = lesson_context['lesson_id']
    payload['title'] = lesson_context['lesson_title']
    payload['target_language'] = lesson_context['target_language']
    payload['explanation_language'] = lesson_context['explanation_language']
    payload['target_language_code'] = lesson_context['target_language_code']
    payload['explanation_language_code'] = lesson_context['explanation_language_code']
    payload['direction'] = lesson_context['direction']
    payload['audio_locale'] = lesson_context['audio_locale']
    return payload


def _normalise_activity_ids(payload):
    activities = payload.get('activities', [])
    if not isinstance(activities, list):
        return payload

    used_ids = set()
    for index, activity in enumerate(activities, start=1):
        if not isinstance(activity, dict):
            continue
        activity_id = str(activity.get('id') or f'activity_{index}')
        if not activity_id.startswith('activity_'):
            activity_id = f'activity_{activity_id}'
        while activity_id in used_ids:
            activity_id = f'activity_{index}_{len(used_ids) + 1}'
        activity['id'] = activity_id
        used_ids.add(activity_id)
    return payload


def _normalise_blank_placeholders(payload):
    activities = payload.get('activities', [])
    if not isinstance(activities, list):
        return payload

    for activity in activities:
        if not isinstance(activity, dict) or activity.get('activity_type') not in BLANK_ACTIVITY_TYPES:
            continue
        content = activity.get('content')
        if not isinstance(content, dict):
            continue
        sentence = content.get('sentence')
        if not isinstance(sentence, str):
            continue

        sentence = sentence.strip()
        patterns = [
            r'\{\s*(?:blank|_+)\s*\}',
            r'\[\s*(?:blank|_+)\s*\]',
            r'\(\s*(?:blank|_+)\s*\)',
            r'<\s*(?:blank|_+)\s*>',
            r'_{2,}',
            r'\.{3,}',
        ]

        if sentence.count('{{blank}}') != 1:
            for pattern in patterns:
                if re.search(pattern, sentence, flags=re.IGNORECASE):
                    sentence = re.sub(pattern, '{{blank}}', sentence, count=1, flags=re.IGNORECASE)
                    break

        sentence = re.sub(r'\{\s*\{\{blank\}\}\s*\}', '{{blank}}', sentence)
        sentence = re.sub(r'\[\s*\{\{blank\}\}\s*\]', '{{blank}}', sentence)
        sentence = re.sub(r'\(\s*\{\{blank\}\}\s*\)', '{{blank}}', sentence)

        if sentence.count('{{blank}}') > 1:
            first = True
            def keep_first(match):
                nonlocal first
                if first:
                    first = False
                    return '{{blank}}'
                return ''
            sentence = re.sub(r'\{\{blank\}\}', keep_first, sentence)

        content['sentence'] = sentence
    return payload


def _normalise_option_list(options):
    if not isinstance(options, list):
        return options

    normalised = []
    for index, option in enumerate(options, start=1):
        text = None
        if isinstance(option, str):
            text = option
        elif isinstance(option, dict):
            for field in ('text', 'value', 'label', 'answer', 'option_text'):
                if option.get(field) is not None:
                    text = str(option[field])
                    break
        else:
            continue

        normalised.append({
            'id': f'option_{index}',
            'text': '' if text is None else str(text),
        })
    return normalised


def _set_correct_option_id(content):
    options = content.get('options')
    if not isinstance(options, list) or not options:
        return

    valid_ids = {o.get('id') for o in options if isinstance(o, dict)}
    correct_value = content.get('correct_option_id')
    if correct_value is None:
        correct_value = content.get('correct_answer')
    content.pop('correct_answer', None)

    if isinstance(correct_value, int):
        if 1 <= correct_value <= len(options):
            content['correct_option_id'] = options[correct_value - 1]['id']
            return
        if 0 <= correct_value < len(options):
            content['correct_option_id'] = options[correct_value]['id']
            return

    if isinstance(correct_value, str):
        stripped_value = correct_value.strip()
        if stripped_value.isdigit():
            option_index = int(stripped_value)
            if 1 <= option_index <= len(options):
                content['correct_option_id'] = options[option_index - 1]['id']
                return
            if 0 <= option_index < len(options):
                content['correct_option_id'] = options[option_index]['id']
                return
        if stripped_value in valid_ids:
            content['correct_option_id'] = stripped_value
            return
        match = next((o for o in options if isinstance(o, dict) and str(o.get('text', '')).strip() == stripped_value), None)
        if match:
            content['correct_option_id'] = match['id']


def _normalise_options_with_correct_answer(content):
    """Renumber options while preserving the model's selected answer."""
    original_options = content.get('options')
    correct_value = content.get('correct_option_id', content.get('correct_answer'))
    correct_text = None
    if isinstance(original_options, list):
        for option in original_options:
            if not isinstance(option, dict):
                continue
            if option.get('id') == correct_value:
                correct_text = option.get(
                    'text',
                    option.get('label', option.get('value')),
                )
                break

    content['options'] = _normalise_option_list(original_options or [])
    if correct_text is not None:
        content['correct_option_id'] = str(correct_text)
    _set_correct_option_id(content)


def _normalise_activity_content(payload, lesson_context):
    activities = payload.get('activities', [])
    if not isinstance(activities, list):
        return payload

    for activity in activities:
        if not isinstance(activity, dict):
            continue

        activity_type = activity.get('activity_type')
        content = activity.get('content')
        if not isinstance(content, dict):
            content = {}
            activity['content'] = content

        if activity_type == 'lesson_overview':
            content.setdefault('module_name', payload.get('title') or lesson_context['lesson_title'])
            content.setdefault('level', activity.get('difficulty') or lesson_context['lesson_difficulty'])
            content.setdefault('description', content.pop('text', payload.get('description') or lesson_context['lesson_description']))
            content.setdefault('duration_minutes', lesson_context['estimated_duration_minutes'] or 5)
            content.setdefault('reward_xp', activity.get('xp') or 10)
            content.setdefault('objectives', lesson_context['lesson_objectives'] or [activity.get('instruction', '')])
            content.setdefault('cover_image_prompt', '')

        elif activity_type == 'fill_in_the_blank':
            content['options'] = _normalise_option_list(content.get('options', []))
            correct_answer = content.get('correct_answer')
            correct_answers = content.get('correct_answers')
            if not isinstance(correct_answers, list):
                if correct_answer is None:
                    correct_answers = []
                elif isinstance(correct_answer, list):
                    correct_answers = correct_answer
                else:
                    correct_answers = [correct_answer]
            content['correct_answers'] = correct_answers
            content.pop('correct_answer', None)
            content.setdefault('input_mode', 'select' if content['options'] else 'text')
            content.setdefault('translation', '')
            content.setdefault('case_sensitive', False)

        elif activity_type == 'listen_and_select':
            _normalise_options_with_correct_answer(content)
            correct_option = next(
                (option for option in content['options'] if option['id'] == content.get('correct_option_id')),
                None,
            )
            audio_text = str(
                content.get('audio_text') or content.get('prompt_text') or ''
            ).strip()
            matching_audio_option = next(
                (
                    option for option in content['options']
                    if str(option.get('text') or '').strip().casefold() == audio_text.casefold()
                ),
                None,
            ) if audio_text else None
            if matching_audio_option:
                # The spoken text is authoritative when it is one of the choices.
                content['correct_option_id'] = matching_audio_option['id']
                content['audio_text'] = matching_audio_option['text']
            else:
                # Keep the activity playable when the model emits unrelated audio.
                content['audio_text'] = (correct_option or {}).get('text') or ''
            content.pop('prompt_text', None)
            content.setdefault('audio_speed_options', ['slow', 'normal'])
            content.pop('audio', None)

        elif activity_type == 'sentence_completion':
            _normalise_options_with_correct_answer(content)
            content.setdefault('translation', '')

        elif activity_type == 'matching_words':
            if not content.get('left_items') and isinstance(content.get('matching_pairs'), list):
                left_items, right_items, correct_pairs = [], [], []
                for index, pair in enumerate(content['matching_pairs'], start=1):
                    if isinstance(pair, dict):
                        left_value = pair.get('left')
                        right_value = pair.get('right')
                    elif isinstance(pair, (list, tuple)) and len(pair) >= 2:
                        left_value, right_value = pair[0], pair[1]
                    else:
                        continue
                    if left_value is None or right_value is None:
                        continue
                    left_id = f'left_{index}'
                    right_id = f'right_{index}'
                    left_items.append({'id': left_id, 'text': str(left_value), 'transliteration': None, 'item_type': 'word'})
                    right_items.append({'id': right_id, 'item_type': 'text', 'meaning': str(right_value)})
                    correct_pairs.append({'left_id': left_id, 'right_id': right_id})
                content['left_items'] = left_items
                content['right_items'] = right_items
                content['correct_pairs'] = correct_pairs
            content.pop('matching_pairs', None)

        elif activity_type == 'word_arrangement':
            if not content.get('word_bank') and isinstance(content.get('tokens'), list):
                content['word_bank'] = content['tokens']

            original_bank = content.get('word_bank', [])
            id_map = {}
            normalised_bank = []
            if isinstance(original_bank, list):
                for index, item in enumerate(original_bank, start=1):
                    new_id = f'word_{index}'
                    if isinstance(item, dict):
                        text = item.get('text', item.get('value', ''))
                        if item.get('id') is not None:
                            id_map[str(item['id'])] = new_id
                    else:
                        text = item
                    normalised_bank.append({'id': new_id, 'text': str(text)})
            content['word_bank'] = normalised_bank

            requested_order = content.get('correct_order')
            if not isinstance(requested_order, list):
                requested_order = content.get('correct_answer')
            if isinstance(requested_order, list):
                unused_ids = [item['id'] for item in normalised_bank]
                normalised_order = []
                for value in requested_order:
                    mapped_id = id_map.get(str(value))
                    if mapped_id in unused_ids:
                        normalised_order.append(mapped_id)
                        unused_ids.remove(mapped_id)
                        continue
                    match = next(
                        (
                            item for item in normalised_bank
                            if item['id'] in unused_ids
                            and item['text'] == str(value)
                        ),
                        None,
                    )
                    if match:
                        normalised_order.append(match['id'])
                        unused_ids.remove(match['id'])
                content['correct_order'] = normalised_order
            content.setdefault('source_sentence', activity.get('instruction') or '')
            content.pop('tokens', None)
            content.pop('correct_answer', None)

        elif activity_type == 'speaking_practice':
            accepted = content.get('accepted_answers')
            default_phrase = accepted[0] if isinstance(accepted, list) and accepted else (
                content.get('phrase') or content.get('target_text') or content.get('word')
                or content.get('text') or content.get('prompt_text', '')
            )
            content.setdefault('phrase', default_phrase)
            content['phrase'] = str(content['phrase']).strip()
            content.setdefault('transliteration', '')
            content.setdefault('meaning', activity.get('instruction') or '')
            content.setdefault('language_code', lesson_context.get('audio_locale') or lesson_context.get('target_language_code'))
            content.setdefault('audio_speed_options', ['slow', 'normal'])
            content.setdefault('recording_duration_seconds', 5)
            content.setdefault('pronunciation_tip', content.get('pronunciation_tips', ''))
            content.setdefault('evaluation', {'minimum_accuracy': 80, 'metrics': ['accuracy']})
            content.pop('prompt_text', None)
            content.pop('target_text', None)
            content.pop('word', None)
            content.pop('text', None)
            content.pop('accepted_answers', None)
            content.pop('pronunciation_tips', None)

        elif activity_type == 'translate_sentence':
            _normalise_options_with_correct_answer(content)
            content.setdefault('source_language', 'explanation')
            content.setdefault('transliteration', None)

    return payload


def _normalise_generated_payload(payload, lesson_context):
    payload = _apply_trusted_lesson_metadata(payload, lesson_context)
    payload = _normalise_activity_ids(payload)
    payload = _normalise_blank_placeholders(payload)

    return payload


def _normalise_generated_payload(payload, lesson_context):
    payload = _apply_trusted_lesson_metadata(payload, lesson_context)
    payload = _normalise_activity_ids(payload)
    payload = _normalise_blank_placeholders(payload)
    payload = _normalise_activity_content(payload, lesson_context)
    return payload


def generate_lesson(user, lesson, generated_lesson=None):
    from .lesson_fallback import get_or_create_fallback_lesson
    return get_or_create_fallback_lesson(user, lesson)
