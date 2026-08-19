# from .huggingface_client import generate_json
# from .prompts import MISTAKE_SYSTEM_PROMPT, build_mistake_prompt


# def explain_mistake(user, generated_lesson, activity, user_answer, correct_answer):
#     payload = generated_lesson.payload
#     context = {
#         'explanation_language': payload.get('explanation_language'),
#         'target_language': payload.get('target_language'),
#         'activity_type': activity.get('activity_type'),
#         'question': activity.get('title'),
#         'instruction': activity.get('instruction'),
#         'learner_answer': user_answer, 'correct_answer': correct_answer,
#         'concept_tags': activity.get('concept_tags', []),
#         'learner_name': user.name,
#     }
#     feedback, _ = generate_json([
#         {'role': 'system', 'content': MISTAKE_SYSTEM_PROMPT},
#         {'role': 'user', 'content': build_mistake_prompt(context)},
#     ], max_tokens=700, temperature=0.25)
#     return feedback
# Previous Hugging Face provider (kept for easy rollback):
# from .huggingface_client import generate_json
from .groq_client import generate_json
from .prompts import MISTAKE_SYSTEM_PROMPT, build_mistake_prompt


REQUIRED_FEEDBACK_FIELDS = {
    'explanation',
    'correction',
    'example',
    'practice_tip',
    'concept_tags',
}


def _get_learner_name(user):
    """
    Return the learner's best available display name.
    """
    get_full_name = getattr(user, 'get_full_name', None)

    if callable(get_full_name):
        full_name = get_full_name()
        if full_name:
            return full_name

    return (
        getattr(user, 'name', None)
        or getattr(user, 'username', None)
        or 'Learner'
    )


def _get_activity_question(activity):
    """
    Build a useful question description from the activity schema.

    Activity-specific data is stored inside activity['content'].
    """
    content = activity.get('content') or {}
    activity_type = activity.get('activity_type')

    if activity_type in {
        'fill_in_the_blank',
        'sentence_completion',
    }:
        return content.get('sentence') or activity.get('title')

    if activity_type == 'listen_and_select':
        return content.get('audio_text') or activity.get('title')

    if activity_type == 'matching_words':
        left_items = content.get('left_items') or []
        return {
            'prompt': activity.get('title'),
            'left_items': left_items,
        }

    if activity_type == 'word_arrangement':
        return (
            content.get('source_sentence')
            or activity.get('title')
        )

    if activity_type == 'speaking_practice':
        return content.get('phrase') or activity.get('title')

    if activity_type == 'translate_sentence':
        return (
            content.get('source_sentence')
            or activity.get('title')
        )

    if activity_type == 'lesson_overview':
        return (
            content.get('description')
            or activity.get('title')
        )

    return activity.get('title')


def _get_activity_reference(activity):
    """
    Return only the relevant activity content required for mistake analysis.

    This avoids sending unnecessary lesson payload data to the LLM.
    """
    content = activity.get('content') or {}
    activity_type = activity.get('activity_type')

    allowed_fields = {
        'fill_in_the_blank': [
            'sentence',
            'translation',
            'options',
            'correct_answers',
            'hint',
            'explanation',
        ],
        'sentence_completion': [
            'sentence',
            'translation',
            'options',
            'correct_option_id',
            'grammar_tip',
        ],
        'listen_and_select': [
            'audio_text',
            'transliteration',
            'options',
            'correct_option_id',
            'explanation',
        ],
        'matching_words': [
            'left_items',
            'right_items',
            'correct_pairs',
        ],
        'word_arrangement': [
            'source_sentence',
            'word_bank',
            'correct_order',
            'accepted_sentences',
            'explanation',
        ],
        'speaking_practice': [
            'phrase',
            'transliteration',
            'meaning',
            'pronunciation_tip',
            'evaluation',
        ],
        'translate_sentence': [
            'source_sentence',
            'source_language',
            'transliteration',
            'options',
            'correct_option_id',
            'explanation',
        ],
        'lesson_overview': [
            'module_name',
            'description',
            'objectives',
        ],
    }

    fields = allowed_fields.get(activity_type, [])

    return {
        key: content.get(key)
        for key in fields
        if key in content
    }


def _validate_feedback(feedback):
    """
    Validate the mistake-feedback response before returning it.
    """
    if not isinstance(feedback, dict):
        raise ValueError(
            'Mistake explanation must be returned as a JSON object.'
        )

    missing_fields = REQUIRED_FEEDBACK_FIELDS - feedback.keys()

    if missing_fields:
        raise ValueError(
            'Mistake explanation is missing required fields: '
            f'{sorted(missing_fields)}.'
        )

    if not isinstance(feedback.get('concept_tags'), list):
        raise ValueError(
            'Mistake explanation concept_tags must be a list.'
        )

    return feedback


def explain_mistake(
    user,
    generated_lesson,
    activity,
    user_answer,
    correct_answer,
):
    """
    Generate a concise personalized explanation for one incorrect activity.

    Compatible with the strict activity schema where activity-specific
    information is stored inside activity['content'].
    """
    if not isinstance(activity, dict):
        raise ValueError('Activity must be a dictionary.')

    lesson_payload = generated_lesson.payload or {}
    activity_content = activity.get('content') or {}

    context = {
        'learner_name': _get_learner_name(user),

        'explanation_language': lesson_payload.get(
            'explanation_language'
        ),
        'explanation_language_code': lesson_payload.get(
            'explanation_language_code'
        ),

        'target_language': lesson_payload.get(
            'target_language'
        ),
        'target_language_code': lesson_payload.get(
            'target_language_code'
        ),

        'lesson_title': lesson_payload.get('title'),
        'activity_id': activity.get('id'),
        'activity_type': activity.get('activity_type'),
        'activity_title': activity.get('title'),
        'instruction': activity.get('instruction'),
        'skill': activity.get('skill'),
        'difficulty': activity.get('difficulty'),
        'concept_tags': activity.get('concept_tags', []),

        'question': _get_activity_question(activity),
        'activity_reference': _get_activity_reference(activity),

        'learner_answer': user_answer,
        'correct_answer': correct_answer,

        # These can help the LLM explain the answer correctly without
        # receiving the entire generated lesson payload.
        'translation': activity_content.get('translation'),
        'transliteration': activity_content.get(
            'transliteration'
        ),
        'existing_explanation': activity_content.get(
            'explanation'
        ),
        'grammar_tip': activity_content.get('grammar_tip'),
        'pronunciation_tip': activity_content.get(
            'pronunciation_tip'
        ),
    }

    explanation = (
        activity_content.get('explanation')
        or activity_content.get('grammar_tip', {}).get('explanation') if isinstance(activity_content.get('grammar_tip'), dict) else None
    )
    if not explanation:
        explanation = f"Review the question instruction and select the option matching '{correct_answer}'."

    feedback = {
        'explanation': explanation,
        'correction': f"The correct answer is: {correct_answer}.",
        'example': activity_content.get('translation') or f"Target phrase: {activity_content.get('audio_text') or activity_content.get('phrase') or correct_answer}",
        'practice_tip': 'Take your time to review the target vocabulary before answering.',
        'concept_tags': activity.get('concept_tags', []),
    }
    return _validate_feedback(feedback)
