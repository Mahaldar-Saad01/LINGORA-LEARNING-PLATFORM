from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.energy_constants import (
    MAX_FREE_ENERGY, STARTING_FREE_ENERGY, NORMAL_LESSON_ENERGY_COST,
    PlanType, SubscriptionStatus, EnergyTransactionType
)
from accounts.energy_services import EnergyService
from accounts.models import User, Subscription, UserEnergy, EnergyTransaction


class EnergySystemTestCase(TestCase):
    def setUp(self):
        self.user_free = User.objects.create_user(
            username='freeuser',
            email='free@example.com',
            password='password123',
            name='Free User'
        )
        self.user_other = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='password123',
            name='Other User'
        )
        self.client_free = APIClient()
        self.client_free.force_authenticate(user=self.user_free)

    # 1. Starts with 24 energy
    def test_01_free_user_starting_energy(self):
        status_data = EnergyService.get_energy_status(self.user_free)
        self.assertEqual(status_data['current_energy'], 24)
        self.assertEqual(status_data['max_energy'], 24)
        self.assertFalse(status_data['is_premium'])

    # 2. Can access a 6-energy lesson with sufficient energy
    def test_02_can_afford_lesson(self):
        self.assertTrue(EnergyService.can_afford(self.user_free, NORMAL_LESSON_ENERGY_COST))

    # 3. Completing a lesson deducts exactly 6 energy
    def test_03_lesson_completion_deducts_energy(self):
        success, reason, status_data = EnergyService.consume_energy(
            self.user_free,
            cost=NORMAL_LESSON_ENERGY_COST,
            reason="Test Lesson 1",
            reference_id="ref_test_03"
        )
        self.assertTrue(success)
        self.assertEqual(status_data['current_energy'], 18)

    # 4. Cannot complete the same lesson twice and lose energy twice (idempotency)
    def test_04_idempotent_energy_deduction(self):
        ref_id = "ref_test_04"
        EnergyService.consume_energy(self.user_free, cost=6, reason="Lesson", reference_id=ref_id)
        # Second call with same reference_id
        success, reason, status_data = EnergyService.consume_energy(
            self.user_free, cost=6, reason="Lesson Retry", reference_id=ref_id
        )
        self.assertTrue(success)
        self.assertEqual(reason, "ALREADY_CHARGED")
        self.assertEqual(status_data['current_energy'], 18)

    # 5. Cannot start/complete a 6-energy lesson with only 5 energy
    def test_05_insufficient_energy_prevention(self):
        _, energy = EnergyService.get_or_create_energy(self.user_free)
        energy.current_energy = 5
        energy.save()

        self.assertFalse(EnergyService.can_afford(self.user_free, 6))
        success, reason, status_data = EnergyService.consume_energy(
            self.user_free, cost=6, reason="Too expensive lesson"
        )
        self.assertFalse(success)
        self.assertEqual(reason, "INSUFFICIENT_ENERGY")
        self.assertEqual(status_data['current_energy'], 5)

    # 6. Energy regenerates by 1 after one full hour
    def test_06_regeneration_after_one_hour(self):
        _, energy = EnergyService.get_or_create_energy(self.user_free)
        energy.current_energy = 10
        energy.last_energy_update = timezone.now() - timedelta(hours=1, minutes=5)
        energy.save()

        sub, energy = EnergyService.refresh_energy(self.user_free)
        self.assertEqual(energy.current_energy, 11)

    # 7. Energy regenerates by 5 after five full hours
    def test_07_regeneration_after_five_hours(self):
        _, energy = EnergyService.get_or_create_energy(self.user_free)
        energy.current_energy = 10
        energy.last_energy_update = timezone.now() - timedelta(hours=5, minutes=10)
        energy.save()

        sub, energy = EnergyService.refresh_energy(self.user_free)
        self.assertEqual(energy.current_energy, 15)

    # 8. Energy never exceeds 24
    def test_08_energy_capped_at_max(self):
        _, energy = EnergyService.get_or_create_energy(self.user_free)
        energy.current_energy = 22
        energy.last_energy_update = timezone.now() - timedelta(hours=10)
        energy.save()

        sub, energy = EnergyService.refresh_energy(self.user_free)
        self.assertEqual(energy.current_energy, 24)

    # 9. Energy does not regenerate while already at 24
    def test_09_no_regeneration_when_full(self):
        status_data = EnergyService.get_energy_status(self.user_free)
        self.assertEqual(status_data['current_energy'], 24)
        tx_count_before = EnergyTransaction.objects.filter(user=self.user_free).count()

        EnergyService.refresh_energy(self.user_free)
        tx_count_after = EnergyTransaction.objects.filter(user=self.user_free).count()
        self.assertEqual(tx_count_before, tx_count_after)

    # 10. Review activities marked free do not consume energy
    def test_10_free_review_activity_cost(self):
        _, energy = EnergyService.get_or_create_energy(self.user_free)
        energy.current_energy = 0
        energy.save()

        # Free review has cost = 0
        success, reason, status_data = EnergyService.consume_energy(
            self.user_free, cost=0, reason="Mistake Review"
        )
        self.assertTrue(success)
        self.assertEqual(status_data['current_energy'], 0)

    # 11. Daily energy rewards cannot exceed configured max (24)
    def test_11_reward_capped_at_max(self):
        _, energy = EnergyService.get_or_create_energy(self.user_free)
        energy.current_energy = 23
        energy.save()

        EnergyService.reward_energy(self.user_free, amount=5, reason="Bonus")
        status_data = EnergyService.get_energy_status(self.user_free)
        self.assertEqual(status_data['current_energy'], 24)

    # 12. Premium users can complete lessons regardless of energy & don't lose energy
    def test_12_premium_unlimited_energy(self):
        EnergyService.activate_premium(self.user_free, duration_days=30)
        status_data = EnergyService.get_energy_status(self.user_free)

        self.assertTrue(status_data['is_premium'])
        self.assertTrue(status_data['unlimited'])
        self.assertEqual(status_data['normal_lesson_cost'], 0)

        # Consume energy
        success, reason, status_data = EnergyService.consume_energy(
            self.user_free, cost=6, reason="Premium Lesson"
        )
        self.assertTrue(success)
        self.assertEqual(reason, "PREMIUM_UNLIMITED")
        self.assertTrue(status_data['unlimited'])

    # 13. Expired Premium users correctly return to FREE rules
    def test_13_premium_expiration_transition(self):
        sub, _ = EnergyService.get_or_create_energy(self.user_free)
        sub.plan_type = PlanType.PREMIUM
        sub.status = SubscriptionStatus.ACTIVE
        sub.expires_at = timezone.now() - timedelta(minutes=1)
        sub.save()

        status_data = EnergyService.get_energy_status(self.user_free)
        self.assertFalse(status_data['is_premium'])
        self.assertEqual(status_data['plan'], "FREE")
        self.assertEqual(status_data['max_energy'], 24)

    # 14. Energy API Endpoint Security
    def test_14_energy_api_endpoint(self):
        response = self.client_free.get('/api/energy/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['plan'], 'FREE')
        self.assertEqual(response.data['current_energy'], 24)

    # 15. Premium Upgrade & Cancel API
    def test_15_subscription_upgrade_cancel_api(self):
        response = self.client_free.post('/api/subscriptions/upgrade/', {'duration_days': 30})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['energy']['is_premium'])

        response_cancel = self.client_free.post('/api/subscriptions/cancel/')
        self.assertEqual(response_cancel.status_code, status.HTTP_200_OK)
        self.assertFalse(response_cancel.data['energy']['is_premium'])
        self.assertEqual(response_cancel.data['energy']['plan'], 'FREE')
