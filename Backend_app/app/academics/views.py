import time
import logging

from django.conf import settings
from django.core.exceptions import MultipleObjectsReturned
from django.db import IntegrityError, transaction
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.energy_constants import NORMAL_LESSON_ENERGY_COST, EnergyTransactionType
from accounts.energy_services import EnergyService
from accounts.models import LearnerProfile
from .models import (ActivityAttempt, Curriculum, DifficultyLevel, GeneratedLesson, Language, Lesson, LessonContent,
                     LearnerSkillProfile, LearningPath, LearningPathItem, LessonRecommendation, SkillHistory)
from .serializers import (
    CurriculumSerializer,
    DifficultyLevelSerializer,
    LanguageSerializer,
    LearnerProfileSerializer,
    LearningSetupSerializer,
    LessonCategorySerializer,
    ActivitySubmissionSerializer,
    LearnerSkillProfileSerializer, SkillHistorySerializer, RecommendationSerializer,
    PersonalizedPathSerializer,
)
from .tasks import dispatch_lesson_buffer, dispatch_lesson_generation
from .services.lesson_fallback import get_or_create_fallback_lesson
from .services.mistake_resolution import explain_mistake
from .services.speaking_practice import score_speaking_answer
from .services.answer_display import serialize_attempt_for_results
from progress.models import LearningStats
from progress.services import calculate_lesson_xp, serialize_stats, update_learning_stats
from .services.adaptive_learning import (
    forecast_learning_scenario, generate_or_extend_path, recalculate_after_lesson,
    refresh_recommendations, skill_priorities, unlock_next,
)
from .services.learning_paths import reorder_path_items


logger = logging.getLogger(__name__)


def _dispatch_lesson_buffer_after_commit(user_id):
    def dispatch():
        try:
            dispatch_lesson_buffer(user_id)
        except Exception:
            logger.exception(
                'Unable to dispatch the lesson buffer for user_id=%s.', user_id
            )

    transaction.on_commit(dispatch)


class RecommendationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        if 'page' not in request.query_params and 'page_size' not in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view)





class LanguageListView(APIView):
    def get(self, request):
        languages = Language.objects.all()
        serializer = LanguageSerializer(languages, many=True)
        return Response(serializer.data)


class DifficultyLevelListView(APIView):
    def get(self, request):
        levels = DifficultyLevel.objects.all()
        serializer = DifficultyLevelSerializer(levels, many=True)
        return Response(serializer.data)


class LearningSetupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LearningSetupSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()

        return Response(
            {
                'message': 'Learning setup saved.',
                'profile': LearnerProfileSerializer(profile).data,
            },
            status=status.HTTP_200_OK,
        )


class LearningPathView(APIView):
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

        curriculum = get_object_or_404(
            Curriculum,
            target_language=profile.target_language,
            explanation_language=profile.known_language,
        )
        path_level = DifficultyLevel.objects.filter(
            name__iexact=profile.current_level.name,
            lesson_categories__curriculum=curriculum,
        ).distinct().first() or profile.current_level
        categories = curriculum.categories.filter(
            level=path_level,
        ).prefetch_related(
            Prefetch('lessons__contents', queryset=LessonContent.objects.filter(is_active=True).order_by('order_no'))
        )

        serializer_context = {
            'target_language': profile.target_language,
            'explanation_language': profile.known_language,
        }
        return Response(
            {
                'curriculum': CurriculumSerializer(curriculum).data,
                'level': DifficultyLevelSerializer(path_level).data,
                'categories': LessonCategorySerializer(
                    categories,
                    many=True,
                    context=serializer_context,
                ).data,
            }
        )


def _public_lesson_payload(generated_lesson):
    payload = {**generated_lesson.payload, 'generation_id': generated_lesson.id}
    private_fields = {'correct_answers', 'correct_option_id', 'correct_pairs', 'correct_order', 'accepted_sentences'}
    payload['activities'] = []
    for activity in generated_lesson.payload.get('activities', []):
        public_activity = {key: value for key, value in activity.items() if key not in {'correct_answer', 'accepted_answers'}}
        public_activity['content'] = {key: value for key, value in activity.get('content', {}).items() if key not in private_fields}
        payload['activities'].append(public_activity)
    return payload


def _answers_match(answer, correct_answer, accepted_answers):
    if isinstance(correct_answer, list):
        return answer == correct_answer
    candidates = [correct_answer, *(accepted_answers or [])]
    if isinstance(answer, str):
        normalized = answer.strip().casefold()
        return any(isinstance(value, str) and value.strip().casefold() == normalized for value in candidates)
    return answer in candidates


def _activity_answer_spec(activity):
    content = activity.get('content') or {}
    activity_type = activity.get('activity_type')
    if activity_type in {'listen_and_select', 'sentence_completion', 'translate_sentence'}:
        return {'selected_option_id': content.get('correct_option_id')}, []
    if activity_type == 'fill_in_the_blank':
        return None, [{'value': value} for value in content.get('correct_answers', [])]
    if activity_type == 'matching_words':
        return {'pairs': content.get('correct_pairs', [])}, []
    if activity_type == 'word_arrangement':
        return {'ordered_word_ids': content.get('correct_order', [])}, []
    if activity_type == 'speaking_practice':
        accepted = content.get('accepted_answers') or [content.get('phrase')]
        return None, [{'transcript': value} for value in accepted if value]
    return activity.get('correct_answer'), activity.get('accepted_answers') or []


def _display_correct_answer(activity, correct_answer, accepted_answers):
    content = activity.get('content') or {}
    activity_type = activity.get('activity_type')
    if activity_type in {'listen_and_select', 'sentence_completion', 'translate_sentence'}:
        option_id = (correct_answer or {}).get('selected_option_id')
        return next(
            (item.get('text') for item in content.get('options', []) if item.get('id') == option_id),
            option_id,
        )
    if activity_type == 'fill_in_the_blank':
        return ', '.join(str(item.get('value')) for item in accepted_answers if item.get('value') is not None)
    if activity_type == 'word_arrangement':
        order = (correct_answer or {}).get('ordered_word_ids', [])
        words = {item.get('id'): item.get('text') for item in content.get('word_bank', [])}
        return ' '.join(str(words.get(item_id, item_id)) for item_id in order)
    if activity_type == 'matching_words':
        left = {item.get('id'): item.get('text') for item in content.get('left_items', [])}
        right = {item.get('id'): item.get('meaning') for item in content.get('right_items', [])}
        return [
            f"{left.get(pair.get('left_id'), pair.get('left_id'))} → {right.get(pair.get('right_id'), pair.get('right_id'))}"
            for pair in (correct_answer or {}).get('pairs', [])
        ]
    if activity_type == 'speaking_practice':
        return content.get('phrase')
    return correct_answer


SKILL_GROUP_BY_ACTIVITY = {
    'matching_words': 'reading',
    'translate_sentence': 'reading',
    'fill_in_the_blank': 'writing',
    'sentence_completion': 'writing',
    'word_arrangement': 'writing',
    'speaking_practice': 'speaking',
}


def _fallback_mistake_feedback(activity, correct_answer):
    content = activity.get('content') or {}
    explanation = content.get('explanation')
    if not explanation and isinstance(content.get('grammar_tip'), dict):
        explanation = content['grammar_tip'].get('explanation')
    return {
        'explanation': explanation or 'This answer does not match the expected meaning or form for this activity.',
        'correction': correct_answer,
        'example': content.get('translation') or content.get('meaning') or '',
        'practice_tip': content.get('pronunciation_tip') or 'Review the prompt and compare each part with the correct answer before trying again.',
        'concept_tags': activity.get('concept_tags', []),
    }


def _lesson_skill_proficiency(attempts):
    result = []
    for skill in ('reading', 'writing', 'speaking'):
        relevant = [
            item for item in attempts
            if not item.skipped and SKILL_GROUP_BY_ACTIVITY.get(item.activity_type) == skill
        ]
        scores = []
        for item in relevant:
            measured = (
                item.pronunciation_score if skill == 'speaking'
                else item.writing_score if skill == 'writing'
                else None
            )
            scores.append(float(measured) if measured is not None else (100 if item.is_correct else 0))
        result.append({
            'skill': skill,
            'attempted': len(relevant),
            'correct': sum(item.is_correct for item in relevant),
            'score': round(sum(scores) / len(scores)) if scores else None,
        })
    return result


class GeneratedLessonView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, lesson_id):
        if not EnergyService.can_afford(request.user, NORMAL_LESSON_ENERGY_COST):
            energy_status = EnergyService.get_energy_status(request.user)
            needed = NORMAL_LESSON_ENERGY_COST - (energy_status.get('current_energy') or 0)
            return Response({
                'success': False,
                'detail': 'Insufficient energy to start a new lesson.',
                'reason': 'INSUFFICIENT_ENERGY',
                'current_energy': energy_status.get('current_energy'),
                'required_energy': NORMAL_LESSON_ENERGY_COST,
                'energy_needed': max(0, needed),
                'next_energy_at': energy_status.get('next_energy_at'),
                'full_refill_at': energy_status.get('full_refill_at'),
                'energy': energy_status,
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        path_item = LearningPathItem.objects.filter(
            path__user=request.user,
            path__status=LearningPath.Status.ACTIVE,
            lesson_id=lesson_id,
        ).first()
        if path_item and path_item.status == LearningPathItem.Status.LOCKED:
            return Response({'detail': 'This lesson is locked.'}, status=status.HTTP_403_FORBIDDEN)
        content_id = request.query_params.get('content_id') or request.data.get('content_id')
        if content_id:
            try:
                content_id = int(content_id)
            except (TypeError, ValueError):
                content_id = None

        lesson = get_object_or_404(
            Lesson.objects.select_related(
                'category__level', 'category__curriculum__target_language',
                'category__curriculum__explanation_language',
            ).prefetch_related(
                Prefetch('contents', queryset=LessonContent.objects.filter(is_active=True).order_by('order_no'))
            ),
            pk=lesson_id, is_active=True,
        )
        fallback = get_or_create_fallback_lesson(request.user, lesson, content_id=content_id)
        return Response(_public_lesson_payload(fallback))


class ActivitySubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, generation_id, activity_id):
        generated = get_object_or_404(GeneratedLesson, id=generation_id, user=request.user)
        activity = next(
            (item for item in generated.payload.get('activities', []) if item.get('id') == activity_id),
            None,
        )
        if activity is None:
            return Response({'detail': 'Activity not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ActivitySubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        answer = values.get('answer')
        skipped = values['skipped']
        speaking_score = None
        manual_speaking_completion = False
        if activity.get('activity_type') == 'speaking_practice' and not skipped:
            answer, speaking_score, speaking_correct = score_speaking_answer(activity, answer)
            manual_speaking_completion = answer['was_manually_confirmed']
        correct_answer, accepted_answers = _activity_answer_spec(activity)
        correct_answer_display = _display_correct_answer(activity, correct_answer, accepted_answers)
        if skipped:
            is_correct = False
        elif activity.get('activity_type') == 'speaking_practice':
            is_correct = speaking_correct
        elif activity.get('activity_type') == 'writing_practice' and values.get('writing_score') is not None:
            is_correct = values['writing_score'] >= 60
        else:
            is_correct = _answers_match(answer, correct_answer, accepted_answers)
        measured_score = speaking_score if activity.get('activity_type') == 'speaking_practice' else values.get('writing_score')
        normalized_score = (
            min(100, max(0, float(measured_score) * (10 if float(measured_score) <= 10 else 1)))
            if measured_score is not None else (0 if skipped or not is_correct else 100)
        )
        mistake_feedback = {}
        if not is_correct and not skipped and not manual_speaking_completion:
            mistake_feedback = _fallback_mistake_feedback(activity, correct_answer_display)
            try:
                mistake_feedback = explain_mistake(
                    request.user, generated, activity, answer, correct_answer_display
                )
            except Exception:
                # The content-backed explanation is persisted when remote feedback is unavailable.
                pass
        attempt, _ = ActivityAttempt.objects.update_or_create(
            generated_lesson=generated,
            activity_id=activity_id,
            defaults={
                'user': request.user, 'activity_type': activity.get('activity_type', ''),
                'skill': activity.get('skill', ''), 'user_answer': answer,
                'correct_answer': correct_answer_display, 'is_correct': is_correct,
                'skipped': skipped,
                'attempt_count': values['attempt_count'],
                'response_time_ms': values['response_time_ms'],
                'hint_used': values['hint_used'],
                'audio_replay_count': values['audio_replay_count'],
                'pronunciation_score': speaking_score,
                'writing_score': values.get('writing_score'),
                'obtained_score': normalized_score,
                'maximum_score': 100,
                'normalized_score': normalized_score,
                'completed_at': timezone.now(),
                'concept_mastery': {tag: 100 if is_correct else 40 for tag in activity.get('concept_tags', [])},
                'mistake_feedback': mistake_feedback,
            },
        )
        return Response({
            'correct': attempt.is_correct,
            'skipped': attempt.skipped,
            'correct_answer': correct_answer_display if not is_correct else None,
            'feedback': activity.get('feedback', ''),
            'mistake_feedback': mistake_feedback,
            'concept_mastery': attempt.concept_mastery,
            'match_accuracy': speaking_score,
            'manually_confirmed': manual_speaking_completion,
        })


class GeneratedLessonCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, generation_id):
        with transaction.atomic():
            type(request.user).objects.select_for_update().get(pk=request.user.pk)
            generated = get_object_or_404(
                GeneratedLesson.objects.select_for_update(), id=generation_id, user=request.user
            )
            activities = generated.payload.get('activities', [])
            scored_activities = [a for a in activities if a.get('activity_type') != 'lesson_overview']
            attempts = list(generated.attempts.all())
            attempts_by_activity = {item.activity_id: item for item in attempts}

            total_questions = len(scored_activities)
            if total_questions == 0:
                accuracy = 100
                is_perfect = True
            else:
                correct_questions = sum(
                    1 for act in scored_activities
                    if attempts_by_activity.get(act.get('id')) and attempts_by_activity[act.get('id')].is_correct and not attempts_by_activity[act.get('id')].skipped
                )
                accuracy = round((correct_questions / total_questions) * 100)
                is_perfect = (correct_questions == total_questions)

            stats, _ = LearningStats.objects.get_or_create(user=request.user)
            before = serialize_stats(stats)

            energy_deducted = False
            energy_status = EnergyService.get_energy_status(request.user)

            item = LearningPathItem.objects.select_for_update().filter(
                path__user=request.user, lesson=generated.lesson,
                status__in=[
                    LearningPathItem.Status.AVAILABLE,
                    LearningPathItem.Status.IN_PROGRESS,
                    LearningPathItem.Status.COMPLETED,
                ],
            ).first()

            current_content_id = generated.payload.get('content_id')
            next_content_id = None
            next_lesson_id = None

            if is_perfect:
                ref_id = f"lesson_complete_{generated.id}_{request.user.id}_{int(timezone.now().timestamp())}"
                success, energy_reason, energy_status = EnergyService.consume_energy(
                    request.user,
                    cost=NORMAL_LESSON_ENERGY_COST,
                    reason=f"Completed lesson: {generated.lesson.title}",
                    reference_id=ref_id,
                    transaction_type=EnergyTransactionType.LESSON_COMPLETION,
                )
                if not success and energy_reason == 'INSUFFICIENT_ENERGY':
                    return Response(energy_status, status=status.HTTP_402_PAYMENT_REQUIRED)

                energy_deducted = bool(success and (energy_reason != "ALREADY_CHARGED"))
                generated.xp_earned = calculate_lesson_xp(generated, accuracy)
                update_learning_stats(stats, xp_earned=generated.xp_earned, accuracy=accuracy)
                skill_profile = recalculate_after_lesson(request.user, generated)
                generated.completed_at = timezone.now()

                current_content = None
                if current_content_id:
                    current_content = generated.lesson.contents.filter(pk=current_content_id).first()

                if current_content:
                    next_content = generated.lesson.contents.filter(
                        is_active=True,
                        order_no__gt=current_content.order_no,
                    ).order_by('order_no').first()
                    if next_content:
                        next_content_id = next_content.id
                        next_lesson_id = generated.lesson_id

                if item:
                    if not next_content_id:
                        if item.status != LearningPathItem.Status.COMPLETED:
                            item.status = LearningPathItem.Status.COMPLETED
                            item.completed_at = timezone.now()
                            item.save(update_fields=['status', 'completed_at'])
                            LessonRecommendation.objects.filter(
                                user=request.user, lesson=generated.lesson
                            ).exclude(
                                status=LessonRecommendation.Status.DISMISSED
                            ).update(status=LessonRecommendation.Status.COMPLETED)
                        next_item = unlock_next(item.path)
                        if next_item:
                            next_lesson_id = next_item.lesson_id
                            first_content = next_item.lesson.contents.filter(is_active=True).order_by('order_no').first()
                            if first_content:
                                next_content_id = first_content.id

                generated.next_action = {
                    'action_type': 'next_lesson',
                    'title': 'Continue to the next lesson',
                    'lesson_id': next_lesson_id or generated.lesson_id,
                    'next_lesson_id': next_lesson_id or generated.lesson_id,
                    'next_content_id': next_content_id or current_content_id,
                    'is_completed': True,
                }
            else:
                # If not 100% correct answers: do not deduct energy, do not complete, do not unlock next lesson
                generated.completed_at = None
                generated.xp_earned = 0
                energy_deducted = False
                generated.next_action = {
                    'action_type': 'review_lesson',
                    'title': 'Review your lesson mistakes to achieve 100%',
                    'lesson_id': generated.lesson_id,
                    'next_lesson_id': generated.lesson_id,
                    'next_content_id': current_content_id,
                    'is_completed': False,
                }

            generated.save(update_fields=['completed_at', 'next_action', 'xp_earned'])
            skill_profile = locals().get('skill_profile') or LearnerSkillProfile.objects.get(user=request.user)
            progress = serialize_stats(stats)
            previously_unlocked = {item['key'] for item in before['achievements'] if item['unlocked']}
            newly_unlocked = [
                item for item in progress['achievements']
                if item['unlocked'] and item['key'] not in previously_unlocked
            ]
            _dispatch_lesson_buffer_after_commit(request.user.id)
        return Response({
            'accuracy': accuracy,
            'is_completed': is_perfect,
            'xp_earned': generated.xp_earned,
            'progress': progress,
            'energy_deducted': energy_deducted,
            'energy': energy_status,
            'new_achievements': newly_unlocked,
            'next_action': generated.next_action,
            'attempts': [serialize_attempt_for_results(
                attempt,
                next((activity for activity in generated.payload.get('activities', [])
                      if activity.get('id') == attempt.activity_id), {}),
            ) for attempt in attempts],
            'skill_proficiency': _lesson_skill_proficiency(attempts),
            'skill_profile': LearnerSkillProfileSerializer(skill_profile).data,
            'learning_path': PersonalizedPathSerializer(item.path).data if item else None,
        })


class MySkillProfileView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        profile, _ = LearnerSkillProfile.objects.get_or_create(user=request.user)
        return Response({**LearnerSkillProfileSerializer(profile).data,
                         'priorities': skill_priorities(request.user)})


class MySkillHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        queryset = SkillHistory.objects.filter(user=request.user).select_related('source_lesson')
        page = max(1, int(request.query_params.get('page', 1)))
        size = min(100, max(1, int(request.query_params.get('page_size', 25))))
        start = (page - 1) * size
        return Response({'count': queryset.count(), 'page': page,
                         'results': SkillHistorySerializer(queryset[start:start+size], many=True).data})


class RecommendationListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        records = LessonRecommendation.objects.filter(
            user=request.user,
            status=LessonRecommendation.Status.PENDING,
        ).select_related(
            'lesson__category__level'
        ).prefetch_related(
            Prefetch('lesson__contents', queryset=LessonContent.objects.filter(is_active=True).order_by('order_no'))
        ).order_by(
            '-recommendation_score', 'created_at', 'id'
        )
        paginator = RecommendationPagination()
        page = paginator.paginate_queryset(records, request, view=self)
        serializer = RecommendationSerializer(
            page if page is not None else records, many=True
        )
        return paginator.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)


class RecommendationRefreshView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'recommendation_refresh'

    def post(self, request):
        try:
            records = refresh_recommendations(request.user)
        except LearnerProfile.DoesNotExist:
            return Response(
                {'detail': 'Complete your learner profile before refreshing recommendations.'},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(RecommendationSerializer(records, many=True).data)


class RecommendationDismissView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, recommendation_id):
        with transaction.atomic():
            record = get_object_or_404(
                LessonRecommendation.objects.select_for_update(),
                id=recommendation_id,
                user=request.user,
            )
            if record.status == LessonRecommendation.Status.PENDING:
                paths = list(
                    LearningPath.objects.select_for_update().filter(
                        user=request.user,
                        status=LearningPath.Status.ACTIVE,
                    )
                )
                for path in paths:
                    items = list(
                        LearningPathItem.objects.select_for_update()
                        .filter(path=path)
                        .order_by('order_no', 'id')
                    )
                    removable_ids = [
                        item.id for item in items
                        if item.lesson_id == record.lesson_id
                        and item.status == LearningPathItem.Status.LOCKED
                    ]
                    if removable_ids:
                        LearningPathItem.objects.filter(id__in=removable_ids).delete()
                        reorder_path_items(path)
                record.status = LessonRecommendation.Status.DISMISSED
                record.save(update_fields=['status'])
        return Response(RecommendationSerializer(record).data)


class RecommendationAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, recommendation_id):
        with transaction.atomic():
            request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
            recommendation = get_object_or_404(
                LessonRecommendation.objects.select_for_update().select_related(
                    'lesson__category__curriculum'
                ),
                id=recommendation_id,
                user=request.user,
            )
            if recommendation.status not in (
                LessonRecommendation.Status.PENDING,
                LessonRecommendation.Status.ACCEPTED,
            ):
                return Response(
                    {'detail': 'This recommendation is no longer available.'},
                    status=status.HTTP_409_CONFLICT,
                )

            try:
                learner = LearnerProfile.objects.select_related(
                    'target_language', 'known_language'
                ).get(user=request.user)
            except LearnerProfile.DoesNotExist:
                return Response(
                    {'detail': 'Complete your learner profile before accepting recommendations.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if not learner.target_language_id or not learner.known_language_id:
                return Response(
                    {'detail': 'Your learner profile must include both learning languages.'},
                    status=status.HTTP_409_CONFLICT,
                )
            try:
                curriculum = Curriculum.objects.get(
                    target_language=learner.target_language,
                    explanation_language=learner.known_language,
                )
            except Curriculum.DoesNotExist:
                return Response(
                    {'detail': 'No curriculum is available for your selected languages.'},
                    status=status.HTTP_409_CONFLICT,
                )
            except MultipleObjectsReturned:
                return Response(
                    {'detail': 'The curriculum configuration is ambiguous.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if recommendation.lesson.category.curriculum_id != curriculum.id:
                return Response(
                    {'detail': 'This recommendation does not match your selected languages.'},
                    status=status.HTTP_409_CONFLICT,
                )

            path = LearningPath.objects.select_for_update().filter(
                user=request.user, status=LearningPath.Status.ACTIVE
            ).first()
            if path is not None and path.curriculum_id != curriculum.id:
                return Response(
                    {'detail': 'Your active learning path does not match your selected languages.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if recommendation.status == LessonRecommendation.Status.ACCEPTED:
                if path and path.items.filter(lesson=recommendation.lesson).exists():
                    return Response(PersonalizedPathSerializer(path).data)
                return Response(
                    {'detail': 'This recommendation can no longer be accepted.'},
                    status=status.HTTP_409_CONFLICT,
                )

            if path is None:
                try:
                    with transaction.atomic():
                        path = LearningPath.objects.create(
                            user=request.user,
                            curriculum=curriculum,
                            title=f'Personalized {curriculum.title}',
                            focus_skills=[
                                priority['skill']
                                for priority in skill_priorities(request.user)[:2]
                            ],
                        )
                except IntegrityError:
                    path = LearningPath.objects.select_for_update().get(
                        user=request.user,
                        status=LearningPath.Status.ACTIVE,
                    )

            existing_items = list(
                LearningPathItem.objects.select_for_update()
                .filter(path=path)
                .order_by('order_no', 'id')
            )
            item = next(
                (candidate for candidate in existing_items
                 if candidate.lesson_id == recommendation.lesson_id),
                None,
            )
            if item is None:
                item = LearningPathItem.objects.create(
                    path=path,
                    lesson=recommendation.lesson,
                    order_no=(path.items.order_by('-order_no').values_list('order_no', flat=True).first() or 0) + 1,
                    status=LearningPathItem.Status.LOCKED,
                    recommendation_score_snapshot=recommendation.recommendation_score,
                    reason_snapshot=recommendation.reason,
                )

                existing_items.append(item)

            ordered_items = existing_items
            ordered_items.remove(item)
            current = next(
                (candidate for candidate in ordered_items if candidate.status in (
                    LearningPathItem.Status.IN_PROGRESS,
                    LearningPathItem.Status.AVAILABLE,
                )),
                None,
            )
            insert_at = ordered_items.index(current) + 1 if current else next(
                (
                    index for index, candidate in enumerate(ordered_items)
                    if candidate.status not in (
                        LearningPathItem.Status.COMPLETED,
                        LearningPathItem.Status.SKIPPED,
                    )
                ),
                len(ordered_items),
            )
            ordered_items.insert(insert_at, item)

            reorder_path_items(path, ordered_items)

            recommendation.status = LessonRecommendation.Status.ACCEPTED
            recommendation.save(update_fields=['status'])
            unlock_next(path)
            _dispatch_lesson_buffer_after_commit(request.user.id)

        path.refresh_from_db()
        return Response(PersonalizedPathSerializer(path).data)


class CurrentPersonalizedPathView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        scoped_generations = GeneratedLesson.objects.filter(
            user=request.user
        ).order_by('-generation_version')
        path = LearningPath.objects.filter(
            user=request.user,
            status=LearningPath.Status.ACTIVE,
        ).prefetch_related(
            Prefetch('items__lesson__contents', queryset=LessonContent.objects.filter(is_active=True).order_by('order_no')),
            Prefetch(
                'items__lesson__generated_versions',
                queryset=scoped_generations,
                to_attr='scoped_generated_versions',
            ),
        ).first()
        return Response(PersonalizedPathSerializer(path).data if path else None)


class GeneratePersonalizedPathView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            with transaction.atomic():
                path = generate_or_extend_path(request.user)
                _dispatch_lesson_buffer_after_commit(request.user.id)
        except LearnerProfile.DoesNotExist:
            return Response(
                {'detail': 'Complete your learner profile before generating a path.'},
                status=status.HTTP_409_CONFLICT,
            )
        except Curriculum.DoesNotExist:
            return Response(
                {'detail': 'No curriculum is available for your selected languages.'},
                status=status.HTTP_409_CONFLICT,
            )
        except MultipleObjectsReturned:
            return Response(
                {'detail': 'The curriculum configuration is ambiguous.'},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(PersonalizedPathSerializer(path).data, status=status.HTTP_201_CREATED)


class PersonalizedPathDetailView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, path_id):
        path = get_object_or_404(LearningPath.objects.prefetch_related('items__lesson'), id=path_id, user=request.user)
        return Response(PersonalizedPathSerializer(path).data)


class PathItemActionView(APIView):
    permission_classes = [IsAuthenticated]
    action = None
    def post(self, request, item_id):
        with transaction.atomic():
            item = get_object_or_404(LearningPathItem.objects.select_for_update().select_related('path'),
                                     id=item_id, path__user=request.user)
            if self.action == 'start':
                if item.status == LearningPathItem.Status.LOCKED:
                    return Response({'detail': 'This lesson is locked.'}, status=403)
                if item.status == LearningPathItem.Status.AVAILABLE:
                    item.status = LearningPathItem.Status.IN_PROGRESS
                    item.started_at = timezone.now()
                    item.save(update_fields=['status', 'started_at'])
            elif self.action == 'skip':
                if item.status not in (
                    LearningPathItem.Status.AVAILABLE,
                    LearningPathItem.Status.IN_PROGRESS,
                ):
                    return Response({'detail': 'This item cannot be skipped.'}, status=409)
                item.status = LearningPathItem.Status.SKIPPED
                item.save(update_fields=['status'])
                unlock_next(item.path)
            else:
                generated = GeneratedLesson.objects.filter(user=request.user, lesson=item.lesson).order_by('-generation_version').first()
                if not generated:
                    return Response({'detail': 'Complete the generated lesson first.'}, status=409)
                return GeneratedLessonCompleteView().post(request, generated.id)
        return Response(PersonalizedPathSerializer(item.path).data)


class PathItemStartView(PathItemActionView): action = 'start'
class PathItemCompleteView(PathItemActionView): action = 'complete'
class PathItemSkipView(PathItemActionView): action = 'skip'


class ProficiencyForecastView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        try:
            days = min(90, max(1, int(request.query_params.get('days', 14))))
            lesson_count = min(20, max(1, int(request.query_params.get('lessons', 2))))
            consistency = min(100, max(0, int(request.query_params.get('consistency', 80))))
            return Response(forecast_learning_scenario(
                request.user, days, lesson_count, consistency,
            ))
        except (TypeError, ValueError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
