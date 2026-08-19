from collections import defaultdict

from academics.models import DifficultyLevel, Language

from ..models import Assessment, AssessmentQuestion


FIRST_ASSESSMENT_LEVEL_SPLIT = {
    'Beginner': 10,
}


def resolve_language(value):
    if not value:
        return None
    return Language.objects.filter(name__iexact=value).first() or Language.objects.filter(
        code__iexact=value,
    ).first()


def get_first_assessment_questions(target_language, explanation_language):
    """Return the deterministic beginner question set used for display and scoring."""
    selected = []
    selected_question_texts = set()

    for level_name, required_count in FIRST_ASSESSMENT_LEVEL_SPLIT.items():
        level = DifficultyLevel.objects.filter(name__iexact=level_name).first()
        if level is None:
            continue

        candidates = AssessmentQuestion.objects.filter(
            assessment__target_language=target_language,
            assessment__explanation_language=explanation_language,
            assessment__level=level,
        ).select_related(
            'assessment',
            'passage',
        ).prefetch_related('options').order_by(
            'assessment__type',
            'order_no',
            'id',
        )

        level_questions = _select_balanced_questions(
            candidates,
            required_count,
            excluded_question_texts=selected_question_texts,
        )
        selected.extend(level_questions)
        selected_question_texts.update(
            _normalize_question_text(question.question_text)
            for question in level_questions
        )

    return selected


def _normalize_question_text(question_text):
    """Normalize display text so duplicate rows cannot repeat a question."""
    return ' '.join(question_text.split()).casefold()


def _select_balanced_questions(
    questions,
    required_count,
    excluded_question_texts=None,
):
    questions_by_type = defaultdict(list)
    passage_question_counts = defaultdict(int)
    seen_question_texts = set(excluded_question_texts or ())

    for question in questions:
        normalized_text = _normalize_question_text(question.question_text)
        if normalized_text in seen_question_texts:
            continue
        if question.passage_id and passage_question_counts[question.passage_id] >= 2:
            continue

        questions_by_type[question.assessment.type].append(question)
        seen_question_texts.add(normalized_text)
        if question.passage_id:
            passage_question_counts[question.passage_id] += 1

    type_order = [
        Assessment.READING,
        Assessment.COMPREHENSION,
        Assessment.WRITING,
    ]
    selected = []
    while len(selected) < required_count:
        added_question = False
        for assessment_type in type_order:
            type_questions = questions_by_type[assessment_type]
            if type_questions and len(selected) < required_count:
                selected.append(type_questions.pop(0))
                added_question = True
        if not added_question:
            break

    return selected
