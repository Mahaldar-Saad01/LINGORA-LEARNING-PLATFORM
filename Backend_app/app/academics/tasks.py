import logging
import threading
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.db import close_old_connections, transaction
from django.utils import timezone

from accounts.models import LearnerProfile, User
from .models import GeneratedLesson, Lesson, LearningPathItem
# Previous Hugging Face provider (kept for easy rollback):
# from .services.huggingface_client import LessonGenerationError
from .services.groq_client import LessonGenerationError
from .services.lesson_generation import generate_lesson

logger = logging.getLogger(__name__)


def dispatch_lesson_generation(generated_lesson_id):
    """
    Generate without blocking the HTTP request.

    Celery is preferred. Local development still works when Redis is not
    running by executing the same task in a short-lived background thread.
    """
    def publish():
        try:
            generate_lesson_for_user.apply_async(
                args=[generated_lesson_id],
                retry=False,
            )
            return
        except Exception:
            logger.warning(
                'Celery is unavailable; generating lesson %s in-process.',
                generated_lesson_id,
                exc_info=True,
            )

        close_old_connections()
        try:
            generate_lesson_for_user.apply(
                args=[generated_lesson_id],
                throw=False,
            )
        finally:
            close_old_connections()

    threading.Thread(
        target=publish,
        name=f'lesson-generation-{generated_lesson_id}',
        daemon=True,
    ).start()


def dispatch_lesson_buffer(user_id):
    """Publish without holding up an assessment/completion HTTP response."""
    def publish():
        try:
            ensure_lesson_buffer_for_user.apply_async(args=[user_id], retry=False)
        except Exception:
            logger.exception('Could not enqueue lesson buffer for user %s', user_id)

    threading.Thread(
        target=publish,
        name=f'lesson-buffer-{user_id}',
        daemon=True,
    ).start()


@shared_task(bind=True, autoretry_for=(LessonGenerationError,), retry_backoff=True,
             retry_jitter=True, max_retries=3, soft_time_limit=240, time_limit=270)
def generate_lesson_for_user(self, generated_lesson_id):
    with transaction.atomic():
        record = GeneratedLesson.objects.select_for_update().select_related(
            'user', 'lesson__category__level', 'lesson__category__curriculum__target_language',
            'lesson__category__curriculum__explanation_language',
        ).get(pk=generated_lesson_id)
        if record.status == GeneratedLesson.Status.READY and (
            record.expires_at is None or record.expires_at > timezone.now()
        ):
            return record.id
        record.status = GeneratedLesson.Status.GENERATING
        record.generation_started_at = timezone.now()
        record.retry_count = self.request.retries
        record.last_error = ''
        record.validation_errors = []
        record.payload = {}
        record.save(update_fields=['status', 'generation_started_at', 'retry_count', 'last_error', 'validation_errors', 'payload', 'updated_at'])

    try:
        generated = generate_lesson(record.user, record.lesson, generated_lesson=record)
    except Exception as exc:
        validation_errors = [str(exc)] if isinstance(exc, ValueError) else []
        GeneratedLesson.objects.filter(pk=record.pk).update(
            status=GeneratedLesson.Status.FAILED, payload={}, last_error=str(exc)[:4000],
            validation_errors=validation_errors, retry_count=self.request.retries + 1,
        )
        logger.exception('Lesson generation failed for record %s', record.pk)
        # A rate-limit retry should be handled by the periodic retry task.
        # Immediate Celery retries only consume more of the same exhausted
        # quota and delay recovery.
        if (
            isinstance(exc, LessonGenerationError)
            and 'rate limit' not in str(exc).lower()
            and '429' not in str(exc)
        ):
            raise
        return record.id

    now = timezone.now()
    GeneratedLesson.objects.filter(pk=generated.pk).update(
        status=GeneratedLesson.Status.READY, generated_at=now,
        expires_at=now + timedelta(seconds=settings.LESSON_GENERATION_TTL_SECONDS),
        last_error='', validation_errors=[],
    )
    try:
        from notifications.tasks import send_lesson_ready_notifications
        send_lesson_ready_notifications.delay(user_id=generated.user_id, generated_lesson_id=generated.pk)
    except Exception:
        logger.exception("Failed to dispatch lesson ready notification for lesson %s", generated.pk)
    return generated.pk


@shared_task
def ensure_lesson_buffer_for_user(user_id):
    queued_ids = []
    with transaction.atomic():
        profile = LearnerProfile.objects.select_for_update().filter(user_id=user_id).first()
        if not profile or not all((profile.known_language_id, profile.target_language_id, profile.current_level_id)):
            logger.warning('Cannot prepare lessons for user %s: incomplete learner profile', user_id)
            return []
        path_lessons = list(LearningPathItem.objects.filter(
            path__user_id=user_id, path__status='active',
            status__in=['available', 'in_progress', 'locked'],
        ).select_related('lesson').order_by('order_no')[:settings.ADAPTIVE_GENERATION_BUFFER])
        lessons = [item.lesson for item in path_lessons] or list(Lesson.objects.filter(
            is_active=True, category__level=profile.current_level,
            category__curriculum__target_language=profile.target_language,
            category__curriculum__explanation_language=profile.known_language,
        ).order_by('category__order_no', 'order_no', 'pk'))
        completed = set(GeneratedLesson.objects.filter(
            user_id=user_id, completed_at__isnull=False
        ).values_list('lesson_id', flat=True))
        # Prepare deterministic pairs: assessment -> lessons 1-2,
        # one completed lesson -> lessons 3-4, two -> lessons 5-6, etc.
        pair_start = 0 if path_lessons else len(completed) * 2
        candidates = lessons[pair_start:pair_start + settings.ADAPTIVE_GENERATION_BUFFER]
        now = timezone.now()
        from .services.adaptive_learning import skill_priorities
        weak_skills = [item['skill'] for item in skill_priorities(profile.user)[:3]]
        for lesson in candidates:
            record, created = GeneratedLesson.objects.select_for_update().get_or_create(
                user_id=user_id, lesson=lesson, generation_version=settings.LESSON_GENERATION_VERSION,
                defaults={'status': GeneratedLesson.Status.QUEUED, 'queued_at': now,
                          'prompt_version': settings.LESSON_PROMPT_VERSION,
                          'personalization_context': {
                              'weak_skills': weak_skills,
                              'selected_lesson_objectives': lesson.learning_objectives,
                          }},
            )
            retryable = record.status == GeneratedLesson.Status.FAILED and record.retry_count < settings.LESSON_GENERATION_MAX_RETRIES
            expired = record.status == GeneratedLesson.Status.READY and record.expires_at and record.expires_at <= now
            if created or retryable or expired:
                record.status = GeneratedLesson.Status.QUEUED
                record.queued_at = now
                record.payload = {} if expired else record.payload
                record.save(update_fields=['status', 'queued_at', 'payload', 'updated_at'])
                queued_ids.append(record.id)
        transaction.on_commit(lambda: [generate_lesson_for_user.delay(pk) for pk in queued_ids])
    return queued_ids


@shared_task
def retry_failed_lesson_generations():
    user_ids = User.objects.filter(
        generated_lessons__status=GeneratedLesson.Status.FAILED,
        generated_lessons__retry_count__lt=settings.LESSON_GENERATION_MAX_RETRIES,
    ).values_list('id', flat=True).distinct()
    for user_id in user_ids:
        ensure_lesson_buffer_for_user.delay(user_id)
