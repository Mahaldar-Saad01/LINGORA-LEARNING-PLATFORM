from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import LearnerProfile, User
from academics.models import (
    ActivityAttempt, Curriculum, DifficultyLevel, GeneratedLesson, Language,
    LearnerSkillProfile, LearningPath, LearningPathItem, Lesson, LessonCategory,
    LessonPrerequisite, LessonRecommendation, SkillHistory,
)
from academics.services.adaptive_learning import (
    forecast, forecast_learning_scenario, generate_or_extend_path, initialize_skill_profile,
    recalculate_after_lesson, refresh_recommendations, skill_priorities,
)


class AdaptiveLearningTests(TestCase):
    def setUp(self):
        self.known = Language.objects.create(name='English', code='en')
        self.target = Language.objects.create(name='Spanish', code='es')
        self.level = DifficultyLevel.objects.create(name='Beginner', min_score=0, max_score=59)
        self.curriculum = Curriculum.objects.create(
            title='Spanish for English', target_language=self.target, explanation_language=self.known)
        self.category = LessonCategory.objects.create(curriculum=self.curriculum, level=self.level, name='Basics')
        self.user = User.objects.create_user(
            username='learner', password='pass', email='a@example.com', name='A',
            preferred_language='English', target_language='Spanish')
        LearnerProfile.objects.create(user=self.user, known_language=self.known,
                                      target_language=self.target, current_level=self.level)

    def lesson(self, title, order, skills):
        return Lesson.objects.create(category=self.category, title=title, order_no=order, skills=skills)

    def test_assessment_initialization_is_idempotent(self):
        initialize_skill_profile(self.user, 35)
        initialize_skill_profile(self.user, 90)
        self.assertEqual(LearnerSkillProfile.objects.filter(user=self.user).count(), 1)
        self.assertEqual(SkillHistory.objects.filter(user=self.user).count(), 6)
        self.assertEqual(float(self.user.skill_profile.overall_score), 35)

    def test_recent_lesson_updates_only_practised_skill_and_is_bounded(self):
        lesson = self.lesson('Writing', 1, ['writing'])
        generated = GeneratedLesson.objects.create(user=self.user, lesson=lesson, status='ready')
        ActivityAttempt.objects.create(generated_lesson=generated, user=self.user, activity_id='a',
                                       activity_type='word_arrangement', skill='writing', is_correct=True)
        profile = initialize_skill_profile(self.user, 50)
        recalculate_after_lesson(self.user, generated)
        profile.refresh_from_db()
        self.assertEqual(float(profile.reading_score), 50)
        self.assertGreater(float(profile.writing_score), 50)
        self.assertLessEqual(float(profile.writing_score), 100)

    def test_weakest_skill_has_highest_priority(self):
        profile = initialize_skill_profile(self.user, 70)
        profile.writing_score = 20; profile.save()
        self.assertEqual(skill_priorities(self.user)[0]['skill'], 'writing')

    def test_completed_and_prerequisite_blocked_lessons_are_excluded(self):
        first = self.lesson('First', 1, ['reading'])
        blocked = self.lesson('Blocked', 2, ['writing'])
        LessonPrerequisite.objects.create(lesson=blocked, prerequisite=first)
        records = refresh_recommendations(self.user)
        self.assertNotIn(blocked.id, [r.lesson_id for r in records])
        generated = GeneratedLesson.objects.create(user=self.user, lesson=first, completed_at=timezone.now())
        records = refresh_recommendations(self.user)
        self.assertNotIn(first.id, [r.lesson_id for r in records])
        self.assertIn(blocked.id, [r.lesson_id for r in records])

    def test_path_is_singleton_and_unlocks_first_item(self):
        self.lesson('One', 1, ['reading']); self.lesson('Two', 2, ['writing'])
        first = generate_or_extend_path(self.user)
        second = generate_or_extend_path(self.user)
        self.assertEqual(first.id, second.id)
        self.assertEqual(first.items.filter(status=LearningPathItem.Status.AVAILABLE).count(), 1)

    def test_forecast_stays_in_bounds(self):
        initialize_skill_profile(self.user, 99)
        result = forecast(self.user, 'writing', 90)
        self.assertLessEqual(result['predicted_score'], 100)
        self.assertGreaterEqual(result['predicted_range']['minimum'], 0)

    def test_scenario_forecast_returns_all_skills_and_average(self):
        initialize_skill_profile(self.user, 45)
        self.lesson('Writing', 1, ['writing'])
        result = forecast_learning_scenario(self.user, 14, 2, 80)
        self.assertEqual({item['skill'] for item in result['skills']}, {
            'reading', 'writing', 'listening', 'speaking', 'vocabulary', 'grammar',
        })
        self.assertEqual(result['current_overall_score'], round(sum(
            item['current_score'] for item in result['skills']) / 6))
        self.assertEqual(result['predicted_overall_score'], round(sum(
            item['predicted_score'] for item in result['skills']) / 6))

    def test_relevant_lessons_and_speaking_activity_drive_skill_gain(self):
        initialize_skill_profile(self.user, 40)
        lesson = self.lesson('Speaking and writing', 1, ['writing'])
        GeneratedLesson.objects.create(
            user=self.user, lesson=lesson, status=GeneratedLesson.Status.READY,
            payload={'activities': [{'activity_type': 'speaking_practice'}]},
        )
        result = forecast_learning_scenario(self.user, 14, 1, 100)
        by_skill = {item['skill']: item for item in result['skills']}
        self.assertGreater(by_skill['writing']['improvement'], by_skill['listening']['improvement'])
        self.assertGreater(by_skill['speaking']['improvement'], 0)
        self.assertEqual(by_skill['listening']['improvement'], 0)

    def test_new_learner_has_low_confidence_and_valid_ranges(self):
        result = forecast_learning_scenario(self.user, 14, 2, 80)
        self.assertEqual(result['confidence'], 'low')
        for item in result['skills']:
            self.assertGreaterEqual(item['predicted_score'], 0)
            self.assertLessEqual(item['predicted_score'], 100)
            self.assertLessEqual(item['predicted_range']['minimum'], item['predicted_score'])
            self.assertGreaterEqual(item['predicted_range']['maximum'], item['predicted_score'])

    def test_path_priority_deduplicates_and_excludes_locked_item(self):
        available = self.lesson('Available', 1, ['reading'])
        locked = self.lesson('Locked', 2, ['writing'])
        path = LearningPath.objects.create(
            user=self.user, curriculum=self.curriculum, title='Path', status=LearningPath.Status.ACTIVE)
        LearningPathItem.objects.create(path=path, lesson=available, order_no=1,
                                        status=LearningPathItem.Status.AVAILABLE)
        LearningPathItem.objects.create(path=path, lesson=locked, order_no=2,
                                        status=LearningPathItem.Status.LOCKED)
        LessonRecommendation.objects.create(
            user=self.user, lesson=available, recommendation_score=90, priority=1,
            status=LessonRecommendation.Status.PENDING, expires_at=timezone.now() + timezone.timedelta(days=1))
        result = forecast_learning_scenario(self.user, 14, 1, 80)
        self.assertEqual([item['id'] for item in result['upcoming_lessons']], [available.id])


class ProficiencyForecastApiTests(AdaptiveLearningTests):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.url = '/api/proficiency-forecast/'

    def test_authentication_is_required(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_defaults_and_clamped_parameters(self):
        self.client.force_authenticate(self.user)
        defaults = self.client.get(self.url)
        self.assertEqual(defaults.status_code, 200)
        self.assertEqual(defaults.data['scenario'], {
            'days': 14, 'lessons': 2, 'consistency_percentage': 80,
        })
        clamped = self.client.get(self.url, {'days': 0, 'lessons': 99, 'consistency': 120})
        self.assertEqual(clamped.data['scenario'], {
            'days': 1, 'lessons': 20, 'consistency_percentage': 100,
        })

    def test_invalid_integer_returns_400(self):
        self.client.force_authenticate(self.user)
        for parameter in ('days', 'lessons', 'consistency'):
            response = self.client.get(self.url, {parameter: 'invalid'})
            self.assertEqual(response.status_code, 400)

    def test_missing_learner_profile_is_clean_error(self):
        self.client.force_authenticate(self.user)
        self.user.learner_profile.delete()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 400)
        self.assertIn('learner profile', response.data['detail'].lower())


class SpeakingSubmissionApiTests(TestCase):
    def setUp(self):
        known = Language.objects.create(name='English speaking', code='en-sp')
        target = Language.objects.create(name='German speaking', code='de-sp')
        level = DifficultyLevel.objects.create(name='Speaking beginner', min_score=0, max_score=59)
        curriculum = Curriculum.objects.create(
            title='German speaking course', target_language=target, explanation_language=known)
        category = LessonCategory.objects.create(curriculum=curriculum, level=level, name='Speaking basics')
        self.user = User.objects.create_user(
            username='speaker', password='pass', email='speaker@example.com', name='Speaker',
            preferred_language='English', target_language='German')
        LearnerProfile.objects.create(user=self.user, known_language=known,
                                      target_language=target, current_level=level)
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        lesson = Lesson.objects.create(category=category, title='Speaking', order_no=1, skills=['speaking'])
        self.generated = GeneratedLesson.objects.create(
            user=self.user, lesson=lesson, status=GeneratedLesson.Status.READY,
            payload={'activities': [{
                'id': 'speak', 'activity_type': 'speaking_practice', 'skill': 'speaking',
                'content': {'phrase': 'Guten Morgen'},
            }]},
        )
        self.url = f'/api/learning/generated-lessons/{self.generated.id}/activities/speak/submit/'

    def test_complete_answer_reaches_json_storage_and_is_server_scored(self):
        response = self.client.post(self.url, {
            'answer': {
                'transcript': 'guten, morgen!', 'expected_text': 'wrong phrase',
                'recording_duration_ms': 1000, 'recognition_confidence': .8,
                'match_accuracy': 0, 'is_correct': False,
                'was_manually_confirmed': False,
                'alternatives': [{'transcript': 'guten morgen', 'confidence': .8, 'accuracy': 0}],
            },
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['correct'])
        self.assertEqual(response.data['match_accuracy'], 100)
        attempt = ActivityAttempt.objects.get(generated_lesson=self.generated, activity_id='speak')
        self.assertEqual(attempt.user_answer['expected_text'], 'Guten Morgen')
        self.assertEqual(float(attempt.pronunciation_score), 100)

    def test_manual_confirmation_is_stored_without_pronunciation_claim(self):
        response = self.client.post(self.url, {'answer': {
            'transcript': '', 'expected_text': 'Guten Morgen',
            'recording_duration_ms': 0, 'recognition_confidence': None,
            'match_accuracy': None, 'is_correct': None,
            'was_manually_confirmed': True, 'alternatives': [],
        }}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['manually_confirmed'])
        self.assertIsNone(response.data['match_accuracy'])
