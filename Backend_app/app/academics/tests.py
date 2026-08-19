import json
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from academics.services.llm_generation_logger import log_lesson_generation
from academics.services.lesson_generation import (
    _normalise_activity_content,
    generate_lesson,
)
from academics.services.lesson_fallback import ensure_fallback_explanations
from academics.services.lesson_schema import _validate_correct_option
from academics.services.lesson_semantics import (
    classify_lesson_topic,
    validate_lesson_semantics,
)
from academics.services.speaking_practice import (
    normalize_spoken_text,
    score_speaking_answer,
    validate_speaking_answer,
    word_match_score,
)
from academics.services.answer_display import (
    canonical_answer, format_activity_answer, serialize_attempt_for_results,
)
from rest_framework import serializers
from academics.views import _fallback_mistake_feedback, _lesson_skill_proficiency


class LessonFeedbackAndProficiencyTests(SimpleTestCase):
    def test_old_fallback_activity_gets_a_stored_explanation(self):
        activities = [{'activity_type': 'translate_sentence', 'content': {'explanation': None}}]
        self.assertTrue(ensure_fallback_explanations(activities))
        self.assertTrue(activities[0]['content']['explanation'])

    def test_content_explanation_is_kept_when_remote_feedback_is_unavailable(self):
        feedback = _fallback_mistake_feedback({
            'content': {'explanation': 'This option has the wrong meaning.'},
            'concept_tags': ['meaning'],
        }, 'नमस्ते')
        self.assertEqual(feedback['explanation'], 'This option has the wrong meaning.')
        self.assertEqual(feedback['correction'], 'नमस्ते')

    def test_proficiency_uses_real_attempts_and_measured_speaking_score(self):
        attempts = [
            SimpleNamespace(activity_type='matching_words', skipped=False, is_correct=True, pronunciation_score=None, writing_score=None),
            SimpleNamespace(activity_type='translate_sentence', skipped=False, is_correct=False, pronunciation_score=None, writing_score=None),
            SimpleNamespace(activity_type='sentence_completion', skipped=False, is_correct=True, pronunciation_score=None, writing_score=None),
            SimpleNamespace(activity_type='speaking_practice', skipped=False, is_correct=True, pronunciation_score=82, writing_score=None),
        ]
        proficiency = {item['skill']: item for item in _lesson_skill_proficiency(attempts)}
        self.assertEqual(proficiency['reading'], {'skill': 'reading', 'attempted': 2, 'correct': 1, 'score': 50})
        self.assertEqual(proficiency['writing']['score'], 100)
        self.assertEqual(proficiency['speaking']['score'], 82)


class SpeakingPracticeScoringTests(SimpleTestCase):
    activity = {'content': {'phrase': 'Guten Morgen'}}

    def answer(self, **overrides):
        return {
            'transcript': 'Guten Morgen', 'expected_text': 'tampered',
            'recording_duration_ms': 1850, 'recognition_confidence': .92,
            'match_accuracy': 1, 'is_correct': False,
            'was_manually_confirmed': False,
            'alternatives': [{'transcript': 'Guten Morgen', 'confidence': .92, 'accuracy': 100}],
            **overrides,
        }

    def test_normalization_and_successful_match(self):
        self.assertEqual(normalize_spoken_text('  GUTEN,   Morgen! '), 'guten morgen')
        self.assertEqual(word_match_score('Guten Morgen', 'guten, morgen!'), 100)

    def test_unsuccessful_match(self):
        self.assertLess(word_match_score('Guten Morgen', 'Gute Nacht'), 80)

    def test_server_phrase_and_score_override_client_values(self):
        stored, score, correct = score_speaking_answer(self.activity, self.answer())
        self.assertEqual(stored['expected_text'], 'Guten Morgen')
        self.assertEqual(score, 100)
        self.assertTrue(correct)
        self.assertTrue(stored['is_correct'])

    def test_manual_confirmation_is_unverified(self):
        stored, score, correct = score_speaking_answer(self.activity, self.answer(
            transcript='', recognition_confidence=None, match_accuracy=None,
            is_correct=None, was_manually_confirmed=True, alternatives=[],
        ))
        self.assertIsNone(score)
        self.assertFalse(correct)
        self.assertIsNone(stored['is_correct'])

    def test_missing_transcript_requires_manual_confirmation(self):
        with self.assertRaises(serializers.ValidationError):
            validate_speaking_answer(self.answer(transcript=''))

    def test_numeric_bounds_and_duration_are_enforced(self):
        for values in (
            {'recording_duration_ms': -1},
            {'recognition_confidence': 1.1},
            {'match_accuracy': 101},
        ):
            with self.assertRaises(serializers.ValidationError):
                validate_speaking_answer(self.answer(**values))

    def test_malformed_and_oversized_alternatives_are_rejected(self):
        with self.assertRaises(serializers.ValidationError):
            validate_speaking_answer('not-an-object')
        with self.assertRaises(serializers.ValidationError):
            validate_speaking_answer(self.answer(alternatives=[{}] * 6))
        with self.assertRaises(serializers.ValidationError):
            validate_speaking_answer(self.answer(alternatives=[{'transcript': 'x' * 501}]))


class ActivityAnswerDisplayTests(SimpleTestCase):
    def activity(self, activity_type, content):
        return {'id': 'a1', 'activity_type': activity_type, 'skill': 'vocabulary',
                'title': 'Practice', 'instruction': 'Choose an answer', 'content': content}

    def test_option_id_resolves_to_label_and_server_canonical_answer(self):
        activity = self.activity('listen_and_select', {
            'audio_text': 'नमस्ते',
            'options': [{'id': 'one', 'text': 'Hello'}, {'id': 'two', 'text': 'नमस्ते'}],
            'correct_option_id': 'two',
        })
        self.assertEqual(format_activity_answer(activity, {'selected_option_id': 'one'}), 'Hello')
        trusted = canonical_answer(activity)
        self.assertEqual(format_activity_answer(activity, trusted, correct=True), 'नमस्ते')

    def test_blank_and_translation_answers(self):
        blank = self.activity('fill_in_the_blank', {'sentence': 'Guten {{blank}}', 'correct_answers': ['Morgen']})
        self.assertEqual(format_activity_answer(blank, {'value': 'Abend'}), 'Abend')
        self.assertEqual(format_activity_answer(blank, canonical_answer(blank), correct=True), 'Morgen')
        translation = self.activity('translate_sentence', {
            'source_sentence': 'Good morning',
            'options': [{'id': 'de', 'text': 'Guten Morgen'}], 'correct_option_id': 'de',
        })
        self.assertEqual(format_activity_answer(translation, canonical_answer(translation), correct=True), 'Guten Morgen')

    def test_word_order_and_matching_pairs_are_readable(self):
        arrangement = self.activity('word_arrangement', {
            'word_bank': [{'id': 'w1', 'text': 'Guten'}, {'id': 'w2', 'text': 'Morgen'}],
            'correct_order': ['w1', 'w2'],
        })
        self.assertEqual(format_activity_answer(arrangement, {'ordered_word_ids': ['w2', 'w1']}), 'Morgen Guten')
        matching = self.activity('matching_words', {
            'left_items': [{'id': 'l1', 'text': 'Hello'}],
            'right_items': [{'id': 'r1', 'meaning': 'नमस्ते'}],
            'correct_pairs': [{'left_id': 'l1', 'right_id': 'r1'}],
        })
        self.assertEqual(format_activity_answer(matching, canonical_answer(matching)), 'Hello → नमस्ते')

    def test_speaking_manual_null_and_malformed_answers_are_controlled(self):
        speaking = self.activity('speaking_practice', {'phrase': 'Guten Morgen'})
        self.assertEqual(format_activity_answer(speaking, {'transcript': 'Guten Abend'}), 'Guten Abend')
        self.assertEqual(format_activity_answer(speaking, {'was_manually_confirmed': True}), 'Practice completed manually')
        self.assertEqual(format_activity_answer(speaking, canonical_answer(speaking), correct=True), 'Guten Morgen')
        self.assertEqual(format_activity_answer(speaking, None), 'No answer')
        self.assertEqual(format_activity_answer({'activity_type': 'legacy', 'content': {}}, {'nested': {}}), 'Answer submitted')

    def test_serialized_result_never_uses_correctness_boolean_as_answer(self):
        activity = self.activity('fill_in_the_blank', {'sentence': 'Guten {{blank}}', 'correct_answers': ['Morgen']})
        attempt = SimpleNamespace(
            id=7, activity_id='a1', activity_type='fill_in_the_blank', skill='vocabulary',
            user_answer={'value': 'Abend'}, correct_answer=False, is_correct=False,
            skipped=False, mistake_feedback={'explanation': 'Use the morning greeting.'},
        )
        result = serialize_attempt_for_results(attempt, activity)
        self.assertFalse(result['is_correct'])
        self.assertEqual(result['correct_answer_display'], 'Morgen')
        self.assertNotEqual(result['correct_answer_display'], 'False')
        self.assertNotIn('{', result['user_answer_display'])

    def test_manual_speaking_is_not_marked_for_review(self):
        activity = self.activity('speaking_practice', {'phrase': 'Hallo'})
        attempt = SimpleNamespace(
            id=8, activity_id='a1', activity_type='speaking_practice', skill='speaking',
            user_answer={'transcript': '', 'was_manually_confirmed': True}, correct_answer=None,
            is_correct=False, skipped=False, mistake_feedback={},
        )
        result = serialize_attempt_for_results(attempt, activity)
        self.assertFalse(result['review_required'])
        self.assertEqual(result['user_answer_display'], 'Practice completed manually')


class LessonGenerationLoggerTests(SimpleTestCase):
    def test_writes_unicode_and_redacts_nested_secrets(self):
        with tempfile.TemporaryDirectory() as directory, override_settings(
            BASE_DIR=Path(directory),
            LLM_GENERATION_LOGGING_ENABLED=True,
            LLM_GENERATION_LOG_PROMPTS=True,
        ):
            path = log_lesson_generation(
                user=SimpleNamespace(pk=5),
                lesson=SimpleNamespace(pk=2, title='Hindi Vowels'),
                attempt=1,
                messages=[{'role': 'user', 'content': 'हिन्दी'}],
                raw_response={
                    'text': 'स्वर',
                    'nested': {'access_token': 'never-log-this'},
                },
                validation_status='failed',
                validation_error='invalid',
            )

            self.assertIsNotNone(path)
            raw_log = path.read_text(encoding='utf-8')
            self.assertIn('हिन्दी', raw_log)
            self.assertIn('स्वर', raw_log)
            self.assertNotIn('never-log-this', raw_log)
            self.assertEqual(
                json.loads(raw_log)['raw_response']['nested']['access_token'],
                '[REDACTED]',
            )

    @patch(
        'academics.services.llm_generation_logger.Path.open',
        side_effect=OSError('disk unavailable'),
    )
    def test_write_failure_is_swallowed(self, _mock_open):
        with tempfile.TemporaryDirectory() as directory, override_settings(
            BASE_DIR=Path(directory),
            LLM_GENERATION_LOGGING_ENABLED=True,
        ):
            result = log_lesson_generation(
                user=SimpleNamespace(pk=5),
                lesson=SimpleNamespace(pk=2, title='Hindi Vowels'),
                attempt=1,
            )
        self.assertIsNone(result)


class LessonPayloadNormalizationTests(SimpleTestCase):
    def test_correct_option_survives_option_id_renumbering(self):
        payload = {
            'activities': [{
                'id': 'activity_1',
                'activity_type': 'sentence_completion',
                'content': {
                    'sentence': 'Ich habe {{blank}}.',
                    'options': [
                        {'id': 'option_4', 'text': 'eins'},
                        {'id': 'option_5', 'text': 'zwei'},
                        {'id': 'option_6', 'text': 'drei'},
                    ],
                    'correct_option_id': 'option_5',
                },
            }],
        }

        _normalise_activity_content(payload, {})

        content = payload['activities'][0]['content']
        self.assertEqual(content['correct_option_id'], 'option_2')
        _validate_correct_option(payload['activities'][0])

    def test_listen_options_answer_and_audio_are_canonical(self):
        payload = {
            'activities': [{
                'id': 'activity_3',
                'activity_type': 'listen_and_select',
                'content': {
                    'options': [
                        {'id': '1', 'value': 'नमस्ते', 'unused': True},
                        {'id': 'old', 'label': 'hello'},
                    ],
                    'correct_answer': '1',
                },
            }],
        }

        _normalise_activity_content(payload, {})
        content = payload['activities'][0]['content']

        self.assertEqual(content['options'], [
            {'id': 'option_1', 'text': 'नमस्ते'},
            {'id': 'option_2', 'text': 'hello'},
        ])
        self.assertEqual(content['correct_option_id'], 'option_1')
        self.assertEqual(content['audio_text'], 'नमस्ते')
        self.assertNotIn('correct_answer', content)
        _validate_correct_option(payload['activities'][0])

    def test_listen_answer_is_repaired_when_audio_matches_another_option(self):
        payload = {
            'activities': [{
                'id': 'activity_2',
                'activity_type': 'listen_and_select',
                'content': {
                    'audio_text': 'bonjour',
                    'options': [
                        {'id': 'first', 'text': 'salut'},
                        {'id': 'second', 'text': 'bonjour'},
                    ],
                    'correct_option_id': 'first',
                },
            }],
        }

        _normalise_activity_content(payload, {})
        content = payload['activities'][0]['content']

        self.assertEqual(content['audio_text'], 'bonjour')
        self.assertEqual(content['correct_option_id'], 'option_2')

    def test_listen_audio_is_repaired_when_it_matches_no_option(self):
        payload = {
            'activities': [{
                'id': 'activity_2',
                'activity_type': 'listen_and_select',
                'content': {
                    'audio_text': 'unrelated model output',
                    'options': [
                        {'id': 'first', 'text': 'salut'},
                        {'id': 'second', 'text': 'bonjour'},
                    ],
                    'correct_option_id': 'second',
                },
            }],
        }

        _normalise_activity_content(payload, {})
        content = payload['activities'][0]['content']

        self.assertEqual(content['audio_text'], 'bonjour')
        self.assertEqual(content['correct_option_id'], 'option_2')

    def test_matching_pairs_accept_objects_and_arrays(self):
        payload = {
            'activities': [{
                'id': 'matching',
                'activity_type': 'matching_words',
                'content': {
                    'matching_pairs': [
                        {'left': 'नमस्ते', 'right': 'Namaste'},
                        ['अलविदा', 'Goodbye'],
                    ],
                },
            }],
        }

        _normalise_activity_content(payload, {})
        content = payload['activities'][0]['content']

        self.assertEqual([item['text'] for item in content['left_items']], ['नमस्ते', 'अलविदा'])
        self.assertEqual([item['meaning'] for item in content['right_items']], ['Namaste', 'Goodbye'])
        self.assertEqual(content['correct_pairs'], [
            {'left_id': 'left_1', 'right_id': 'right_1'},
            {'left_id': 'left_2', 'right_id': 'right_2'},
        ])

    def test_word_bank_strings_are_normalised(self):
        payload = {
            'activities': [{
                'id': 'arrange',
                'activity_type': 'word_arrangement',
                'content': {
                    'word_bank': ['Ich', 'habe', 'zwei'],
                    'correct_order': ['Ich', 'habe', 'zwei'],
                },
            }],
        }

        _normalise_activity_content(payload, {})

        content = payload['activities'][0]['content']
        self.assertEqual(content['word_bank'][0], {
            'id': 'word_1',
            'text': 'Ich',
        })
        self.assertEqual(
            content['correct_order'],
            ['word_1', 'word_2', 'word_3'],
        )


class LessonSemanticValidationTests(SimpleTestCase):
    def setUp(self):
        self.context = {
            'lesson_title': 'Hindi Vowels – Part 1',
            'lesson_description': 'Learn independent Hindi vowels and their sounds.',
            'category': 'Hindi Script Foundations',
            'lesson_objectives': ['Recognize and pronounce Hindi vowels.'],
            'estimated_duration_minutes': 10,
        }
        self.valid_activities = [
            {'id': 'overview', 'activity_type': 'lesson_overview', 'skill': 'Hindi Vowels', 'estimated_time': 60, 'content': {}},
            {'id': 'listen', 'activity_type': 'listen_and_select', 'skill': 'Hindi Vowels', 'estimated_time': 60, 'content': {
                'audio_text': 'अ', 'options': [{'id': 'option_1', 'text': 'अ'}, {'id': 'option_2', 'text': 'आ'}], 'correct_option_id': 'option_1',
            }},
            {'id': 'match', 'activity_type': 'matching_words', 'skill': 'Hindi Vowels', 'estimated_time': 60, 'content': {
                'left_items': [{'id': 'left_1', 'text': 'अ'}, {'id': 'left_2', 'text': 'आ'}],
                'right_items': [
                    {'id': 'right_1', 'meaning': 'Short vowel sound, approximately as in about'},
                    {'id': 'right_2', 'meaning': 'Long open vowel sound, approximately as in father'},
                ],
                'correct_pairs': [
                    {'left_id': 'left_1', 'right_id': 'right_1'},
                    {'left_id': 'left_2', 'right_id': 'right_2'},
                ],
            }},
            {'id': 'speak', 'activity_type': 'speaking_practice', 'skill': 'Hindi Vowels', 'estimated_time': 60, 'content': {'phrase': 'आ'}},
        ]

    def payload_with(self, replacement=None):
        activities = [dict(activity, content=dict(activity['content'])) for activity in self.valid_activities]
        if replacement:
            activities[-1] = replacement
        return {'activities': activities}

    def assert_semantically_invalid(self, activity, context=None):
        with self.assertRaises(ValueError):
            validate_lesson_semantics(self.payload_with(activity), context or self.context)

    def test_classifies_vowel_lesson_as_script(self):
        self.assertEqual(classify_lesson_topic(self.context), 'script')

    def test_rejects_artificial_english_blank_with_isolated_vowel(self):
        self.assert_semantically_invalid({'id': 'bad', 'activity_type': 'fill_in_the_blank', 'skill': 'Hindi Vowels', 'estimated_time': 30, 'content': {
            'sentence': 'I say {{blank}}.', 'correct_answers': ['अ'],
        }})

    def test_rejects_artificial_hindi_blank_with_isolated_vowel(self):
        self.assert_semantically_invalid({'id': 'bad', 'activity_type': 'sentence_completion', 'skill': 'Hindi Vowels', 'estimated_time': 30, 'content': {
            'sentence': 'मैं {{blank}} कहता हूँ।', 'options': [{'id': 'option_1', 'text': 'अ'}], 'correct_option_id': 'option_1',
        }})

    def test_rejects_letter_translation(self):
        self.assert_semantically_invalid({'id': 'bad', 'activity_type': 'translate_sentence', 'skill': 'Hindi Vowels', 'estimated_time': 30, 'content': {
            'source_sentence': 'A', 'options': [{'id': 'option_1', 'text': 'अ'}], 'correct_option_id': 'option_1',
        }})

    def test_rejects_direct_letter_matching(self):
        self.assert_semantically_invalid({'id': 'bad', 'activity_type': 'matching_words', 'skill': 'Hindi Vowels', 'estimated_time': 30, 'content': {
            'left_items': [{'id': 'left_1', 'text': 'अ'}, {'id': 'left_2', 'text': 'आ'}],
            'right_items': [{'id': 'right_1', 'meaning': 'A'}, {'id': 'right_2', 'meaning': 'AA'}],
            'correct_pairs': [{'left_id': 'left_1', 'right_id': 'right_1'}, {'left_id': 'left_2', 'right_id': 'right_2'}],
        }})

    def test_rejects_word_arrangement_of_isolated_letters(self):
        grammar_context = {**self.context, 'lesson_title': 'Basic grammar', 'lesson_description': 'Sentence grammar', 'category': 'Grammar'}
        self.assert_semantically_invalid({'id': 'bad', 'activity_type': 'word_arrangement', 'skill': 'Grammar', 'estimated_time': 30, 'content': {
            'word_bank': [{'id': 'word_1', 'text': 'अ'}, {'id': 'word_2', 'text': 'आ'}],
        }}, grammar_context)

    def test_valid_vowel_recognition_and_pronunciation_pass(self):
        result = validate_lesson_semantics(self.payload_with(), self.context)
        self.assertEqual(len(result['activities']), 4)


class LessonGenerationLoggingFlowTests(SimpleTestCase):
    @patch('academics.services.lesson_generation.build_user_context', return_value={})
    @patch('academics.services.lesson_generation.build_lesson_context', return_value={})
    @patch('academics.services.lesson_generation.build_lesson_prompt', return_value='prompt')
    @patch('academics.services.lesson_generation._normalise_generated_payload')
    @patch('academics.services.lesson_generation.validate_lesson_semantics')
    @patch('academics.services.lesson_generation.validate_lesson_payload')
    @patch('academics.services.lesson_generation.generate_json')
    @patch('academics.services.lesson_generation.GeneratedLesson.objects.create')
    def test_failed_attempt_and_success_are_logged(
        self,
        create_generated,
        generate_json_mock,
        validate_mock,
        _semantic_validator,
        payload_normalizer,
        _prompt,
        _lesson_context,
        _user_context,
    ):
        payload = {'title': 'हिन्दी स्वर'}
        generate_json_mock.side_effect = [
            (payload.copy(), 'test-model'),
            (payload.copy(), 'test-model'),
        ]
        payload_normalizer.side_effect = lambda value, _context: value
        validate_mock.side_effect = [ValueError('invalid activity'), None]
        create_generated.return_value = SimpleNamespace(id=91)

        with tempfile.TemporaryDirectory() as directory, override_settings(
            BASE_DIR=Path(directory),
            LLM_GENERATION_LOGGING_ENABLED=True,
            LLM_GENERATION_LOG_PROMPTS=True,
        ):
            generated = generate_lesson(
                SimpleNamespace(pk=5),
                SimpleNamespace(pk=2, title='Hindi Vowels'),
            )
            paths = list(
                (Path(directory) / 'llm_logs' / 'lesson_generations').rglob('*.json')
            )
            records = [json.loads(path.read_text(encoding='utf-8')) for path in paths]

        self.assertEqual(generated.id, 91)
        self.assertEqual(len(records), 2)
        by_status = {record['validation']['status']: record for record in records}
        self.assertFalse(by_status['failed']['succeeded'])
        self.assertEqual(by_status['passed']['generated_lesson_id'], 91)
        self.assertTrue(by_status['passed']['succeeded'])
