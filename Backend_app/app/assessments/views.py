from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import ScopedRateThrottle

from accounts.energy_constants import ASSESSMENT_ENERGY_REWARD, EnergyTransactionType
from accounts.energy_services import EnergyService
from accounts.models import LearnerProfile
from academics.models import Language
from academics.serializers import DifficultyLevelSerializer, LearnerProfileSerializer
from academics.tasks import dispatch_lesson_buffer

from .models import Assessment, AssessmentQuestion, BadgeDefinition, RecurringAssessment, UserBadge
from .services.first_assessment import (
    FIRST_ASSESSMENT_LEVEL_SPLIT,
    get_first_assessment_questions,
    resolve_language,
)
from .serializers import (
    AssessmentSerializer,
    FIRST_ASSESSMENT_QUESTION_COUNT,
    FirstAssessmentSubmitSerializer,
    MARKS_PER_QUESTION,
)
from .services.recurring import (
    complete_assessment, get_or_create_current, save_answer, serialize_assessment,
    serialize_badges, serialize_result, start_assessment, status_payload,
)


class RecurringAssessmentStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(status_payload(request.user))


class CurrentRecurringAssessmentView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'assessment_create'

    def get(self, request):
        item = get_or_create_current(request.user, request.query_params.get('type', 'daily'))
        return Response(serialize_assessment(item))


class OwnedRecurringAssessmentView(APIView):
    permission_classes = [IsAuthenticated]

    def assessment(self, request, assessment_id):
        return get_object_or_404(RecurringAssessment, id=assessment_id, user=request.user)


class RecurringAssessmentStartView(OwnedRecurringAssessmentView):
    def post(self, request, assessment_id):
        return Response(serialize_assessment(start_assessment(self.assessment(request, assessment_id))))


class RecurringAssessmentAnswerView(OwnedRecurringAssessmentView):
    def post(self, request, assessment_id):
        assessment = self.assessment(request, assessment_id)
        activity_id = request.data.get('activity_id')
        if not isinstance(activity_id, str) or not activity_id:
            return Response({'activity_id': 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)
        answer = save_answer(assessment, activity_id, request.data.get('answer'))
        return Response({'activity_id': answer.activity_id, 'answer': answer.answer, 'saved': True})


class RecurringAssessmentCompleteView(OwnedRecurringAssessmentView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'assessment_complete'

    def post(self, request, assessment_id):
        assessment, badges, extended = complete_assessment(assessment_id, request.user)
        EnergyService.reward_energy(
            request.user,
            amount=ASSESSMENT_ENERGY_REWARD,
            reason=f"Completed {assessment.assessment_type} assessment",
            reference_id=f"recurring_assessment_{assessment.id}",
            transaction_type=EnergyTransactionType.ASSESSMENT_COMPLETION,
        )
        return Response({
            'id': assessment.id,
            'energy': EnergyService.get_energy_status(request.user),
            **serialize_result(assessment, badges, extended)
        })


class RecurringAssessmentResultView(OwnedRecurringAssessmentView):
    def get(self, request, assessment_id):
        assessment = self.assessment(request, assessment_id)
        if assessment.status != RecurringAssessment.Status.COMPLETED:
            return Response({'detail': 'Assessment is not completed.'}, status=status.HTTP_409_CONFLICT)
        return Response({'id': assessment.id, 'assessment_type': assessment.assessment_type,
                         'period_key': assessment.period_key, **serialize_result(assessment)})


class RecurringAssessmentHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        records = RecurringAssessment.objects.filter(user=request.user, status='completed').order_by('-completed_at')
        paginator = PageNumberPagination()
        paginator.page_size = 10
        page = paginator.paginate_queryset(records, request)
        data = [{'id': item.id, 'assessment_type': item.assessment_type,
                 'period_key': item.period_key, 'score': item.score,
                 'xp_awarded': item.xp_awarded, 'completed_at': item.completed_at} for item in page]
        return paginator.get_paginated_response(data)


class BadgeDefinitionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        earned = set(UserBadge.objects.filter(user=request.user).values_list('badge_id', flat=True))
        return Response([{'code': item.code, 'name': item.name, 'description': item.description,
                          'icon': item.icon, 'badge_type': item.badge_type, 'earned': item.id in earned}
                         for item in BadgeDefinition.objects.filter(is_active=True)])


class MyBadgeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        awards = UserBadge.objects.filter(user=request.user).select_related('badge').order_by('-earned_at')
        return Response(serialize_badges(awards))


class LearningAssessmentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_object_or_404(LearnerProfile, user=request.user)

        if not all([
            profile.known_language_id,
            profile.target_language_id,
            profile.current_level_id,
        ]):
            return Response(
                {'detail': 'Complete learning setup first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assessments = Assessment.objects.filter(
            target_language=profile.target_language,
            explanation_language=profile.known_language,
            level=profile.current_level,
        ).prefetch_related('questions__options')

        return Response({
            'assessments': AssessmentSerializer(assessments, many=True).data,
        })


class FirstAssessmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = LearnerProfile.objects.get_or_create(user=request.user)
        known_language = resolve_language(
            request.user.preferred_language,
        ) or profile.known_language
        target_language = resolve_language(
            request.user.target_language,
        ) or profile.target_language

        if known_language is None or target_language is None:
            return Response(
                {'detail': 'First assessment setup data is missing.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile.known_language = known_language
        profile.target_language = target_language
        profile.save(update_fields=['known_language', 'target_language', 'updated_at'])

        questions = get_first_assessment_questions(target_language, known_language)

        if len(questions) < FIRST_ASSESSMENT_QUESTION_COUNT:
            return Response(
                {
                    'detail': (
                        'The first assessment requires 10 beginner questions '
                        'for this language pair.'
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        grouped_questions = []
        passage_groups = {}

        for question in questions:
            if question.question_type == AssessmentQuestion.PASSAGE_MCQ:
                passage_key = question.passage_id or f'legacy-{question.id}'
                if passage_key not in passage_groups:
                    group = {
                        'id': f'passage-{passage_key}',
                        'passage': self._serialize_passage(question),
                        'questions': [],
                    }
                    passage_groups[passage_key] = group
                    grouped_questions.append(group)

                if len(passage_groups[passage_key]['questions']) < 2:
                    passage_groups[passage_key]['questions'].append(
                        self._serialize_question(question),
                    )
                continue

            grouped_questions.append(self._serialize_question(question))

        if not grouped_questions:
            return Response(
                {'detail': 'No first assessment questions found for this language pair.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            'language_pair': {
                'target_language': target_language.name,
                'explanation_language': known_language.name,
            },
                'level_mix': FIRST_ASSESSMENT_LEVEL_SPLIT,
                'questions': grouped_questions,
                'total_questions': FIRST_ASSESSMENT_QUESTION_COUNT,
                'marks_per_question': MARKS_PER_QUESTION,
                'total_marks': FIRST_ASSESSMENT_QUESTION_COUNT * MARKS_PER_QUESTION,
        })

    def _serialize_passage(self, question):
        passage = question.passage

        if passage is not None:
            return {
                'id': passage.id,
                'label': passage.label,
                'title': passage.title,
                'text': passage.text,
                'readTime': passage.read_time,
                'hintTitle': passage.hint_title,
                'hintText': passage.hint_text,
            }

        return {
            'id': None,
            'label': question.passage_label,
            'title': question.passage_title,
            'text': question.passage_text,
            'readTime': question.passage_read_time,
            'hintTitle': question.passage_hint_title,
            'hintText': question.passage_hint_text,
        }

    def _serialize_question(self, question):
        data = {
            'id': question.id,
            'prompt': question.question_text,
            'helper': self._get_helper_text(question),
            'questionType': question.question_type,
            'marks': MARKS_PER_QUESTION,
        }

        if question.question_type == AssessmentQuestion.SHORT_ANSWER:
            data.update({
                'type': 'writing',
                'hint': 'Use short beginner sentences. Clear writing is strong writing.',
                'maxCharacters': 150,
                'minCharacters': 1,
                'minimumWords': 1,
            })
            return data

        data['options'] = [
            {
                'id': option.id,
                'text': option.option_text,
                'meaning': option.option_text,
            }
            for option in question.options.all()
        ]
        return data

    def _get_helper_text(self, question):
        if question.question_type == AssessmentQuestion.PASSAGE_MCQ:
            return 'Use the passage to choose the correct answer.'
        if question.question_type == AssessmentQuestion.SHORT_ANSWER:
            return 'Write a simple answer using beginner words.'
        return 'Choose the best answer.'


class FirstAssessmentSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FirstAssessmentSubmitSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                profile, score_percentage, writing_feedback = serializer.save()
                transaction.on_commit(
                    lambda: dispatch_lesson_buffer(request.user.id),
                    robust=True,
                )
        except (RuntimeError, ValueError) as exc:
            return Response(
                {'detail': f'Writing evaluation is temporarily unavailable: {exc}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        EnergyService.reward_energy(
            request.user,
            amount=ASSESSMENT_ENERGY_REWARD,
            reason="Completed initial assessment",
            reference_id=f"first_assessment_user_{request.user.id}",
            transaction_type=EnergyTransactionType.ASSESSMENT_COMPLETION,
        )

        return Response(
            {
                'message': 'First assessment submitted.',
                'score_percentage': score_percentage,
                'score': score_percentage,
                'total_marks': FIRST_ASSESSMENT_QUESTION_COUNT * MARKS_PER_QUESTION,
                'writing_feedback': writing_feedback,
                'level': DifficultyLevelSerializer(profile.current_level).data,
                'profile': LearnerProfileSerializer(profile).data,
                'energy': EnergyService.get_energy_status(request.user),
                'lesson_preparation_status': 'queued',
            },
            status=status.HTTP_200_OK,
        )
