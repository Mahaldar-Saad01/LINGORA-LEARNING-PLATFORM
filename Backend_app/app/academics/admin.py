from django.contrib import admin

from .models import (
    Curriculum,
    DifficultyLevel,
    Language,
    Lesson,
    LessonCategory,
    LessonContent,
)


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = ['name', 'code']
    search_fields = ['name', 'code']


@admin.register(DifficultyLevel)
class DifficultyLevelAdmin(admin.ModelAdmin):
    list_display = ['name', 'min_score', 'max_score', 'order_no']
    ordering = ['order_no', 'min_score']


@admin.register(Curriculum)
class CurriculumAdmin(admin.ModelAdmin):
    list_display = ['title', 'target_language', 'explanation_language']
    list_filter = ['target_language', 'explanation_language']
    search_fields = ['title']


@admin.register(LessonCategory)
class LessonCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'curriculum', 'level', 'order_no']
    list_filter = ['curriculum', 'level']
    ordering = ['curriculum', 'level', 'order_no']


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'order_no', 'estimated_minutes']
    list_filter = ['category__curriculum', 'category__level']
    search_fields = ['title', 'description']


@admin.register(LessonContent)
class LessonContentAdmin(admin.ModelAdmin):
    list_display = ['title', 'lesson', 'order_no', 'target_language', 'explanation_language', 'is_active']
    list_filter = ['target_language', 'explanation_language', 'is_active']
    search_fields = ['title', 'content_text', 'explanation_text']
    ordering = ['lesson', 'order_no']
