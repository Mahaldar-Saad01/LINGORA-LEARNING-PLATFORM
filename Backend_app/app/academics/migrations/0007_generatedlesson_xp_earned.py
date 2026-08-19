from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('academics', '0006_lessoncontent_fallback_activities')]
    operations = [migrations.AddField(model_name='generatedlesson', name='xp_earned', field=models.PositiveIntegerField(default=0))]
