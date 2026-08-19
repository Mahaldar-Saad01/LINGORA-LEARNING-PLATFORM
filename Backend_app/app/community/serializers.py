from rest_framework import serializers
from .models import CommunityPost, PostReaction


class CommunityPostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    avatar_id = serializers.SerializerMethodField()
    target_lang = serializers.SerializerMethodField()
    flag = serializers.SerializerMethodField()
    xp_badge = serializers.SerializerMethodField()
    streak_badge = serializers.SerializerMethodField()
    timestamp = serializers.SerializerMethodField()
    fires = serializers.SerializerMethodField()
    likes = serializers.SerializerMethodField()
    user_fired = serializers.SerializerMethodField()
    user_liked = serializers.SerializerMethodField()

    class Meta:
        model = CommunityPost
        fields = [
            'id', 'author_name', 'username', 'avatar_id', 'target_lang', 'flag',
            'xp_badge', 'streak_badge', 'milestone', 'text', 'timestamp',
            'fires', 'likes', 'user_fired', 'user_liked', 'created_at'
        ]

    def get_author_name(self, obj):
        if obj.author_name:
            return obj.author_name
        return obj.user.name if obj.user and obj.user.name else 'Learner'

    def get_username(self, obj):
        name = self.get_author_name(obj)
        clean = name.lower().replace(' ', '_')
        return f'@{clean}'

    def get_avatar_id(self, obj):
        if obj.user and hasattr(obj.user, 'avatar') and getattr(obj.user, 'avatar', None):
            return obj.user.avatar
        return obj.author_avatar or 'owl'

    def get_target_lang(self, obj):
        if obj.user and obj.user.target_language:
            return obj.user.target_language
        return obj.target_lang or 'Spanish'

    def get_flag(self, obj):
        lang = str(self.get_target_lang(obj)).lower()
        if 'french' in lang: return '🇫🇷'
        if 'german' in lang: return '🇩🇪'
        if 'japanese' in lang: return '🇯🇵'
        if 'italian' in lang: return '🇮🇹'
        if 'portuguese' in lang: return '🇵🇹'
        if 'english' in lang: return '🇬🇧'
        return '🇪🇸'

    def get_xp_badge(self, obj):
        if obj.user and hasattr(obj.user, 'learning_stats'):
            return f'{obj.user.learning_stats.total_xp:,} XP'
        return '1,450 XP'

    def get_streak_badge(self, obj):
        if obj.user and hasattr(obj.user, 'learning_stats'):
            return f'{obj.user.learning_stats.current_streak} Days'
        return '7 Days'

    def get_timestamp(self, obj):
        from django.utils.timesince import timesince
        return f'{timesince(obj.created_at)} ago'

    def get_fires(self, obj):
        return obj.reactions.filter(reaction_type=PostReaction.FIRE).count()

    def get_likes(self, obj):
        return obj.reactions.filter(reaction_type=PostReaction.LIKE).count()

    def get_user_fired(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.reactions.filter(user=request.user, reaction_type=PostReaction.FIRE).exists()
        return False

    def get_user_liked(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.reactions.filter(user=request.user, reaction_type=PostReaction.LIKE).exists()
        return False
