from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('academics', '0005_rolling_lesson_generation')]
    operations = [
        migrations.AddField(model_name='lessoncontent', name='fallback_activities', field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name='lessoncontent', name='is_active', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='lessoncontent', name='updated_at', field=models.DateTimeField(auto_now=True)),
    ]
