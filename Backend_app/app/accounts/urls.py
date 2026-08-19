from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView, RegisterView, RequestPasswordResetOTPView,
    VerifyPasswordResetOTPView, ResetPasswordWithOTPView,
    UserEnergyView, UpgradeSubscriptionView, CancelSubscriptionView,
)


urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('forgot-password/request-otp/', RequestPasswordResetOTPView.as_view(), name='request-otp'),
    path('forgot-password/verify-otp/', VerifyPasswordResetOTPView.as_view(), name='verify-otp'),
    path('forgot-password/reset-password/', ResetPasswordWithOTPView.as_view(), name='reset-password'),
    path('energy/', UserEnergyView.as_view(), name='user-energy'),
    path('subscriptions/upgrade/', UpgradeSubscriptionView.as_view(), name='subscription-upgrade'),
    path('subscriptions/cancel/', CancelSubscriptionView.as_view(), name='subscription-cancel'),
]


