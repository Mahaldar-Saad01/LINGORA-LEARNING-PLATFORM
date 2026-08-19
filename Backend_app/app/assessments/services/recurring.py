import hashlib
import json
import random
from collections import defaultdict
from datetime import timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import LearnerProfile
from academics.models import GeneratedLesson, Lesson
from academics.services.answer_display import canonical_answer, format_activity_answer, question_display
from academics.services.speaking_practice import score_speaking_answer
from progress.models import LearningStats
from . import first_assessment  # noqa: F401 - keeps placement services explicitly separate
from assessments.models import BadgeDefinition, RecurringAssessment, RecurringAssessmentAnswer, UserBadge


ASSESSMENT_CONFIG = {
    'daily': {'questions': 6, 'xp': 15, 'minutes': '3-5'},
    'weekly': {'questions': 15, 'xp': 60, 'minutes': '10-15'},
    'monthly': {'questions': 30, 'xp': 150, 'minutes': '20-30'},
}
SUPPORTED_TYPES = {
    'fill_in_the_blank', 'listen_and_select', 'sentence_completion',
    'matching_words', 'word_arrangement', 'speaking_practice',
    'translate_sentence', 'multiple_choice', 'reading_comprehension',
}


def assessment_timezone(user):
    name = getattr(user, 'timezone', None) or settings.TIME_ZONE
    try:
        return name, ZoneInfo(name)
    except ZoneInfoNotFoundError:
        return settings.TIME_ZONE, ZoneInfo(settings.TIME_ZONE)


def period_details(assessment_type, moment=None, timezone_name=None):
    if assessment_type not in ASSESSMENT_CONFIG:
        raise ValidationError({'type': 'Use daily, weekly, or monthly.'})
    zone = ZoneInfo(timezone_name or settings.TIME_ZONE)
    local = (moment or timezone.now()).astimezone(zone)
    day = local.date()
    if assessment_type == 'daily':
        return day.isoformat(), day, day
    if assessment_type == 'weekly':
        start = day - timedelta(days=day.weekday())
        iso_year, iso_week, _ = day.isocalendar()
        return f'{iso_year}-W{iso_week:02d}', start, start + timedelta(days=6)
    start = day.replace(day=1)
    next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    return day.strftime('%Y-%m'), start, next_month - timedelta(days=1)


def _valid_activity(activity):
    return (isinstance(activity, dict) and activity.get('activity_type') in SUPPORTED_TYPES
            and activity.get('id') and isinstance(activity.get('content'), dict))


def _activity_pool(user):
    try:
        learner = LearnerProfile.objects.select_related(
            'target_language', 'known_language', 'current_level').get(user=user)
    except LearnerProfile.DoesNotExist as exc:
        raise ValidationError('Complete your learner profile before starting assessments.') from exc
    lessons = list(Lesson.objects.filter(
        is_active=True, category__curriculum__target_language=learner.target_language,
        category__curriculum__explanation_language=learner.known_language,
        category__level=learner.current_level,
    ).select_related('category').prefetch_related('contents'))
    generated = GeneratedLesson.objects.filter(
        user=user, lesson_id__in=[item.id for item in lessons], status=GeneratedLesson.Status.READY,
    ).order_by('lesson_id', '-generation_version')
    generated_by_lesson = {}
    for item in generated:
        generated_by_lesson.setdefault(item.lesson_id, item.payload.get('activities', []))
    pool = []
    seen = set()
    for lesson in lessons:
        activities = generated_by_lesson.get(lesson.id)
        if not activities:
            content = next((item for item in lesson.contents.all() if item.is_active), None)
            activities = content.fallback_activities if content else []
        for activity in activities or []:
            stable_id = f'lesson_{lesson.id}_{activity.get("id", "")}'
            if stable_id in seen or not _valid_activity(activity):
                continue
            snapshot = json.loads(json.dumps(activity))
            snapshot['id'] = stable_id
            snapshot['source_lesson_id'] = lesson.id
            pool.append(snapshot)
            seen.add(stable_id)
    return pool


def _select_questions(pool, count, seed):
    if len(pool) < count:
        raise ValidationError(
            f'Only {len(pool)} valid activities are available; this assessment requires {count}.')
    grouped = defaultdict(list)
    for item in pool:
        grouped[item.get('skill') or 'general'].append(item)
    rng = random.Random(int(hashlib.sha256(seed.encode()).hexdigest(), 16))
    for values in grouped.values():
        rng.shuffle(values)
    skills = sorted(grouped)
    chosen = []
    while len(chosen) < count:
        progressed = False
        for skill in skills:
            if grouped[skill] and len(chosen) < count:
                chosen.append(grouped[skill].pop())
                progressed = True
        if not progressed:
            break
    rng.shuffle(chosen)
    return chosen


def get_or_create_current(user, assessment_type):
    timezone_name, _zone = assessment_timezone(user)
    period_key, start, end = period_details(assessment_type, timezone_name=timezone_name)
    existing = RecurringAssessment.objects.filter(
        user=user, assessment_type=assessment_type, period_key=period_key).first()
    if existing:
        return existing
    config = ASSESSMENT_CONFIG[assessment_type]
    questions = _select_questions(_activity_pool(user), config['questions'], f'{user.pk}:{assessment_type}:{period_key}')
    assessment, _ = RecurringAssessment.objects.get_or_create(
        user=user, assessment_type=assessment_type, period_key=period_key,
        defaults={'local_period_start': start, 'local_period_end': end, 'timezone_name': timezone_name,
                  'question_snapshot': questions, 'question_count': len(questions)})
    return assessment


def public_question(question):
    private = {'correct_answer', 'accepted_answers'}
    private_content = {'correct_option_id', 'correct_answers', 'correct_pairs', 'correct_order', 'accepted_sentences'}
    return {**{key: value for key, value in question.items() if key not in private},
            'content': {key: value for key, value in question.get('content', {}).items() if key not in private_content}}


def serialize_assessment(assessment, include_results=False):
    answers = {item.activity_id: item for item in assessment.answers.all()}
    questions = assessment.question_snapshot if include_results else [public_question(item) for item in assessment.question_snapshot]
    data = {'id': assessment.id, 'assessment_type': assessment.assessment_type,
            'period_key': assessment.period_key, 'status': assessment.status,
            'question_count': assessment.question_count, 'questions': questions,
            'answers': [{'activity_id': item.activity_id, 'answer': item.answer}
                        for item in answers.values()], 'started_at': assessment.started_at}
    if include_results and assessment.status == RecurringAssessment.Status.COMPLETED:
        data.update(serialize_result(assessment))
    return data


def start_assessment(assessment):
    if assessment.status == RecurringAssessment.Status.AVAILABLE:
        assessment.status = RecurringAssessment.Status.IN_PROGRESS
        assessment.started_at = timezone.now()
        assessment.save(update_fields=['status', 'started_at', 'updated_at'])
    return assessment


def _score(question, answer):
    activity_type = question.get('activity_type')
    if activity_type == 'speaking_practice':
        stored, score, correct = score_speaking_answer(question, answer)
        return stored, score, None if stored.get('was_manually_confirmed') else correct, {'unverified': score is None}
    trusted = canonical_answer(question)
    if activity_type == 'fill_in_the_blank':
        submitted = str((answer or {}).get('value', '')).strip().casefold()
        accepted = [str(value).strip().casefold() for value in question.get('content', {}).get('correct_answers', [])]
        correct = bool(submitted and submitted in accepted)
    else:
        correct = answer == trusted
    return answer, 100 if correct else 0, correct, {}


def save_answer(assessment, activity_id, answer):
    if assessment.status == RecurringAssessment.Status.COMPLETED:
        raise ValidationError('Completed assessments are read-only.')
    if len(json.dumps(answer, ensure_ascii=False)) > 20000:
        raise ValidationError({'answer': 'Answer is too large.'})
    question = next((item for item in assessment.question_snapshot if item.get('id') == activity_id), None)
    if not question:
        raise ValidationError({'activity_id': 'Question is not part of this assessment.'})
    stored, score, correct, details = _score(question, answer)
    return RecurringAssessmentAnswer.objects.update_or_create(
        assessment=assessment, activity_id=activity_id,
        defaults={'activity_type': question.get('activity_type', ''), 'skill': question.get('skill', ''),
                  'answer': stored, 'score': score, 'is_correct': correct, 'scoring_details': details})[0]


def _daily_run(user, through_date):
    dates = set(RecurringAssessment.objects.filter(
        user=user, assessment_type='daily', status='completed',
        local_period_start__lte=through_date).values_list('local_period_start', flat=True))
    run = 0
    day = through_date
    while day in dates:
        run += 1
        day -= timedelta(days=1)
    return run


def _award_badges(assessment):
    codes = []
    score = float(assessment.score or 0)
    daily_run = _daily_run(assessment.user, assessment.local_period_start)
    if assessment.assessment_type == 'daily':
        codes += ['first_step']
        if daily_run >= 3: codes += ['three_day_momentum']
        if daily_run >= 7: codes += ['consistent_learner']
        if score == 100: codes += ['perfect_day']
        month_count = RecurringAssessment.objects.filter(
            user=assessment.user, assessment_type='daily', status='completed',
            local_period_start__year=assessment.local_period_start.year,
            local_period_start__month=assessment.local_period_start.month).count()
        if month_count >= 20: codes += ['full_month']
    elif assessment.assessment_type == 'weekly':
        codes += ['weekly_reviewer']
        if score >= 80: codes += ['strong_week']
    else:
        codes += ['monthly_explorer']
        if score >= 80: codes += ['monthly_mastery']
    new = []
    for badge in BadgeDefinition.objects.filter(code__in=codes, is_active=True):
        award, created = UserBadge.objects.get_or_create(
            user=assessment.user, badge=badge, source_key='once',
            defaults={'source_type': assessment.assessment_type, 'metadata': {'period_key': assessment.period_key}})
        if created:
            new.append({'code': badge.code, 'name': badge.name, 'description': badge.description, 'icon': badge.icon,
                        'earned_at': award.earned_at})
    return new


@transaction.atomic
def complete_assessment(assessment_id, user):
    assessment = RecurringAssessment.objects.select_for_update().get(id=assessment_id, user=user)
    if assessment.status == RecurringAssessment.Status.COMPLETED:
        return assessment, [], False
    answers = list(assessment.answers.all())
    if len(answers) < assessment.question_count:
        raise ValidationError(f'Answer all {assessment.question_count} questions before completing the assessment.')
    graded = [item for item in answers if item.is_correct is not None]
    assessment.attempted_count = len(answers)
    assessment.correct_count = sum(item.is_correct for item in graded)
    assessment.score = round(assessment.correct_count / max(1, len(graded)) * 100, 2)
    assessment.duration_seconds = max(0, int((timezone.now() - (assessment.started_at or assessment.created_at)).total_seconds()))
    config = ASSESSMENT_CONFIG[assessment.assessment_type]
    stats, _ = LearningStats.objects.select_for_update().get_or_create(user=user)
    local_today = timezone.now().astimezone(ZoneInfo(assessment.timezone_name)).date()
    streak_extended = stats.last_activity_date != local_today
    if streak_extended:
        stats.current_streak = stats.current_streak + 1 if stats.last_activity_date == local_today - timedelta(days=1) else 1
        stats.last_activity_date = local_today
        stats.longest_streak = max(stats.longest_streak, stats.current_streak)
    stats.total_xp += config['xp']
    stats.save(update_fields=['total_xp', 'current_streak', 'longest_streak', 'last_activity_date', 'updated_at'])
    assessment.status = RecurringAssessment.Status.COMPLETED
    assessment.completed_at = timezone.now()
    assessment.xp_awarded = config['xp']
    assessment.reward_claimed = True
    assessment.save()
    return assessment, _award_badges(assessment), streak_extended


def serialize_result(assessment, new_badges=None, streak_extended=False):
    by_skill = defaultdict(lambda: {'attempted': 0, 'graded': 0, 'correct': 0})
    mistakes = []
    questions = {item.get('id'): item for item in assessment.question_snapshot}
    for answer in assessment.answers.all():
        skill = answer.skill or 'general'
        by_skill[skill]['attempted'] += 1
        if answer.is_correct is not None:
            by_skill[skill]['graded'] += 1
            by_skill[skill]['correct'] += int(answer.is_correct)
        question = questions.get(answer.activity_id, {})
        if answer.is_correct is False:
            trusted = canonical_answer(question)
            mistakes.append({'activity_id': answer.activity_id, 'activity_type': answer.activity_type,
                             'skill': skill, 'question_display': question_display(question),
                             'user_answer_display': format_activity_answer(question, answer.answer),
                             'correct_answer_display': format_activity_answer(question, trusted, correct=True)})
    skills = [{'skill': skill, **values,
               'score': round(values['correct'] / max(1, values['graded']) * 100)}
              for skill, values in sorted(by_skill.items())]
    return {'score': float(assessment.score or 0), 'correct_count': assessment.correct_count,
            'attempted_count': assessment.attempted_count, 'duration_seconds': assessment.duration_seconds,
            'xp_awarded': assessment.xp_awarded, 'streak_extended': streak_extended,
            'skills': skills, 'mistakes': mistakes, 'new_badges': new_badges or []}


def status_payload(user):
    timezone_name, zone = assessment_timezone(user)
    today = timezone.now().astimezone(zone).date()
    stats, _ = LearningStats.objects.get_or_create(user=user)
    result = {'streak': {'current': stats.current_streak, 'longest': stats.longest_streak,
                         'completed_today': stats.last_activity_date == today}}
    for assessment_type, config in ASSESSMENT_CONFIG.items():
        item = get_or_create_current(user, assessment_type)
        result[assessment_type] = {'available': True, 'completed': item.status == 'completed',
                                   'status': item.status, 'assessment_id': item.id,
                                   'period_key': item.period_key, 'period_ends_at': item.local_period_end,
                                   'reward_xp': config['xp'], 'question_count': item.question_count,
                                   'estimated_minutes': config['minutes']}
    result['recent_badges'] = serialize_badges(UserBadge.objects.filter(user=user).select_related('badge')[:4])
    return result


def serialize_badges(awards):
    return [{'code': item.badge.code, 'name': item.badge.name, 'description': item.badge.description,
             'icon': item.badge.icon, 'earned_at': item.earned_at,
             'source_type': item.source_type} for item in awards]
