from django.db import models


class LearningStats(models.Model):
    user = models.OneToOneField(
        'accounts.User', on_delete=models.CASCADE, related_name='learning_stats'
    )
    total_xp = models.PositiveIntegerField(default=0)
    completed_lessons = models.PositiveIntegerField(default=0)
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    consecutive_perfect_lessons = models.PositiveIntegerField(default=0)
    best_perfect_run = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user} learning stats'
