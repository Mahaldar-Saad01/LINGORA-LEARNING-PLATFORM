from django.urls import path

from .views import (
    FirstAssessmentSubmitView,
    FirstAssessmentView,
    LearningAssessmentListView,
    BadgeDefinitionListView,
    CurrentRecurringAssessmentView,
    MyBadgeListView,
    RecurringAssessmentAnswerView,
    RecurringAssessmentCompleteView,
    RecurringAssessmentHistoryView,
    RecurringAssessmentResultView,
    RecurringAssessmentStartView,
    RecurringAssessmentStatusView,
)


urlpatterns = [
    path('assessments/status/', RecurringAssessmentStatusView.as_view(), name='recurring-assessment-status'),
    path('assessments/current/', CurrentRecurringAssessmentView.as_view(), name='current-recurring-assessment'),
    path('assessments/history/', RecurringAssessmentHistoryView.as_view(), name='recurring-assessment-history'),
    path('assessments/<int:assessment_id>/start/', RecurringAssessmentStartView.as_view(), name='recurring-assessment-start'),
    path('assessments/<int:assessment_id>/answer/', RecurringAssessmentAnswerView.as_view(), name='recurring-assessment-answer'),
    path('assessments/<int:assessment_id>/complete/', RecurringAssessmentCompleteView.as_view(), name='recurring-assessment-complete'),
    path('assessments/<int:assessment_id>/result/', RecurringAssessmentResultView.as_view(), name='recurring-assessment-result'),
    path('badges/', BadgeDefinitionListView.as_view(), name='badge-list'),
    path('badges/mine/', MyBadgeListView.as_view(), name='my-badges'),
    path(
        'learning/assessments/',
        LearningAssessmentListView.as_view(),
        name='learning-assessment-list',
    ),
    path(
        'learning/first-assessment/',
        FirstAssessmentView.as_view(),
        name='first-assessment',
    ),
    path(
        'learning/first-assessment/submit/',
        FirstAssessmentSubmitView.as_view(),
        name='first-assessment-submit',
    ),
]
