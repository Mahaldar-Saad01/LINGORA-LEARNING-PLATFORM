from datetime import timedelta
from django.db import transaction
from django.utils import timezone

from .energy_constants import (
    MAX_FREE_ENERGY, STARTING_FREE_ENERGY, ENERGY_REGENERATION_INTERVAL_SECONDS,
    ENERGY_REGENERATION_AMOUNT_PER_HOUR, NORMAL_LESSON_ENERGY_COST,
    PlanType, SubscriptionStatus, EnergyTransactionType
)
from .models import Subscription, UserEnergy, EnergyTransaction


class EnergyService:
    @staticmethod
    def get_or_create_energy(user):
        sub, _ = Subscription.objects.get_or_create(
            user=user,
            defaults={
                'plan_type': PlanType.FREE,
                'status': SubscriptionStatus.ACTIVE,
                'started_at': timezone.now(),
            }
        )
        energy, _ = UserEnergy.objects.get_or_create(
            user=user,
            defaults={
                'current_energy': STARTING_FREE_ENERGY,
                'max_energy': MAX_FREE_ENERGY,
                'last_energy_update': timezone.now(),
            }
        )
        return sub, energy

    @staticmethod
    def expire_subscription_if_needed(subscription, user_energy):
        if (
            subscription.plan_type == PlanType.PREMIUM
            and subscription.status == SubscriptionStatus.ACTIVE
            and subscription.expires_at
            and subscription.expires_at <= timezone.now()
        ):
            subscription.plan_type = PlanType.FREE
            subscription.status = SubscriptionStatus.EXPIRED
            subscription.save(update_fields=['plan_type', 'status', 'updated_at'])

            user_energy.current_energy = min(user_energy.current_energy, MAX_FREE_ENERGY)
            user_energy.max_energy = MAX_FREE_ENERGY
            user_energy.last_energy_update = timezone.now()
            user_energy.save(update_fields=['current_energy', 'max_energy', 'last_energy_update', 'updated_at'])

    @classmethod
    def refresh_energy(cls, user, save=True):
        sub, energy = cls.get_or_create_energy(user)
        cls.expire_subscription_if_needed(sub, energy)

        if sub.is_premium:
            return sub, energy

        now = timezone.now()
        elapsed_seconds = (now - energy.last_energy_update).total_seconds()
        hours_elapsed = int(elapsed_seconds // ENERGY_REGENERATION_INTERVAL_SECONDS)

        if hours_elapsed >= 1 and energy.current_energy < energy.max_energy:
            energy_to_add = hours_elapsed * ENERGY_REGENERATION_AMOUNT_PER_HOUR
            new_energy = min(energy.current_energy + energy_to_add, energy.max_energy)
            actual_added = new_energy - energy.current_energy

            if new_energy == energy.max_energy:
                energy.last_energy_update = now
            else:
                energy.last_energy_update = energy.last_energy_update + timedelta(seconds=hours_elapsed * ENERGY_REGENERATION_INTERVAL_SECONDS)

            energy.current_energy = new_energy
            if save:
                energy.save(update_fields=['current_energy', 'last_energy_update', 'updated_at'])
                if actual_added > 0:
                    EnergyTransaction.objects.create(
                        user=user,
                        amount=actual_added,
                        transaction_type=EnergyTransactionType.REGENERATION,
                        reason="Hourly energy regeneration",
                    )
        elif energy.current_energy >= energy.max_energy:
            energy.last_energy_update = now
            if save:
                energy.save(update_fields=['last_energy_update', 'updated_at'])

        return sub, energy

    @classmethod
    def get_energy_status(cls, user):
        sub, energy = cls.refresh_energy(user, save=True)

        if sub.is_premium:
            return {
                'plan': PlanType.PREMIUM,
                'is_premium': True,
                'unlimited': True,
                'current_energy': None,
                'max_energy': None,
                'normal_lesson_cost': 0,
                'next_energy_at': None,
                'full_refill_at': None,
            }

        now = timezone.now()
        next_energy_at = None
        full_refill_at = None

        if energy.current_energy < energy.max_energy:
            seconds_since_update = (now - energy.last_energy_update).total_seconds()
            seconds_to_next = max(0, ENERGY_REGENERATION_INTERVAL_SECONDS - (seconds_since_update % ENERGY_REGENERATION_INTERVAL_SECONDS))
            next_energy_at = (now + timedelta(seconds=seconds_to_next)).isoformat()
            needed = energy.max_energy - energy.current_energy
            seconds_to_full = seconds_to_next + (needed - 1) * ENERGY_REGENERATION_INTERVAL_SECONDS
            full_refill_at = (now + timedelta(seconds=seconds_to_full)).isoformat()

        return {
            'plan': PlanType.FREE,
            'is_premium': False,
            'unlimited': False,
            'current_energy': energy.current_energy,
            'max_energy': energy.max_energy,
            'energy_regeneration_rate': 1,
            'regeneration_interval_minutes': 60,
            'normal_lesson_cost': NORMAL_LESSON_ENERGY_COST,
            'next_energy_at': next_energy_at,
            'full_refill_at': full_refill_at,
        }

    @classmethod
    def can_afford(cls, user, cost):
        sub, energy = cls.refresh_energy(user, save=True)
        if sub.is_premium:
            return True
        return energy.current_energy >= cost

    @classmethod
    def consume_energy(cls, user, cost, reason, reference_id=None, transaction_type=EnergyTransactionType.LESSON_COMPLETION):
        with transaction.atomic():
            sub = Subscription.objects.select_for_update().filter(user=user).first()
            energy = UserEnergy.objects.select_for_update().filter(user=user).first()
            if not sub or not energy:
                sub, energy = cls.get_or_create_energy(user)
                sub = Subscription.objects.select_for_update().filter(user=user).first()
                energy = UserEnergy.objects.select_for_update().filter(user=user).first()

            cls.expire_subscription_if_needed(sub, energy)

            if reference_id:
                existing_tx = EnergyTransaction.objects.filter(user=user, reference_id=reference_id).first()
                if existing_tx:
                    return True, "ALREADY_CHARGED", cls.get_energy_status(user)

            if sub.is_premium:
                EnergyTransaction.objects.create(
                    user=user,
                    amount=0,
                    transaction_type=EnergyTransactionType.PREMIUM_BYPASS,
                    reason=f"Premium unlimited energy: {reason}",
                    reference_id=reference_id or '',
                )
                return True, "PREMIUM_UNLIMITED", cls.get_energy_status(user)

            cls.refresh_energy(user, save=True)
            energy.refresh_from_db()

            if energy.current_energy < cost:
                needed = cost - energy.current_energy
                status = cls.get_energy_status(user)
                status.update({
                    'success': False,
                    'reason': 'INSUFFICIENT_ENERGY',
                    'required_energy': cost,
                    'energy_needed': needed,
                })
                return False, "INSUFFICIENT_ENERGY", status

            energy.current_energy -= cost
            energy.save(update_fields=['current_energy', 'updated_at'])

            EnergyTransaction.objects.create(
                user=user,
                amount=-cost,
                transaction_type=transaction_type,
                reason=reason,
                reference_id=reference_id or '',
            )
            return True, "SUCCESS", cls.get_energy_status(user)

    @classmethod
    def reward_energy(cls, user, amount, reason, reference_id=None, transaction_type=EnergyTransactionType.ASSESSMENT_COMPLETION):
        with transaction.atomic():
            sub, energy = cls.refresh_energy(user, save=True)
            if sub.is_premium:
                return True, "PREMIUM_UNLIMITED", cls.get_energy_status(user)

            if reference_id and EnergyTransaction.objects.filter(user=user, reference_id=reference_id).exists():
                return True, "ALREADY_REWARDED", cls.get_energy_status(user)

            new_energy = min(energy.current_energy + amount, energy.max_energy)
            actual_added = new_energy - energy.current_energy

            energy.current_energy = new_energy
            energy.save(update_fields=['current_energy', 'updated_at'])

            if actual_added > 0:
                EnergyTransaction.objects.create(
                    user=user,
                    amount=actual_added,
                    transaction_type=transaction_type,
                    reason=reason,
                    reference_id=reference_id or '',
                )
            return True, "SUCCESS", cls.get_energy_status(user)

    @classmethod
    def activate_premium(cls, user, duration_days=30, provider='default_gateway', reference=''):
        with transaction.atomic():
            sub, energy = cls.get_or_create_energy(user)
            sub.plan_type = PlanType.PREMIUM
            sub.status = SubscriptionStatus.ACTIVE
            sub.started_at = timezone.now()
            sub.expires_at = timezone.now() + timedelta(days=duration_days) if duration_days else None
            sub.payment_provider = provider
            sub.payment_reference = reference
            sub.save()
            return cls.get_energy_status(user)

    @classmethod
    def cancel_premium(cls, user):
        with transaction.atomic():
            sub, energy = cls.get_or_create_energy(user)
            sub.plan_type = PlanType.FREE
            sub.status = SubscriptionStatus.CANCELLED
            sub.expires_at = timezone.now()
            sub.save()

            energy.current_energy = min(energy.current_energy, MAX_FREE_ENERGY)
            energy.max_energy = MAX_FREE_ENERGY
            energy.last_energy_update = timezone.now()
            energy.save()
            return cls.get_energy_status(user)
