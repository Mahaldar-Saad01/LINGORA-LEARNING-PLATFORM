from django.db import transaction

from academics.models import GeneratedLesson, LessonContent
from .lesson_generation import _get_audio_locale, _get_text_direction
from .lesson_schema import validate_lesson_payload


VALID_SKILLS = {'reading', 'writing', 'listening', 'speaking', 'vocabulary', 'grammar', 'pronunciation', 'comprehension'}
DEFAULT_WRONG_ANSWER_EXPLANATIONS = {
    'listen_and_select': 'The correct option matches the expression played in the audio.',
    'matching_words': 'Each word must be paired with its corresponding meaning.',
    'word_arrangement': 'The words follow the standard sentence order shown by the correct answer.',
    'fill_in_the_blank': 'The correct answer fits both the meaning and grammar of the sentence.',
    'sentence_completion': 'The correct option completes the sentence with the intended meaning and grammar.',
    'translate_sentence': 'The correct option preserves the meaning of the source sentence.',
}


def ensure_fallback_explanations(activities):
    changed = False
    for activity in activities:
        explanation = DEFAULT_WRONG_ANSWER_EXPLANATIONS.get(activity.get('activity_type'))
        content = activity.get('content')
        if explanation and isinstance(content, dict) and not content.get('explanation'):
            content['explanation'] = explanation
            changed = True
    return changed


def build_fallback_activities(lesson, content=None):
    title = f"{lesson.title} · {content.title}" if content else lesson.title
    description = (content.explanation_text if content and content.explanation_text else None) or lesson.description
    content_text_lines = [line.strip() for line in (content.content_text or '').split('\n') if line.strip()] if content else []
    vocabulary = content_text_lines or [str(value) for value in lesson.vocabulary if str(value).strip()]
    objectives = lesson.learning_objectives or [description or f'Practice {title}']
    difficulty = lesson.category.level.name.lower()
    skill = next((value for value in lesson.skills if value in VALID_SKILLS), 'vocabulary')
    activities = [{
        'id': 'activity_1', 'activity_type': 'lesson_overview', 'title': title,
        'instruction': 'Review the lesson goals.', 'difficulty': difficulty, 'skill': skill,
        'concept_tags': lesson.grammar_topics[:3], 'xp': 5, 'estimated_time': 30,
        'content': {
            'module_name': title, 'level': lesson.category.level.name,
            'description': description, 'duration_minutes': lesson.estimated_minutes,
            'reward_xp': 5, 'objectives': objectives[:6], 'cover_image_prompt': '',
        },
    }]
    practice_values = vocabulary[:4] or [title, description or title]
    if len(practice_values) == 1:
        practice_values.append(title)
    activities.append({
        'id': 'activity_2', 'activity_type': 'listen_and_select', 'title': 'Listen and choose',
        'instruction': 'Listen and select the matching expression.', 'difficulty': difficulty,
        'skill': 'listening', 'concept_tags': lesson.grammar_topics[:3], 'xp': 10,
        'estimated_time': 45,
        'content': {
            'audio_text': practice_values[0], 'transliteration': None,
            'audio_speed_options': ['slow', 'normal'],
            'options': [{'id': f'option_{index}', 'text': value} for index, value in enumerate(practice_values, 1)],
            'correct_option_id': 'option_1',
            'explanation': description or f'The first option is the expression introduced in {title}.',
        },
    })
    activities.append({
        'id': 'activity_3', 'activity_type': 'speaking_practice', 'title': 'Speak aloud',
        'instruction': 'Listen, then repeat the expression.', 'difficulty': difficulty,
        'skill': 'speaking', 'concept_tags': lesson.grammar_topics[:3], 'xp': 10,
        'estimated_time': 45,
        'content': {
            'phrase': practice_values[0], 'transliteration': None,
            'meaning': description,
            'language_code': lesson.category.curriculum.target_language.code,
            'audio_speed_options': ['slow', 'normal'],
            'recording_duration_seconds': 8, 'pronunciation_tip': None,
            'evaluation': {'minimum_accuracy': 80, 'metrics': ['accuracy']},
        },
    })
    return activities


VALID_ACTIVITY_TYPES = {
    'lesson_overview', 'listen_and_select', 'matching_words',
    'word_arrangement', 'fill_in_the_blank', 'sentence_completion',
    'translate_sentence', 'speaking_practice', 'writing_practice',
}


def sanitize_activities(activities, lesson):
    if not isinstance(activities, list):
        return build_fallback_activities(lesson)

    sanitized = []
    seen_ids = set()

    for idx, act in enumerate(activities, 1):
        if not isinstance(act, dict):
            continue

        act_type = act.get('activity_type')
        if act_type not in VALID_ACTIVITY_TYPES:
            content = act.get('content') if isinstance(act.get('content'), dict) else {}
            if 'options' in content:
                act_type = 'listen_and_select'
            elif 'phrase' in content:
                act_type = 'speaking_practice'
            elif 'words' in content:
                act_type = 'word_arrangement'
            else:
                act_type = 'lesson_overview'
            act['activity_type'] = act_type

        act_id = str(act.get('id') or f"act_{idx}").strip()
        if not act_id or act_id in seen_ids:
            act_id = f"act_{idx}"
        seen_ids.add(act_id)
        act['id'] = act_id

        if not isinstance(act.get('content'), dict):
            act['content'] = {}

        sanitized.append(act)

    if not sanitized:
        return build_fallback_activities(lesson)

    return sanitized


def ensure_minimum_activities(activities, lesson, target_content=None):
    if not isinstance(activities, list):
        activities = []

    fallback = build_fallback_activities(lesson, content=target_content)

    if len(activities) < 2:
        existing_types = {act.get('activity_type') for act in activities if isinstance(act, dict)}
        for fb_act in fallback:
            if fb_act.get('activity_type') not in existing_types:
                activities.append(fb_act)

    if len(activities) < 2:
        activities = fallback

    return activities


def ensure_lesson_content(lesson):
    curriculum = lesson.category.curriculum
    content, _ = LessonContent.objects.update_or_create(
        lesson=lesson,
        target_language=curriculum.target_language,
        explanation_language=curriculum.explanation_language,
        defaults={
            'title': lesson.title,
            'content_text': '\n'.join(str(value) for value in lesson.vocabulary),
            'explanation_text': lesson.description,
            'example_text': lesson.generation_instructions,
            'fallback_activities': build_fallback_activities(lesson),
            'is_active': True,
        },
    )
    return content


@transaction.atomic
def get_or_create_fallback_lesson(user, lesson, content_id=None):
    qs = lesson.contents.filter(
        target_language=lesson.category.curriculum.target_language,
        explanation_language=lesson.category.curriculum.explanation_language,
        is_active=True,
    ).order_by('order_no')

    target_content = None
    if content_id:
        try:
            target_content = qs.filter(pk=int(content_id)).first()
        except (TypeError, ValueError):
            target_content = None

    if not target_content:
        target_content = qs.first()

    if not target_content:
        target_content = ensure_lesson_content(lesson)

    has_stored_activities = isinstance(target_content.fallback_activities, list) and len(target_content.fallback_activities) > 0
    if has_stored_activities:
        raw_activities = target_content.fallback_activities
    else:
        raw_activities = build_fallback_activities(lesson, content=target_content)

    item_activities = sanitize_activities(raw_activities, lesson)
    if not has_stored_activities:
        item_activities = ensure_minimum_activities(item_activities, lesson, target_content=target_content)

    if ensure_fallback_explanations(item_activities):
        target_content.fallback_activities = item_activities
        target_content.save(update_fields=['fallback_activities', 'updated_at'])

    unique_activities = []
    seen = set()
    for idx, act in enumerate(item_activities, 1):
        act_id = act.get('id') or f"content_{target_content.id}_act_{idx}"
        if act_id in seen:
            act_id = f"content_{target_content.id}_act_{idx}"
        seen.add(act_id)
        act['id'] = act_id
        unique_activities.append(act)

    curriculum = lesson.category.curriculum
    payload = {
        'lesson_id': lesson.id,
        'content_id': target_content.id,
        'content_order_no': target_content.order_no,
        'title': f"{lesson.title} · {target_content.title}",
        'target_language': curriculum.target_language.name,
        'explanation_language': curriculum.explanation_language.name,
        'target_language_code': curriculum.target_language.code,
        'explanation_language_code': curriculum.explanation_language.code,
        'direction': _get_text_direction(curriculum.target_language.code),
        'audio_locale': _get_audio_locale(curriculum.target_language.code),
        'activities': unique_activities,
    }
    validate_lesson_payload(payload)

    gen_version = target_content.order_no if (target_content.order_no and target_content.order_no > 0) else 1
    generated, _ = GeneratedLesson.objects.update_or_create(
        user=user, lesson=lesson, generation_version=gen_version,
        defaults={'payload': payload, 'status': GeneratedLesson.Status.READY,
                  'completed_at': None,
                  'prompt_version': f'database-fallback-content-{target_content.id}',
                  'model_name': 'database-fallback'},
    )
    if generated.completed_at is not None or generated.payload != payload:
        generated.completed_at = None
        generated.payload = payload
        generated.status = GeneratedLesson.Status.READY
        generated.save(update_fields=['completed_at', 'payload', 'status', 'updated_at'])
    return generated
