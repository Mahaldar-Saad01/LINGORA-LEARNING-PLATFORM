from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from .energy_constants import (
    MAX_FREE_ENERGY, STARTING_FREE_ENERGY, PlanType, SubscriptionStatus, EnergyTransactionType
)


class User(AbstractUser):
    MOTIVATION_CHOICES = [
        ('cg', 'Career Growth'),
        ('tp', 'Travel Plans'),
        ('bx', 'Brain Exercise'),
        ('cp', 'Connect with People'),
        ('jc', 'Just Curious'),
    ]

    LANGUAGE_level_CHOICES = [
        ('new', 'New to language'),
        ('words', 'Some common words'),
        ('basic', 'Basic conversation'),
        ('intermediate', 'Can talk about various topics'),
        ('advanced', 'Can discuss topics in detail'),
    ]

    REFERRAL_CHOICES = [
        ('socm', 'Social Media'),
        ('ff', 'Friend / Family'),
        ('os', 'Online Search'),
        ('ab', 'Article / Blog'),
        ('ad', 'Ad'),
    ]

    STUDY_TIME_CHOICES = [
        ('5_min', '5 mins/day'),
        ('15_min', '15 mins/day'),
        ('30_min', '30 mins/day'),
        ('60_min', '60 mins/day'),
    ]

    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    age = models.PositiveIntegerField(default=30)
    preferred_language = models.CharField(max_length=50)
    target_language = models.CharField(max_length=50)
    language_level = models.CharField(max_length=50, choices=LANGUAGE_level_CHOICES, default='new')
    motivation = models.CharField(max_length=50, choices=MOTIVATION_CHOICES, default='cg')
    referral_src = models.CharField(max_length=50, choices=REFERRAL_CHOICES, default='socm')
    study_time = models.CharField(max_length=50, choices=STUDY_TIME_CHOICES, default='15_min')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class LearnerProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='learner_profile',
    )
    known_language = models.ForeignKey(
        'academics.Language',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='known_by_learners',
    )
    target_language = models.ForeignKey(
        'academics.Language',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='targeted_by_learners',
    )
    current_level = models.ForeignKey(
        'academics.DifficultyLevel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='learners',
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user} learning profile'


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_otps')
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.email} ({self.otp_code})"


class Subscription(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan_type = models.CharField(max_length=20, choices=PlanType.choices, default=PlanType.FREE)
    status = models.CharField(max_length=20, choices=SubscriptionStatus.choices, default=SubscriptionStatus.ACTIVE)
    started_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)
    payment_provider = models.CharField(max_length=50, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_premium(self):
        if self.plan_type == PlanType.PREMIUM and self.status == SubscriptionStatus.ACTIVE:
            if self.expires_at is None or self.expires_at > timezone.now():
                return True
        return False

    def __str__(self):
        return f"{self.user} - {self.plan_type} ({self.status})"


class UserEnergy(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='energy')
    current_energy = models.PositiveSmallIntegerField(default=STARTING_FREE_ENERGY)
    max_energy = models.PositiveSmallIntegerField(default=MAX_FREE_ENERGY)
    last_energy_update = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} energy: {self.current_energy}/{self.max_energy}"


class EnergyTransaction(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='energy_transactions')
    amount = models.IntegerField()  # Negative for consumption, positive for gain
    transaction_type = models.CharField(max_length=40, choices=EnergyTransactionType.choices)
    reason = models.CharField(max_length=255)
    reference_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user}: {self.amount:+d} ({self.transaction_type})"


