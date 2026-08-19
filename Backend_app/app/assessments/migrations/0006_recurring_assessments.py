from django.db import migrations, models
import django.db.models.deletion


BADGES = [
    ('first_step', 'First Step', 'Complete your first daily assessment.', 'daily', 'flag', 1),
    ('three_day_momentum', 'Three-Day Momentum', 'Complete daily assessments three days in a row.', 'daily', 'local_fire_department', 3),
    ('perfect_day', 'Perfect Day', 'Score 100% on a daily assessment.', 'daily', 'stars', 100),
    ('consistent_learner', 'Consistent Learner', 'Complete daily assessments seven days in a row.', 'weekly', 'date_range', 7),
    ('weekly_reviewer', 'Weekly Reviewer', 'Complete your first weekly assessment.', 'weekly', 'fact_check', 1),
    ('strong_week', 'Strong Week', 'Score at least 80% on a weekly assessment.', 'weekly', 'trending_up', 80),
    ('monthly_explorer', 'Monthly Explorer', 'Complete your first monthly assessment.', 'monthly', 'explore', 1),
    ('monthly_mastery', 'Monthly Mastery', 'Score at least 80% on a monthly assessment.', 'monthly', 'military_tech', 80),
    ('full_month', 'Full Month', 'Complete 20 daily assessments in one month.', 'monthly', 'calendar_month', 20),
]


def seed_badges(apps, schema_editor):
    Badge = apps.get_model('assessments', 'BadgeDefinition')
    for code, name, description, badge_type, icon, threshold in BADGES:
        Badge.objects.update_or_create(code=code, defaults={
            'name': name, 'description': description, 'badge_type': badge_type,
            'icon': icon, 'threshold': threshold, 'is_active': True})


class Migration(migrations.Migration):
    dependencies = [('assessments', '0005_set_assessment_question_marks_to_ten'), ('accounts', '0002_learnerprofile')]
    operations = [
        migrations.CreateModel(name='BadgeDefinition', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('code', models.CharField(max_length=50, unique=True)), ('name', models.CharField(max_length=100)),
            ('description', models.CharField(max_length=255)), ('badge_type', models.CharField(max_length=20)),
            ('icon', models.CharField(default='workspace_premium', max_length=50)),
            ('threshold', models.PositiveSmallIntegerField(default=1)), ('is_active', models.BooleanField(default=True)),
        ]),
        migrations.CreateModel(name='RecurringAssessment', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('assessment_type', models.CharField(choices=[('daily','Daily'),('weekly','Weekly'),('monthly','Monthly')], max_length=12)),
            ('period_key', models.CharField(max_length=12)), ('local_period_start', models.DateField()), ('local_period_end', models.DateField()),
            ('timezone_name', models.CharField(max_length=64)), ('status', models.CharField(choices=[('available','Available'),('in_progress','In progress'),('completed','Completed'),('expired','Expired')], default='available', max_length=16)),
            ('question_snapshot', models.JSONField(default=list)), ('question_count', models.PositiveSmallIntegerField(default=0)),
            ('started_at', models.DateTimeField(blank=True, null=True)), ('completed_at', models.DateTimeField(blank=True, null=True)),
            ('score', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)), ('correct_count', models.PositiveSmallIntegerField(default=0)),
            ('attempted_count', models.PositiveSmallIntegerField(default=0)), ('duration_seconds', models.PositiveIntegerField(default=0)),
            ('xp_awarded', models.PositiveIntegerField(default=0)), ('reward_claimed', models.BooleanField(default=False)),
            ('created_at', models.DateTimeField(auto_now_add=True)), ('updated_at', models.DateTimeField(auto_now=True)),
            ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recurring_assessments', to='accounts.user')),
        ], options={'indexes': [models.Index(fields=['user','assessment_type','status'], name='assessments_user_id_24022a_idx')],
                    'constraints': [models.UniqueConstraint(fields=('user','assessment_type','period_key'), name='unique_recurring_assessment_period')]}),
        migrations.CreateModel(name='RecurringAssessmentAnswer', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('activity_id', models.CharField(max_length=140)), ('activity_type', models.CharField(max_length=50)), ('skill', models.CharField(blank=True, max_length=50)),
            ('answer', models.JSONField(blank=True, null=True)), ('is_correct', models.BooleanField(blank=True, null=True)),
            ('score', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)), ('scoring_details', models.JSONField(blank=True, default=dict)),
            ('answered_at', models.DateTimeField(auto_now=True)), ('assessment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='assessments.recurringassessment')),
        ], options={'constraints': [models.UniqueConstraint(fields=('assessment','activity_id'), name='unique_recurring_assessment_answer')]}),
        migrations.CreateModel(name='UserBadge', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('earned_at', models.DateTimeField(auto_now_add=True)), ('source_type', models.CharField(max_length=20)), ('source_key', models.CharField(default='once', max_length=50)),
            ('metadata', models.JSONField(blank=True, default=dict)), ('badge', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='awards', to='assessments.badgedefinition')),
            ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recurring_badges', to='accounts.user')),
        ], options={'constraints': [models.UniqueConstraint(fields=('user','badge','source_key'), name='unique_user_recurring_badge_source')]}),
        migrations.RunPython(seed_badges, migrations.RunPython.noop),
    ]
