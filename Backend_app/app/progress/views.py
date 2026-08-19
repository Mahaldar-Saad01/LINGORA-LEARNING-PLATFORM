from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LearningStats
from .services import serialize_stats


class MyProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        stats, _ = LearningStats.objects.get_or_create(user=request.user)
        return Response(serialize_stats(stats))
