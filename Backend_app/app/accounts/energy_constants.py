from django.db import models

MAX_FREE_ENERGY = 24
STARTING_FREE_ENERGY = 24
ENERGY_REGENERATION_INTERVAL_SECONDS = 3600
ENERGY_REGENERATION_AMOUNT_PER_HOUR = 1

NORMAL_LESSON_ENERGY_COST = 6
QUICK_REVIEW_ENERGY_COST = 2
ASSESSMENT_ENERGY_REWARD = 2


class PlanType(models.TextChoices):
    FREE = 'FREE', 'Free'
    PREMIUM = 'PREMIUM', 'Premium'


class SubscriptionStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    EXPIRED = 'EXPIRED', 'Expired'
    CANCELLED = 'CANCELLED', 'Cancelled'


class EnergyTransactionType(models.TextChoices):
    LESSON_COMPLETION = 'LESSON_COMPLETION', 'Lesson Completion'
    ASSESSMENT_COMPLETION = 'ASSESSMENT_COMPLETION', 'Assessment Completion'
    DAILY_BONUS = 'DAILY_BONUS', 'Daily Bonus'
    STREAK_BONUS = 'STREAK_BONUS', 'Streak Bonus'
    REWARD = 'REWARD', 'Reward'
    REGENERATION = 'REGENERATION', 'Regeneration'
    PREMIUM_BYPASS = 'PREMIUM_BYPASS', 'Premium Bypass'
    ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT', 'Admin Adjustment'
    INITIALIZATION = 'INITIALIZATION', 'Initialization'
