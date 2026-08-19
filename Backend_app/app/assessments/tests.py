from types import SimpleNamespace

from datetime import datetime, timezone as datetime_timezone
from unittest.mock import patch

from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from .models import Assessment
from .services.first_assessment import _select_balanced_questions
from accounts.models import LearnerProfile, User
from academics.models import (
    Curriculum, DifficultyLevel, Language, LearnerSkillProfile, Lesson,
    LessonCategory, LessonContent, LessonRecommendation,
)
from progress.models import LearningStats
from .models import BadgeDefinition, RecurringAssessment, UserBadge
from .services.recurring import (
    complete_assessment, get_or_create_current, period_details, save_answer,
)


class FirstAssessmentQuestionSelectionTests(SimpleTestCase):
    @staticmethod
    def question(question_id, text, assessment_type=Assessment.READING, passage_id=None):
        return SimpleNamespace(
            id=question_id,
            question_text=text,
            passage_id=passage_id,
            assessment=SimpleNamespace(type=assessment_type),
        )

    def test_duplicate_question_text_is_selected_only_once(self):
        questions = [
            self.question(1, 'Choose the correct greeting.'),
            self.question(2, '  choose   THE correct greeting.  '),
            self.question(3, 'Choose the correct farewell.'),
        ]

        selected = _select_balanced_questions(questions, required_count=3)

        self.assertEqual([question.id for question in selected], [1, 3])

    def test_excluded_question_text_is_not_selected_again(self):
        questions = [
            self.question(1, 'Already selected'),
            self.question(2, 'A new question'),
        ]

        selected = _select_balanced_questions(
            questions,
            required_count=2,
            excluded_question_texts={'already selected'},
        )

        self.assertEqual([question.id for question in selected], [2])


class RecurringPeriodTests(SimpleTestCase):
    def test_daily_weekly_monthly_and_boundaries(self):
        moment = datetime(2027, 1, 1, 20, 0, tzinfo=datetime_timezone.utc)
        self.assertEqual(period_details('daily', moment, 'Asia/Kolkata')[0], '2027-01-02')
        self.assertEqual(period_details('weekly', moment, 'UTC')[0], '2026-W53')
        self.assertEqual(period_details('monthly', moment, 'UTC')[0], '2027-01')
        leap = datetime(2028, 2, 29, 12, tzinfo=datetime_timezone.utc)
        self.assertEqual(period_details('monthly', leap, 'UTC')[2].day, 29)


class RecurringAssessmentTests(TestCase):
    def setUp(self):
        self.known = Language.objects.create(name='Recurring English', code='ren')
        self.target = Language.objects.create(name='Recurring German', code='rde')
        self.level = DifficultyLevel.objects.create(name='Recurring beginner', min_score=0, max_score=59)
        self.curriculum = Curriculum.objects.create(
            title='Recurring course', target_language=self.target, explanation_language=self.known)
        self.category = LessonCategory.objects.create(
            curriculum=self.curriculum, level=self.level, name='Recurring basics')
        self.user = User.objects.create_user(
            username='recurring', password='pass', email='recurring@example.com', name='Recurring',
            preferred_language='English', target_language='German')
        LearnerProfile.objects.create(user=self.user, known_language=self.known,
                                      target_language=self.target, current_level=self.level)
        LearnerSkillProfile.objects.create(user=self.user)
        lesson = Lesson.objects.create(category=self.category, title='Question source', skills=['vocabulary'])
        activities = []
        for index in range(1, 7):
            activities.append({
                'id': f'q{index}', 'activity_type': 'fill_in_the_blank',
                'title': f'Question {index}', 'instruction': 'Complete the phrase',
                'skill': 'vocabulary', 'content': {
                    'sentence': f'Guten {{{{blank}}}} {index}', 'correct_answers': [f'answer{index}'],
                },
            })
        LessonContent.objects.create(
            lesson=lesson, target_language=self.target, explanation_language=self.known,
            title='Questions', content_text='', explanation_text='', example_text='',
            fallback_activities=activities)
        BadgeDefinition.objects.bulk_create([
            BadgeDefinition(code='first_step', name='First Step', description='First', badge_type='daily'),
            BadgeDefinition(code='perfect_day', name='Perfect Day', description='Perfect', badge_type='daily'),
        ], ignore_conflicts=True)
        self.client = APIClient()

    def test_authentication_and_deterministic_unique_snapshot(self):
        self.assertEqual(self.client.get('/api/assessments/status/').status_code, 401)
        first = get_or_create_current(self.user, 'daily')
        second = get_or_create_current(self.user, 'daily')
        self.assertEqual(first.id, second.id)
        self.assertEqual(first.question_count, 6)
        self.assertEqual(len({item['id'] for item in first.question_snapshot}), 6)
        self.assertEqual(first.question_snapshot, second.question_snapshot)

    def test_correct_answers_are_hidden_before_completion(self):
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/assessments/current/', {'type': 'daily'})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('correct_answers', response.data['questions'][0]['content'])

    def test_completion_is_idempotent_and_does_not_update_adaptive_models(self):
        item = get_or_create_current(self.user, 'daily')
        original_profile = LearnerSkillProfile.objects.get(user=self.user)
        original_updated = original_profile.updated_at
        for question in item.question_snapshot:
            expected = question['content']['correct_answers'][0]
            save_answer(item, question['id'], {'value': expected})
        completed, badges, extended = complete_assessment(item.id, self.user)
        again, repeated_badges, repeated_extended = complete_assessment(item.id, self.user)
        stats = LearningStats.objects.get(user=self.user)
        self.assertEqual(stats.total_xp, 15)
        self.assertEqual(stats.current_streak, 1)
        self.assertTrue(extended)
        self.assertFalse(repeated_extended)
        self.assertEqual(completed.id, again.id)
        self.assertEqual(repeated_badges, [])
        self.assertTrue(UserBadge.objects.filter(user=self.user, badge__code='first_step').exists())
        original_profile.refresh_from_db()
        self.assertEqual(original_profile.updated_at, original_updated)
        self.assertEqual(LessonRecommendation.objects.filter(user=self.user).count(), 0)

    def test_owner_scoping_and_completed_read_only(self):
        item = get_or_create_current(self.user, 'daily')
        other = User.objects.create_user(username='other-recurring', password='pass', email='other-r@example.com', name='Other')
        self.client.force_authenticate(other)
        self.assertEqual(self.client.post(f'/api/assessments/{item.id}/start/').status_code, 404)
