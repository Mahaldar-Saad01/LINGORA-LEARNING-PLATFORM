import json
from pathlib import Path

from django.core.management.base import CommandError
from django.db import transaction

from academics.models import DifficultyLevel, Language
from assessments.models import Assessment, AssessmentQuestion, Passage, QuestionOption


DEFAULT_DATA_FILE = Path(__file__).with_name('expanded_language_assessment_seed_data.json')
LANGUAGE_CODES = {
    'English': 'en',
    'German': 'de',
    'Hindi': 'hi',
}
LEVEL_DEFAULTS = {
    'Beginner': {'min_score': 0, 'max_score': 39, 'order_no': 1},
    'Intermediate': {'min_score': 40, 'max_score': 69, 'order_no': 2},
    'Advanced': {'min_score': 70, 'max_score': 100, 'order_no': 3},
}


class AssessmentSeeder:
    def __init__(self, data_file=None):
        self.data_file = Path(data_file) if data_file else DEFAULT_DATA_FILE
        self.counts = {
            'assessments': 0,
            'passages': 0,
            'questions': 0,
            'options': 0,
        }

    @transaction.atomic
    def run(self):
        payload = self._load_payload()
        for assessment_data in payload['assessments']:
            self._seed_assessment(assessment_data)
        return self.counts

    def _load_payload(self):
        if not self.data_file.exists():
            raise CommandError(f'Seed data file was not found: {self.data_file}')

        try:
            with self.data_file.open(encoding='utf-8') as seed_file:
                payload = json.load(seed_file)
        except (OSError, json.JSONDecodeError) as exc:
            raise CommandError(f'Could not read seed data: {exc}') from exc

        if not isinstance(payload.get('assessments'), list):
            raise CommandError('Seed JSON must contain an assessments list.')
        return payload

    def _seed_assessment(self, data):
        target_language = self._get_language(data['target_language'])
        explanation_language = self._get_language(data['explanation_language'])
        level = self._get_level(data['level'])
        assessment, _ = Assessment.objects.update_or_create(
            target_language=target_language,
            explanation_language=explanation_language,
            level=level,
            type=data['type'],
            defaults={
                'title': data['title'],
                'description': data.get('description', ''),
            },
        )
        self.counts['assessments'] += 1

        seeded_question_ids = []
        seeded_passage_ids = []
        for question_data in data.get('questions', []):
            seeded_question_ids.append(self._seed_question(assessment, question_data).id)

        for passage_data in data.get('passages', []):
            passage, _ = Passage.objects.update_or_create(
                assessment=assessment,
                title=passage_data['title'],
                defaults={
                    'label': passage_data.get('label', ''),
                    'text': passage_data['text'],
                    'read_time': passage_data.get('read_time', ''),
                    'hint_title': passage_data.get('hint_title', ''),
                    'hint_text': passage_data.get('hint_text', ''),
                    'order_no': passage_data.get('order_no', 1),
                },
            )
            self.counts['passages'] += 1
            seeded_passage_ids.append(passage.id)
            for question_data in passage_data.get('questions', []):
                seeded_question_ids.append(
                    self._seed_question(assessment, question_data, passage=passage).id
                )

        assessment.questions.exclude(id__in=seeded_question_ids).delete()
        assessment.passages.exclude(id__in=seeded_passage_ids).delete()

    def _seed_question(self, assessment, data, passage=None):
        question, _ = AssessmentQuestion.objects.update_or_create(
            assessment=assessment,
            question_text=data['question_text'],
            defaults={
                'passage': passage,
                'question_type': data['question_type'],
                'marks': 10,
                'order_no': data.get('order_no', 1),
                'passage_title': data.get('passage_title', ''),
            },
        )
        self.counts['questions'] += 1

        option_ids = []
        for option_data in data.get('options', []):
            option, _ = QuestionOption.objects.update_or_create(
                question=question,
                option_text=option_data['option_text'],
                defaults={
                    'is_correct': option_data.get('is_correct', False),
                    'order_no': option_data.get('order_no', 1),
                },
            )
            option_ids.append(option.id)
            self.counts['options'] += 1
        question.options.exclude(id__in=option_ids).delete()
        return question

    def _get_language(self, name):
        language = Language.objects.filter(name__iexact=name).first()
        if language:
            return language
        code = LANGUAGE_CODES.get(name)
        if not code:
            raise CommandError(f'No language code is configured for {name}.')
        return Language.objects.create(name=name, code=code)

    def _get_level(self, name):
        level = DifficultyLevel.objects.filter(name__iexact=name).first()
        if level:
            return level
        defaults = LEVEL_DEFAULTS.get(name)
        if not defaults:
            raise CommandError(f'No difficulty defaults are configured for {name}.')
        return DifficultyLevel.objects.create(name=name, **defaults)
