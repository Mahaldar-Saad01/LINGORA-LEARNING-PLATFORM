"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path

from accounts.views import UserEnergyView, UpgradeSubscriptionView, CancelSubscriptionView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/energy/', UserEnergyView.as_view(), name='root-user-energy'),
    path('api/subscriptions/upgrade/', UpgradeSubscriptionView.as_view(), name='root-subscription-upgrade'),
    path('api/subscriptions/cancel/', CancelSubscriptionView.as_view(), name='root-subscription-cancel'),
    path('api/accounts/', include('accounts.urls')),
    path('api/tutor/', include('tutor.urls')),
    path('api/', include('academics.urls')),
    path('api/', include('assessments.urls')),
    path('api/', include('progress.urls')),
    path('api/', include('notifications.urls')),
    path('api/community/', include('community.urls')),
]
