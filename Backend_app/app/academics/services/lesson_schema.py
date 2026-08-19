# ACTIVITY_TYPES = [
#     'lesson_overview', 'listening_choice', 'translation_choice',
#     'sentence_completion', 'matching', 'word_arrangement',
#     'speaking_practice', 'image_choice', 'reading_comprehension',
#     'writing_practice',
# ]

# LESSON_JSON_SCHEMA = {
#     'name': 'adaptive_language_lesson',
#     'strict': True,
#     'schema': {
#         'type': 'object',
#         'additionalProperties': False,
#         'required': ['lesson_id', 'title', 'target_language', 'explanation_language', 'language_code', 'direction', 'audio_locale', 'activities'],
#         'properties': {
#             'lesson_id': {'type': 'integer'}, 'title': {'type': 'string'},
#             'target_language': {'type': 'string'}, 'explanation_language': {'type': 'string'},
#             'language_code': {'type': 'string'}, 'direction': {'enum': ['ltr', 'rtl']},
#             'audio_locale': {'type': 'string'},
#             'activities': {
#                 'type': 'array', 'minItems': 2,
#                 'items': {
#                     'type': 'object', 'additionalProperties': True,
#                     'required': ['id', 'activity_type', 'title', 'instruction', 'difficulty', 'skill', 'concept_tags', 'xp', 'estimated_time'],
#                     'properties': {
#                         'id': {'type': 'string'}, 'activity_type': {'enum': ACTIVITY_TYPES},
#                         'title': {'type': 'string'}, 'instruction': {'type': 'string'},
#                         'difficulty': {'type': 'string'}, 'skill': {'type': 'string'},
#                         'concept_tags': {'type': 'array', 'items': {'type': 'string'}},
#                         'xp': {'type': 'integer'}, 'estimated_time': {'type': 'integer'},
#                     },
#                 },
#             },
#         },
#     },
# }


# def validate_lesson_payload(payload):
#     if not isinstance(payload, dict) or not isinstance(payload.get('activities'), list):
#         raise ValueError('Generated lesson must contain an activities list.')
#     if not payload['activities']:
#         raise ValueError('Generated lesson must contain at least one activity.')
#     seen = set()
#     for activity in payload['activities']:
#         activity_id = activity.get('id')
#         activity_type = activity.get('activity_type')
#         if not activity_id or activity_id in seen:
#             raise ValueError('Every activity requires a unique id.')
#         if activity_type not in ACTIVITY_TYPES:
#             raise ValueError(f'Unsupported activity type: {activity_type}')
#         seen.add(activity_id)
#     return payload
ACTIVITY_TYPES = [
    'lesson_overview',
    'fill_in_the_blank',
    'listen_and_select',
    'sentence_completion',
    'matching_words',
    'word_arrangement',
    'speaking_practice',
    'translate_sentence',
]


COMMON_ACTIVITY_PROPERTIES = {
    'id': {
        'type': 'string',
        'description': 'Unique activity ID inside this lesson, such as activity_1.',
    },
    'activity_type': {
        'enum': ACTIVITY_TYPES,
    },
    'title': {
        'type': 'string',
    },
    'instruction': {
        'type': 'string',
        'description': 'Instruction shown to the learner in the explanation language.',
    },
    'difficulty': {
        'enum': ['beginner', 'intermediate', 'advanced'],
    },
    'skill': {
        'enum': [
            'reading',
            'writing',
            'listening',
            'speaking',
            'vocabulary',
            'grammar',
            'pronunciation',
            'comprehension',
        ],
    },
    'concept_tags': {
        'type': 'array',
        'items': {'type': 'string'},
    },
    'xp': {
        'type': 'integer',
        'minimum': 0,
        'maximum': 100,
    },
    'estimated_time': {
        'type': 'integer',
        'minimum': 10,
        'description': 'Estimated completion time in seconds.',
    },
}


def activity_schema(activity_type, content_schema):
    return {
        'type': 'object',
        'additionalProperties': False,
        'required': [
            'id',
            'activity_type',
            'title',
            'instruction',
            'difficulty',
            'skill',
            'concept_tags',
            'xp',
            'estimated_time',
            'content',
        ],
        'properties': {
            **COMMON_ACTIVITY_PROPERTIES,
            'activity_type': {
                'const': activity_type,
            },
            'content': content_schema,
        },
    }


LESSON_OVERVIEW_CONTENT_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': [
        'module_name',
        'level',
        'description',
        'duration_minutes',
        'reward_xp',
        'objectives',
        'cover_image_prompt',
    ],
    'properties': {
        'module_name': {'type': 'string'},
        'level': {'type': 'string'},
        'description': {'type': 'string'},
        'duration_minutes': {'type': 'integer', 'minimum': 1},
        'reward_xp': {'type': 'integer', 'minimum': 0},
        'objectives': {
            'type': 'array',
            'minItems': 1,
            'maxItems': 6,
            'items': {'type': 'string'},
        },
        'cover_image_prompt': {
            'type': 'string',
            'description': 'Image description only. Do not return an image URL.',
        },
        'next_step_title': {
            'type': ['string', 'null'],
        },
    },
}


FILL_IN_THE_BLANK_CONTENT_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': [
        'sentence',
        'translation',
        'input_mode',
        'correct_answers',
        'case_sensitive',
    ],
    'properties': {
        'sentence': {
            'type': 'string',
            'description': 'Sentence containing exactly one {{blank}} placeholder.',
        },
        'translation': {'type': 'string'},
        'input_mode': {
            'enum': ['text', 'select'],
        },
        'options': {
            'type': 'array',
            'items': {
                'type': 'object',
                'additionalProperties': False,
                'required': ['id', 'text'],
                'properties': {
                    'id': {'type': 'string'},
                    'text': {'type': 'string'},
                },
            },
        },
        'correct_answers': {
            'type': 'array',
            'minItems': 1,
            'items': {'type': 'string'},
        },
        'case_sensitive': {'type': 'boolean'},
        'hint': {'type': ['string', 'null']},
        'explanation': {'type': ['string', 'null']},
    },
}


SENTENCE_COMPLETION_CONTENT_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': [
        'sentence',
        'translation',
        'options',
        'correct_option_id',
    ],
    'properties': {
        'sentence': {
            'type': 'string',
            'description': 'Sentence containing exactly one {{blank}} placeholder.',
        },
        'translation': {'type': 'string'},
        'audio_text': {'type': ['string', 'null']},
        'options': {
            'type': 'array',
            'minItems': 2,
            'maxItems': 5,
            'items': {
                'type': 'object',
                'additionalProperties': False,
                'required': ['id', 'text'],
                'properties': {
                    'id': {'type': 'string'},
                    'text': {'type': 'string'},
                },
            },
        },
        'correct_option_id': {'type': 'string'},
        'grammar_tip': {
            'type': ['object', 'null'],
            'additionalProperties': False,
            'required': ['title', 'explanation'],
            'properties': {
                'title': {'type': 'string'},
                'explanation': {'type': 'string'},
            },
        },
        'image_prompt': {'type': ['string', 'null']},
    },
}


LISTEN_AND_SELECT_CONTENT_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': [
        'audio_text',
        'audio_speed_options',
        'options',
        'correct_option_id',
    ],
    'properties': {
        'audio_text': {'type': 'string'},
        'transliteration': {'type': ['string', 'null']},
        'audio_speed_options': {
            'type': 'array',
            'minItems': 1,
            'items': {
                'enum': ['slow', 'normal'],
            },
        },
        'options': {
            'type': 'array',
            'minItems': 2,
            'maxItems': 5,
            'items': {
                'type': 'object',
                'additionalProperties': False,
                'required': ['id', 'text'],
                'properties': {
                    'id': {'type': 'string'},
                    'text': {'type': 'string'},
                },
            },
        },
        'correct_option_id': {'type': 'string'},
        'explanation': {'type': ['string', 'null']},
    },
}


MATCHING_WORDS_CONTENT_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': [
        'left_items',
        'right_items',
        'correct_pairs',
    ],
    'properties': {
        'left_items': {
            'type': 'array',
            'minItems': 2,
            'maxItems': 8,
            'items': {
                'type': 'object',
                'additionalProperties': False,
                'required': ['id', 'text', 'item_type'],
                'properties': {
                    'id': {'type': 'string'},
                    'text': {'type': 'string'},
                    'transliteration': {'type': ['string', 'null']},
                    'item_type': {'const': 'word'},
                },
            },
        },
        'right_items': {
            'type': 'array',
            'minItems': 2,
            'maxItems': 8,
            'items': {
                'type': 'object',
                'additionalProperties': False,
                'required': ['id', 'item_type', 'meaning'],
                'properties': {
                    'id': {'type': 'string'},
                    'item_type': {
                        'enum': ['text', 'image'],
                    },
                    'meaning': {'type': 'string'},
                    'image_prompt': {'type': ['string', 'null']},
                },
            },
        },
        'correct_pairs': {
            'type': 'array',
            'minItems': 2,
            'items': {
                'type': 'object',
                'additionalProperties': False,
                'required': ['left_id', 'right_id'],
                'properties': {
                    'left_id': {'type': 'string'},
                    'right_id': {'type': 'string'},
                },
            },
        },
    },
}


WORD_ARRANGEMENT_CONTENT_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': [
        'source_sentence',
        'word_bank',
        'correct_order',
    ],
    'properties': {
        'source_sentence': {'type': 'string'},
        'source_audio_text': {'type': ['string', 'null']},
        'word_bank': {
            'type': 'array',
            'minItems': 2,
            'maxItems': 12,
            'items': {
                'type': 'object',
                'additionalProperties': False,
                'required': ['id', 'text'],
                'properties': {
                    'id': {'type': 'string'},
                    'text': {'type': 'string'},
                },
            },
        },
        'correct_order': {
            'type': 'array',
            'minItems': 1,
            'items': {'type': 'string'},
        },
        'accepted_sentences': {
            'type': 'array',
            'items': {'type': 'string'},
        },
        'explanation': {'type': ['string', 'null']},
    },
}


SPEAKING_PRACTICE_CONTENT_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': [
        'phrase',
    ],
    'properties': {
        'phrase': {'type': 'string', 'minLength': 1},
        'transliteration': {'type': ['string', 'null']},
        'meaning': {'type': 'string'},
        'language_code': {
            'type': 'string',
            'pattern': '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$',
        },
        'audio_speed_options': {
            'type': 'array',
            'minItems': 1,
            'items': {
                'enum': ['slow', 'normal'],
            },
        },
        'recording_duration_seconds': {
            'type': 'integer',
            'minimum': 2,
            'maximum': 30,
        },
        'pronunciation_tip': {'type': ['string', 'null']},
        'evaluation': {
            'type': 'object',
            'additionalProperties': False,
            'required': ['minimum_accuracy', 'metrics'],
            'properties': {
                'minimum_accuracy': {
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 100,
                },
                'metrics': {
                    'type': 'array',
                    'minItems': 1,
                    'items': {
                        'enum': [
                            'accuracy',
                            'fluency',
                            'pronunciation',
                            'completeness',
                        ],
                    },
                },
            },
        },
    },
}


TRANSLATE_SENTENCE_CONTENT_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': [
        'source_sentence',
        'source_language',
        'transliteration',
        'options',
        'correct_option_id',
    ],
    'properties': {
        'source_sentence': {'type': 'string'},
        'source_language': {
            'enum': ['target', 'explanation'],
        },
        'transliteration': {'type': ['string', 'null']},
        'audio_text': {'type': ['string', 'null']},
        'options': {
            'type': 'array',
            'minItems': 2,
            'maxItems': 5,
            'items': {
                'type': 'object',
                'additionalProperties': False,
                'required': ['id', 'text'],
                'properties': {
                    'id': {'type': 'string'},
                    'text': {'type': 'string'},
                },
            },
        },
        'correct_option_id': {'type': 'string'},
        'explanation': {'type': ['string', 'null']},
    },
}


LESSON_JSON_SCHEMA = {
    'name': 'adaptive_language_lesson',
    'strict': True,
    'schema': {
        'type': 'object',
        'additionalProperties': False,
        'required': [
            'lesson_id',
            'title',
            'target_language',
            'explanation_language',
            'target_language_code',
            'explanation_language_code',
            'direction',
            'audio_locale',
            'activities',
        ],
        'properties': {
            'lesson_id': {'type': 'integer'},
            'title': {'type': 'string'},
            'target_language': {'type': 'string'},
            'explanation_language': {'type': 'string'},
            'target_language_code': {'type': 'string'},
            'explanation_language_code': {'type': 'string'},
            'direction': {
                'enum': ['ltr', 'rtl'],
            },
            'audio_locale': {'type': 'string'},
            'activities': {
                'type': 'array',
                'minItems': 2,
                'maxItems': 20,
                'items': {
                    'oneOf': [
                        activity_schema(
                            'lesson_overview',
                            LESSON_OVERVIEW_CONTENT_SCHEMA,
                        ),
                        activity_schema(
                            'fill_in_the_blank',
                            FILL_IN_THE_BLANK_CONTENT_SCHEMA,
                        ),
                        activity_schema(
                            'listen_and_select',
                            LISTEN_AND_SELECT_CONTENT_SCHEMA,
                        ),
                        activity_schema(
                            'sentence_completion',
                            SENTENCE_COMPLETION_CONTENT_SCHEMA,
                        ),
                        activity_schema(
                            'matching_words',
                            MATCHING_WORDS_CONTENT_SCHEMA,
                        ),
                        activity_schema(
                            'word_arrangement',
                            WORD_ARRANGEMENT_CONTENT_SCHEMA,
                        ),
                        activity_schema(
                            'speaking_practice',
                            SPEAKING_PRACTICE_CONTENT_SCHEMA,
                        ),
                        activity_schema(
                            'translate_sentence',
                            TRANSLATE_SENTENCE_CONTENT_SCHEMA,
                        ),
                    ],
                },
            },
        },
    },
}

GENERATION_JSON_SCHEMA = {
    'name': 'generated_language_lesson',
    'strict': True,
    'schema': {
        'type': 'object',
        'properties': {
            'title': {
                'type': 'string',
            },
            'description': {
                'type': 'string',
            },
            'activities': {
                'type': 'array',
                'minItems': 1,
                'items': {
                    'type': 'object',
                    'properties': {
                        'id': {
                            'type': 'string',
                        },
                        'activity_type': {
                            'type': 'string',
                            'enum': [
                                'lesson_overview',
                                'fill_in_the_blank',
                                'listen_and_select',
                                'sentence_completion',
                                'matching_words',
                                'word_arrangement',
                                'speaking_practice',
                                'translate_sentence',
                            ],
                        },
                        'title': {
                            'type': 'string',
                        },
                        'instruction': {
                            'type': 'string',
                        },
                        'difficulty': {
                            'type': 'string',
                        },
                        'skill': {
                            'type': 'string',
                        },
                        'concept_tags': {
                            'type': 'array',
                            'items': {
                                'type': 'string',
                            },
                        },
                        'xp': {
                            'type': 'integer',
                        },
                        'estimated_time': {
                            'type': 'integer',
                        },
                        'content': {
                            'type': 'object',
                            'additionalProperties': True,
                        },
                    },
                    'required': [
                        'id',
                        'activity_type',
                        'title',
                        'instruction',
                        'difficulty',
                        'skill',
                        'concept_tags',
                        'xp',
                        'estimated_time',
                        'content',
                    ],
                    'additionalProperties': False,
                },
            },
        },
        'required': [
            'title',
            'description',
            'activities',
        ],
        'additionalProperties': False,
    },
}

def _validate_unique_ids(items, field_name, activity_id):
    ids = [item.get('id') for item in items]

    if any(not item_id for item_id in ids):
        raise ValueError(
            f'{activity_id}: every {field_name} item requires an id.'
        )

    if len(ids) != len(set(ids)):
        raise ValueError(
            f'{activity_id}: duplicate IDs found in {field_name}.'
        )

    return set(ids)


def _validate_correct_option(activity):
    content = activity['content']
    options = content.get('options', [])

    option_ids = _validate_unique_ids(
        options,
        'options',
        activity['id'],
    )

    correct_option_id = content.get('correct_option_id')

    if correct_option_id not in option_ids:
        raise ValueError(
            f"{activity['id']}: correct_option_id "
            f"'{correct_option_id}' does not exist in options."
        )


def _validate_blank_activity(activity):
    sentence = activity['content'].get('sentence', '')

    if sentence.count('{{blank}}') != 1:
        raise ValueError(
            f"{activity['id']}: sentence must contain exactly one "
            "{{blank}} placeholder."
        )


def _validate_word_arrangement(activity):
    content = activity['content']
    word_bank = content.get('word_bank', [])
    correct_order = content.get('correct_order', [])

    word_ids = _validate_unique_ids(
        word_bank,
        'word_bank',
        activity['id'],
    )

    unknown_ids = [
        word_id
        for word_id in correct_order
        if word_id not in word_ids
    ]

    if unknown_ids:
        raise ValueError(
            f"{activity['id']}: correct_order contains unknown IDs: "
            f'{unknown_ids}.'
        )

    if len(correct_order) != len(set(correct_order)):
        raise ValueError(
            f"{activity['id']}: correct_order contains duplicate word IDs."
        )


def _validate_matching(activity):
    content = activity['content']

    left_ids = _validate_unique_ids(
        content.get('left_items', []),
        'left_items',
        activity['id'],
    )

    right_ids = _validate_unique_ids(
        content.get('right_items', []),
        'right_items',
        activity['id'],
    )

    pairs = content.get('correct_pairs', [])
    paired_left_ids = set()
    paired_right_ids = set()

    for pair in pairs:
        left_id = pair.get('left_id')
        right_id = pair.get('right_id')

        if left_id not in left_ids:
            raise ValueError(
                f"{activity['id']}: unknown left_id '{left_id}'."
            )

        if right_id not in right_ids:
            raise ValueError(
                f"{activity['id']}: unknown right_id '{right_id}'."
            )

        if left_id in paired_left_ids:
            raise ValueError(
                f"{activity['id']}: left item '{left_id}' "
                'is matched more than once.'
            )

        if right_id in paired_right_ids:
            raise ValueError(
                f"{activity['id']}: right item '{right_id}' "
                'is matched more than once.'
            )

        paired_left_ids.add(left_id)
        paired_right_ids.add(right_id)


def validate_lesson_payload(payload):
    if not isinstance(payload, dict):
        raise ValueError('Generated lesson must be an object.')

    activities = payload.get('activities')

    if not isinstance(activities, list):
        raise ValueError(
            'Generated lesson must contain an activities list.'
        )

    if len(activities) < 1:
        raise ValueError(
            'Generated lesson must contain at least one activity.'
        )

    activity_ids = set()

    option_based_types = {
        'sentence_completion',
        'listen_and_select',
        'translate_sentence',
    }

    blank_types = {
        'fill_in_the_blank',
        'sentence_completion',
    }

    for index, activity in enumerate(activities):
        if not isinstance(activity, dict):
            raise ValueError(
                f'Activity at index {index} must be an object.'
            )

        activity_id = activity.get('id')
        activity_type = activity.get('activity_type')
        content = activity.get('content')

        if not activity_id:
            raise ValueError(
                f'Activity at index {index} requires an id.'
            )

        if activity_id in activity_ids:
            raise ValueError(
                f'Duplicate activity id: {activity_id}.'
            )

        if activity_type not in ACTIVITY_TYPES:
            raise ValueError(
                f'Unsupported activity type: {activity_type}.'
            )

        if not isinstance(content, dict):
            raise ValueError(
                f'{activity_id}: content must be an object.'
            )

        activity_ids.add(activity_id)

        if activity_type in option_based_types:
            _validate_correct_option(activity)

        if activity_type in blank_types:
            _validate_blank_activity(activity)

        if activity_type == 'word_arrangement':
            _validate_word_arrangement(activity)

        if activity_type == 'matching_words':
            _validate_matching(activity)

    return payload
