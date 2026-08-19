from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from progress.models import LearningStats
from academics.models import Language, DifficultyLevel, Curriculum, LessonCategory, Lesson, GeneratedLesson
from assessments.models import RecurringAssessment
from notifications.models import Notification, NotificationPreference, NotificationType
from notifications.services import NotificationService
from notifications.tasks import (
    send_daily_learning_reminders,
    send_streak_risk_notifications,
    send_inactivity_notifications,
    send_assessment_reminders,
    send_lesson_ready_notifications,
    send_achievement_notifications,
    clean_expired_notifications,
)


class NotificationSystemTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            username='learner1',
            email='learner1@example.com',
            password='password123',
            name='Learner One',
        )
        self.user2 = User.objects.create_user(
            username='learner2',
            email='learner2@example.com',
            password='password123',
            name='Learner Two',
        )

        self.client1 = APIClient()
        self.client1.force_authenticate(user=self.user1)

        self.client2 = APIClient()
        self.client2.force_authenticate(user=self.user2)

    def test_01_notification_creation(self):
        notification = NotificationService.create_notification(
            user=self.user1,
            notification_type=NotificationType.SYSTEM,
            title='Welcome!',
            message='Welcome to Lingora.',
        )
        self.assertIsNotNone(notification)
        self.assertEqual(notification.user, self.user1)
        self.assertFalse(notification.is_read)

    def test_02_notification_preferences(self):
        pref = NotificationService.get_or_create_preferences(self.user1)
        self.assertTrue(pref.notifications_enabled)
        self.assertEqual(pref.timezone, 'UTC')

        updated = NotificationService.update_preferences(
            self.user1,
            lesson_reminders_enabled=False,
            timezone='America/New_York',
        )
        self.assertFalse(updated.lesson_reminders_enabled)
        self.assertEqual(updated.timezone, 'America/New_York')

    def test_03_daily_reminder_task(self):
        # User 1 hasn't completed a lesson today
        send_daily_learning_reminders()
        count = Notification.objects.filter(
            user=self.user1,
            notification_type=NotificationType.LESSON_REMINDER,
        ).count()
        self.assertEqual(count, 1)

    def test_04_streak_reminder_task(self):
        # Set streak to 5, last activity yesterday
        yesterday = timezone.localdate() - timedelta(days=1)
        LearningStats.objects.create(
            user=self.user1,
            current_streak=5,
            last_activity_date=yesterday,
        )

        send_streak_risk_notifications()
        notification = Notification.objects.filter(
            user=self.user1,
            notification_type=NotificationType.STREAK_REMINDER,
        ).first()
        self.assertIsNotNone(notification)
        self.assertIn('5-day streak', notification.message)

    def test_05_assessment_reminder_task(self):
        RecurringAssessment.objects.create(
            user=self.user1,
            assessment_type='daily',
            period_key='2026-08-06',
            local_period_start=timezone.localdate(),
            local_period_end=timezone.localdate(),
            timezone_name='UTC',
            status=RecurringAssessment.Status.AVAILABLE,
        )

        send_assessment_reminders()
        count = Notification.objects.filter(
            user=self.user1,
            notification_type=NotificationType.ASSESSMENT_REMINDER,
        ).count()
        self.assertEqual(count, 1)

    def test_06_inactivity_reminder_task(self):
        three_days_ago = timezone.localdate() - timedelta(days=3)
        LearningStats.objects.create(
            user=self.user1,
            last_activity_date=three_days_ago,
        )

        send_inactivity_notifications()
        notification = Notification.objects.filter(
            user=self.user1,
            notification_type=NotificationType.INACTIVITY_REMINDER,
        ).first()
        self.assertIsNotNone(notification)
        self.assertIn('3 day(s)', notification.message)

    def test_07_lesson_ready_notification_task(self):
        lang1 = Language.objects.create(name='English', code='en')
        lang2 = Language.objects.create(name='Spanish', code='es')
        curr = Curriculum.objects.create(title='EN-ES', target_language=lang2, explanation_language=lang1)
        level = DifficultyLevel.objects.create(name='Beginner', min_score=0, max_score=100, order_no=1)
        cat = LessonCategory.objects.create(curriculum=curr, level=level, name='Basics')
        lesson = Lesson.objects.create(category=cat, title='Greetings')

        gl = GeneratedLesson.objects.create(
            user=self.user1,
            lesson=lesson,
            status=GeneratedLesson.Status.READY,
            generated_at=timezone.now(),
        )

        send_lesson_ready_notifications(user_id=self.user1.id, generated_lesson_id=gl.id)
        notification = Notification.objects.filter(
            user=self.user1,
            notification_type=NotificationType.LESSON_READY,
        ).first()
        self.assertIsNotNone(notification)
        self.assertIn('Greetings', notification.message)

    def test_08_duplicate_prevention(self):
        # Run daily learning reminder twice
        send_daily_learning_reminders()
        send_daily_learning_reminders()
        count = Notification.objects.filter(
            user=self.user1,
            notification_type=NotificationType.LESSON_REMINDER,
        ).count()
        self.assertEqual(count, 1)

    def test_09_read_notification_api(self):
        n = NotificationService.create_notification(
            user=self.user1,
            notification_type=NotificationType.SYSTEM,
            title='Test',
            message='Test message',
        )

        response = self.client1.patch(f'/api/notifications/{n.id}/read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        n.refresh_from_db()
        self.assertTrue(n.is_read)
        self.assertIsNotNone(n.read_at)

    def test_10_read_all_notifications_api(self):
        NotificationService.create_notification(user=self.user1, notification_type=NotificationType.SYSTEM, title='N1', message='M1')
        NotificationService.create_notification(user=self.user1, notification_type=NotificationType.SYSTEM, title='N2', message='M2', check_duplicates=False)

        response = self.client1.patch('/api/notifications/read-all/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        unread = Notification.objects.filter(user=self.user1, is_read=False).count()
        self.assertEqual(unread, 0)

    def test_11_user_isolation(self):
        n1 = NotificationService.create_notification(user=self.user1, notification_type=NotificationType.SYSTEM, title='N1', message='M1')

        # User 2 tries to read User 1's notification
        response = self.client2.patch(f'/api/notifications/{n1.id}/read/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # User 2 gets notifications list
        response = self.client2.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = data.get('results', data)
        self.assertEqual(len(results), 0)

    def test_12_disabled_notifications(self):
        NotificationService.update_preferences(self.user1, notifications_enabled=False)
        send_daily_learning_reminders()

        count = Notification.objects.filter(
            user=self.user1,
            notification_type=NotificationType.LESSON_REMINDER,
        ).count()
        self.assertEqual(count, 0)

    def test_13_timezone_handling(self):
        NotificationService.update_preferences(self.user1, timezone='Asia/Kolkata')
        pref = NotificationService.get_or_create_preferences(self.user1)
        self.assertEqual(pref.timezone, 'Asia/Kolkata')

        local_date = NotificationService.get_user_local_date(self.user1)
        self.assertIsNotNone(local_date)

    def test_14_celery_task_execution(self):
        res1 = send_daily_learning_reminders()
        res2 = send_streak_risk_notifications()
        res3 = send_inactivity_notifications()
        res4 = send_assessment_reminders()
        self.assertIn('processed', res1)
        self.assertIn('processed', res2)
        self.assertIn('processed', res3)
        self.assertIn('created', res4)

    def test_15_expired_notifications(self):
        # Notification created already expired
        expired_time = timezone.now() - timedelta(days=1)
        Notification.objects.create(
            user=self.user1,
            notification_type=NotificationType.SYSTEM,
            title='Expired',
            message='Old news',
            expires_at=expired_time,
        )

        clean_expired_notifications()
        count = Notification.objects.filter(user=self.user1, title='Expired').count()
        self.assertEqual(count, 0)
