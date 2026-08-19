from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from accounts.models import LearnerProfile
from academics.models import (
    ActivityAttempt, GeneratedLesson, LearnerSkillProfile, LearningPath,
    LearningPathItem, Lesson, LessonRecommendation, SKILLS, SkillHistory,
)


ACTIVITY_SKILLS = {
    'listen_and_select': 'listening', 'speaking_practice': 'speaking',
    'translate_sentence': 'vocabulary', 'matching_words': 'vocabulary',
    'fill_in_the_blank': 'grammar', 'sentence_completion': 'grammar',
    'word_arrangement': 'writing',
}

FORECAST_SKILLS = tuple(SKILLS)
ACTIVITY_SKILL_MAP = {
    'lesson_overview': (),
    'fill_in_the_blank': ('writing', 'grammar', 'vocabulary'),
    'listen_and_select': ('listening', 'vocabulary'),
    'sentence_completion': ('writing', 'grammar'),
    'matching_words': ('vocabulary', 'reading'),
    'word_arrangement': ('grammar', 'writing'),
    'speaking_practice': ('speaking', 'vocabulary'),
    'translate_sentence': ('writing', 'reading', 'grammar'),
}
LESSON_SKILL_GAIN_WEIGHT = 2.0
ACTIVITY_EXPOSURE_GAIN_WEIGHT = 0.5
MAX_SKILL_GAIN = 15.0
RECENT_ATTEMPT_LIMIT = 20


def clamp(value):
    return round(max(0.0, min(100.0, float(value))), 2)


def initialize_skill_profile(user, overall, skill_scores=None, source='assessment'):
    skill_scores = skill_scores or {}
    defaults = {f'{skill}_score': clamp(skill_scores.get(skill, overall)) for skill in SKILLS}
    defaults.update(overall_score=clamp(overall), confidence=30, last_recalculated_at=timezone.now())
    profile, created = LearnerSkillProfile.objects.get_or_create(user=user, defaults=defaults)
    if created:
        SkillHistory.objects.bulk_create([
            SkillHistory(user=user, skill=skill, previous_score=defaults[f'{skill}_score'],
                         new_score=defaults[f'{skill}_score'], score_change=0,
                         source_type=source, metadata={'initialization': True})
            for skill in SKILLS
        ])
    return profile


def attempt_score(attempt):
    if attempt.skipped:
        return 0.0
    if attempt.normalized_score is not None:
        return float(attempt.normalized_score)
    if attempt.pronunciation_score is not None:
        return clamp(attempt.pronunciation_score)
    if attempt.writing_score is not None:
        return clamp(attempt.writing_score * 10 if attempt.writing_score <= 10 else attempt.writing_score)
    return 100.0 if attempt.is_correct else 0.0


def recalculate_after_lesson(user, generated):
    profile, _ = LearnerSkillProfile.objects.select_for_update().get_or_create(user=user)
    attempts = list(generated.attempts.exclude(activity_type='lesson_overview').order_by('-updated_at'))
    grouped = defaultdict(list)
    for attempt in attempts:
        skill = attempt.skill if attempt.skill in SKILLS else ACTIVITY_SKILLS.get(attempt.activity_type)
        if skill:
            grouped[skill].append(attempt_score(attempt))
    recent_weight = float(getattr(settings, 'ADAPTIVE_RECENT_WEIGHT', .30))
    for skill, scores in grouped.items():
        # Exponential recency weighting within this completion.
        weights = [0.8 ** index for index in range(len(scores))]
        performance = sum(score * weight for score, weight in zip(scores, weights)) / sum(weights)
        field = f'{skill}_score'
        previous = float(getattr(profile, field))
        new = clamp(previous * (1 - recent_weight) + performance * recent_weight)
        setattr(profile, field, new)
        if abs(new - previous) >= .01:
            SkillHistory.objects.create(
                user=user, skill=skill, previous_score=previous, new_score=new,
                score_change=new - previous, source_type=SkillHistory.Source.LESSON,
                source_lesson=generated.lesson,
                metadata={'generated_lesson_id': generated.id, 'observations': len(scores),
                          'recent_performance': round(performance, 2)},
            )
    profile.overall_score = clamp(sum(float(getattr(profile, f'{s}_score')) for s in SKILLS) / len(SKILLS))
    profile.confidence = clamp(min(95, 20 + profile.total_activity_attempts * 2))
    profile.total_completed_lessons += 1
    profile.total_activity_attempts += len(attempts)
    profile.last_recalculated_at = timezone.now()
    profile.save()
    return profile


def skill_priorities(user):
    profile, _ = LearnerSkillProfile.objects.get_or_create(user=user)
    attempts = list(ActivityAttempt.objects.filter(user=user).order_by('-updated_at')[:100])
    result = []
    for skill in SKILLS:
        relevant = [a for a in attempts if (a.skill or ACTIVITY_SKILLS.get(a.activity_type)) == skill][:20]
        scores = [attempt_score(a) for a in relevant]
        recent = sum(scores[:5]) / len(scores[:5]) if scores[:5] else float(getattr(profile, f'{skill}_score'))
        older = sum(scores[5:]) / len(scores[5:]) if scores[5:] else recent
        current = float(getattr(profile, f'{skill}_score'))
        skipped = sum(a.skipped for a in relevant) / max(1, len(relevant))
        repeated = sum(a.attempt_count > 1 and not a.is_correct for a in relevant) / max(1, len(relevant))
        slow = sum(a.response_time_ms > 90000 for a in relevant) / max(1, len(relevant))
        priority = clamp((100-current)*.50 + (100-recent)*.20 + max(0, older-recent)*.10 +
                         skipped*100*.08 + repeated*100*.08 + slow*100*.04)
        reasons = []
        if current < 50: reasons.append('LOW_CURRENT_SCORE')
        if recent < older - 5: reasons.append('DECLINING_TREND')
        if repeated >= .2: reasons.append('REPEATED_INCORRECT_ATTEMPTS')
        if skipped >= .2: reasons.append('FREQUENT_SKIPS')
        result.append({'skill': skill, 'priority_score': priority, 'current_score': current,
                       'trend': 'declining' if recent < older - 5 else 'improving' if recent > older + 5 else 'stable',
                       'observations': len(relevant), 'reason_codes': reasons or ['LIMITED_EVIDENCE']})
    return sorted(result, key=lambda item: (-item['priority_score'], item['skill']))


def refresh_recommendations(user, limit=10):
    learner = LearnerProfile.objects.select_related('target_language', 'known_language', 'current_level').get(user=user)
    profile, _ = LearnerSkillProfile.objects.get_or_create(user=user)
    priorities = {p['skill']: p for p in skill_priorities(user)}
    completed = set(GeneratedLesson.objects.filter(user=user, completed_at__isnull=False).values_list('lesson_id', flat=True))
    candidates = Lesson.objects.filter(
        is_active=True, category__curriculum__target_language=learner.target_language,
        category__curriculum__explanation_language=learner.known_language,
        minimum_recommended_proficiency__lte=profile.overall_score,
        maximum_recommended_proficiency__gte=profile.overall_score,
    ).select_related('category__level', 'category__curriculum').prefetch_related('prerequisite_links')
    ranked = []
    for lesson in candidates:
        if lesson.id in completed:
            continue
        mandatory = [link.prerequisite_id for link in lesson.prerequisite_links.all() if link.is_mandatory]
        if any(pk not in completed for pk in mandatory):
            continue
        lesson_skills = [s for s in lesson.skills if s in priorities]
        primary = max(lesson_skills, key=lambda s: priorities[s]['priority_score'], default=priorities[next(iter(priorities))]['skill'])
        weakness = priorities[primary]['priority_score']
        level_gap = abs(float(profile.overall_score) - (lesson.category.level.min_score + lesson.category.level.max_score) / 2)
        difficulty = max(0, 100-level_gap*2)
        mistake = min(100, ActivityAttempt.objects.filter(user=user, is_correct=False, skill=primary).count()*15)
        goal = 100 if primary in ('speaking', 'vocabulary') and user.motivation in ('tp', 'cp') else 50
        score = clamp(weakness*.40 + 100*.20 + mistake*.15 + difficulty*.15 + goal*.10)
        ranked.append((score, lesson, primary, {'summary': f'Build {primary} with a level-appropriate lesson.',
                       'factors': {'skill_weakness': weakness, 'prerequisite_readiness': 100,
                                   'mistake_relevance': mistake, 'difficulty_suitability': difficulty, 'goal_relevance': goal}}))
    ranked.sort(key=lambda row: (-row[0], row[1].category.order_no, row[1].order_no))
    now = timezone.now()
    with transaction.atomic():
        LessonRecommendation.objects.filter(
            user=user,
            status=LessonRecommendation.Status.PENDING,
            expires_at__lte=now,
        ).update(status=LessonRecommendation.Status.EXPIRED)
        records = []
        for priority, (score, lesson, primary, reason) in enumerate(ranked[:limit], 1):
            record, _ = LessonRecommendation.objects.update_or_create(
                user=user,
                lesson=lesson,
                engine_version='deterministic_v1',
                status=LessonRecommendation.Status.PENDING,
                defaults={'recommendation_score': score, 'priority': priority, 'primary_skill': primary,
                          'reason': reason, 'expires_at': now + timedelta(days=7)})
            records.append(record)
    return records


def generate_or_extend_path(user):
    learner = LearnerProfile.objects.select_related('target_language', 'known_language').get(user=user)
    curriculum = learner.target_language.target_curricula.get(explanation_language=learner.known_language)
    recommendations = refresh_recommendations(user)
    focus = [p['skill'] for p in skill_priorities(user)[:2]]
    path, _ = LearningPath.objects.get_or_create(
        user=user,
        curriculum=curriculum,
        status=LearningPath.Status.ACTIVE,
        defaults={'title': f'Personalized {curriculum.title}', 'focus_skills': focus})
    existing = set(path.items.values_list('lesson_id', flat=True))
    next_order = (path.items.aggregate(value=Max('order_no'))['value'] or 0) + 1
    target = int(getattr(settings, 'ADAPTIVE_PATH_LENGTH', 7))
    for recommendation in recommendations:
        if path.items.exclude(status__in=[
            LearningPathItem.Status.COMPLETED,
            LearningPathItem.Status.SKIPPED,
        ]).count() >= target:
            break
        if recommendation.lesson_id not in existing:
            LearningPathItem.objects.create(
                path=path, lesson=recommendation.lesson, order_no=next_order,
                status=LearningPathItem.Status.LOCKED,
                recommendation_score_snapshot=recommendation.recommendation_score,
                reason_snapshot=recommendation.reason)
            existing.add(recommendation.lesson_id); next_order += 1
    unlock_next(path)
    return path


def unlock_next(path):
    completed = set(GeneratedLesson.objects.filter(user=path.user, completed_at__isnull=False).values_list('lesson_id', flat=True))
    open_item = path.items.filter(status__in=[
        LearningPathItem.Status.AVAILABLE,
        LearningPathItem.Status.IN_PROGRESS,
    ]).first()
    if open_item:
        return open_item
    for item in path.items.filter(
        status=LearningPathItem.Status.LOCKED
    ).select_related('lesson'):
        required = set(item.lesson.prerequisite_links.filter(is_mandatory=True).values_list('prerequisite_id', flat=True))
        preceding_done = not path.items.filter(
            order_no__lt=item.order_no
        ).exclude(status__in=[
            LearningPathItem.Status.COMPLETED,
            LearningPathItem.Status.SKIPPED,
        ]).exists()
        if required <= completed and preceding_done:
            item.status = LearningPathItem.Status.AVAILABLE
            item.save(update_fields=['status'])
            return item
    return None


def forecast(user, skill, days):
    if skill not in SKILLS:
        raise ValueError('Unsupported skill.')
    profile, _ = LearnerSkillProfile.objects.get_or_create(user=user)
    current = float(getattr(profile, f'{skill}_score'))
    attempts = list(ActivityAttempt.objects.filter(user=user, skill=skill).order_by('-updated_at')[:10])
    recent = sum(attempt_score(a) for a in attempts) / len(attempts) if attempts else current
    planned = sum(
        skill in item.lesson.skills
        for item in LearningPathItem.objects.filter(
            path__user=user,
            path__status=LearningPath.Status.ACTIVE,
            status__in=[
                LearningPathItem.Status.LOCKED,
                LearningPathItem.Status.AVAILABLE,
                LearningPathItem.Status.IN_PROGRESS,
            ],
        ).select_related('lesson')
    )
    gain = min(15, planned * 1.2 * min(days, 30) / 14 + (recent-current)*.15)
    predicted = clamp(current + gain)
    margin = 5 if len(attempts) >= 8 else 9
    return {'skill': skill, 'current_score': current, 'predicted_score': predicted,
            'predicted_range': {'minimum': clamp(predicted-margin), 'maximum': clamp(predicted+margin)},
            'forecast_days': days, 'method': 'rule_based_v1',
            'confidence': 'high' if len(attempts) >= 15 else 'medium' if len(attempts) >= 6 else 'low',
            'factors': [f'{planned} planned {skill} lessons', f'{len(attempts)} recent observations'],
            'is_estimate': True}


def _forecast_lessons(user, lesson_count):
    """Return accessible lessons in path, recommendation, then curriculum order."""
    completed = set(GeneratedLesson.objects.filter(
        user=user, completed_at__isnull=False,
    ).values_list('lesson_id', flat=True))
    selected = []
    seen = set(completed)
    inaccessible_path_lessons = set(LearningPathItem.objects.filter(
        path__user=user, path__status=LearningPath.Status.ACTIVE,
        status=LearningPathItem.Status.LOCKED,
    ).values_list('lesson_id', flat=True))

    def add(lessons):
        for lesson in lessons:
            if lesson.id not in seen and lesson.id not in inaccessible_path_lessons and len(selected) < lesson_count:
                selected.append(lesson)
                seen.add(lesson.id)

    add(Lesson.objects.filter(
        path_items__path__user=user,
        path_items__path__status=LearningPath.Status.ACTIVE,
        path_items__status__in=[LearningPathItem.Status.AVAILABLE, LearningPathItem.Status.IN_PROGRESS],
        is_active=True,
    ).order_by('path_items__order_no').prefetch_related('contents', 'prerequisite_links'))

    recommendations = Lesson.objects.filter(
        recommendations__user=user,
        recommendations__status=LessonRecommendation.Status.PENDING,
        recommendations__expires_at__gt=timezone.now(), is_active=True,
    ).order_by('recommendations__priority').prefetch_related('contents', 'prerequisite_links')
    for lesson in recommendations:
        required = {link.prerequisite_id for link in lesson.prerequisite_links.all() if link.is_mandatory}
        if required <= completed:
            add([lesson])

    try:
        learner = LearnerProfile.objects.select_related('target_language', 'known_language').get(user=user)
    except LearnerProfile.DoesNotExist as exc:
        raise ValueError('A learner profile is required to create a forecast.') from exc
    if learner.target_language_id and learner.known_language_id:
        curriculum = Lesson.objects.filter(
            is_active=True,
            category__curriculum__target_language=learner.target_language,
            category__curriculum__explanation_language=learner.known_language,
        ).order_by('category__order_no', 'order_no').prefetch_related('contents', 'prerequisite_links')
        for lesson in curriculum:
            required = {link.prerequisite_id for link in lesson.prerequisite_links.all() if link.is_mandatory}
            if required <= completed:
                add([lesson])
            if len(selected) >= lesson_count:
                break
    return selected


def _lesson_activities(user, lessons):
    generated = GeneratedLesson.objects.filter(
        user=user, lesson_id__in=[lesson.id for lesson in lessons], status=GeneratedLesson.Status.READY,
    ).order_by('lesson_id', '-generation_version')
    payload_by_lesson = {}
    for item in generated:
        payload_by_lesson.setdefault(item.lesson_id, item.payload.get('activities', []))
    result = {}
    generated_count = 0
    for lesson in lessons:
        activities = payload_by_lesson.get(lesson.id)
        if activities:
            generated_count += 1
        else:
            content = next((item for item in lesson.contents.all() if item.is_active), None)
            activities = content.fallback_activities if content else []
        if not activities:
            activities = [{'activity_type': value} for value in lesson.allowed_activity_types]
        result[lesson.id] = activities
    return result, generated_count


def _exposures(user, lessons):
    lesson_counts = defaultdict(int)
    activity_counts = defaultdict(int)
    activity_names = defaultdict(set)
    explicit_metadata = 0
    activities_by_lesson, generated_count = _lesson_activities(user, lessons)
    for lesson in lessons:
        lesson_skills = {str(value).lower() for value in lesson.skills if str(value).lower() in FORECAST_SKILLS}
        if lesson_skills:
            explicit_metadata += 1
        for skill in lesson_skills:
            lesson_counts[skill] += 1
        for activity in activities_by_lesson[lesson.id]:
            activity_type = str(activity.get('activity_type', '')).lower()
            if activity_type == 'lesson_overview':
                continue
            mapped = set(ACTIVITY_SKILL_MAP.get(activity_type, ()))
            explicit_skill = str(activity.get('skill', '')).lower()
            if explicit_skill in FORECAST_SKILLS:
                mapped.add(explicit_skill)
            for skill in mapped:
                activity_counts[skill] += 1
                activity_names[skill].add(activity_type.replace('_', ' '))
    return lesson_counts, activity_counts, activity_names, explicit_metadata, generated_count


def _confidence(attempt_count, completed_count, lesson_count, explicit_count, generated_count):
    metadata_ratio = explicit_count / max(1, lesson_count)
    if attempt_count >= 12 and completed_count >= 4 and metadata_ratio >= .75 and generated_count:
        return 'high'
    if attempt_count >= 4 and completed_count >= 1 and metadata_ratio >= .5:
        return 'medium'
    return 'low'


def _uncertainty(confidence, attempt_count, consistency, metadata_complete):
    margin = {'low': 8, 'medium': 5, 'high': 3}[confidence]
    if attempt_count < 4:
        margin += 2
    if consistency < 70:
        margin += 2
    if not metadata_complete:
        margin += 1
    return margin


def _reason(skill, lesson_exposure, activity_exposure, activity_names):
    if not lesson_exposure and not activity_exposure:
        return f'No selected upcoming lesson directly targets {skill}, so no major improvement is projected.'
    details = []
    if lesson_exposure:
        details.append(f'{lesson_exposure} selected {"lesson" if lesson_exposure == 1 else "lessons"}')
    if activity_exposure:
        details.append(f'{activity_exposure} relevant activities ({", ".join(sorted(activity_names)[:3])})')
    return f'The scenario includes {" and ".join(details)} supporting {skill}.'


def forecast_learning_scenario(user, days, lesson_count, consistency_percentage):
    """Build a deterministic projection from accessible lessons and recent evidence."""
    profile, _ = LearnerSkillProfile.objects.get_or_create(user=user)
    lessons = _forecast_lessons(user, lesson_count)
    lesson_exp, activity_exp, activity_names, explicit_count, generated_count = _exposures(user, lessons)
    attempts = list(ActivityAttempt.objects.filter(user=user).order_by('-updated_at')[:RECENT_ATTEMPT_LIMIT])
    recent_average = sum(attempt_score(item) for item in attempts) / len(attempts) if attempts else None
    performance_factor = 1.0 if recent_average is None else min(1.25, max(.6, recent_average / 75))
    completed_count = GeneratedLesson.objects.filter(user=user, completed_at__isnull=False).count()
    confidence = _confidence(len(attempts), completed_count, len(lessons), explicit_count, generated_count)
    consistency_factor = consistency_percentage / 100
    time_factor = min(1.5, max(.5, days / 14))
    skills = []
    for skill in FORECAST_SKILLS:
        current = clamp(getattr(profile, f'{skill}_score'))
        base_gain = lesson_exp[skill] * LESSON_SKILL_GAIN_WEIGHT + activity_exp[skill] * ACTIVITY_EXPOSURE_GAIN_WEIGHT
        saturation_factor = max(.2, 1 - current / 120)
        gain = min(MAX_SKILL_GAIN, base_gain * consistency_factor * performance_factor * time_factor * saturation_factor)
        improvement = max(1, round(gain)) if gain > 0 else 0
        predicted = int(round(clamp(current + improvement)))
        current_rounded = int(round(current))
        margin = _uncertainty(confidence, len(attempts), consistency_percentage, explicit_count == len(lessons))
        skills.append({
            'skill': skill, 'current_score': current_rounded, 'predicted_score': predicted,
            'improvement': predicted - current_rounded,
            'predicted_range': {'minimum': max(0, predicted - margin), 'maximum': min(100, predicted + margin)},
            'lesson_exposure': lesson_exp[skill], 'activity_exposure': activity_exp[skill],
            'reason': _reason(skill, lesson_exp[skill], activity_exp[skill], activity_names[skill]),
        })
    current_overall = round(sum(item['current_score'] for item in skills) / len(skills))
    predicted_overall = round(sum(item['predicted_score'] for item in skills) / len(skills))
    return {
        'scenario': {'days': days, 'lessons': lesson_count, 'consistency_percentage': consistency_percentage},
        'summary': (f'Completing {lesson_count} lessons with {consistency_percentage}% consistency may improve '
                    f'your overall proficiency from {current_overall}% to {predicted_overall}%.'),
        'current_overall_score': current_overall, 'predicted_overall_score': predicted_overall,
        'overall_improvement': predicted_overall - current_overall, 'skills': skills,
        'upcoming_lessons': [{'id': lesson.id, 'title': lesson.title,
                              'skills': [str(value).lower() for value in lesson.skills if str(value).lower() in FORECAST_SKILLS]}
                             for lesson in lessons],
        'assumptions': [f'The learner completes the selected {lesson_count} lessons.',
                        f'The learner maintains approximately {consistency_percentage}% consistency.',
                        'Future performance follows recent learning patterns.'],
        'confidence': confidence,
    }
