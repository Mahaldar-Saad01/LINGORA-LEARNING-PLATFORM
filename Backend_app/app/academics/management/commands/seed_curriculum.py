import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from academics.models import Curriculum, DifficultyLevel, Language, Lesson, LessonCategory
from academics.services.lesson_fallback import ensure_lesson_content


DEFAULT_SEED_FILE = (
    Path(__file__).resolve().parent.parent / 'seedingdata' / 'curriculum_lessons_seed.json'
)

LANGUAGE_NAMES = {
    'en': 'English',
    'hi': 'Hindi',
    'de': 'German',
}

LEVEL_DEFAULTS = {
    'Beginner': {'min_score': 0, 'max_score': 35, 'order_no': 1},
    'Intermediate': {'min_score': 36, 'max_score': 70, 'order_no': 2},
    'Advanced': {'min_score': 71, 'max_score': 100, 'order_no': 3},
}


class Command(BaseCommand):
    help = 'Seed curriculum, lesson categories, and lessons from a JSON file.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=Path,
            default=DEFAULT_SEED_FILE,
            help=f'JSON seed file (default: {DEFAULT_SEED_FILE})',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        seed_file = options['file'].expanduser().resolve()
        data = self._load_seed_file(seed_file)

        if 'curricula' in data:
            self._seed_blueprint(data, seed_file)
            return

        curriculum_data = data['curriculum']
        target_language = self._get_language(curriculum_data['target_language'])
        explanation_language = self._get_language(
            curriculum_data['explanation_language']
        )

        curriculum, curriculum_created = Curriculum.objects.update_or_create(
            target_language=target_language,
            explanation_language=explanation_language,
            defaults={
                'title': curriculum_data['title'],
                'description': curriculum_data.get('description', ''),
            },
        )

        category_created_count = 0
        category_updated_count = 0
        lesson_created_count = 0
        lesson_updated_count = 0

        for category_data in data['categories']:
            level = self._get_level(category_data['level'])
            category, category_created = LessonCategory.objects.update_or_create(
                curriculum=curriculum,
                level=level,
                name=category_data['name'],
                defaults={
                    'description': category_data.get('description', ''),
                    'order_no': category_data.get('order_no', 1),
                },
            )
            if category_created:
                category_created_count += 1
            else:
                category_updated_count += 1

            for lesson_data in category_data['lessons']:
                _, lesson_created = Lesson.objects.update_or_create(
                    category=category,
                    title=lesson_data['title'],
                    defaults={
                        'description': lesson_data.get('description', ''),
                        'order_no': lesson_data.get('order_no', 1),
                        'estimated_minutes': lesson_data.get('estimated_minutes', 5),
                    },
                )
                if lesson_created:
                    lesson_created_count += 1
                else:
                    lesson_updated_count += 1

        curriculum_status = 'created' if curriculum_created else 'updated'
        self.stdout.write(
            self.style.SUCCESS(
                f'Curriculum seed completed from {seed_file}: '
                f'curriculum {curriculum_status}, '
                f'{category_created_count} categories created, '
                f'{category_updated_count} categories updated, '
                f'{lesson_created_count} lessons created, '
                f'{lesson_updated_count} lessons updated.'
            )
        )

    def _seed_blueprint(self, data, seed_file):
        category_by_key = {}
        curricula_created = curricula_updated = 0
        categories_created = categories_updated = 0
        lessons_created = lessons_updated = 0

        for curriculum_data in data['curricula']:
            target_language = self._get_language(curriculum_data['target_language_code'])
            explanation_language = self._get_language(curriculum_data['explanation_language_code'])
            curriculum, created = Curriculum.objects.update_or_create(
                target_language=target_language,
                explanation_language=explanation_language,
                defaults={
                    'title': curriculum_data['title'],
                    'description': curriculum_data.get('description', ''),
                },
            )
            curricula_created += int(created)
            curricula_updated += int(not created)

            for category_data in curriculum_data.get('categories', []):
                level = self._get_level(category_data['level'])
                category, created = LessonCategory.objects.update_or_create(
                    curriculum=curriculum,
                    level=level,
                    name=category_data['name'],
                    defaults={
                        'description': category_data.get('description', ''),
                        'order_no': category_data.get('order_no', 1),
                    },
                )
                category_by_key[category_data['key']] = category
                categories_created += int(created)
                categories_updated += int(not created)

        for lesson_data in data['lessons']:
            category = category_by_key.get(lesson_data['category_key'])
            if category is None:
                raise CommandError(
                    f'Lesson "{lesson_data.get("title", "")}" references unknown '
                    f'category key "{lesson_data["category_key"]}".'
                )
            lesson, created = Lesson.objects.update_or_create(
                category=category,
                title=lesson_data['title'],
                defaults={
                    'description': lesson_data.get('description', ''),
                    'order_no': lesson_data.get('order_no', 1),
                    'estimated_minutes': lesson_data.get('estimated_minutes', 5),
                    'learning_objectives': lesson_data.get('learning_objectives', []),
                    'vocabulary': lesson_data.get('vocabulary', []),
                    'grammar_topics': lesson_data.get('grammar_topics', []),
                    'skills': lesson_data.get('skills', []),
                    'allowed_activity_types': lesson_data.get('allowed_activity_types', []),
                    'minimum_activities': lesson_data.get('minimum_activities', 1),
                    'maximum_activities': lesson_data.get('maximum_activities', 8),
                    'generation_instructions': lesson_data.get('generation_instructions', ''),
                    'is_active': lesson_data.get('is_active', True),
                },
            )
            try:
                lesson.full_clean()
            except Exception as exc:
                raise CommandError(f'Invalid lesson "{lesson.title}": {exc}') from exc
            lesson.save()
            curriculum = lesson.category.curriculum
            if not lesson.contents.filter(
                target_language=curriculum.target_language,
                explanation_language=curriculum.explanation_language,
            ).exists():
                ensure_lesson_content(lesson)
            lessons_created += int(created)
            lessons_updated += int(not created)

        self.stdout.write(self.style.SUCCESS(
            f'Curriculum blueprint seeded from {seed_file}: '
            f'{curricula_created} curricula created, {curricula_updated} updated; '
            f'{categories_created} categories created, {categories_updated} updated; '
            f'{lessons_created} lessons created, {lessons_updated} updated.'
        ))

    def _load_seed_file(self, seed_file):
        if not seed_file.is_file():
            raise CommandError(f'Seed file not found: {seed_file}')

        try:
            with seed_file.open(encoding='utf-8') as file_handle:
                data = json.load(file_handle)
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            raise CommandError(f'Could not read seed file {seed_file}: {exc}') from exc

        if not isinstance(data, dict):
            raise CommandError('Seed data must be a JSON object.')
        if isinstance(data.get('curricula'), list):
            if not data['curricula']:
                raise CommandError('Seed data must contain at least one curriculum.')
            if not isinstance(data.get('lessons'), list):
                raise CommandError('Blueprint seed data must contain a "lessons" list.')
            supported = set(data.get('supported_activity_types', []))
            for index, lesson in enumerate(data['lessons'], start=1):
                if not isinstance(lesson, dict) or not lesson.get('category_key') or not lesson.get('title'):
                    raise CommandError(f'Lesson {index} requires category_key and title.')
                unknown = set(lesson.get('allowed_activity_types', [])) - supported
                if unknown:
                    raise CommandError(f'Lesson {index} uses unsupported activities: {sorted(unknown)}')
            return data
        if not isinstance(data.get('curriculum'), dict):
            raise CommandError('Seed data must contain a "curriculum" object.')
        if not isinstance(data.get('categories'), list):
            raise CommandError('Seed data must contain a "categories" list.')

        required_curriculum_fields = {
            'title',
            'target_language',
            'explanation_language',
        }
        missing = required_curriculum_fields - data['curriculum'].keys()
        if missing:
            raise CommandError(
                f'Curriculum is missing required fields: {", ".join(sorted(missing))}'
            )

        for category_index, category in enumerate(data['categories'], start=1):
            if not isinstance(category, dict):
                raise CommandError(f'Category {category_index} must be an object.')
            missing = {'level', 'name', 'lessons'} - category.keys()
            if missing:
                raise CommandError(
                    f'Category {category_index} is missing required fields: '
                    f'{", ".join(sorted(missing))}'
                )
            if not isinstance(category['lessons'], list):
                raise CommandError(
                    f'Lessons for category {category_index} must be a list.'
                )
            for lesson_index, lesson in enumerate(category['lessons'], start=1):
                if not isinstance(lesson, dict) or not lesson.get('title'):
                    raise CommandError(
                        f'Lesson {lesson_index} in category {category_index} '
                        'must be an object with a title.'
                    )

        return data

    def _get_language(self, code):
        try:
            name = LANGUAGE_NAMES[code]
        except KeyError as exc:
            raise CommandError(
                f'Unknown language code "{code}". Add its name to LANGUAGE_NAMES.'
            ) from exc
        language, _ = Language.objects.get_or_create(code=code, defaults={'name': name})
        return language

    def _get_level(self, name):
        try:
            defaults = LEVEL_DEFAULTS[name]
        except KeyError as exc:
            raise CommandError(
                f'Unknown difficulty level "{name}". Add it to LEVEL_DEFAULTS.'
            ) from exc
        level = DifficultyLevel.objects.filter(name__iexact=name).first()
        if level is None:
            level = DifficultyLevel.objects.create(name=name, **defaults)
        else:
            level.name = name
            for field, value in defaults.items():
                setattr(level, field, value)
            level.save(update_fields=['name', *defaults.keys()])
        return level
