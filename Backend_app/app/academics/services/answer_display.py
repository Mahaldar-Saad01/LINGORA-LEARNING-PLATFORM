"""Learner-facing activity answer formatting for completed lesson results."""


OPTION_ACTIVITY_TYPES = {
    'multiple_choice', 'listen_and_select', 'sentence_completion',
    'translate_sentence', 'reading_comprehension',
}


def _text(value, fallback):
    if value is None or value == '':
        return fallback
    if isinstance(value, str):
        return value.strip() or fallback
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    return fallback


def _option_text(content, option_id, fallback):
    options = content.get('options') if isinstance(content.get('options'), list) else []
    for option in options:
        if isinstance(option, dict) and option.get('id') == option_id:
            return _text(option.get('text', option.get('label', option.get('value'))), fallback)
    return fallback


def _pair_text(content, pairs, fallback):
    if not isinstance(pairs, list):
        return fallback
    left = {item.get('id'): item.get('text') for item in content.get('left_items', []) if isinstance(item, dict)}
    right = {item.get('id'): item.get('meaning', item.get('text')) for item in content.get('right_items', []) if isinstance(item, dict)}
    labels = []
    for pair in pairs:
        if not isinstance(pair, dict):
            continue
        left_value = left.get(pair.get('left_id'), pair.get('left', ''))
        right_value = right.get(pair.get('right_id'), pair.get('right', ''))
        if left_value and right_value:
            labels.append(f'{left_value} \u2192 {right_value}')
    return ', '.join(labels) if labels else fallback


def _ordered_words(content, value, fallback):
    ids = value.get('ordered_word_ids') if isinstance(value, dict) else value
    if not isinstance(ids, list):
        return fallback
    bank = {item.get('id'): item.get('text') for item in content.get('word_bank', []) if isinstance(item, dict)}
    words = [_text(bank.get(item_id), '') for item_id in ids]
    rendered = ' '.join(word for word in words if word)
    return rendered or fallback


def canonical_answer(activity):
    content = activity.get('content') or {}
    activity_type = activity.get('activity_type')
    if activity_type in OPTION_ACTIVITY_TYPES:
        return {'selected_option_id': content.get('correct_option_id')}
    if activity_type == 'fill_in_the_blank':
        answers = content.get('correct_answers') or []
        return {'value': answers[0]} if answers else None
    if activity_type == 'matching_words':
        return {'pairs': content.get('correct_pairs', [])}
    if activity_type == 'word_arrangement':
        return {'ordered_word_ids': content.get('correct_order', [])}
    if activity_type == 'speaking_practice':
        return {'transcript': content.get('phrase', '')}
    return activity.get('correct_answer')


def format_activity_answer(activity, value, *, correct=False):
    """Convert a structured activity answer into controlled display text."""
    content = activity.get('content') or {}
    activity_type = activity.get('activity_type')
    fallback = 'Correct answer unavailable' if correct else 'No answer'
    if activity_type in OPTION_ACTIVITY_TYPES:
        option_id = value.get('selected_option_id') if isinstance(value, dict) else value
        return _option_text(content, option_id, fallback)
    if activity_type == 'fill_in_the_blank':
        answer = value.get('value') if isinstance(value, dict) else value
        return _text(answer, fallback)
    if activity_type == 'matching_words':
        pairs = value.get('pairs') if isinstance(value, dict) else value
        return _pair_text(content, pairs, fallback)
    if activity_type == 'word_arrangement':
        return _ordered_words(content, value, fallback)
    if activity_type == 'speaking_practice':
        if isinstance(value, dict) and value.get('was_manually_confirmed'):
            return 'Practice completed manually'
        transcript = value.get('transcript') if isinstance(value, dict) else value
        return _text(transcript, fallback)
    if activity_type == 'lesson_overview':
        return 'Lesson overview'
    if isinstance(value, dict):
        for key in ('translation', 'text', 'value', 'answer', 'transcript'):
            if key in value:
                return _text(value[key], 'Answer submitted')
        return 'Answer submitted'
    if isinstance(value, list):
        labels = [_text(item, '') for item in value]
        rendered = ', '.join(label for label in labels if label)
        return rendered or fallback
    return _text(value, fallback)


def question_display(activity):
    content = activity.get('content') or {}
    activity_type = activity.get('activity_type')
    candidates = {
        'fill_in_the_blank': (content.get('sentence'),),
        'sentence_completion': (content.get('sentence'),),
        'listen_and_select': (activity.get('instruction'), content.get('audio_text')),
        'matching_words': (activity.get('instruction'), activity.get('title')),
        'word_arrangement': (content.get('source_sentence'), activity.get('instruction')),
        'speaking_practice': (content.get('phrase'), activity.get('instruction')),
        'translate_sentence': (content.get('source_sentence'), activity.get('instruction')),
    }.get(activity_type, (activity.get('instruction'), activity.get('title')))
    return next((_text(value, '') for value in candidates if _text(value, '')), 'Review this activity')


def serialize_attempt_for_results(attempt, activity):
    trusted_answer = canonical_answer(activity)
    manual = bool(
        activity.get('activity_type') == 'speaking_practice'
        and isinstance(attempt.user_answer, dict)
        and attempt.user_answer.get('was_manually_confirmed')
    )
    review_required = bool(
        not attempt.skipped and not attempt.is_correct and not manual
        and activity.get('activity_type') != 'lesson_overview'
    )
    feedback = attempt.mistake_feedback if isinstance(attempt.mistake_feedback, dict) else {}
    return {
        'id': attempt.id,
        'activity_id': attempt.activity_id,
        'activity_type': activity.get('activity_type', attempt.activity_type),
        'skill': attempt.skill or activity.get('skill') or 'General',
        'question': question_display(activity),
        'question_display': question_display(activity),
        'user_answer': attempt.user_answer,
        'user_answer_display': format_activity_answer(activity, attempt.user_answer),
        'correct_answer': trusted_answer,
        'correct_answer_display': format_activity_answer(activity, trusted_answer, correct=True),
        'is_correct': attempt.is_correct,
        'correct': attempt.is_correct,
        'skipped': attempt.skipped,
        'manually_confirmed': manual,
        'review_required': review_required,
        'explanation': feedback.get('explanation', ''),
        'mistake_feedback': feedback,
    }
