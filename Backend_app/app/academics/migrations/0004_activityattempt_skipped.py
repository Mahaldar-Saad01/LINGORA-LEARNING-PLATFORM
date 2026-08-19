from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('academics', '0003_normalize_intermediate_level')]
    operations = [
        migrations.AddField(
            model_name='activityattempt',
            name='skipped',
            field=models.BooleanField(default=False),
        ),
    ]
