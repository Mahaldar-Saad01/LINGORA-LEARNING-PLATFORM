from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from academics.models import ActivityAttempt, Curriculum, DifficultyLevel, GeneratedLesson, Language, Lesson, LessonCategory
from progress.models import LearningStats
from progress.services import serialize_stats, update_learning_stats


class LearningProgressTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='progress@example.com', email='progress@example.com', password='password123',
            name='Progress', preferred_language='en', target_language='de',
        )

    def test_streak_and_perfect_achievement_progress(self):
        stats = LearningStats.objects.create(user=self.user)
        update_learning_stats(stats, xp_earned=50, accuracy=100)
        stats.last_activity_date = timezone.localdate() - timedelta(days=1)
        stats.save(update_fields=['last_activity_date'])
        update_learning_stats(stats, xp_earned=50, accuracy=100)
        data = serialize_stats(stats)
        self.assertEqual(data['total_xp'], 100)
        self.assertEqual(data['current_streak'], 2)
        self.assertTrue(next(item for item in data['achievements'] if item['key'] == 'perfect_pair')['unlocked'])
        self.assertTrue(next(item for item in data['achievements'] if item['key'] == 'xp_100')['unlocked'])

    @patch('academics.views.dispatch_lesson_buffer')
    def test_lesson_completion_awards_xp_only_once(self, _dispatch):
        explanation = Language.objects.create(name='Test English', code='ten')
        target = Language.objects.create(name='Test German', code='tde')
        level = DifficultyLevel.objects.create(name='Progress level', min_score=0, max_score=100)
        curriculum = Curriculum.objects.create(title='Progress path', target_language=target, explanation_language=explanation)
        category = LessonCategory.objects.create(curriculum=curriculum, level=level, name='Progress basics')
        lesson = Lesson.objects.create(category=category, title='XP lesson')
        generated = GeneratedLesson.objects.create(
            user=self.user, lesson=lesson, generation_version=0, status=GeneratedLesson.Status.READY,
            payload={'activities': [{'id': 'activity_1', 'activity_type': 'lesson_overview', 'xp': 20}]},
        )
        ActivityAttempt.objects.create(
            generated_lesson=generated, user=self.user, activity_id='activity_1',
            activity_type='lesson_overview', is_correct=True,
        )
        client = APIClient()
        client.force_authenticate(self.user)
        url = reverse('generated-lesson-complete', args=[generated.id])
        first = client.post(url)
        second = client.post(url)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        stats = LearningStats.objects.get(user=self.user)
        self.assertEqual(stats.total_xp, 40)
        self.assertEqual(stats.completed_lessons, 1)
        self.assertEqual(first.data['xp_earned'], second.data['xp_earned'])
