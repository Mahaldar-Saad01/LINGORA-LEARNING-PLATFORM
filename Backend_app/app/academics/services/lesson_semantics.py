import re


TOPIC_ACTIVITY_GUIDANCE = {
    'script': {
        'preferred': [
            'lesson_overview', 'listen_and_select', 'matching_words',
            'speaking_practice',
        ],
        'disallowed': [
            'translate_sentence', 'sentence_completion', 'word_arrangement',
        ],
    },
    'greetings': {
        'preferred': [
            'listen_and_select', 'matching_words', 'speaking_practice',
            'translate_sentence', 'sentence_completion',
        ],
        'disallowed': [],
    },
    'grammar': {
        'preferred': [
            'fill_in_the_blank', 'sentence_completion', 'word_arrangement',
            'translate_sentence',
        ],
        'disallowed': [],
    },
    'vocabulary': {
        'preferred': [
            'listen_and_select', 'matching_words', 'speaking_practice',
            'translate_sentence',
        ],
        'disallowed': [],
    },
    'listening': {'preferred': ['listen_and_select', 'speaking_practice'], 'disallowed': []},
    'conversation': {'preferred': ['listen_and_select', 'speaking_practice', 'translate_sentence'], 'disallowed': []},
    'reading': {'preferred': ['matching_words', 'sentence_completion'], 'disallowed': []},
    'writing': {'preferred': ['fill_in_the_blank', 'sentence_completion', 'word_arrangement'], 'disallowed': []},
}

TOPIC_KEYWORDS = {
    'script': (
        'alphabet', 'script', 'letter', 'letters', 'vowel', 'vowels',
        'consonant', 'consonants', 'pronunciation', 'devanagari',
    ),
    'greetings': ('greeting', 'greetings', 'hello', 'introduction'),
    'grammar': ('grammar', 'tense', 'verb', 'noun', 'adjective', 'sentence structure'),
    'listening': ('listening', 'listen', 'audio'),
    'conversation': ('conversation', 'dialogue', 'speaking'),
    'reading': ('reading', 'read', 'comprehension'),
    'writing': ('writing', 'write'),
    'vocabulary': ('vocabulary', 'word', 'words', 'phrase', 'phrases'),
}


def classify_lesson_topic(lesson_context, payload=None):
    values = [
        lesson_context.get('lesson_title'),
        lesson_context.get('lesson_description'),
        lesson_context.get('category'),
        *(lesson_context.get('lesson_objectives') or []),
    ]
    if payload:
        values.extend(
            activity.get('skill')
            for activity in payload.get('activities', [])
            if isinstance(activity, dict)
        )
    text = ' '.join(str(value or '') for value in values).lower()

    scores = {
        topic: sum(1 for keyword in keywords if keyword in text)
        for topic, keywords in TOPIC_KEYWORDS.items()
    }
    topic, score = max(scores.items(), key=lambda item: item[1])
    return topic if score else 'vocabulary'


def _correct_option_text(content):
    correct_id = content.get('correct_option_id')
    for option in content.get('options', []):
        if isinstance(option, dict) and option.get('id') == correct_id:
            return str(option.get('text', '')).strip()
    return ''


def _blank_answers(content):
    answers = content.get('correct_answers')
    if isinstance(answers, list):
        return [str(answer).strip() for answer in answers]
    answer = _correct_option_text(content)
    return [answer] if answer else []


def _is_isolated_script_symbol(value):
    text = str(value or '').strip()
    return len(text) == 1 and '\u0900' <= text <= '\u097f'


def _validate_blank_semantics(activity):
    content = activity['content']
    sentence = re.sub(r'\s+', ' ', str(content.get('sentence', '')).strip()).lower()
    artificial_patterns = (
        r'^i\s+(?:say|write|use)\s+\{\{blank\}\}[.!?]?$',
        r'^मैं\s+\{\{blank\}\}\s+कहत[ाी]\s+(?:हूँ|हूं)[।.!?]?$',
    )
    if any(re.match(pattern, sentence, flags=re.IGNORECASE) for pattern in artificial_patterns):
        raise ValueError(
            f"Semantic error: {activity['id']} uses an artificial blank sentence: '{content.get('sentence')}'."
        )
    if any(_is_isolated_script_symbol(answer) for answer in _blank_answers(content)):
        raise ValueError(
            f"Semantic error: {activity['id']} inserts an isolated script symbol into a sentence."
        )


def _validate_matching_semantics(activity):
    content = activity['content']
    left_by_id = {item.get('id'): item for item in content.get('left_items', [])}
    right_by_id = {item.get('id'): item for item in content.get('right_items', [])}
    for pair in content.get('correct_pairs', []):
        left = left_by_id.get(pair.get('left_id'), {}).get('text', '')
        right = right_by_id.get(pair.get('right_id'), {}).get('meaning', '')
        if _is_isolated_script_symbol(left) and re.fullmatch(r'[A-Za-z]{1,3}', str(right).strip()):
            raise ValueError(
                f"Semantic error: {activity['id']} directly maps the Hindi letter '{left}' to English '{right}'. Describe sounds as approximate instead."
            )


def validate_lesson_semantics(payload, lesson_context):
    activities = payload.get('activities', [])
    topic = classify_lesson_topic(lesson_context, payload)
    guidance = TOPIC_ACTIVITY_GUIDANCE[topic]

    minimum_activities = int(lesson_context.get('minimum_activities') or 4)
    maximum_activities = int(lesson_context.get('maximum_activities') or 6)
    if not minimum_activities <= len(activities) <= maximum_activities:
        raise ValueError(
            'Semantic error: lessons must contain '
            f'{minimum_activities} to {maximum_activities} useful activities.'
        )

    seen = set()
    total_seconds = 0
    for activity in activities:
        activity_id = activity.get('id', 'unknown activity')
        activity_type = activity.get('activity_type')
        content = activity.get('content', {})

        if activity_type in guidance['disallowed']:
            raise ValueError(
                f"Semantic error: {activity_id} uses {activity_type}, which is unsuitable for a {topic} lesson."
            )

        if activity_type in {'fill_in_the_blank', 'sentence_completion'}:
            _validate_blank_semantics(activity)

        if activity_type == 'word_arrangement':
            words = [str(item.get('text', '')).strip() for item in content.get('word_bank', [])]
            meaningful_words = [word for word in words if len(word) > 1]
            if len(words) < 3 or len(meaningful_words) < 3:
                raise ValueError(
                    f'Semantic error: {activity_id} word_arrangement requires at least 3 meaningful words, not isolated letters.'
                )

        if activity_type == 'matching_words':
            _validate_matching_semantics(activity)

        correct_text = _correct_option_text(content)
        if activity_type == 'listen_and_select' and correct_text:
            audio_text = str(content.get('audio_text', '')).strip()
            if audio_text and audio_text != correct_text:
                raise ValueError(
                    f"Semantic error: {activity_id} audio does not match its correct option."
                )

        question = content.get('sentence') or content.get('source_sentence') or content.get('audio_text') or content.get('phrase') or activity.get('instruction', '')
        signature = (activity_type, str(question).strip().casefold(), correct_text.casefold())
        if signature in seen:
            raise ValueError(f'Semantic error: {activity_id} duplicates another activity.')
        seen.add(signature)
        total_seconds += max(0, int(activity.get('estimated_time') or 0))

    duration_seconds = max(1, int(lesson_context.get('estimated_duration_minutes') or 5)) * 60
    if total_seconds > duration_seconds * 1.5:
        raise ValueError(
            f'Semantic error: estimated activity time ({total_seconds} seconds) is far above the lesson duration ({duration_seconds} seconds).'
        )

    return payload
