import json
from django.http import StreamingHttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import TutorConversation, TutorMessage
from .serializers import TutorConversationSerializer, TutorMessageSerializer
from .services import generate_gemini_stream


class TutorConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TutorConversationSerializer

    def get_queryset(self):
        return TutorConversation.objects.filter(user=self.request.user).order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TutorChatStreamView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        conversation_id = request.data.get('conversation_id')
        message_text = request.data.get('message', '').strip()

        if not message_text:
            return Response(
                {'error': 'Message content is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Retrieve or create conversation
        if conversation_id:
            try:
                conversation = TutorConversation.objects.get(
                    id=conversation_id, user=user
                )
            except TutorConversation.DoesNotExist:
                return Response(
                    {'error': 'Conversation not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            title = message_text[:40] + ('...' if len(message_text) > 40 else '')
            conversation = TutorConversation.objects.create(
                user=user, title=title
            )

        # Save user message
        user_msg = TutorMessage.objects.create(
            conversation=conversation, sender='user', content=message_text
        )

        # Fetch recent message history (up to last 10 messages before current)
        history_msgs = (
            TutorMessage.objects.filter(conversation=conversation)
            .exclude(id=user_msg.id)
            .order_by('-created_at')[:10]
        )
        history = [
            {'sender': msg.sender, 'content': msg.content}
            for msg in reversed(history_msgs)
        ]

        def event_stream():
            # First send metadata chunk
            meta = {
                'type': 'meta',
                'conversation_id': conversation.id,
                'title': conversation.title,
            }
            yield f'data: {json.dumps(meta)}\n\n'

            full_assistant_text = []

            # Stream response chunks from Gemini
            for chunk in generate_gemini_stream(history, message_text, user):
                full_assistant_text.append(chunk)
                payload = {'type': 'chunk', 'text': chunk}
                yield f'data: {json.dumps(payload)}\n\n'

            complete_text = ''.join(full_assistant_text)

            # Save assistant message to DB
            TutorMessage.objects.create(
                conversation=conversation,
                sender='assistant',
                content=complete_text,
            )

            # Update conversation timestamp
            conversation.save()

            done_payload = {
                'type': 'done',
                'conversation_id': conversation.id,
                'full_text': complete_text,
            }
            yield f'data: {json.dumps(done_payload)}\n\n'

        response = StreamingHttpResponse(
            event_stream(), content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tutor_stats(request):
    user = request.user
    total_conversations = TutorConversation.objects.filter(user=user).count()
    total_messages = TutorMessage.objects.filter(
        conversation__user=user
    ).count()

    streak = 0
    if hasattr(user, 'progress') and user.progress:
        streak = getattr(user.progress, 'current_streak', 0)

    target_language = getattr(user, 'target_language', 'English') or 'English'
    proficiency = getattr(user, 'language_level', 'Intermediate') or 'Intermediate'

    return Response({
        'target_language': target_language,
        'language_level': proficiency,
        'total_conversations': total_conversations,
        'total_messages': total_messages,
        'streak': streak,
        'quick_prompts': [
            "Explain recent grammar mistakes",
            f"Practice conversational {target_language}",
            "Review today's key vocabulary",
            "Give me a 5-minute quiz on verb tenses",
            "Explain how to order food naturally",
        ]
    })
