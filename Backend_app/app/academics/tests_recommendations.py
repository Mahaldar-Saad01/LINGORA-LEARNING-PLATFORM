from datetime import timedelta
from unittest.mock import patch

from django.core.cache import cache
from django.core.exceptions import MultipleObjectsReturned
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from accounts.models import LearnerProfile, User
from academics.models import (
    Curriculum,
    DifficultyLevel,
    GeneratedLesson,
    Language,
    LearningPath,
    LearningPathItem,
    Lesson,
    LessonCategory,
    LessonRecommendation,
)
from academics.services.learning_paths import reorder_path_items
from academics.views import _dispatch_lesson_buffer_after_commit


class RecommendationEndpointTests(TestCase):
    def setUp(self):
        self.known = Language.objects.create(name='English', code='en')
        self.target = Language.objects.create(name='Spanish', code='es')
        self.level = DifficultyLevel.objects.create(
            name='Beginner', min_score=0, max_score=50
        )
        self.curriculum = Curriculum.objects.create(
            title='Spanish for English',
            target_language=self.target,
            explanation_language=self.known,
        )
        self.category = LessonCategory.objects.create(
            curriculum=self.curriculum, level=self.level, name='Basics'
        )
        self.user = self.make_user('learner', 'learner@example.com')
        self.other = self.make_user('other', 'other@example.com')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def make_user(self, username, email, with_profile=True):
        user = User.objects.create_user(
            username=username,
            password='pass',
            email=email,
            name=username,
            preferred_language='English',
            target_language='Spanish',
        )
        if with_profile:
            LearnerProfile.objects.create(
                user=user,
                known_language=self.known,
                target_language=self.target,
                current_level=self.level,
            )
        return user

    def lesson(self, title, order_no):
        return Lesson.objects.create(
            category=self.category,
            title=title,
            order_no=order_no,
            skills=['reading'],
        )

    def recommendation(self, user, lesson, score=50, status=None):
        return LessonRecommendation.objects.create(
            user=user,
            lesson=lesson,
            recommendation_score=score,
            priority=1,
            status=status or LessonRecommendation.Status.PENDING,
            expires_at=timezone.now() + timedelta(days=1),
        )

    def path(self, user=None):
        return LearningPath.objects.create(
            user=user or self.user,
            curriculum=self.curriculum,
            title='Personalized path',
        )

    def add_item(self, path, lesson, order_no, item_status):
        return LearningPathItem.objects.create(
            path=path,
            lesson=lesson,
            order_no=order_no,
            status=item_status,
        )

    def test_list_only_pending_in_deterministic_score_order(self):
        low = self.recommendation(self.user, self.lesson('Low', 1), 10)
        high = self.recommendation(self.user, self.lesson('High', 2), 90)
        self.recommendation(
            self.user,
            self.lesson('Dismissed', 3),
            100,
            LessonRecommendation.Status.DISMISSED,
        )

        response = self.client.get(reverse('recommendations'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['id'] for row in response.data], [high.id, low.id])

    def test_optional_pagination_preserves_default_list_contract(self):
        self.recommendation(self.user, self.lesson('One', 1))
        response = self.client.get(reverse('recommendations'), {'page': 1})
        self.assertEqual(set(response.data), {'count', 'next', 'previous', 'results'})

    def test_accept_creates_path_and_is_idempotent(self):
        recommendation = self.recommendation(self.user, self.lesson('New', 1))
        url = reverse('recommendation-accept', args=[recommendation.id])

        with patch('academics.views.dispatch_lesson_buffer') as dispatch:
            with self.captureOnCommitCallbacks(execute=True):
                first = self.client.post(url)
                second = self.client.post(url)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(
            LearningPath.objects.filter(
                user=self.user, status=LearningPath.Status.ACTIVE
            ).count(),
            1,
        )
        self.assertEqual(
            LearningPathItem.objects.filter(
                path__user=self.user, lesson=recommendation.lesson
            ).count(),
            1,
        )
        dispatch.assert_called_once_with(self.user.id)

    def test_accept_inserts_after_current_item(self):
        path = self.path()
        completed = self.add_item(
            path, self.lesson('Completed', 1), 1, LearningPathItem.Status.COMPLETED
        )
        current = self.add_item(
            path, self.lesson('Current', 2), 2, LearningPathItem.Status.AVAILABLE
        )
        later = self.add_item(
            path, self.lesson('Later', 3), 3, LearningPathItem.Status.LOCKED
        )
        recommendation = self.recommendation(self.user, self.lesson('Recommended', 4))

        self.client.post(reverse('recommendation-accept', args=[recommendation.id]))

        items = list(path.items.order_by('order_no'))
        self.assertEqual(
            [item.lesson_id for item in items],
            [completed.lesson_id, current.lesson_id, recommendation.lesson_id, later.lesson_id],
        )
        self.assertEqual([item.order_no for item in items], [1, 2, 3, 4])

    def test_dismiss_removes_only_matching_locked_item_and_reorders(self):
        path = self.path()
        lesson = self.lesson('Recommended', 1)
        first = self.add_item(
            path, self.lesson('First', 2), 1, LearningPathItem.Status.COMPLETED
        )
        locked = self.add_item(path, lesson, 2, LearningPathItem.Status.LOCKED)
        third = self.add_item(
            path, self.lesson('Third', 3), 3, LearningPathItem.Status.AVAILABLE
        )
        recommendation = self.recommendation(self.user, lesson)

        response = self.client.post(
            reverse('recommendation-dismiss', args=[recommendation.id])
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(LearningPathItem.objects.filter(pk=locked.pk).exists())
        items = list(path.items.order_by('order_no'))
        self.assertEqual([item.pk for item in items], [first.pk, third.pk])
        self.assertEqual([item.order_no for item in items], [1, 2])

    def test_dismiss_preserves_non_locked_items(self):
        for index, item_status in enumerate(
            (
                LearningPathItem.Status.AVAILABLE,
                LearningPathItem.Status.IN_PROGRESS,
                LearningPathItem.Status.COMPLETED,
            ),
            start=1,
        ):
            with self.subTest(item_status=item_status):
                path = self.path()
                lesson = self.lesson(f'Lesson {index}', index)
                item = self.add_item(path, lesson, 1, item_status)
                recommendation = self.recommendation(self.user, lesson)
                self.client.post(
                    reverse('recommendation-dismiss', args=[recommendation.id])
                )
                self.assertTrue(LearningPathItem.objects.filter(pk=item.pk).exists())
                path.status = LearningPath.Status.REPLACED
                path.save(update_fields=['status'])

    def test_other_user_cannot_list_accept_or_dismiss(self):
        recommendation = self.recommendation(self.other, self.lesson('Private', 1))
        self.assertEqual(self.client.get(reverse('recommendations')).data, [])
        self.assertEqual(
            self.client.post(
                reverse('recommendation-accept', args=[recommendation.id])
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.post(
                reverse('recommendation-dismiss', args=[recommendation.id])
            ).status_code,
            404,
        )

    def test_current_path_never_serializes_another_users_generation(self):
        path = self.path()
        lesson = self.lesson('Shared', 1)
        self.add_item(path, lesson, 1, LearningPathItem.Status.AVAILABLE)
        own = GeneratedLesson.objects.create(user=self.user, lesson=lesson)
        GeneratedLesson.objects.create(
            user=self.other, lesson=lesson, generation_version=2
        )

        response = self.client.get(reverse('current-learning-path'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['items'][0]['generation']['id'], own.id)

    def test_missing_profile_and_curriculum_are_controlled(self):
        no_profile = self.make_user('unconfigured', 'none@example.com', False)
        recommendation = self.recommendation(no_profile, self.lesson('Profile', 1))
        self.client.force_authenticate(no_profile)
        response = self.client.post(
            reverse('recommendation-accept', args=[recommendation.id])
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn('profile', response.data['detail'].lower())

        self.client.force_authenticate(self.user)
        self.curriculum.delete()
        # Deletion cascades the original lesson, so create a mismatched curriculum/lesson.
        other_target = Language.objects.create(name='French', code='fr')
        other_curriculum = Curriculum.objects.create(
            title='French for English',
            target_language=other_target,
            explanation_language=self.known,
        )
        category = LessonCategory.objects.create(
            curriculum=other_curriculum, level=self.level, name='Other'
        )
        lesson = Lesson.objects.create(category=category, title='Mismatch')
        recommendation = self.recommendation(self.user, lesson)
        response = self.client.post(
            reverse('recommendation-accept', args=[recommendation.id])
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn('curriculum', response.data['detail'].lower())

    @patch(
        'academics.views.Curriculum.objects.get',
        side_effect=MultipleObjectsReturned,
    )
    def test_ambiguous_curriculum_is_controlled(self, _get):
        recommendation = self.recommendation(self.user, self.lesson('Ambiguous', 1))
        response = self.client.post(
            reverse('recommendation-accept', args=[recommendation.id])
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn('ambiguous', response.data['detail'].lower())

    def test_one_active_path_per_user_constraint(self):
        self.path()
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.path()

    def test_reorder_service_produces_contiguous_unique_numbers(self):
        path = self.path()
        items = [
            self.add_item(
                path,
                self.lesson(f'Item {index}', index),
                index,
                LearningPathItem.Status.LOCKED,
            )
            for index in range(1, 5)
        ]
        reorder_path_items(path, list(reversed(items)))
        reordered = list(path.items.order_by('order_no'))
        self.assertEqual([item.pk for item in reordered], [item.pk for item in reversed(items)])
        self.assertEqual([item.order_no for item in reordered], [1, 2, 3, 4])

    def test_rollback_does_not_dispatch_lesson_buffer(self):
        with patch('academics.views.dispatch_lesson_buffer') as dispatch:
            with self.captureOnCommitCallbacks(execute=True):
                try:
                    with transaction.atomic():
                        _dispatch_lesson_buffer_after_commit(self.user.id)
                        raise RuntimeError('force rollback')
                except RuntimeError:
                    pass
        dispatch.assert_not_called()


@override_settings(
    REST_FRAMEWORK={
        'DEFAULT_AUTHENTICATION_CLASSES': (
            'rest_framework_simplejwt.authentication.JWTAuthentication',
        ),
        'DEFAULT_THROTTLE_RATES': {'recommendation_refresh': '1/hour'},
    }
)
class RecommendationRefreshThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='throttled',
            password='pass',
            email='throttled@example.com',
            name='Throttled',
            preferred_language='English',
            target_language='Spanish',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    @patch('academics.views.refresh_recommendations', return_value=[])
    def test_refresh_is_throttled(self, refresh):
        url = reverse('recommendations-refresh')
        with patch.dict(
            ScopedRateThrottle.THROTTLE_RATES,
            {'recommendation_refresh': '1/hour'},
        ):
            self.assertEqual(self.client.post(url).status_code, 200)
            self.assertEqual(self.client.post(url).status_code, 429)
        refresh.assert_called_once()
