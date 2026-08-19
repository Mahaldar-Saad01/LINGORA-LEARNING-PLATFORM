from django.core.management.base import BaseCommand

from academics.models import (
    Curriculum,
    DifficultyLevel,
    Language,
    Lesson,
    LessonCategory,
    LessonContent,
)
from assessments.models import Assessment, AssessmentQuestion, Passage, QuestionOption


class Command(BaseCommand):
    help = 'Seed sample language learning curriculum, lessons, and assessments.'

    def handle(self, *args, **options):
        english, _ = Language.objects.get_or_create(
            code='en',
            defaults={'name': 'English'},
        )
        hindi, _ = Language.objects.get_or_create(
            code='hi',
            defaults={'name': 'Hindi'},
        )
        german, _ = Language.objects.get_or_create(
            code='de',
            defaults={'name': 'German'},
        )

        beginner, _ = DifficultyLevel.objects.update_or_create(
            name='Beginner',
            defaults={'min_score': 0, 'max_score': 35, 'order_no': 1},
        )
        DifficultyLevel.objects.update_or_create(
            name='Intermediate',
            defaults={'min_score': 36, 'max_score': 70, 'order_no': 2},
        )
        DifficultyLevel.objects.update_or_create(
            name='Advanced',
            defaults={'min_score': 71, 'max_score': 100, 'order_no': 3},
        )

        self._seed_german_beginner_assessments(german, english, beginner)

        curriculum, _ = Curriculum.objects.get_or_create(
            target_language=hindi,
            explanation_language=english,
            defaults={
                'title': 'Hindi for English Speakers',
                'description': 'A beginner-friendly Hindi curriculum explained in English.',
            },
        )

        category, _ = LessonCategory.objects.get_or_create(
            curriculum=curriculum,
            level=beginner,
            name='Beginner Basics',
            defaults={'order_no': 1},
        )

        lesson_data = [
            {
                'title': 'Basic Greetings',
                'description': 'Learn common Hindi greetings.',
                'order_no': 1,
                'content_text': 'नमस्ते',
                'explanation_text': 'Namaste means Hello in Hindi.',
                'example_text': 'नमस्ते, आप कैसे हैं?',
            },
            {
                'title': 'Common Words',
                'description': 'Learn everyday Hindi words.',
                'order_no': 2,
                'content_text': 'पानी, खाना, घर',
                'explanation_text': 'These words mean water, food, and home.',
                'example_text': 'मुझे पानी चाहिए।',
            },
            {
                'title': 'Simple Sentences',
                'description': 'Learn simple Hindi sentence patterns.',
                'order_no': 3,
                'content_text': 'मेरा नाम राहुल है।',
                'explanation_text': 'This means My name is Rahul.',
                'example_text': 'मेरा नाम साद है।',
            },
        ]

        for item in lesson_data:
            lesson, _ = Lesson.objects.get_or_create(
                category=category,
                title=item['title'],
                defaults={
                    'description': item['description'],
                    'order_no': item['order_no'],
                    'estimated_minutes': 5,
                },
            )
            LessonContent.objects.get_or_create(
                lesson=lesson,
                target_language=hindi,
                explanation_language=english,
                defaults={
                    'title': item['title'],
                    'content_text': item['content_text'],
                    'explanation_text': item['explanation_text'],
                    'example_text': item['example_text'],
                },
            )

        reading = self._create_assessment(
            hindi,
            english,
            beginner,
            'reading',
            'Beginner Reading Test',
            'Check your understanding of basic Hindi words.',
        )
        reading_question = self._create_question(
            reading,
            'What does नमस्ते mean?',
            'mcq',
            1,
        )
        self._replace_options(
            reading_question,
            [
                ('Hello', True),
                ('Goodbye', False),
                ('Water', False),
                ('Food', False),
            ],
        )

        writing = self._create_assessment(
            hindi,
            english,
            beginner,
            'writing',
            'Beginner Writing Test',
            'Practice writing simple Hindi sentences.',
        )
        self._create_question(
            writing,
            "Write 'My name is Saad' in Hindi.",
            'short_answer',
            1,
        )

        comprehension = self._create_assessment(
            hindi,
            english,
            beginner,
            'comprehension',
            'Beginner Comprehension Test',
            'Check your understanding of common Hindi vocabulary.',
        )
        comprehension_question = self._create_question(
            comprehension,
            'What does पानी mean?',
            'mcq',
            1,
        )
        self._replace_options(
            comprehension_question,
            [
                ('Water', True),
                ('Food', False),
                ('House', False),
                ('Name', False),
            ],
        )
        passage = self._create_passage(
            comprehension,
            'The Secret Garden',
            (
                'As the sun rose over the stone walls, Barnaby the rabbit discovered '
                'a patch of fresh, vibrant carrots hidden under large leaves in the '
                'peaceful garden.'
            ),
            label='Reading Practice',
            read_time='5 min read',
            hint_title='Take your time reading, friend!',
            hint_text='Notice the descriptive words about the carrots.',
            order_no=1,
        )
        passage_question = self._create_question(
            comprehension,
            'Where did the rabbit go?',
            'passage_mcq',
            2,
            passage=passage,
            passage_label=passage.label,
            passage_title=passage.title,
            passage_text=passage.text,
            passage_read_time=passage.read_time,
            passage_hint_title=passage.hint_title,
            passage_hint_text=passage.hint_text,
        )
        self._replace_options(
            passage_question,
            [
                ('The Forest', False),
                ('The Garden', True),
                ('The Burrow', False),
            ],
        )

        self.stdout.write(self.style.SUCCESS('Sample learning data seeded.'))

    def _seed_german_beginner_assessments(self, german, english, beginner):
        reading = self._create_assessment(
            german,
            english,
            beginner,
            'reading',
            'Beginner German Reading Test',
            'Check your understanding of basic German words in English.',
        )
        reading_questions = [
            (
                'What does Guten Morgen mean?',
                1,
                [
                    ('Good morning', True),
                    ('Good night', False),
                    ('Thank you', False),
                    ('See you soon', False),
                ],
            ),
            (
                'Choose the English meaning of Wasser.',
                2,
                [
                    ('Water', True),
                    ('Bread', False),
                    ('House', False),
                    ('Name', False),
                ],
            ),
            (
                'Which German word means bread?',
                3,
                [
                    ('Brot', True),
                    ('Bitte', False),
                    ('Danke', False),
                    ('Freund', False),
                ],
            ),
            (
                'What does Haus mean?',
                4,
                [
                    ('House', True),
                    ('School', False),
                    ('Book', False),
                    ('Friend', False),
                ],
            ),
            (
                'Which German word means friend?',
                5,
                [
                    ('Freund', True),
                    ('Wasser', False),
                    ('Brot', False),
                    ('Haus', False),
                ],
            ),
        ]
        for question_text, order_no, options in reading_questions:
            question = self._create_question(reading, question_text, 'mcq', order_no)
            self._replace_options(question, options)

        writing = self._create_assessment(
            german,
            english,
            beginner,
            'writing',
            'Beginner German Writing Test',
            'Practice writing a few simple beginner German phrases.',
        )
        self._create_question(
            writing,
            'Write two short German sentences introducing yourself.',
            'short_answer',
            1,
        )
        self._create_question(
            writing,
            'Write one German greeting and one German thank-you phrase.',
            'short_answer',
            2,
        )

        comprehension = self._create_assessment(
            german,
            english,
            beginner,
            'comprehension',
            'Beginner German Comprehension Test',
            'Read short beginner passages and answer in English.',
        )
        passage = self._create_passage(
            comprehension,
            'Anna at the Cafe',
            (
                'Anna geht am Morgen in ein kleines Cafe. Sie bestellt Wasser '
                'und Brot. Dann sagt sie Danke und liest ein Buch.'
            ),
            label='Reading Practice',
            read_time='3 min read',
            hint_title='Look for simple action words.',
            hint_text='Focus on what Anna orders and what she does after saying thank you.',
            order_no=1,
        )
        passage_questions = [
            (
                'Where does Anna go in the morning?',
                1,
                [
                    ('To a small cafe', True),
                    ('To a school', False),
                    ('To a train station', False),
                ],
            ),
            (
                'What does Anna order?',
                2,
                [
                    ('Water and bread', True),
                    ('Tea and cake', False),
                    ('Milk and rice', False),
                ],
            ),
        ]
        for question_text, order_no, options in passage_questions:
            question = self._create_question(
                comprehension,
                question_text,
                'passage_mcq',
                order_no,
                passage=passage,
                passage_label=passage.label,
                passage_title=passage.title,
                passage_text=passage.text,
                passage_read_time=passage.read_time,
                passage_hint_title=passage.hint_title,
                passage_hint_text=passage.hint_text,
            )
            self._replace_options(question, options)

        vocabulary_question = self._create_question(
            comprehension,
            'What does Danke mean?',
            'mcq',
            3,
        )
        self._replace_options(
            vocabulary_question,
            [
                ('Thank you', True),
                ('Please', False),
                ('Goodbye', False),
                ('Book', False),
            ],
        )

    def _create_assessment(
        self,
        target_language,
        explanation_language,
        level,
        assessment_type,
        title,
        description,
    ):
        assessment, _ = Assessment.objects.get_or_create(
            target_language=target_language,
            explanation_language=explanation_language,
            level=level,
            type=assessment_type,
            defaults={'title': title, 'description': description},
        )
        return assessment

    def _create_question(self, assessment, question_text, question_type, order_no, **extra_fields):
        question, _ = AssessmentQuestion.objects.get_or_create(
            assessment=assessment,
            question_text=question_text,
            defaults={
                'question_type': question_type,
                'marks': 10,
                'order_no': order_no,
                **extra_fields,
            },
        )
        for field, value in extra_fields.items():
            setattr(question, field, value)
        question.question_type = question_type
        question.marks = 10
        question.order_no = order_no
        question.save()
        return question

    def _create_passage(
        self,
        assessment,
        title,
        text,
        label='Reading Practice',
        read_time='3 min read',
        hint_title='Read carefully.',
        hint_text='Use the passage details to answer.',
        order_no=1,
    ):
        passage, _ = Passage.objects.update_or_create(
            assessment=assessment,
            title=title,
            defaults={
                'text': text,
                'label': label,
                'read_time': read_time,
                'hint_title': hint_title,
                'hint_text': hint_text,
                'order_no': order_no,
            },
        )
        return passage

    def _replace_options(self, question, options):
        question.options.all().delete()
        for index, (option_text, is_correct) in enumerate(options, start=1):
            QuestionOption.objects.create(
                question=question,
                option_text=option_text,
                is_correct=is_correct,
                order_no=index,
            )
