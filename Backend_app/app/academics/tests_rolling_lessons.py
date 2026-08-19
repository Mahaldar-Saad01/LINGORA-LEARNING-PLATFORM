from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.models import LearnerProfile, User
from academics.models import Curriculum, DifficultyLevel, GeneratedLesson, Language, Lesson, LessonCategory
from academics.services.lesson_fallback import get_or_create_fallback_lesson
from academics.tasks import ensure_lesson_buffer_for_user


@override_settings(LESSON_GENERATION_VERSION=1, LESSON_PROMPT_VERSION='test-v1')
class RollingLessonBufferTests(TestCase):
    def setUp(self):
        self.english = Language.objects.create(name='English test', code='ent')
        self.target = Language.objects.create(name='German test', code='det')
        self.level = DifficultyLevel.objects.create(name='Test beginner', min_score=0, max_score=100)
        self.curriculum = Curriculum.objects.create(
            title='Test curriculum', target_language=self.target, explanation_language=self.english,
        )
        self.category = LessonCategory.objects.create(
            curriculum=self.curriculum, level=self.level, name='Basics', order_no=1,
        )
        self.lessons = [Lesson.objects.create(
            category=self.category, title=f'Lesson {index}', order_no=index,
            description='Practice core words.', learning_objectives=['Practice words'],
            vocabulary=[f'word-{index}', f'other-{index}'], skills=['vocabulary'],
        ) for index in range(1, 5)]
        self.user = User.objects.create_user(
            username='rolling@example.com', email='rolling@example.com', password='password123',
            name='Rolling', preferred_language='ent', target_language='det',
        )
        LearnerProfile.objects.create(
            user=self.user, known_language=self.english,
            target_language=self.target, current_level=self.level,
        )

    def test_assessment_stage_reserves_lessons_one_and_two(self):
        queued = ensure_lesson_buffer_for_user(self.user.id)
        lesson_ids = set(GeneratedLesson.objects.filter(id__in=queued).values_list('lesson_id', flat=True))
        self.assertEqual(lesson_ids, {self.lessons[0].id, self.lessons[1].id})

    def test_completing_lesson_one_reserves_lessons_three_and_four(self):
        ensure_lesson_buffer_for_user(self.user.id)
        first = GeneratedLesson.objects.get(user=self.user, lesson=self.lessons[0], generation_version=1)
        first.completed_at = timezone.now()
        first.save(update_fields=['completed_at'])
        queued = ensure_lesson_buffer_for_user(self.user.id)
        lesson_ids = set(GeneratedLesson.objects.filter(id__in=queued).values_list('lesson_id', flat=True))
        self.assertEqual(lesson_ids, {self.lessons[2].id, self.lessons[3].id})

    def test_database_fallback_is_immediately_usable(self):
        generated = get_or_create_fallback_lesson(self.user, self.lessons[0])
        self.assertEqual(generated.generation_version, 0)
        self.assertEqual(generated.status, GeneratedLesson.Status.READY)
        self.assertGreaterEqual(len(generated.payload['activities']), 2)
