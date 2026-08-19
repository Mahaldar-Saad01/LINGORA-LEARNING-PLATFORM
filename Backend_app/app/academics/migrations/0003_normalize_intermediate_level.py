from django.db import migrations


def normalize_intermediate_level(apps, schema_editor):
    DifficultyLevel = apps.get_model('academics', 'DifficultyLevel')
    LessonCategory = apps.get_model('academics', 'LessonCategory')
    LearnerProfile = apps.get_model('accounts', 'LearnerProfile')
    Assessment = apps.get_model('assessments', 'Assessment')
    levels = list(DifficultyLevel.objects.filter(name__iexact='intermediate').order_by('id'))
    if not levels:
        return
    canonical = levels[0]
    for duplicate in levels[1:]:
        LessonCategory.objects.filter(level=duplicate).update(level=canonical)
        LearnerProfile.objects.filter(current_level=duplicate).update(current_level=canonical)
        Assessment.objects.filter(level=duplicate).update(level=canonical)
        duplicate.delete()
    canonical.name = 'Intermediate'
    canonical.min_score = 36
    canonical.max_score = 70
    canonical.order_no = 2
    canonical.save(update_fields=['name', 'min_score', 'max_score', 'order_no'])


class Migration(migrations.Migration):
    dependencies = [
        ('academics', '0002_generatedlesson_activityattempt'),
        ('accounts', '0002_learnerprofile'),
        ('assessments', '0005_set_assessment_question_marks_to_ten'),
    ]
    operations = [migrations.RunPython(normalize_intermediate_level, migrations.RunPython.noop)]
