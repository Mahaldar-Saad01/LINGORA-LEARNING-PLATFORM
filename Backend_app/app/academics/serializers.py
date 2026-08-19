from rest_framework import serializers

from accounts.models import LearnerProfile
from assessments.models import Assessment, AssessmentQuestion, Passage, QuestionOption

from .models import (
    Curriculum,
    DifficultyLevel,
    Language,
    Lesson,
    LessonCategory,
    LessonContent,
    LearnerSkillProfile,
    LearningPath,
    LearningPathItem,
    LessonRecommendation,
    GeneratedLesson,
    SkillHistory,
)


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ['id', 'name', 'code']


class DifficultyLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = DifficultyLevel
        fields = ['id', 'name', 'min_score', 'max_score', 'order_no']


class CurriculumSerializer(serializers.ModelSerializer):
    target_language = LanguageSerializer(read_only=True)
    explanation_language = LanguageSerializer(read_only=True)

    class Meta:
        model = Curriculum
        fields = [
            'id',
            'title',
        ]

class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ['id', 'name', 'code']


class DifficultyLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = DifficultyLevel
        fields = ['id', 'name', 'min_score', 'max_score', 'order_no']


class CurriculumSerializer(serializers.ModelSerializer):
    target_language = LanguageSerializer(read_only=True)
    explanation_language = LanguageSerializer(read_only=True)

    class Meta:
        model = Curriculum
        fields = [
            'id',
            'title',
            'description',
            'target_language',
            'explanation_language',
        ]


class LessonContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonContent
        fields = [
            'id',
            'order_no',
            'title',
            'content_text',
            'explanation_text',
            'example_text',
            'audio_url',
            'video_url',
            'image_url',
            'is_active',
        ]


class LessonSerializer(serializers.ModelSerializer):
    content = serializers.SerializerMethodField()
    contents = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id',
            'title',
            'description',
            'order_no',
            'estimated_minutes',
            'content',
            'contents',
        ]

    def get_content(self, lesson):
        target_language = self.context.get('target_language')
        explanation_language = self.context.get('explanation_language')
        qs = lesson.contents.filter(is_active=True)
        if target_language and explanation_language:
            qs = qs.filter(
                target_language=target_language,
                explanation_language=explanation_language,
            )
        content = qs.order_by('order_no').first()
        return LessonContentSerializer(content).data if content else None

    def get_contents(self, lesson):
        target_language = self.context.get('target_language')
        explanation_language = self.context.get('explanation_language')
        qs = lesson.contents.filter(is_active=True)
        if target_language and explanation_language:
            qs = qs.filter(
                target_language=target_language,
                explanation_language=explanation_language,
            )
        contents = qs.order_by('order_no')
        return LessonContentSerializer(contents, many=True).data


class LearnerSkillProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearnerSkillProfile
        exclude = ['user']


class SkillHistorySerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='source_lesson.title', read_only=True)
    class Meta:
        model = SkillHistory
        fields = ['id', 'skill', 'previous_score', 'new_score', 'score_change',
                  'source_type', 'source_lesson', 'lesson_title', 'metadata', 'recorded_at']


class RecommendationSerializer(serializers.ModelSerializer):
    lesson = LessonSerializer(read_only=True)
    class Meta:
        model = LessonRecommendation
        fields = ['id', 'lesson', 'recommendation_score', 'priority', 'primary_skill',
                  'reason', 'status', 'engine_version', 'created_at', 'expires_at']


class LearningPathItemSerializer(serializers.ModelSerializer):
    lesson = LessonSerializer(read_only=True)
    contents = serializers.SerializerMethodField()
    generation = serializers.SerializerMethodField()

    def get_contents(self, obj):
        contents = obj.lesson.contents.filter(is_active=True).order_by('order_no')
        return LessonContentSerializer(contents, many=True).data

    def get_generation(self, obj):
        scoped = getattr(obj.lesson, 'scoped_generated_versions', None)
        if scoped is not None:
            generated = scoped[0] if scoped else None
        else:
            generated = GeneratedLesson.objects.filter(
                user=obj.path.user, lesson=obj.lesson
            ).order_by('-generation_version').first()
        return None if not generated else {'id': generated.id, 'status': generated.status, 'last_error': generated.last_error}

    class Meta:
        model = LearningPathItem
        fields = ['id', 'lesson', 'contents', 'order_no', 'scheduled_date', 'status',
                  'recommendation_score_snapshot', 'reason_snapshot', 'started_at',
                  'completed_at', 'generation']


class PersonalizedPathSerializer(serializers.ModelSerializer):
    items = LearningPathItemSerializer(many=True, read_only=True)
    nodes = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

    def get_nodes(self, obj):
        nodes = []
        global_order = 1
        items = obj.items.all().select_related('lesson').prefetch_related(
            serializers.SerializerMethodField()
        ) if False else obj.items.all().select_related('lesson')

        for item in items:
            lesson = item.lesson
            contents = list(lesson.contents.filter(is_active=True).order_by('order_no'))
            reason_summary = ''
            if isinstance(item.reason_snapshot, dict):
                reason_summary = item.reason_snapshot.get('summary', '')

            for c in contents:
                nodes.append({
                    'node_id': f"item_{item.id}_content_{c.id}",
                    'path_item_id': item.id,
                    'lesson_id': lesson.id,
                    'lesson_title': lesson.title,
                    'content_id': c.id,
                    'content_order_no': c.order_no,
                    'content_title': c.title,
                    'status': item.status,
                    'order_no': global_order,
                    'reason': reason_summary,
                    'scheduled_date': item.scheduled_date,
                    'started_at': item.started_at,
                    'completed_at': item.completed_at,
                })
                global_order += 1
        return nodes

    def get_progress_percentage(self, obj):
        total = obj.items.count()
        return round(
            obj.items.filter(status=LearningPathItem.Status.COMPLETED).count()
            / total * 100
        ) if total else 0

    class Meta:
        model = LearningPath
        fields = ['id', 'title', 'focus_skills', 'status', 'engine_version',
                  'created_at', 'updated_at', 'progress_percentage', 'items', 'nodes']

class LessonCategorySerializer(serializers.ModelSerializer):
    lessons = serializers.SerializerMethodField()

    class Meta:
        model = LessonCategory
        fields = ['id', 'name', 'description', 'order_no', 'lessons']

    def get_lessons(self, category):
        lessons = category.lessons.all()
        return LessonSerializer(
            lessons,
            many=True,
            context=self.context,
        ).data


class LearningSetupSerializer(serializers.Serializer):
    known_language_id = serializers.PrimaryKeyRelatedField(
        source='known_language',
        queryset=Language.objects.all(),
    )
    target_language_id = serializers.PrimaryKeyRelatedField(
        source='target_language',
        queryset=Language.objects.all(),
    )
    current_level_id = serializers.PrimaryKeyRelatedField(
        source='current_level',
        queryset=DifficultyLevel.objects.all(),
    )

    def save(self, **kwargs):
        user = self.context['request'].user
        profile, _ = LearnerProfile.objects.get_or_create(user=user)

        profile.known_language = self.validated_data['known_language']
        profile.target_language = self.validated_data['target_language']
        profile.current_level = self.validated_data['current_level']
        profile.save()

        return profile


class FirstAssessmentSubmitSerializer(serializers.Serializer):
    correct_answers = serializers.IntegerField(min_value=0)
    total_questions = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        if attrs['correct_answers'] > attrs['total_questions']:
            raise serializers.ValidationError({
                'correct_answers': 'Correct answers cannot be greater than total questions.'
            })
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        correct_answers = self.validated_data['correct_answers']
        total_questions = self.validated_data['total_questions']
        score_percentage = round((correct_answers / total_questions) * 100)
        level = DifficultyLevel.objects.filter(
            min_score__lte=score_percentage,
            max_score__gte=score_percentage,
        ).first()

        if level is None:
            raise serializers.ValidationError({
                'score': 'No difficulty level matches this score.'
            })

        profile, _ = LearnerProfile.objects.get_or_create(user=user)
        if profile.known_language_id is None:
            profile.known_language = Language.objects.filter(
                name__iexact=user.preferred_language,
            ).first()
        if profile.target_language_id is None:
            profile.target_language = Language.objects.filter(
                name__iexact=user.target_language,
            ).first()
        profile.current_level = level
        profile.save()

        return profile, score_percentage


class LearnerProfileSerializer(serializers.ModelSerializer):
    known_language = LanguageSerializer(read_only=True)
    target_language = LanguageSerializer(read_only=True)
    current_level = DifficultyLevelSerializer(read_only=True)

    class Meta:
        model = LearnerProfile
        fields = ['id', 'known_language', 'target_language', 'current_level']


class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ['id', 'option_text', 'is_correct']


class PassageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Passage
        fields = [
            'id',
            'label',
            'title',
            'text',
            'read_time',
            'hint_title',
            'hint_text',
            'order_no',
        ]


class AssessmentQuestionSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, read_only=True)
    passage = PassageSerializer(read_only=True)

    class Meta:
        model = AssessmentQuestion
        fields = [
            'id',
            'passage',
            'passage_id',
            'question_text',
            'question_type',
            'marks',
            'order_no',
            'passage_label',
            'passage_title',
            'passage_text',
            'passage_read_time',
            'passage_hint_title',
            'passage_hint_text',
            'options',
        ]


class AssessmentSerializer(serializers.ModelSerializer):
    questions = AssessmentQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Assessment
        fields = ['id', 'type', 'title', 'description', 'questions']


class ActivitySubmissionSerializer(serializers.Serializer):
    answer = serializers.JSONField(required=False, allow_null=True)
    skipped = serializers.BooleanField(default=False)
    attempt_count = serializers.IntegerField(min_value=1, default=1)
    response_time_ms = serializers.IntegerField(min_value=0, default=0)
    hint_used = serializers.BooleanField(default=False)
    audio_replay_count = serializers.IntegerField(min_value=0, default=0)
    pronunciation_score = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    writing_score = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
