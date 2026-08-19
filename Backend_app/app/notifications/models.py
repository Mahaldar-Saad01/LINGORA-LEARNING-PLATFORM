from django.db import models
from django.utils import timezone


class NotificationType(models.TextChoices):
    LESSON_REMINDER = 'lesson_reminder', 'Lesson reminder'
    STREAK_REMINDER = 'streak_reminder', 'Streak reminder'
    ASSESSMENT_REMINDER = 'assessment_reminder', 'Assessment reminder'
    DAILY_GOAL_REMINDER = 'daily_goal_reminder', 'Daily goal reminder'
    INACTIVITY_REMINDER = 'inactivity_reminder', 'Inactivity reminder'
    LESSON_READY = 'lesson_ready', 'Lesson ready'
    LESSON_COMPLETED = 'lesson_completed', 'Lesson completed'
    ASSESSMENT_AVAILABLE = 'assessment_available', 'Assessment available'
    ACHIEVEMENT = 'achievement', 'Achievement'
    SYSTEM = 'system', 'System'


class Notification(models.Model):
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'notification_type', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user} - {self.notification_type} ({'read' if self.is_read else 'unread'})"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notification_preference',
    )
    notifications_enabled = models.BooleanField(default=True)
    lesson_reminders_enabled = models.BooleanField(default=True)
    streak_reminders_enabled = models.BooleanField(default=True)
    assessment_reminders_enabled = models.BooleanField(default=True)
    achievement_notifications_enabled = models.BooleanField(default=True)
    inactivity_notifications_enabled = models.BooleanField(default=True)
    preferred_notification_time = models.TimeField(default='09:00:00')
    timezone = models.CharField(max_length=64, default='UTC')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} notification preferences"
