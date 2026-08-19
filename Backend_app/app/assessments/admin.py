from django.contrib import admin

from .models import (
    Assessment, AssessmentQuestion, BadgeDefinition, Passage, QuestionOption,
    RecurringAssessment, RecurringAssessmentAnswer, UserBadge,
)


class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 0


class AssessmentQuestionInline(admin.TabularInline):
    model = AssessmentQuestion
    extra = 0


class PassageInline(admin.TabularInline):
    model = Passage
    extra = 0


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'type',
        'target_language',
        'explanation_language',
        'level',
    ]
    list_filter = ['type', 'target_language', 'explanation_language', 'level']
    search_fields = ['title', 'description']
    inlines = [PassageInline, AssessmentQuestionInline]


@admin.register(Passage)
class PassageAdmin(admin.ModelAdmin):
    list_display = ['title', 'assessment', 'label', 'read_time', 'order_no']
    list_filter = ['assessment__target_language', 'assessment__explanation_language']
    search_fields = ['title', 'text', 'hint_text']


@admin.register(AssessmentQuestion)
class AssessmentQuestionAdmin(admin.ModelAdmin):
    list_display = ['assessment', 'question_type', 'passage', 'passage_title', 'marks', 'order_no']
    list_filter = ['question_type', 'assessment__type']
    search_fields = ['question_text', 'passage_title', 'passage_text']
    fieldsets = [
        (
            None,
            {
                'fields': [
                    'assessment',
                    'passage',
                    'question_text',
                    'question_type',
                    'marks',
                    'order_no',
                ],
            },
        ),
        (
            'Passage holder',
            {
                'classes': ['collapse'],
                'fields': [
                    'passage_label',
                    'passage_title',
                    'passage_text',
                    'passage_read_time',
                    'passage_hint_title',
                    'passage_hint_text',
                ],
            },
        ),
    ]
    inlines = [QuestionOptionInline]


@admin.register(QuestionOption)
class QuestionOptionAdmin(admin.ModelAdmin):
    list_display = ['question', 'option_text', 'is_correct', 'order_no']
    list_filter = ['is_correct']
    search_fields = ['option_text']


@admin.register(RecurringAssessment)
class RecurringAssessmentAdmin(admin.ModelAdmin):
    list_display = ['user', 'assessment_type', 'period_key', 'status', 'score', 'xp_awarded', 'completed_at']
    list_filter = ['assessment_type', 'status', 'period_key']
    search_fields = ['user__username', 'user__email', 'period_key']
    readonly_fields = ['question_snapshot', 'completed_at', 'xp_awarded', 'reward_claimed', 'created_at', 'updated_at']


@admin.register(RecurringAssessmentAnswer)
class RecurringAssessmentAnswerAdmin(admin.ModelAdmin):
    list_display = ['assessment', 'activity_id', 'activity_type', 'skill', 'is_correct', 'score']
    list_filter = ['activity_type', 'skill', 'is_correct']
    search_fields = ['assessment__user__username', 'activity_id']


@admin.register(BadgeDefinition)
class BadgeDefinitionAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'badge_type', 'threshold', 'is_active']
    list_filter = ['badge_type', 'is_active']
    search_fields = ['name', 'code', 'description']


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'source_type', 'source_key', 'earned_at']
    list_filter = ['source_type', 'badge']
    search_fields = ['user__username', 'user__email', 'badge__name']
    readonly_fields = ['earned_at']
