import academics.models
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('academics', '0004_activityattempt_skipped')]
    operations = [
        migrations.AddField(model_name='lesson', name='learning_objectives', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='lesson', name='vocabulary', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='lesson', name='grammar_topics', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='lesson', name='skills', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='lesson', name='allowed_activity_types', field=models.JSONField(blank=True, default=academics.models.default_activity_types)),
        migrations.AddField(model_name='lesson', name='minimum_activities', field=models.PositiveIntegerField(default=4)),
        migrations.AddField(model_name='lesson', name='maximum_activities', field=models.PositiveIntegerField(default=8)),
        migrations.AddField(model_name='lesson', name='generation_instructions', field=models.TextField(blank=True)),
        migrations.AddField(model_name='lesson', name='is_active', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='generatedlesson', name='status', field=models.CharField(choices=[('queued','Queued'),('generating','Generating'),('validating','Validating'),('ready','Ready'),('failed','Failed')], default='queued', max_length=20)),
        migrations.AddField(model_name='generatedlesson', name='generation_version', field=models.PositiveIntegerField(default=1)),
        migrations.AddField(model_name='generatedlesson', name='prompt_version', field=models.CharField(default='lesson-v1', max_length=40)),
        migrations.AddField(model_name='generatedlesson', name='validation_errors', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='generatedlesson', name='retry_count', field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name='generatedlesson', name='last_error', field=models.TextField(blank=True)),
        migrations.AddField(model_name='generatedlesson', name='queued_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='generatedlesson', name='generation_started_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='generatedlesson', name='generated_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='generatedlesson', name='expires_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='generatedlesson', name='updated_at', field=models.DateTimeField(auto_now=True)),
        migrations.AlterField(model_name='generatedlesson', name='payload', field=models.JSONField(blank=True, default=dict)),
        migrations.AddConstraint(model_name='generatedlesson', constraint=models.UniqueConstraint(fields=('user','lesson','generation_version'), name='unique_user_lesson_generation_version')),
    ]
