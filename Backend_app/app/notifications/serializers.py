from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'user',
            'notification_type',
            'title',
            'message',
            'is_read',
            'created_at',
            'read_at',
            'scheduled_for',
            'metadata',
            'expires_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'read_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'id',
            'user',
            'notifications_enabled',
            'lesson_reminders_enabled',
            'streak_reminders_enabled',
            'assessment_reminders_enabled',
            'achievement_notifications_enabled',
            'inactivity_notifications_enabled',
            'preferred_notification_time',
            'timezone',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'updated_at']
