from django.db import models

from academics.models import DifficultyLevel, Language


class Assessment(models.Model):
    READING = 'reading'
    WRITING = 'writing'
    COMPREHENSION = 'comprehension'

    TYPE_CHOICES = [
        (READING, 'Reading'),
        (WRITING, 'Writing'),
        (COMPREHENSION, 'Comprehension'),
    ]

    target_language = models.ForeignKey(
        Language,
        on_delete=models.CASCADE,
        related_name='target_assessments',
    )
    explanation_language = models.ForeignKey(
        Language,
        on_delete=models.CASCADE,
        related_name='explanation_assessments',
    )
    level = models.ForeignKey(
        DifficultyLevel,
        on_delete=models.CASCADE,
        related_name='assessments',
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['level__order_no', 'type', 'title']
        unique_together = (
            'target_language',
            'explanation_language',
            'level',
            'type',
        )

    def __str__(self):
        return self.title


class Passage(models.Model):
    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name='passages',
    )
    label = models.CharField(max_length=80, blank=True)
    title = models.CharField(max_length=255)
    text = models.TextField()
    read_time = models.CharField(max_length=40, blank=True)
    hint_title = models.CharField(max_length=120, blank=True)
    hint_text = models.CharField(max_length=255, blank=True)
    order_no = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order_no', 'id']

    def __str__(self):
        return self.title


class AssessmentQuestion(models.Model):
    MCQ = 'mcq'
    PASSAGE_MCQ = 'passage_mcq'
    SHORT_ANSWER = 'short_answer'

    QUESTION_TYPE_CHOICES = [
        (MCQ, 'MCQ'),
        (PASSAGE_MCQ, 'Passage MCQ'),
        (SHORT_ANSWER, 'Short Answer'),
    ]

    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name='questions',
    )
    passage = models.ForeignKey(
        Passage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='questions',
    )
    question_text = models.TextField()
    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPE_CHOICES,
        default=MCQ,
    )
    marks = models.PositiveIntegerField(default=10)
    order_no = models.PositiveIntegerField(default=1)
    passage_title = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['order_no', 'id']

    def __str__(self):
        return self.question_text[:80]


class QuestionOption(models.Model):
    question = models.ForeignKey(
        AssessmentQuestion,
        on_delete=models.CASCADE,
        related_name='options',
    )
    option_text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)
    order_no = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order_no', 'id']

    def __str__(self):
        return self.option_text


class RecurringAssessment(models.Model):
    class Type(models.TextChoices):
        DAILY = 'daily', 'Daily'
        WEEKLY = 'weekly', 'Weekly'
        MONTHLY = 'monthly', 'Monthly'

    class Status(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        IN_PROGRESS = 'in_progress', 'In progress'
        COMPLETED = 'completed', 'Completed'
        EXPIRED = 'expired', 'Expired'

    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='recurring_assessments')
    assessment_type = models.CharField(max_length=12, choices=Type.choices)
    period_key = models.CharField(max_length=12)
    local_period_start = models.DateField()
    local_period_end = models.DateField()
    timezone_name = models.CharField(max_length=64)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.AVAILABLE)
    question_snapshot = models.JSONField(default=list)
    question_count = models.PositiveSmallIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    correct_count = models.PositiveSmallIntegerField(default=0)
    attempted_count = models.PositiveSmallIntegerField(default=0)
    duration_seconds = models.PositiveIntegerField(default=0)
    xp_awarded = models.PositiveIntegerField(default=0)
    reward_claimed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=['user', 'assessment_type', 'period_key'], name='unique_recurring_assessment_period')]
        indexes = [models.Index(
            fields=['user', 'assessment_type', 'status'], name='assessments_user_id_24022a_idx')]


class RecurringAssessmentAnswer(models.Model):
    assessment = models.ForeignKey(RecurringAssessment, on_delete=models.CASCADE, related_name='answers')
    activity_id = models.CharField(max_length=140)
    activity_type = models.CharField(max_length=50)
    skill = models.CharField(max_length=50, blank=True)
    answer = models.JSONField(null=True, blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    scoring_details = models.JSONField(default=dict, blank=True)
    answered_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=['assessment', 'activity_id'], name='unique_recurring_assessment_answer')]


class BadgeDefinition(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255)
    badge_type = models.CharField(max_length=20)
    icon = models.CharField(max_length=50, default='workspace_premium')
    threshold = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='recurring_badges')
    badge = models.ForeignKey(BadgeDefinition, on_delete=models.CASCADE, related_name='awards')
    earned_at = models.DateTimeField(auto_now_add=True)
    source_type = models.CharField(max_length=20)
    source_key = models.CharField(max_length=50, default='once')
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=['user', 'badge', 'source_key'], name='unique_user_recurring_badge_source')]
