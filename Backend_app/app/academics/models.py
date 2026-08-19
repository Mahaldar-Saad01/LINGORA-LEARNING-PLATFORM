from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class ActivityType(models.TextChoices):
    LESSON_OVERVIEW = 'lesson_overview', 'Lesson overview'
    FILL_IN_THE_BLANK = 'fill_in_the_blank', 'Fill in the blank'
    LISTEN_AND_SELECT = 'listen_and_select', 'Listen and select'
    SENTENCE_COMPLETION = 'sentence_completion', 'Sentence completion'
    MATCHING_WORDS = 'matching_words', 'Matching words'
    WORD_ARRANGEMENT = 'word_arrangement', 'Word arrangement'
    SPEAKING_PRACTICE = 'speaking_practice', 'Speaking practice'
    TRANSLATE_SENTENCE = 'translate_sentence', 'Translate sentence'


DEFAULT_ACTIVITY_TYPES = [value for value, _label in ActivityType.choices]


def default_activity_types():
    return list(DEFAULT_ACTIVITY_TYPES)


class Language(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.code})'


class DifficultyLevel(models.Model):
    name = models.CharField(max_length=100, unique=True)
    min_score = models.PositiveIntegerField()
    max_score = models.PositiveIntegerField()
    order_no = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order_no', 'min_score']

    def __str__(self):
        return self.name


class Curriculum(models.Model):
    title = models.CharField(max_length=255)
    target_language = models.ForeignKey(
        Language,
        on_delete=models.CASCADE,
        related_name='target_curricula',
    )
    explanation_language = models.ForeignKey(
        Language,
        on_delete=models.CASCADE,
        related_name='explanation_curricula',
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['title']
        unique_together = ('target_language', 'explanation_language')

    def __str__(self):
        return self.title


class LessonCategory(models.Model):
    curriculum = models.ForeignKey(
        Curriculum,
        on_delete=models.CASCADE,
        related_name='categories',
    )
    level = models.ForeignKey(
        DifficultyLevel,
        on_delete=models.CASCADE,
        related_name='lesson_categories',
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order_no = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order_no', 'name']
        unique_together = ('curriculum', 'level', 'name')
        verbose_name_plural = 'lesson categories'

    def __str__(self):
        return f'{self.curriculum} - {self.name}'


class Lesson(models.Model):
    category = models.ForeignKey(
        LessonCategory,
        on_delete=models.CASCADE,
        related_name='lessons',
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order_no = models.PositiveIntegerField(default=1)
    estimated_minutes = models.PositiveIntegerField(default=5)
    learning_objectives = models.JSONField(default=list, blank=True)
    vocabulary = models.JSONField(default=list, blank=True)
    grammar_topics = models.JSONField(default=list, blank=True)
    skills = models.JSONField(default=list, blank=True)
    allowed_activity_types = models.JSONField(default=default_activity_types, blank=True)
    minimum_activities = models.PositiveIntegerField(default=4)
    maximum_activities = models.PositiveIntegerField(default=8)
    generation_instructions = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    minimum_recommended_proficiency = models.PositiveSmallIntegerField(
        default=0, validators=[MaxValueValidator(100)]
    )
    maximum_recommended_proficiency = models.PositiveSmallIntegerField(
        default=100, validators=[MaxValueValidator(100)]
    )
    prerequisites = models.ManyToManyField(
        'self', through='LessonPrerequisite', symmetrical=False,
        related_name='unlocks', blank=True,
    )

    class Meta:
        ordering = ['order_no', 'title']
        unique_together = ('category', 'title')

    def __str__(self):
        return self.title

    def clean(self):
        super().clean()
        errors = {}
        for field in ('learning_objectives', 'vocabulary', 'grammar_topics', 'skills'):
            if not isinstance(getattr(self, field), list):
                errors[field] = 'Must be a JSON list.'
        if not isinstance(self.allowed_activity_types, list):
            errors['allowed_activity_types'] = 'Must be a JSON list.'
        else:
            normalized = list(dict.fromkeys(self.allowed_activity_types))
            unsupported = sorted(set(normalized) - set(DEFAULT_ACTIVITY_TYPES))
            if unsupported:
                errors['allowed_activity_types'] = f'Unsupported activity types: {", ".join(unsupported)}.'
            else:
                self.allowed_activity_types = normalized
        if self.minimum_activities < 1:
            errors['minimum_activities'] = 'Must be at least 1.'
        if self.maximum_activities < self.minimum_activities:
            errors['maximum_activities'] = 'Must be greater than or equal to minimum activities.'
        if self.maximum_recommended_proficiency < self.minimum_recommended_proficiency:
            errors['maximum_recommended_proficiency'] = 'Must not be below the minimum.'
        if errors:
            raise ValidationError(errors)


class LessonContent(models.Model):
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name='contents',
    )
    order_no = models.PositiveIntegerField(default=1)
    target_language = models.ForeignKey(
        Language,
        on_delete=models.CASCADE,
        related_name='target_lesson_contents',
    )
    explanation_language = models.ForeignKey(
        Language,
        on_delete=models.CASCADE,
        related_name='explanation_lesson_contents',
    )
    title = models.CharField(max_length=255)
    content_text = models.TextField()
    explanation_text = models.TextField()
    example_text = models.TextField()
    audio_url = models.URLField(blank=True)
    video_url = models.URLField(blank=True)
    image_url = models.URLField(blank=True)
    fallback_activities = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['lesson', 'order_no']
        constraints = [
            models.UniqueConstraint(
                fields=['lesson', 'order_no'],
                name='unique_lesson_content_order',
            ),
    ]

    def __str__(self):
        return f'{self.lesson} content'


class GeneratedLesson(models.Model):
    class Status(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        GENERATING = 'generating', 'Generating'
        VALIDATING = 'validating', 'Validating'
        READY = 'ready', 'Ready'
        FAILED = 'failed', 'Failed'

    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='generated_lessons'
    )
    lesson = models.ForeignKey(
        Lesson, on_delete=models.CASCADE, related_name='generated_versions'
    )
    payload = models.JSONField(default=dict, blank=True)
    model_name = models.CharField(max_length=150, default='Qwen/Qwen3-8B')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    generation_version = models.PositiveIntegerField(default=1)
    prompt_version = models.CharField(max_length=40, default='lesson-v1')
    validation_errors = models.JSONField(default=list, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True)
    queued_at = models.DateTimeField(null=True, blank=True)
    generation_started_at = models.DateTimeField(null=True, blank=True)
    generated_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    next_action = models.JSONField(default=dict, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    xp_earned = models.PositiveIntegerField(default=0)
    personalization_context = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'lesson', 'generation_version'],
                name='unique_user_lesson_generation_version',
            ),
        ]


class ActivityAttempt(models.Model):
    generated_lesson = models.ForeignKey(
        GeneratedLesson, on_delete=models.CASCADE, related_name='attempts'
    )
    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='lesson_activity_attempts'
    )
    activity_id = models.CharField(max_length=100)
    activity_type = models.CharField(max_length=50)
    skill = models.CharField(max_length=50, blank=True)
    user_answer = models.JSONField(null=True, blank=True)
    correct_answer = models.JSONField(null=True, blank=True)
    is_correct = models.BooleanField(default=False)
    skipped = models.BooleanField(default=False)
    attempt_count = models.PositiveIntegerField(default=1)
    response_time_ms = models.PositiveIntegerField(default=0)
    hint_used = models.BooleanField(default=False)
    audio_replay_count = models.PositiveIntegerField(default=0)
    pronunciation_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    writing_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    obtained_score = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    maximum_score = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    normalized_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    concept_mastery = models.JSONField(default=dict, blank=True)
    mistake_feedback = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('generated_lesson', 'activity_id')


SCORE_VALIDATORS = [MinValueValidator(0), MaxValueValidator(100)]
SKILLS = ('reading', 'writing', 'listening', 'speaking', 'vocabulary', 'grammar')


class LessonPrerequisite(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='prerequisite_links')
    prerequisite = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='dependent_links')
    is_mandatory = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['lesson', 'prerequisite'], name='unique_lesson_prerequisite'),
            models.CheckConstraint(condition=~models.Q(lesson=models.F('prerequisite')), name='lesson_not_own_prerequisite'),
        ]

    def clean(self):
        if self.lesson_id == self.prerequisite_id:
            raise ValidationError('A lesson cannot require itself.')
        if self.lesson_id and self.prerequisite_id:
            if self.lesson.category.curriculum_id != self.prerequisite.category.curriculum_id:
                raise ValidationError('Prerequisites must belong to the same curriculum.')


class LearnerSkillProfile(models.Model):
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, related_name='skill_profile')
    reading_score = models.DecimalField(max_digits=5, decimal_places=2, default=50, validators=SCORE_VALIDATORS)
    writing_score = models.DecimalField(max_digits=5, decimal_places=2, default=50, validators=SCORE_VALIDATORS)
    listening_score = models.DecimalField(max_digits=5, decimal_places=2, default=50, validators=SCORE_VALIDATORS)
    speaking_score = models.DecimalField(max_digits=5, decimal_places=2, default=50, validators=SCORE_VALIDATORS)
    vocabulary_score = models.DecimalField(max_digits=5, decimal_places=2, default=50, validators=SCORE_VALIDATORS)
    grammar_score = models.DecimalField(max_digits=5, decimal_places=2, default=50, validators=SCORE_VALIDATORS)
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, default=50, validators=SCORE_VALIDATORS)
    confidence = models.DecimalField(max_digits=5, decimal_places=2, default=20, validators=SCORE_VALIDATORS)
    total_completed_lessons = models.PositiveIntegerField(default=0)
    total_activity_attempts = models.PositiveIntegerField(default=0)
    last_recalculated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class SkillHistory(models.Model):
    class Source(models.TextChoices):
        ASSESSMENT = 'assessment', 'Assessment'
        LESSON = 'lesson', 'Lesson'
        BACKFILL = 'backfill', 'Backfill'
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='skill_history')
    skill = models.CharField(max_length=20)
    previous_score = models.DecimalField(max_digits=5, decimal_places=2, validators=SCORE_VALIDATORS)
    new_score = models.DecimalField(max_digits=5, decimal_places=2, validators=SCORE_VALIDATORS)
    score_change = models.DecimalField(max_digits=6, decimal_places=2)
    source_type = models.CharField(max_length=20, choices=Source.choices)
    source_lesson = models.ForeignKey(Lesson, null=True, blank=True, on_delete=models.SET_NULL)
    metadata = models.JSONField(default=dict, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True, db_index=True)


class LessonRecommendation(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        DISMISSED = 'dismissed', 'Dismissed'
        COMPLETED = 'completed', 'Completed'
        EXPIRED = 'expired', 'Expired'
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='lesson_recommendations')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='recommendations')
    recommendation_score = models.DecimalField(max_digits=6, decimal_places=2)
    priority = models.PositiveIntegerField()
    primary_skill = models.CharField(max_length=20, blank=True)
    reason = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    engine_version = models.CharField(max_length=30, default='deterministic_v1')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'lesson', 'engine_version'], condition=models.Q(status='pending'), name='unique_pending_recommendation')
        ]
        indexes = [models.Index(fields=['user', 'status', 'priority'])]


class LearningPath(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'
        REPLACED = 'replaced', 'Replaced'
        PAUSED = 'paused', 'Paused'
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='personalized_paths')
    curriculum = models.ForeignKey(Curriculum, on_delete=models.CASCADE, related_name='learning_paths')
    title = models.CharField(max_length=255)
    focus_skills = models.JSONField(default=list)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    engine_version = models.CharField(max_length=30, default='deterministic_v1')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                condition=models.Q(status='active'),
                name='one_active_path_per_user',
            )
        ]


class LearningPathItem(models.Model):
    class Status(models.TextChoices):
        LOCKED = 'locked', 'Locked'
        AVAILABLE = 'available', 'Available'
        IN_PROGRESS = 'in_progress', 'In progress'
        COMPLETED = 'completed', 'Completed'
        SKIPPED = 'skipped', 'Skipped'
    path = models.ForeignKey(LearningPath, on_delete=models.CASCADE, related_name='items')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='path_items')
    order_no = models.PositiveIntegerField()
    scheduled_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.LOCKED)
    recommendation_score_snapshot = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    reason_snapshot = models.JSONField(default=dict)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['order_no']
        constraints = [
            models.UniqueConstraint(fields=['path', 'order_no'], name='unique_path_order'),
            models.UniqueConstraint(fields=['path', 'lesson'], name='unique_lesson_in_path'),
        ]
