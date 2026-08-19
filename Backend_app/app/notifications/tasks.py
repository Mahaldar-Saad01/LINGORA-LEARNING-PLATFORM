import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from accounts.models import User
from progress.models import LearningStats
from assessments.models import RecurringAssessment
from academics.models import GeneratedLesson
from .models import Notification, NotificationType
from .services import NotificationService

logger = logging.getLogger(__name__)


@shared_task
def send_daily_learning_reminders():
    logger.info("Daily reminder task started")
    processed_count = 0
    created_count = 0
    skipped_disabled = 0
    skipped_duplicate = 0

    users = User.objects.filter(is_active=True).select_related('notification_preference', 'learning_stats')

    for user in users:
        processed_count += 1
        try:
            pref = NotificationService.get_or_create_preferences(user)
            if not pref.notifications_enabled or not pref.lesson_reminders_enabled:
                skipped_disabled += 1
                continue

            local_today = NotificationService.get_user_local_date(user)
            stats = getattr(user, 'learning_stats', None)

            # Check if completed lesson today
            if stats and stats.last_activity_date == local_today:
                continue

            notification = NotificationService.create_notification(
                user=user,
                notification_type=NotificationType.LESSON_REMINDER,
            )

            if notification:
                created_count += 1
            else:
                skipped_duplicate += 1
        except Exception:
            logger.exception("Error sending daily learning reminder to user %s", user.id)

    logger.info(
        "Notification task completed. Processed %d learners, Created %d notifications, Skipped %d disabled, Skipped %d duplicate notifications",
        processed_count, created_count, skipped_disabled, skipped_duplicate
    )
    return {'processed': processed_count, 'created': created_count}


@shared_task
def send_streak_risk_notifications():
    logger.info("Streak risk reminder task started")
    processed_count = 0
    created_count = 0

    users = User.objects.filter(
        is_active=True,
        learning_stats__current_streak__gt=0,
    ).select_related('notification_preference', 'learning_stats')

    for user in users:
        processed_count += 1
        try:
            local_today = NotificationService.get_user_local_date(user)
            stats = user.learning_stats

            if stats.last_activity_date == local_today:
                continue  # Already practiced today

            streak = stats.current_streak
            notification = NotificationService.create_notification(
                user=user,
                notification_type=NotificationType.STREAK_REMINDER,
                metadata={'streak': streak},
            )
            if notification:
                created_count += 1
        except Exception:
            logger.exception("Error processing streak risk for user %s", user.id)

    logger.info("Streak risk task completed. Processed %d learners, Created %d notifications", processed_count, created_count)
    return {'processed': processed_count, 'created': created_count}


@shared_task
def send_inactivity_notifications():
    logger.info("Inactivity reminder task started")
    processed_count = 0
    created_count = 0

    users = User.objects.filter(is_active=True).select_related('notification_preference', 'learning_stats')

    for user in users:
        processed_count += 1
        try:
            local_today = NotificationService.get_user_local_date(user)
            stats = getattr(user, 'learning_stats', None)

            if not stats or not stats.last_activity_date:
                continue

            days_inactive = (local_today - stats.last_activity_date).days
            if days_inactive in (1, 3, 7):
                notification = NotificationService.create_notification(
                    user=user,
                    notification_type=NotificationType.INACTIVITY_REMINDER,
                    metadata={'days': days_inactive},
                    cooldown_hours=24 * days_inactive,
                )
                if notification:
                    created_count += 1
        except Exception:
            logger.exception("Error sending inactivity notification for user %s", user.id)

    logger.info("Inactivity notification task completed. Processed %d, Created %d", processed_count, created_count)
    return {'processed': processed_count, 'created': created_count}


@shared_task
def send_assessment_reminders():
    logger.info("Assessment reminder task started")
    created_count = 0

    available_assessments = RecurringAssessment.objects.filter(
        status=RecurringAssessment.Status.AVAILABLE,
    ).select_related('user', 'user__notification_preference')

    for ra in available_assessments:
        try:
            notification = NotificationService.create_notification(
                user=ra.user,
                notification_type=NotificationType.ASSESSMENT_REMINDER,
                metadata={'assessment_id': ra.id, 'assessment_type': ra.assessment_type},
            )
            if notification:
                created_count += 1
        except Exception:
            logger.exception("Error sending assessment reminder for assessment %s", ra.id)

    logger.info("Assessment reminder task completed. Created %d notifications", created_count)
    return {'created': created_count}


@shared_task
def send_lesson_ready_notifications(user_id=None, generated_lesson_id=None):
    logger.info("Lesson ready notification task started (user_id=%s, generated_lesson_id=%s)", user_id, generated_lesson_id)
    created_count = 0

    qs = GeneratedLesson.objects.filter(status=GeneratedLesson.Status.READY).select_related('user', 'lesson')
    if generated_lesson_id:
        qs = qs.filter(pk=generated_lesson_id)
    elif user_id:
        qs = qs.filter(user_id=user_id)
    else:
        # Check lessons ready within the last 2 hours
        qs = qs.filter(generated_at__gte=timezone.now() - timedelta(hours=2))

    for gl in qs:
        try:
            notification = NotificationService.create_notification(
                user=gl.user,
                notification_type=NotificationType.LESSON_READY,
                metadata={
                    'generated_lesson_id': gl.id,
                    'lesson_id': gl.lesson.id,
                    'lesson_title': gl.lesson.title,
                },
            )
            if notification:
                created_count += 1
        except Exception:
            logger.exception("Error sending lesson ready notification for lesson %s", gl.id)

    logger.info("Lesson ready task completed. Created %d notifications", created_count)
    return {'created': created_count}


@shared_task
def send_achievement_notifications(user_id=None, achievement_key=None, achievement_title=None):
    logger.info("Achievement notification task started (user_id=%s, key=%s)", user_id, achievement_key)
    if not user_id or not achievement_key:
        return {'created': 0}

    try:
        user = User.objects.get(pk=user_id)
        notification = NotificationService.create_notification(
            user=user,
            notification_type=NotificationType.ACHIEVEMENT,
            metadata={
                'achievement_key': achievement_key,
                'achievement_title': achievement_title or achievement_key,
            },
        )
        return {'created': 1 if notification else 0}
    except Exception:
        logger.exception("Error sending achievement notification for user %s", user_id)
        return {'created': 0}


@shared_task
def clean_expired_notifications():
    logger.info("Clean expired notifications task started")
    deleted_count, _ = Notification.objects.filter(expires_at__lte=timezone.now()).delete()
    logger.info("Clean expired notifications completed. Deleted %d notifications", deleted_count)
    return {'deleted': deleted_count}
