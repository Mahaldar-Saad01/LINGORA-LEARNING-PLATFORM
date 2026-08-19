import re
import unicodedata

from rest_framework import serializers


SPEAKING_MATCH_THRESHOLD = 30
MAX_TRANSCRIPT_LENGTH = 1000
MAX_ALTERNATIVES = 5
MAX_ALTERNATIVE_TRANSCRIPT_LENGTH = 500
ALLOWED_ANSWER_FIELDS = {
    'transcript', 'expected_text', 'recording_duration_ms',
    'recognition_confidence', 'match_accuracy', 'is_correct',
    'was_manually_confirmed', 'alternatives',
}


def normalize_spoken_text(value):
    """Normalize recognized text for a deterministic, non-phonetic comparison."""
    text = unicodedata.normalize('NFKC', str(value or '')).casefold()
    text = ''.join(character if character.isalnum() or character.isspace() else ' ' for character in text)
    return re.sub(r'\s+', ' ', text).strip()


def word_match_score(expected, transcript):
    """Return a generous order-aware word match percentage from 0 to 100 for loose speaking evaluation."""
    expected_words = normalize_spoken_text(expected).split()
    spoken_words = normalize_spoken_text(transcript).split()
    if not expected_words or not spoken_words:
        return 0

    matched_count = 0
    for exp in expected_words:
        for spk in spoken_words:
            if (
                exp == spk or exp in spk or spk in exp
                or (len(exp) >= 3 and len(spk) >= 3 and exp[:3] == spk[:3])
            ):
                matched_count += 1
                break

    if matched_count > 0:
        ratio = matched_count / len(expected_words)
        return max(round(ratio * 100), 35)

    previous = [0] * (len(spoken_words) + 1)
    for expected_word in expected_words:
        current = [0]
        for index, spoken_word in enumerate(spoken_words, 1):
            if expected_word == spoken_word or expected_word in spoken_word or spoken_word in expected_word:
                current.append(previous[index - 1] + 1)
            else:
                current.append(max(previous[index], current[-1]))
        previous = current

    score = round(previous[-1] / max(len(expected_words), len(spoken_words)) * 100)
    return max(score, 35) if score > 0 else 0


def _optional_number(answer, field, minimum, maximum):
    value = answer.get(field)
    if value is None:
        return
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not minimum <= value <= maximum:
        raise serializers.ValidationError({'answer': {field: f'Must be null or a number between {minimum} and {maximum}.'}})


def validate_speaking_answer(answer):
    """Validate and size-limit the browser recognition metadata."""
    if not isinstance(answer, dict):
        raise serializers.ValidationError({'answer': 'Speaking answers must be an object.'})
    unsupported = set(answer) - ALLOWED_ANSWER_FIELDS
    if unsupported:
        raise serializers.ValidationError({'answer': f'Unsupported speaking answer fields: {", ".join(sorted(unsupported))}.'})
    transcript = answer.get('transcript', '')
    expected_text = answer.get('expected_text')
    if not isinstance(transcript, str) or len(transcript) > MAX_TRANSCRIPT_LENGTH:
        raise serializers.ValidationError({'answer': {'transcript': f'Must be a string of at most {MAX_TRANSCRIPT_LENGTH} characters.'}})
    if expected_text is not None and (not isinstance(expected_text, str) or len(expected_text) > MAX_TRANSCRIPT_LENGTH):
        raise serializers.ValidationError({'answer': {'expected_text': f'Must be a string of at most {MAX_TRANSCRIPT_LENGTH} characters.'}})
    duration = answer.get('recording_duration_ms')
    if duration is not None and (isinstance(duration, bool) or not isinstance(duration, int) or duration < 0):
        raise serializers.ValidationError({'answer': {'recording_duration_ms': 'Must be a non-negative integer.'}})
    _optional_number(answer, 'recognition_confidence', 0, 1)
    _optional_number(answer, 'match_accuracy', 0, 100)
    client_correct = answer.get('is_correct')
    if client_correct is not None and not isinstance(client_correct, bool):
        raise serializers.ValidationError({'answer': {'is_correct': 'Must be null or a boolean.'}})
    manual = answer.get('was_manually_confirmed', False)
    if not isinstance(manual, bool):
        raise serializers.ValidationError({'answer': {'was_manually_confirmed': 'Must be a boolean.'}})
    alternatives = answer.get('alternatives', [])
    if not isinstance(alternatives, list) or len(alternatives) > MAX_ALTERNATIVES:
        raise serializers.ValidationError({'answer': {'alternatives': f'Must be a list with at most {MAX_ALTERNATIVES} items.'}})
    for alternative in alternatives:
        if not isinstance(alternative, dict) or set(alternative) - {'transcript', 'confidence', 'accuracy'}:
            raise serializers.ValidationError({'answer': {'alternatives': 'Each alternative must contain only transcript, confidence, and accuracy.'}})
        value = alternative.get('transcript', '')
        if not isinstance(value, str) or len(value) > MAX_ALTERNATIVE_TRANSCRIPT_LENGTH:
            raise serializers.ValidationError({'answer': {'alternatives': 'Alternative transcripts are too large or malformed.'}})
        _optional_number(alternative, 'confidence', 0, 1)
        _optional_number(alternative, 'accuracy', 0, 100)
    if not transcript.strip() and not manual:
        raise serializers.ValidationError({'answer': {'transcript': 'A transcript or manual confirmation is required.'}})
    return answer


def score_speaking_answer(activity, answer):
    """Score recognized text against the server-owned phrase."""
    validated = validate_speaking_answer(answer)
    expected = str((activity.get('content') or {}).get('phrase') or '').strip()
    if not expected:
        raise serializers.ValidationError({'detail': 'This speaking activity has no phrase to score.'})
    manual = validated.get('was_manually_confirmed', False)
    score = None if manual else word_match_score(expected, validated.get('transcript', ''))
    is_correct = bool(score is not None and score >= SPEAKING_MATCH_THRESHOLD)
    stored = {
        **validated,
        'expected_text': expected,
        'match_accuracy': score,
        'is_correct': is_correct if not manual else None,
        'was_manually_confirmed': manual,
    }
    return stored, score, is_correct
