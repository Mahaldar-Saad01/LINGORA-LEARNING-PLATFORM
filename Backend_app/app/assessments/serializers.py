import logging

from rest_framework import serializers

from accounts.models import LearnerProfile
from academics.models import DifficultyLevel, Language

from .models import Assessment, AssessmentQuestion, Passage, QuestionOption
from .services.first_assessment import get_first_assessment_questions, resolve_language
from .services.writing_eval import evaluate_writing


FIRST_ASSESSMENT_QUESTION_COUNT = 10
MARKS_PER_QUESTION = 10

logger = logging.getLogger(__name__)


class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ['id', 'option_text', 'is_correct', 'order_no']


class PassageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Passage
        fields = [
            'id',
            'assessment',
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
            'assessment',
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
        fields = [
            'id',
            'target_language',
            'explanation_language',
            'level',
            'type',
            'title',
            'description',
            'questions',
        ]


class FirstAssessmentAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField(min_value=1)
    option_id = serializers.IntegerField(min_value=1, required=False)
    answer_text = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)


class FirstAssessmentSubmitSerializer(serializers.Serializer):
    answers = FirstAssessmentAnswerSerializer(many=True)

    def validate_answers(self, answers):
        if len(answers) != FIRST_ASSESSMENT_QUESTION_COUNT:
            raise serializers.ValidationError(
                f'Exactly {FIRST_ASSESSMENT_QUESTION_COUNT} answers are required.'
            )

        question_ids = [answer['question_id'] for answer in answers]
        if len(set(question_ids)) != len(question_ids):
            raise serializers.ValidationError('Each question can only be answered once.')
        return answers

    def save(self, **kwargs):
        user = self.context['request'].user
        profile, _ = LearnerProfile.objects.get_or_create(user=user)
        target_language = resolve_language(user.target_language) or profile.target_language
        known_language = resolve_language(user.preferred_language) or profile.known_language

        if not target_language or not known_language:
            raise serializers.ValidationError({
                'detail': 'First assessment setup data is missing.',
            })

        assessment_questions = get_first_assessment_questions(
            target_language,
            known_language,
        )
        questions_by_id = {question.id: question for question in assessment_questions}

        submitted_ids = {answer['question_id'] for answer in self.validated_data['answers']}
        if submitted_ids != set(questions_by_id):
            raise serializers.ValidationError({
                'answers': 'Answers must match the 10 questions in the first assessment.',
            })

        total_score = 0.0
        writing_feedback = []
        for submitted_answer in self.validated_data['answers']:
            question = questions_by_id[submitted_answer['question_id']]

            if question.question_type == AssessmentQuestion.SHORT_ANSWER:
                answer_text = submitted_answer.get('answer_text', '')
                if not answer_text:
                    writing_feedback.append({
                        'question_id': question.id,
                        'score': 0,
                        'max_score': MARKS_PER_QUESTION,
                        'feedback': 'No answer was provided.',
                    })
                    continue

                try:
                    evaluation = evaluate_writing(
                        target_language=target_language.name,
                        question=question.question_text,
                        answer=answer_text,
                    )
                except Exception:
                    # Remote AI grading must not make the whole assessment fail.
                    logger.exception(
                        'Writing evaluation failed for assessment question %s',
                        question.id,
                    )
                    writing_feedback.append({
                        'question_id': question.id,
                        'score': 0,
                        'max_score': MARKS_PER_QUESTION,
                        'feedback': (
                            'Automated writing feedback is temporarily unavailable. '
                            'Your assessment was still submitted successfully.'
                        ),
                        'evaluation_unavailable': True,
                    })
                    continue
                writing_score = evaluation['overall_score']
                total_score += writing_score
                writing_feedback.append({
                    'question_id': question.id,
                    'score': writing_score,
                    'max_score': MARKS_PER_QUESTION,
                    'feedback': evaluation.get('feedback', ''),
                    'corrected_answer': evaluation.get('corrected_answer', ''),
                    'language_detected': evaluation.get('language_detected', ''),
                    'is_target_language': evaluation.get('is_target_language', False),
                    'metric_scores': evaluation.get('scores', {}),
                })
                continue

            selected_option_id = submitted_answer.get('option_id')
            is_correct = question.options.filter(
                id=selected_option_id,
                is_correct=True,
            ).exists()
            if is_correct:
                total_score += MARKS_PER_QUESTION

        score_percentage = round(total_score)
        level = DifficultyLevel.objects.filter(
            min_score__lte=score_percentage,
            max_score__gte=score_percentage,
        ).first()
        if level is None:
            raise serializers.ValidationError({
                'score': 'No difficulty level matches this score.',
            })

        profile.known_language = known_language
        profile.target_language = target_language
        profile.current_level = level
        profile.save()

        from academics.services.adaptive_learning import initialize_skill_profile
        writing_values = [
            item['score'] * 10 for item in writing_feedback
            if not item.get('evaluation_unavailable') and item.get('score') is not None
        ]
        initialize_skill_profile(
            user, score_percentage,
            {'writing': sum(writing_values) / len(writing_values)} if writing_values else {},
        )

        return profile, score_percentage, writing_feedback
