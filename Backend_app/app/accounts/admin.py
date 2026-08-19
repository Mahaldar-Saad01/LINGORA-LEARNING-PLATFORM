from django.contrib import admin

from .models import LearnerProfile, User


admin.site.register(User)


@admin.register(LearnerProfile)
class LearnerProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'known_language', 'target_language', 'current_level']
    list_filter = ['known_language', 'target_language', 'current_level']
    search_fields = ['user__email', 'user__name']
