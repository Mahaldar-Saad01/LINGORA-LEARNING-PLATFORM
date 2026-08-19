from django.db import migrations, models


def deactivate_duplicate_active_paths(apps, schema_editor):
    LearningPath = apps.get_model('academics', 'LearningPath')
    active = 'active'
    replacement = 'replaced'
    user_ids = (
        LearningPath.objects.filter(status=active)
        .values_list('user_id', flat=True)
        .order_by()
        .distinct()
    )
    for user_id in user_ids.iterator():
        path_ids = list(
            LearningPath.objects.filter(user_id=user_id, status=active)
            .order_by('created_at', 'id')
            .values_list('id', flat=True)
        )
        if len(path_ids) > 1:
            LearningPath.objects.filter(id__in=path_ids[1:]).update(status=replacement)


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0008_activityattempt_completed_at_and_more'),
    ]

    operations = [
        migrations.RunPython(
            deactivate_duplicate_active_paths,
            migrations.RunPython.noop,
        ),
        migrations.RemoveConstraint(
            model_name='learningpath',
            name='one_active_path_per_curriculum',
        ),
        migrations.AddConstraint(
            model_name='learningpath',
            constraint=models.UniqueConstraint(
                condition=models.Q(status='active'),
                fields=('user',),
                name='one_active_path_per_user',
            ),
        ),
    ]
