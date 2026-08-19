from django.urls import path
from .views import MyProgressView

urlpatterns = [path('progress/me/', MyProgressView.as_view(), name='my-progress')]
