import logging
from datetime import timedelta
import zoneinfo
from django.utils import timezone
from django.db import models
from .models import Notification, NotificationPreference, NotificationType

logger = logging.getLogger(__name__)



NOTIFICATION_TEMPLATES = {
    NotificationType.LESSON_REMINDER: {
        'title': 'Time to learn!',
        'message': "You haven't completed today's lesson yet. Keep your progress going.",
    },
    NotificationType.STREAK_REMINDER: {
        'title': 'Protect your streak!',
        'message': "Your {streak}-day streak is at risk. Complete a lesson today to keep it going!",
    },
    NotificationType.LESSON_READY: {
        'title': 'Your next lesson is ready!',
        'message': "Your personalized lesson '{lesson_title}' is ready for you.",
    },
    NotificationType.LESSON_COMPLETED: {
        'title': 'Great job!',
        'message': "You completed today's lesson and earned {xp} XP.",
    },
    NotificationType.ASSESSMENT_REMINDER: {
        'title': 'Assessment available',
        'message': "Your {assessment_type} assessment is ready. Test your skills now!",
    },
    NotificationType.ASSESSMENT_AVAILABLE: {
        'title': 'New Assessment Available',
        'message': "A new {assessment_type} assessment is now available for you.",
    },
    NotificationType.INACTIVITY_REMINDER: {
        'title': 'We miss you!',
        'message': "It's been {days} day(s) since your last practice. Come back and continue your language journey!",
    },
    NotificationType.ACHIEVEMENT: {
        'title': 'Achievement Unlocked!',
        'message': "Congratulations! You earned the '{achievement_title}' achievement!",
    },
    NotificationType.DAILY_GOAL_REMINDER: {
        'title': 'Daily goal within reach!',
        'message': "You're close to completing today's learning goal. Finish strong!",
    },
    NotificationType.SYSTEM: {
        'title': 'System Notification',
        'message': '{message}',
    },
}


class NotificationService:
    @staticmethod
    def get_or_create_preferences(user):
        pref, _ = NotificationPreference.objects.get_or_create(user=user)
        return pref

    @staticmethod
    def is_notification_enabled(user, notification_type):
        pref = NotificationService.get_or_create_preferences(user)
        if not pref.notifications_enabled:
            return False

        if notification_type in (NotificationType.LESSON_REMINDER, NotificationType.DAILY_GOAL_REMINDER):
            return pref.lesson_reminders_enabled
        elif notification_type == NotificationType.STREAK_REMINDER:
            return pref.streak_reminders_enabled
        elif notification_type in (NotificationType.ASSESSMENT_REMINDER, NotificationType.ASSESSMENT_AVAILABLE):
            return pref.assessment_reminders_enabled
        elif notification_type == NotificationType.INACTIVITY_REMINDER:
            return pref.inactivity_notifications_enabled
        elif notification_type == NotificationType.ACHIEVEMENT:
            return pref.achievement_notifications_enabled
        return True

    @staticmethod
    def get_user_local_date(user):
        pref = NotificationService.get_or_create_preferences(user)
        try:
            user_tz = zoneinfo.ZoneInfo(pref.timezone)
        except Exception:
            user_tz = zoneinfo.ZoneInfo('UTC')
        return timezone.now().astimezone(user_tz).date()

    @staticmethod
    def is_duplicate(user, notification_type, metadata=None, cooldown_hours=24):
        now = timezone.now()
        since = now - timedelta(hours=cooldown_hours)

        qs = Notification.objects.filter(
            user=user,
            notification_type=notification_type,
            created_at__gte=since,
        )

        metadata = metadata or {}

        # Specialized deduplication checks
        if notification_type in (NotificationType.LESSON_REMINDER, NotificationType.STREAK_REMINDER, NotificationType.DAILY_GOAL_REMINDER):
            # Maximum 1 per calendar day
            today = NotificationService.get_user_local_date(user)
            return Notification.objects.filter(
                user=user,
                notification_type=notification_type,
                created_at__date=today,
            ).exists()

        if notification_type == NotificationType.LESSON_READY and 'generated_lesson_id' in metadata:
            return Notification.objects.filter(
                user=user,
                notification_type=notification_type,
                metadata__generated_lesson_id=metadata['generated_lesson_id'],
            ).exists()

        if notification_type in (NotificationType.ASSESSMENT_REMINDER, NotificationType.ASSESSMENT_AVAILABLE) and 'assessment_id' in metadata:
            return Notification.objects.filter(
                user=user,
                notification_type=notification_type,
                metadata__assessment_id=metadata['assessment_id'],
            ).exists()

        if notification_type == NotificationType.ACHIEVEMENT and 'achievement_key' in metadata:
            return Notification.objects.filter(
                user=user,
                notification_type=notification_type,
                metadata__achievement_key=metadata['achievement_key'],
            ).exists()

        return qs.exists()

    @classmethod
    def create_notification(
        cls,
        user,
        notification_type,
        title=None,
        message=None,
        metadata=None,
        scheduled_for=None,
        expires_at=None,
        check_preferences=True,
        check_duplicates=True,
        cooldown_hours=24,
    ):
        if check_preferences and not cls.is_notification_enabled(user, notification_type):
            logger.info("Notification %s skipped for user %s (preferences disabled)", notification_type, user.id)
            return None

        metadata = metadata or {}

        if check_duplicates and cls.is_duplicate(user, notification_type, metadata, cooldown_hours=cooldown_hours):
            logger.info("Notification %s skipped for user %s (duplicate/cooldown)", notification_type, user.id)
            return None

        template = NOTIFICATION_TEMPLATES.get(notification_type, {})
        final_title = title or template.get('title', 'Notification')
        raw_message = message or template.get('message', '')

        try:
            final_message = raw_message.format(**metadata)
        except Exception:
            final_message = raw_message

        if not expires_at:
            expires_at = timezone.now() + timedelta(days=30)

        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=final_title,
            message=final_message,
            metadata=metadata,
            scheduled_for=scheduled_for,
            expires_at=expires_at,
        )

        logger.info("Created notification %s for user %s (id: %s)", notification_type, user.id, notification.id)
        return notification

    @staticmethod
    def mark_as_read(user, notification_id):
        try:
            notification = Notification.objects.get(pk=notification_id, user=user)
            notification.mark_as_read()
            return notification
        except Notification.DoesNotExist:
            return None

    @staticmethod
    def mark_all_as_read(user):
        now = timezone.now()
        updated_count = Notification.objects.filter(
            user=user,
            is_read=False,
        ).update(is_read=True, read_at=now)
        return updated_count

    @staticmethod
    def get_user_notifications(user, unread_only=False):
        now = timezone.now()
        qs = Notification.objects.filter(user=user)
        # Exclude expired
        qs = qs.filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now))
        if unread_only:
            qs = qs.filter(is_read=False)
        return qs.order_by('-created_at')

    @staticmethod
    def update_preferences(user, **kwargs):
        pref = NotificationService.get_or_create_preferences(user)
        for key, value in kwargs.items():
            if hasattr(pref, key):
                setattr(pref, key, value)
        pref.save()
        return pref
