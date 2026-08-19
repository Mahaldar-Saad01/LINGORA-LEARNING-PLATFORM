from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notifications_enabled', models.BooleanField(default=True)),
                ('lesson_reminders_enabled', models.BooleanField(default=True)),
                ('streak_reminders_enabled', models.BooleanField(default=True)),
                ('assessment_reminders_enabled', models.BooleanField(default=True)),
                ('achievement_notifications_enabled', models.BooleanField(default=True)),
                ('inactivity_notifications_enabled', models.BooleanField(default=True)),
                ('preferred_notification_time', models.TimeField(default='09:00:00')),
                ('timezone', models.CharField(default='UTC', max_length=64)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='notification_preference', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('lesson_reminder', 'Lesson reminder'), ('streak_reminder', 'Streak reminder'), ('assessment_reminder', 'Assessment reminder'), ('daily_goal_reminder', 'Daily goal reminder'), ('inactivity_reminder', 'Inactivity reminder'), ('lesson_ready', 'Lesson ready'), ('lesson_completed', 'Lesson completed'), ('assessment_available', 'Assessment available'), ('achievement', 'Achievement'), ('system', 'System')], max_length=50)),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(db_index=True, default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('scheduled_for', models.DateTimeField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('expires_at', models.DateTimeField(blank=True, db_index=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['user', 'is_read'], name='notificatio_user_id_082d41_idx'),
                    models.Index(fields=['user', 'notification_type', 'created_at'], name='notificatio_user_id_48b8ca_idx'),
                ],
            },
        ),
    ]
