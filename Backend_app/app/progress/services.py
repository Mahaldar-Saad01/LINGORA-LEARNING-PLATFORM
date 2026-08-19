from datetime import timedelta

from django.utils import timezone

from .models import LearningStats


ACHIEVEMENTS = [
    {'key': 'first_steps', 'title': 'First Steps', 'description': 'Complete your first lesson.', 'icon': 'footprint', 'field': 'completed_lessons', 'target': 1},
    {'key': 'perfect_pair', 'title': 'Perfect Pair', 'description': 'Complete 2 perfect lessons in a row.', 'icon': 'workspace_premium', 'field': 'best_perfect_run', 'target': 2},
    {'key': 'flawless_five', 'title': 'Flawless Five', 'description': 'Complete 5 perfect lessons in a row.', 'icon': 'military_tech', 'field': 'best_perfect_run', 'target': 5},
    {'key': 'streak_three', 'title': 'On Fire', 'description': 'Reach a 3-day learning streak.', 'icon': 'local_fire_department', 'field': 'longest_streak', 'target': 3},
    {'key': 'streak_seven', 'title': 'Week Warrior', 'description': 'Reach a 7-day learning streak.', 'icon': 'date_range', 'field': 'longest_streak', 'target': 7},
    {'key': 'xp_100', 'title': 'XP Explorer', 'description': 'Earn 100 total XP.', 'icon': 'stars', 'field': 'total_xp', 'target': 100},
    {'key': 'xp_500', 'title': 'XP Champion', 'description': 'Earn 500 total XP.', 'icon': 'emoji_events', 'field': 'total_xp', 'target': 500},
    {'key': 'lessons_ten', 'title': 'Dedicated Learner', 'description': 'Complete 10 lessons.', 'icon': 'menu_book', 'field': 'completed_lessons', 'target': 10},
]


def calculate_lesson_xp(generated_lesson, accuracy):
    activity_xp = sum(max(0, int(item.get('xp') or 0)) for item in generated_lesson.payload.get('activities', []))
    base = activity_xp or max(10, len(generated_lesson.payload.get('activities', [])) * 5)
    return base + (20 if accuracy == 100 else 10 if accuracy >= 80 else 0)


def update_learning_stats(stats, *, xp_earned, accuracy):
    today = timezone.localdate()
    if stats.last_activity_date != today:
        stats.current_streak = stats.current_streak + 1 if stats.last_activity_date == today - timedelta(days=1) else 1
        stats.last_activity_date = today
    stats.longest_streak = max(stats.longest_streak, stats.current_streak)
    stats.consecutive_perfect_lessons = stats.consecutive_perfect_lessons + 1 if accuracy == 100 else 0
    stats.best_perfect_run = max(stats.best_perfect_run, stats.consecutive_perfect_lessons)
    stats.total_xp += xp_earned
    stats.completed_lessons += 1
    stats.save()


def get_weekly_progress_data(user):
    today = timezone.localdate()
    start_of_week = today - timedelta(days=today.weekday())
    day_labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    from academics.models import ActivityAttempt
    attempts = ActivityAttempt.objects.filter(
        user=user,
        updated_at__date__gte=start_of_week,
    )

    daily_minutes = {i: 0.0 for i in range(7)}
    for attempt in attempts:
        attempt_date = attempt.updated_at.date()
        day_index = (attempt_date - start_of_week).days
        if 0 <= day_index < 7:
            ms = attempt.response_time_ms or 0
            mins = max(0.5, ms / 60000.0)
            daily_minutes[day_index] += mins

    max_mins = max(daily_minutes.values()) or 1.0
    total_mins = sum(daily_minutes.values())

    week_days = []
    for i, day in enumerate(day_labels):
        mins = round(daily_minutes[i], 1)
        pct = min(100, max(5 if mins > 0 else 0, round((mins / max_mins) * 100)))
        week_days.append({
            'day': day,
            'minutes': mins,
            'value': pct,
        })

    if total_mins >= 60:
        time_display = f"{round(total_mins / 60.0, 1)} hours of focused learning this week"
    else:
        time_display = f"{round(total_mins)} minutes of focused learning this week"

    return {
        'week_days': week_days,
        'total_weekly_minutes': round(total_mins, 1),
        'weekly_time_display': time_display,
    }


def serialize_stats(stats):
    achievements = []
    for definition in ACHIEVEMENTS:
        value = getattr(stats, definition['field'])
        achievements.append({
            **{key: definition[key] for key in ('key', 'title', 'description', 'icon', 'target')},
            'progress': min(value, definition['target']),
            'unlocked': value >= definition['target'],
        })
    today = timezone.localdate()
    current_streak = stats.current_streak if stats.last_activity_date and stats.last_activity_date >= today - timedelta(days=1) else 0
    weekly_data = get_weekly_progress_data(stats.user)
    return {
        'total_xp': stats.total_xp,
        'completed_lessons': stats.completed_lessons,
        'current_streak': current_streak,
        'longest_streak': stats.longest_streak,
        'consecutive_perfect_lessons': stats.consecutive_perfect_lessons,
        'unlocked_achievements': sum(item['unlocked'] for item in achievements),
        'achievements': achievements,
        'weekly_progress': weekly_data['week_days'],
        'total_weekly_minutes': weekly_data['total_weekly_minutes'],
        'weekly_time_display': weekly_data['weekly_time_display'],
    }

