from rest_framework import serializers
from .models import TutorConversation, TutorMessage


class TutorMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorMessage
        fields = ['id', 'conversation', 'sender', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']


class TutorConversationSerializer(serializers.ModelSerializer):
    messages = TutorMessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = TutorConversation
        fields = [
            'id',
            'user',
            'title',
            'created_at',
            'updated_at',
            'messages',
            'message_count',
            'last_message',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if last:
            return {
                'sender': last.sender,
                'content': last.content,
                'created_at': last.created_at,
            }
        return None
