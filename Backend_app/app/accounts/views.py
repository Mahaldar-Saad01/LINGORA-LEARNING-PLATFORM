import logging
import random
from datetime import timedelta
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .energy_services import EnergyService
from .models import User, PasswordResetOTP
from .serializers import LoginSerializer, RegisterSerializer

logger = logging.getLogger(__name__)


def has_completed_assessment(user):
    try:
        return user.learner_profile.current_level_id is not None
    except ObjectDoesNotExist:
        return False


def get_user_payload(user):
    return {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'preferred_language': user.preferred_language,
        'target_language': user.target_language,
        'has_completed_assessment': has_completed_assessment(user),
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                'message': 'Registration successful.',
                'user': get_user_payload(user),
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                'message': 'Login successful.',
                'user': get_user_payload(user),
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
            },
            status=status.HTTP_200_OK,
        )


class RequestPasswordResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'detail': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email).first()
        if not user:
            return Response({'detail': 'No account found with this email address.'}, status=status.HTTP_404_NOT_FOUND)

        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=15)

        PasswordResetOTP.objects.filter(user=user, is_verified=False).delete()

        PasswordResetOTP.objects.create(
            user=user,
            email=email,
            otp_code=otp_code,
            expires_at=expires_at,
        )

        logger.info(f"==================================================")
        logger.info(f" PASSWORD RESET OTP FOR {email}: {otp_code} ")
        logger.info(f"==================================================")
        print(f"\n==================================================", flush=True)
        print(f" PASSWORD RESET OTP FOR {email}: {otp_code} ", flush=True)
        print(f"==================================================\n", flush=True)

        try:
            send_mail(
                subject='lingora Learning - Password Reset OTP',
                message=f"Hello {user.name},\n\nYour password reset OTP code is: {otp_code}\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.",
                from_email=None,
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception as e:
            logger.warning(f"Failed to send email via SMTP: {e}")

        return Response(
            {'message': f'OTP code has been sent to your email address. (OTP: {otp_code})', 'email': email, 'otp': otp_code},
            status=status.HTTP_200_OK,
        )


class VerifyPasswordResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        otp_code = (request.data.get('otp') or '').strip()

        if not email or not otp_code:
            return Response({'detail': 'Email and OTP code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = PasswordResetOTP.objects.filter(
            email=email,
            otp_code=otp_code,
            expires_at__gt=timezone.now(),
        ).first()

        if not otp_record:
            return Response({'detail': 'Invalid or expired OTP code. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record.is_verified = True
        otp_record.save(update_fields=['is_verified'])

        return Response({'message': 'OTP verified successfully.'}, status=status.HTTP_200_OK)


class ResetPasswordWithOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        otp_code = (request.data.get('otp') or '').strip()
        new_password = request.data.get('new_password')

        if not email or not otp_code or not new_password:
            return Response({'detail': 'Email, OTP, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({'detail': 'Password must be at least 6 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = PasswordResetOTP.objects.filter(
            email=email,
            otp_code=otp_code,
            is_verified=True,
            expires_at__gt=timezone.now(),
        ).first()

        if not otp_record:
            return Response({'detail': 'Unverified or expired OTP. Please verify your OTP code first.'}, status=status.HTTP_400_BAD_REQUEST)

        user = otp_record.user
        user.set_password(new_password)
        user.save()

        PasswordResetOTP.objects.filter(user=user).delete()

        return Response({'message': 'Password has been updated successfully. You can now log in.'}, status=status.HTTP_200_OK)


class UserEnergyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_data = EnergyService.get_energy_status(request.user)
        return Response(status_data, status=status.HTTP_200_OK)


class UpgradeSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        duration_days = request.data.get('duration_days', 30)
        provider = request.data.get('payment_provider', 'demo_gateway')
        reference = request.data.get('payment_reference', 'REF-DEMO-123')

        try:
            duration_days = int(duration_days)
        except (ValueError, TypeError):
            duration_days = 30

        status_data = EnergyService.activate_premium(
            request.user,
            duration_days=duration_days,
            provider=provider,
            reference=reference,
        )
        return Response(
            {'message': 'Successfully upgraded to Premium!', 'energy': status_data},
            status=status.HTTP_200_OK,
        )


class CancelSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        status_data = EnergyService.cancel_premium(request.user)
        return Response(
            {'message': 'Subscription cancelled. Returned to Free plan.', 'energy': status_data},
            status=status.HTTP_200_OK,
        )


