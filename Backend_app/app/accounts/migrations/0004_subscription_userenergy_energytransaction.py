import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_passwordresetotp'),
    ]

    operations = [
        migrations.CreateModel(
            name='Subscription',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('plan_type', models.CharField(choices=[('FREE', 'Free'), ('PREMIUM', 'Premium')], default='FREE', max_length=20)),
                ('status', models.CharField(choices=[('ACTIVE', 'Active'), ('EXPIRED', 'Expired'), ('CANCELLED', 'Cancelled')], default='ACTIVE', max_length=20)),
                ('started_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('payment_provider', models.CharField(blank=True, max_length=50)),
                ('payment_reference', models.CharField(blank=True, max_length=100)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='subscription', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='UserEnergy',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('current_energy', models.PositiveSmallIntegerField(default=24)),
                ('max_energy', models.PositiveSmallIntegerField(default=24)),
                ('last_energy_update', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='energy', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='EnergyTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.IntegerField()),
                ('transaction_type', models.CharField(choices=[('LESSON_COMPLETION', 'Lesson Completion'), ('ASSESSMENT_COMPLETION', 'Assessment Completion'), ('DAILY_BONUS', 'Daily Bonus'), ('STREAK_BONUS', 'Streak Bonus'), ('REWARD', 'Reward'), ('REGENERATION', 'Regeneration'), ('PREMIUM_BYPASS', 'Premium Bypass'), ('ADMIN_ADJUSTMENT', 'Admin Adjustment'), ('INITIALIZATION', 'Initialization')], max_length=40)),
                ('reason', models.CharField(max_length=255)),
                ('reference_id', models.CharField(blank=True, max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='energy_transactions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
