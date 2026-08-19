from django.urls import path

from .views import (
    DifficultyLevelListView,
    LanguageListView,
    LearningPathView,
    LearningSetupView,
    GeneratedLessonView,
    ActivitySubmitView,
    GeneratedLessonCompleteView,
    MySkillProfileView, MySkillHistoryView, RecommendationListView,
    RecommendationRefreshView, RecommendationAcceptView, RecommendationDismissView, CurrentPersonalizedPathView,
    GeneratePersonalizedPathView, PersonalizedPathDetailView, PathItemStartView,
    PathItemCompleteView, PathItemSkipView, ProficiencyForecastView,
)


urlpatterns = [
    path('languages/', LanguageListView.as_view(), name='language-list'),
    path(
        'difficulty-levels/',
        DifficultyLevelListView.as_view(),
        name='difficulty-level-list',
    ),
    path('learning/setup/', LearningSetupView.as_view(), name='learning-setup'),
    path('learning/path/', LearningPathView.as_view(), name='learning-path'),
    path('learning/lessons/<int:lesson_id>/generate/', GeneratedLessonView.as_view(), name='generated-lesson'),
    path('learning/generated-lessons/<int:generation_id>/activities/<str:activity_id>/submit/', ActivitySubmitView.as_view(), name='activity-submit'),
    path('learning/generated-lessons/<int:generation_id>/complete/', GeneratedLessonCompleteView.as_view(), name='generated-lesson-complete'),
    path('me/skill-profile/', MySkillProfileView.as_view(), name='my-skill-profile'),
    path('me/skill-history/', MySkillHistoryView.as_view(), name='my-skill-history'),
    path('recommendations/', RecommendationListView.as_view(), name='recommendations'),
    path('recommendations/refresh/', RecommendationRefreshView.as_view(), name='recommendations-refresh'),
    path('recommendations/<int:recommendation_id>/accept/', RecommendationAcceptView.as_view(), name='recommendation-accept'),
    path('recommendations/<int:recommendation_id>/dismiss/', RecommendationDismissView.as_view(), name='recommendation-dismiss'),
    path('learning-paths/current/', CurrentPersonalizedPathView.as_view(), name='current-learning-path'),
    path('learning-paths/generate/', GeneratePersonalizedPathView.as_view(), name='generate-learning-path'),
    path('learning-paths/<int:path_id>/', PersonalizedPathDetailView.as_view(), name='learning-path-detail'),
    path('learning-path-items/<int:item_id>/start/', PathItemStartView.as_view(), name='path-item-start'),
    path('learning-path-items/<int:item_id>/complete/', PathItemCompleteView.as_view(), name='path-item-complete'),
    path('learning-path-items/<int:item_id>/skip/', PathItemSkipView.as_view(), name='path-item-skip'),
    path('proficiency-forecast/', ProficiencyForecastView.as_view(), name='proficiency-forecast'),
]
