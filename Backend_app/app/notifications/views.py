from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import Notification
from .serializers import NotificationSerializer, NotificationPreferenceSerializer
from .services import NotificationService


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """GET /api/notifications/ - List user notifications with pagination & unread filter."""
    unread_filter = request.query_params.get('unread', 'false').lower() == 'true'
    qs = NotificationService.get_user_notifications(request.user, unread_only=unread_filter)

    paginator = NotificationPagination()
    page = paginator.paginate_queryset(qs, request)
    if page is not None:
        serializer = NotificationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = NotificationSerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_notifications(request):
    """GET /api/notifications/unread/ - Get unread notification list and count."""
    qs = NotificationService.get_user_notifications(request.user, unread_only=True)
    count = qs.count()
    serializer = NotificationSerializer(qs[:10], many=True)
    return Response({
        'unread_count': count,
        'notifications': serializer.data,
    }, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, pk):
    """PATCH /api/notifications/<id>/read/ - Mark single notification as read."""
    notification = NotificationService.mark_as_read(request.user, pk)
    if not notification:
        return Response({'detail': 'Notification not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = NotificationSerializer(notification)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """PATCH /api/notifications/read-all/ - Mark all notifications as read."""
    updated_count = NotificationService.mark_all_as_read(request.user)
    return Response({'detail': f'Marked {updated_count} notifications as read.', 'updated_count': updated_count}, status=status.HTTP_200_OK)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def notification_preferences(request):
    """GET/PATCH /api/notification-preferences/ - Retrieve or update notification preferences."""
    pref = NotificationService.get_or_create_preferences(request.user)

    if request.method == 'PATCH':
        serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer = NotificationPreferenceSerializer(pref)
    return Response(serializer.data, status=status.HTTP_200_OK)
