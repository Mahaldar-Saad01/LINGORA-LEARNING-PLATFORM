from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from progress.models import LearningStats
from .models import CommunityPost, PostReaction
from .serializers import CommunityPostSerializer


SEED_POSTS = [
    {
        'author_name': 'Elena Rostova',
        'author_avatar': 'fox',
        'target_lang': 'Spanish',
        'milestone': '🎯 20% Spanish Proficiency Reached',
        'text': 'Just hit 20% overall proficiency in Spanish! The AI Tutor real-time practice really helped me get past intermediate conversation blocks! 🚀',
    },
    {
        'author_name': 'Marcus Chen',
        'author_avatar': 'panda',
        'target_lang': 'Japanese',
        'milestone': '🏆 Monthly Assessment Master',
        'text': 'Completed 30 days straight of monthly assessment challenges with 95% average score! Kanji writing practice and daily reviews pay off! 📝✨',
    },
    {
        'author_name': 'Sophia Al-Mansoor',
        'author_avatar': 'owl',
        'target_lang': 'French',
        'milestone': '🌟 2,000 XP Milestone',
        'text': 'Just unlocked the "Weekly Reviewer" badge and hit over 2,000 total XP in French! Onto Level B1 listening exercises! 🥐🥖',
    },
    {
        'author_name': 'Alex Rivera',
        'author_avatar': 'bear',
        'target_lang': 'German',
        'milestone': '📚 Story Completed',
        'text': 'Finished my first German short story translation without hints! Der Weg ist das Ziel! 🇩🇪 Keep pushing everyone!',
    },
]


def seed_initial_posts_if_empty():
    if CommunityPost.objects.count() == 0:
        first_user = User.objects.first()
        if not first_user:
            return
        for item in SEED_POSTS:
            CommunityPost.objects.create(
                user=first_user,
                author_name=item['author_name'],
                author_avatar=item['author_avatar'],
                target_lang=item['target_lang'],
                milestone=item['milestone'],
                text=item['text'],
            )


class CommunityPostListCreateView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        seed_initial_posts_if_empty()
        posts = CommunityPost.objects.select_related('user').prefetch_related('reactions').order_by('-created_at')
        serializer = CommunityPostSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        text = request.data.get('text', '').strip()
        milestone = request.data.get('milestone', '').strip()

        if not text:
            return Response({'text': 'Post text cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        post = CommunityPost.objects.create(
            user=request.user,
            text=text,
            milestone=milestone,
            author_name=request.user.name or request.user.username or 'Learner',
            author_avatar=getattr(request.user, 'avatar', 'owl'),
            target_lang=request.user.target_language or 'Spanish',
        )

        serializer = CommunityPostSerializer(post, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PostReactionToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = CommunityPost.objects.get(id=post_id)
        except CommunityPost.DoesNotExist:
            return Response({'detail': 'Post not found.'}, status=status.HTTP_404_NOT_FOUND)

        reaction_type = request.data.get('reaction_type', 'fire')
        if reaction_type not in [PostReaction.FIRE, PostReaction.LIKE]:
            return Response({'detail': 'Invalid reaction type.'}, status=status.HTTP_400_BAD_REQUEST)

        existing = PostReaction.objects.filter(post=post, user=request.user, reaction_type=reaction_type).first()
        if existing:
            existing.delete()
            active = False
        else:
            PostReaction.objects.create(post=post, user=request.user, reaction_type=reaction_type)
            active = True

        fires = post.reactions.filter(reaction_type=PostReaction.FIRE).count()
        likes = post.reactions.filter(reaction_type=PostReaction.LIKE).count()
        user_fired = post.reactions.filter(user=request.user, reaction_type=PostReaction.FIRE).exists()
        user_liked = post.reactions.filter(user=request.user, reaction_type=PostReaction.LIKE).exists()

        return Response({
            'post_id': post_id,
            'reaction_type': reaction_type,
            'active': active,
            'fires': fires,
            'likes': likes,
            'user_fired': user_fired,
            'user_liked': user_liked,
        })


class CommunityLeaderboardView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        lang_filter = request.query_params.get('lang', 'all').lower()

        # Static Mock Champions
        champions = [
            {'rank': 1, 'name': 'Marcus Chen', 'username': '@marcus_c', 'avatarId': 'panda', 'targetLang': 'Japanese', 'flag': '🇯🇵', 'xp': 3450, 'streak': 45},
            {'rank': 2, 'name': 'Elena Rostova', 'username': '@elena_r', 'avatarId': 'fox', 'targetLang': 'Spanish', 'flag': '🇪🇸', 'xp': 2840, 'streak': 21},
            {'rank': 3, 'name': 'Sophia Al-Mansoor', 'username': '@sophia_m', 'avatarId': 'owl', 'targetLang': 'French', 'flag': '🇫🇷', 'xp': 2120, 'streak': 14},
            {'rank': 5, 'name': 'Alex Rivera', 'username': '@alex_r', 'avatarId': 'bear', 'targetLang': 'German', 'flag': '🇩🇪', 'xp': 1280, 'streak': 9},
            {'rank': 6, 'name': 'Lucas Silva', 'username': '@lucas_s', 'avatarId': 'penguin', 'targetLang': 'Portuguese', 'flag': '🇵🇹', 'xp': 1150, 'streak': 12},
            {'rank': 7, 'name': 'Emma Watson', 'username': '@emma_w', 'avatarId': 'bunny', 'targetLang': 'Italian', 'flag': '🇮🇹', 'xp': 980, 'streak': 5},
            {'rank': 8, 'name': 'Priya Sharma', 'username': '@priya_s', 'avatarId': 'cat', 'targetLang': 'Spanish', 'flag': '🇪🇸', 'xp': 890, 'streak': 8},
        ]

        current_user_item = None
        if request.user.is_authenticated:
            stats, _ = LearningStats.objects.get_or_create(user=request.user)
            target_lang = request.user.target_language or 'Spanish'
            lang_lower = target_lang.lower()
            flag = '🇪🇸'
            if 'french' in lang_lower: flag = '🇫🇷'
            elif 'german' in lang_lower: flag = '🇩🇪'
            elif 'japanese' in lang_lower: flag = '🇯🇵'
            elif 'italian' in lang_lower: flag = '🇮🇹'
            elif 'portuguese' in lang_lower: flag = '🇵🇹'
            elif 'english' in lang_lower: flag = '🇬🇧'

            current_user_item = {
                'rank': 4,
                'name': request.user.name or request.user.username or 'You',
                'username': f'@{ (request.user.name or "you").lower().replace(" ", "_") }',
                'avatarId': getattr(request.user, 'avatar', 'owl'),
                'targetLang': target_lang,
                'flag': flag,
                'xp': stats.total_xp,
                'streak': stats.current_streak,
                'isCurrentUser': True,
            }

        full_list = [champions[0], champions[1], champions[2]]
        if current_user_item:
            full_list.append(current_user_item)
        full_list.extend(champions[3:])

        if lang_filter != 'all':
            full_list = [item for item in full_list if lang_filter in item['targetLang'].lower()]

        return Response(full_list)
