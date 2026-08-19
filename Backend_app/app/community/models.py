from django.db import models


class CommunityPost(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='community_posts')
    text = models.TextField()
    milestone = models.CharField(max_length=255, blank=True)
    author_name = models.CharField(max_length=100, blank=True)
    author_avatar = models.CharField(max_length=50, default='owl')
    target_lang = models.CharField(max_length=50, default='Spanish')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.author_name or self.user}: {self.text[:30]}'


class PostReaction(models.Model):
    FIRE = 'fire'
    LIKE = 'like'

    REACTION_CHOICES = [
        (FIRE, 'Fire'),
        (LIKE, 'Like'),
    ]

    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='post_reactions')
    reaction_type = models.CharField(max_length=10, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['post', 'user', 'reaction_type'], name='unique_user_post_reaction')
        ]

    def __str__(self):
        return f'{self.user} {self.reaction_type} on post {self.post_id}'
