export function formatLegacyAnswer(value, fallback = 'No answer', seen = new WeakSet()) {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string' || typeof value === 'number') return `${value}`
  if (typeof value === 'boolean' || typeof value !== 'object' || seen.has(value)) return fallback
  seen.add(value)
  if (Array.isArray(value)) {
    const labels = value.map((item) => formatLegacyAnswer(item, '', seen)).filter(Boolean)
    return labels.join(', ') || fallback
  }
  if (value.was_manually_confirmed) return 'Practice completed manually'
  if (Array.isArray(value.pairs)) {
    const pairs = value.pairs.map((pair) => {
      if (!pair || typeof pair !== 'object') return ''
      const left = pair.left ?? pair.left_text ?? pair.left_id
      const right = pair.right ?? pair.right_text ?? pair.right_id
      return left && right ? `${left} → ${right}` : ''
    }).filter(Boolean)
    if (pairs.length) return pairs.join(', ')
  }
  if (Array.isArray(value.ordered_words)) return value.ordered_words.join(' ')
  for (const key of ['transcript', 'translation', 'value', 'text', 'answer', 'selected_option_text']) {
    if (value[key] !== null && value[key] !== undefined) return formatLegacyAnswer(value[key], fallback, seen)
  }
  return 'Answer submitted'
}

export function normalizeMistake(mistake, index) {
  const feedback = mistake?.mistake_feedback && typeof mistake.mistake_feedback === 'object'
    ? mistake.mistake_feedback
    : {}
  return {
    id: mistake.id || mistake.activity_id || index,
    activityType: mistake.activity_type || '',
    skill: mistake.skill || 'General',
    question: mistake.question_display || mistake.question || 'Review this activity',
    userAnswerDisplay: mistake.user_answer_display || formatLegacyAnswer(mistake.user_answer ?? mistake.chosen),
    correctAnswerDisplay: mistake.correct_answer_display || formatLegacyAnswer(
      mistake.correct_answer,
      feedback.correction ? formatLegacyAnswer(feedback.correction, 'Correct answer unavailable') : 'Correct answer unavailable',
    ),
    isCorrect: mistake.is_correct ?? (typeof mistake.correct === 'boolean' ? mistake.correct : false),
    manuallyConfirmed: Boolean(mistake.manually_confirmed || mistake.user_answer?.was_manually_confirmed),
    explanation: mistake.explanation || feedback.explanation || '',
  }
}
