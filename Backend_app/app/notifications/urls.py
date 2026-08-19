from django.urls import path
from . import views

urlpatterns = [
    path('notifications/', views.list_notifications, name='notification-list'),
    path('notifications/unread/', views.unread_notifications, name='notification-unread'),
    path('notifications/<int:pk>/read/', views.mark_notification_read, name='notification-mark-read'),
    path('notifications/read-all/', views.mark_all_notifications_read, name='notification-read-all'),
    path('notification-preferences/', views.notification_preferences, name='notification-preferences'),
]
