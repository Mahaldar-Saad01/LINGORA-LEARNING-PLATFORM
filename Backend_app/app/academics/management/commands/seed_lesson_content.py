import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from jsonschema import ValidationError as JSONSchemaError
from jsonschema import validate as validate_json_schema

from academics.models import Lesson, LessonContent
from academics.services.lesson_generation import _get_audio_locale, _get_text_direction
from academics.services.lesson_schema import LESSON_JSON_SCHEMA, validate_lesson_payload


DEFAULT_FILE = Path(__file__).resolve().parent.parent / 'seedingdata' / 'lesson_content_fallback_seed.json'
SKILL_BY_TYPE = {
    'lesson_overview': 'vocabulary', 'listen_and_select': 'listening',
    'matching_words': 'vocabulary', 'speaking_practice': 'speaking',
    'word_arrangement': 'grammar', 'fill_in_the_blank': 'grammar',
    'sentence_completion': 'grammar', 'translate_sentence': 'comprehension',
}
INSTRUCTION_BY_TYPE = {
    'lesson_overview': 'Review the lesson goals.',
    'listen_and_select': 'Listen and choose the correct answer.',
    'matching_words': 'Match each word with its meaning.',
    'speaking_practice': 'Listen, then repeat the expression.',
    'word_arrangement': 'Arrange the words in the correct order.',
    'fill_in_the_blank': 'Complete the sentence.',
    'sentence_completion': 'Choose the best sentence completion.',
    'translate_sentence': 'Choose the correct translation.',
}


class Command(BaseCommand):
    help = 'Validate, normalize, and seed LessonContent fallback activities.'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=Path, default=DEFAULT_FILE)

    @transaction.atomic
    def handle(self, *args, **options):
        path = options['file'].expanduser().resolve()
        try:
            records = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            raise CommandError(f'Could not read {path}: {exc}') from exc
        if not isinstance(records, list) or not records:
            raise CommandError('Lesson content seed must be a non-empty JSON list.')

        created = updated = 0
        seen_lessons = set()
        for position, record in enumerate(records, start=1):
            if not isinstance(record, dict):
                raise CommandError(f'Record {position} must be an object.')
            lesson_id = record.get('lesson_id')
            if lesson_id in seen_lessons:
                raise CommandError(f'Duplicate lesson_id {lesson_id}.')
            seen_lessons.add(lesson_id)
            try:
                lesson = Lesson.objects.select_related(
                    'category__level', 'category__curriculum__target_language',
                    'category__curriculum__explanation_language',
                ).get(pk=lesson_id)
            except Lesson.DoesNotExist as exc:
                raise CommandError(f'Record {position} references missing lesson {lesson_id}.') from exc
            curriculum = lesson.category.curriculum
            if record.get('target_language_id') != curriculum.target_language_id or record.get('explanation_language_id') != curriculum.explanation_language_id:
                raise CommandError(f'Record {position} language IDs do not match lesson {lesson_id}.')

            activities = [self._normalize_activity(item, lesson, index) for index, item in enumerate(record.get('fallback_activities', []), start=1)]
            payload = {
                'lesson_id': lesson.id, 'title': record.get('title') or lesson.title,
                'target_language': curriculum.target_language.name,
                'explanation_language': curriculum.explanation_language.name,
                'target_language_code': curriculum.target_language.code,
                'explanation_language_code': curriculum.explanation_language.code,
                'direction': _get_text_direction(curriculum.target_language.code),
                'audio_locale': _get_audio_locale(curriculum.target_language.code),
                'activities': activities,
            }
            try:
                validate_json_schema(payload, LESSON_JSON_SCHEMA['schema'])
                validate_lesson_payload(payload)
            except (JSONSchemaError, ValueError) as exc:
                raise CommandError(f'Invalid fallback for lesson {lesson_id}: {exc}') from exc

            _, was_created = LessonContent.objects.update_or_create(
                lesson=lesson,
                target_language=curriculum.target_language,
                explanation_language=curriculum.explanation_language,
                defaults={
                    'title': record.get('title') or lesson.title,
                    'content_text': record.get('content_text', ''),
                    'explanation_text': record.get('explanation_text', ''),
                    'example_text': record.get('example_text', ''),
                    'audio_url': record.get('audio_url', ''),
                    'video_url': record.get('video_url', ''),
                    'image_url': record.get('image_url', ''),
                    'fallback_activities': activities,
                    'is_active': record.get('is_active', True),
                },
            )
            created += int(was_created)
            updated += int(not was_created)

        self.stdout.write(self.style.SUCCESS(
            f'Lesson content seeded from {path}: {created} created, {updated} updated.'
        ))

    def _normalize_activity(self, source, lesson, index):
        if not isinstance(source, dict):
            raise CommandError(f'Lesson {lesson.id} activity {index} must be an object.')
        activity_type = source.get('activity_type')
        if activity_type not in SKILL_BY_TYPE:
            raise CommandError(f'Lesson {lesson.id} has unsupported activity type {activity_type!r}.')
        content = {key: value for key, value in source.items() if key not in {'id', 'activity_type'}}

        if activity_type == 'word_arrangement' and len(content.get('word_bank', [])) < 2:
            phrase = next((item.get('text') for item in content.get('word_bank', []) if item.get('text')), content.get('source_sentence', ''))
            activity_type = 'speaking_practice'
            content = {
                'phrase': phrase, 'transliteration': None,
                'meaning': content.get('source_sentence', phrase),
                'audio_speed_options': ['slow', 'normal'],
                'recording_duration_seconds': 8,
                'pronunciation_tip': None,
                'evaluation': {'minimum_accuracy': 60, 'metrics': ['accuracy', 'pronunciation']},
            }

        if activity_type == 'listen_and_select':
            content['audio_speed_options'] = ['slow', 'normal']
            content.setdefault('transliteration', None)
            content['explanation'] = content.get('explanation') or 'The correct option matches the expression played in the audio.'
        elif activity_type == 'matching_words':
            content['left_items'] = [
                {'id': item['id'], 'text': item['text'], 'transliteration': item.get('transliteration'), 'item_type': 'word'}
                for item in content.get('left_items', [])
            ]
            content['right_items'] = [
                {'id': item['id'], 'item_type': 'text', 'meaning': item.get('meaning', item.get('text', ''))}
                for item in content.get('right_items', [])
            ]
        elif activity_type == 'speaking_practice':
            old_evaluation = content.get('evaluation') or {}
            content['audio_speed_options'] = ['slow', 'normal']
            content.setdefault('transliteration', None)
            content.setdefault('pronunciation_tip', None)
            content['evaluation'] = {
                'minimum_accuracy': old_evaluation.get('minimum_pronunciation_score', 60),
                'metrics': ['accuracy', 'pronunciation'],
            }
        elif activity_type == 'sentence_completion':
            tip = content.get('grammar_tip')
            if isinstance(tip, str):
                content['grammar_tip'] = {'title': 'Grammar tip', 'explanation': tip}
            content.setdefault('audio_text', None)
            content.setdefault('image_prompt', None)
            content['explanation'] = content.get('explanation') or 'The correct option completes the sentence with the intended meaning and grammar.'
        elif activity_type == 'translate_sentence':
            source_language = str(content.get('source_language', '')).casefold()
            content['source_language'] = 'target' if source_language in {
                lesson.category.curriculum.target_language.name.casefold(), 'target'
            } else 'explanation'
            content.setdefault('transliteration', None)
            content.setdefault('audio_text', None)
            content['explanation'] = content.get('explanation') or 'The correct option preserves the meaning of the source sentence.'

        if activity_type in {'matching_words', 'word_arrangement', 'fill_in_the_blank'}:
            content['explanation'] = content.get('explanation') or {
                'matching_words': 'Each word must be paired with its corresponding meaning.',
                'word_arrangement': 'The words follow the standard sentence order shown by the correct answer.',
                'fill_in_the_blank': 'The correct answer fits both the meaning and grammar of the sentence.',
            }[activity_type]

        return {
            'id': str(source.get('id') or f'lesson_{lesson.id}_activity_{index}'),
            'activity_type': activity_type,
            'title': str(source.get('title') or activity_type.replace('_', ' ').title()),
            'instruction': str(source.get('instruction') or INSTRUCTION_BY_TYPE[activity_type]),
            'difficulty': lesson.category.level.name.casefold(),
            'skill': SKILL_BY_TYPE[activity_type],
            'concept_tags': [str(value) for value in lesson.grammar_topics[:5]],
            'xp': int(source.get('xp', 10)),
            'estimated_time': int(source.get('estimated_time', 45)),
            'content': content,
        }
