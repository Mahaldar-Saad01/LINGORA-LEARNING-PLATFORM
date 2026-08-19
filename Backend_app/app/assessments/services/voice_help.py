import html
import re


LANGUAGE_CODES = {
    'english': 'en-IN', 'hindi': 'hi-IN', 'german': 'de-DE',
    'french': 'fr-FR', 'spanish': 'es-ES', 'italian': 'it-IT',
    'portuguese': 'pt-PT', 'japanese': 'ja-JP', 'korean': 'ko-KR',
    'chinese': 'zh-CN', 'tamil': 'ta-IN', 'telugu': 'te-IN',
    'marathi': 'mr-IN', 'bengali': 'bn-IN', 'gujarati': 'gu-IN',
    'kannada': 'kn-IN', 'malayalam': 'ml-IN', 'punjabi': 'pa-IN',
}


def normalize_question_type(value):
    normalized = str(value or '').strip().lower().replace('-', '_').replace(' ', '_')
    return {'writing': 'short_answer', 'passage': 'passage_mcq'}.get(normalized, normalized)


def clean_speech_text(value):
    text = html.unescape(str(value or ''))
    text = re.sub(r'<[^>]*>', ' ', text)
    text = re.sub(r'https?://\S+', ' ', text)
    text = re.sub(r'[*_`#~|]+', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def get_speech_language(language, default='en-IN'):
    value = getattr(language, 'code', None) or getattr(language, 'name', None) or language
    value = str(value or '').strip()
    if re.fullmatch(r'[a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?', value):
        return value
    return LANGUAGE_CODES.get(value.lower(), default)
