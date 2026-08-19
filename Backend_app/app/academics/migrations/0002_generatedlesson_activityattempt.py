from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('academics', '0001_initial'), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name='GeneratedLesson',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('payload', models.JSONField()),
                ('model_name', models.CharField(default='Qwen/Qwen3-8B', max_length=150)),
                ('next_action', models.JSONField(blank=True, default=dict)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('lesson', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='generated_versions', to='academics.lesson')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='generated_lessons', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='ActivityAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity_id', models.CharField(max_length=100)),
                ('activity_type', models.CharField(max_length=50)),
                ('skill', models.CharField(blank=True, max_length=50)),
                ('user_answer', models.JSONField(blank=True, null=True)),
                ('correct_answer', models.JSONField(blank=True, null=True)),
                ('is_correct', models.BooleanField(default=False)),
                ('attempt_count', models.PositiveIntegerField(default=1)),
                ('response_time_ms', models.PositiveIntegerField(default=0)),
                ('hint_used', models.BooleanField(default=False)),
                ('audio_replay_count', models.PositiveIntegerField(default=0)),
                ('pronunciation_score', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('writing_score', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('concept_mastery', models.JSONField(blank=True, default=dict)),
                ('mistake_feedback', models.JSONField(blank=True, default=dict)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('generated_lesson', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attempts', to='academics.generatedlesson')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lesson_activity_attempts', to=settings.AUTH_USER_MODEL)),
            ],
            options={'unique_together': {('generated_lesson', 'activity_id')}},
        ),
    ]
