from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import TutorChatStreamView, TutorConversationViewSet, get_tutor_stats

router = DefaultRouter()
router.register(r'conversations', TutorConversationViewSet, basename='tutor-conversation')

urlpatterns = [
    path('chat/', TutorChatStreamView.as_view(), name='tutor-chat-stream'),
    path('stats/', get_tutor_stats, name='tutor-stats'),
    path('', include(router.urls)),
]
