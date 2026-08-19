from django.contrib import admin
from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'notification_type',
        'title',
        'is_read',
        'created_at',
        'scheduled_for',
        'expires_at',
    )
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__name', 'user__email', 'title', 'message')
    readonly_fields = ('created_at', 'read_at')
    ordering = ('-created_at',)


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'notifications_enabled',
        'lesson_reminders_enabled',
        'streak_reminders_enabled',
        'assessment_reminders_enabled',
        'inactivity_notifications_enabled',
        'timezone',
        'preferred_notification_time',
    )
    search_fields = ('user__name', 'user__email')
