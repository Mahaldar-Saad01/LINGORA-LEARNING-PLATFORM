from django.urls import path
from .views import CommunityPostListCreateView, PostReactionToggleView, CommunityLeaderboardView

urlpatterns = [
    path('posts/', CommunityPostListCreateView.as_view(), name='community-posts'),
    path('posts/<int:post_id>/react/', PostReactionToggleView.as_view(), name='community-post-react'),
    path('leaderboard/', CommunityLeaderboardView.as_view(), name='community-leaderboard'),
]
