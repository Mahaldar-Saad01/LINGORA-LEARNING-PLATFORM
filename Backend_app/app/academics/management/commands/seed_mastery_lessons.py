import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from academics.models import Lesson, LessonContent


DEFAULT_FILE = Path(__file__).resolve().parent.parent / 'seedingdata' / 'mastery_lesson_seed.json'


class Command(BaseCommand):
    help = 'Seed mastery lessons and fallback lesson content from a Django-style JSON fixture.'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=Path, default=DEFAULT_FILE)

    @transaction.atomic
    def handle(self, *args, **options):
        path = options['file'].expanduser().resolve()
        try:
            records = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            raise CommandError(f'Could not read {path}: {exc}') from exc
        if not isinstance(records, list):
            raise CommandError('Mastery seed data must be a JSON list.')

        lessons_by_fixture_id = {}
        lessons_created = lessons_updated = content_created = content_updated = 0

        for record in records:
            if record.get('model') != 'academics.lesson':
                continue
            fields = record.get('fields') or {}
            category_id = fields.get('category')
            title = fields.get('title')
            if not category_id or not title:
                raise CommandError('Every lesson record requires category and title.')
            defaults = {key: value for key, value in fields.items() if key not in {'category', 'title'}}
            lesson, created = Lesson.objects.update_or_create(
                category_id=category_id,
                title=title,
                defaults=defaults,
            )
            lessons_by_fixture_id[record.get('pk')] = lesson
            lessons_created += int(created)
            lessons_updated += int(not created)

        for record in records:
            if record.get('model') != 'academics.lessoncontent':
                continue
            fields = record.get('fields') or {}
            lesson = lessons_by_fixture_id.get(fields.get('lesson'))
            if lesson is None:
                raise CommandError(f"LessonContent references unknown lesson {fields.get('lesson')}.")
            target_language_id = fields.get('target_language')
            explanation_language_id = fields.get('explanation_language')
            defaults = {
                key: value for key, value in fields.items()
                if key not in {'lesson', 'target_language', 'explanation_language', 'updated_at'}
            }
            _content, created = LessonContent.objects.update_or_create(
                lesson=lesson,
                target_language_id=target_language_id,
                explanation_language_id=explanation_language_id,
                defaults=defaults,
            )
            content_created += int(created)
            content_updated += int(not created)

        self.stdout.write(self.style.SUCCESS(
            f'Mastery seed complete: lessons {lessons_created} created/{lessons_updated} updated; '
            f'content {content_created} created/{content_updated} updated.'
        ))
