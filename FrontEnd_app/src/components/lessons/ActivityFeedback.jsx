export default function ActivityFeedback({ feedback, isCorrect }) {
  if (!feedback) return null
  if (isCorrect) return <aside className="mt-6 rounded-2xl bg-[#e8f7e8] p-5 text-[#155d25]"><strong>Great work!</strong> Your answer is correct.</aside>
  const detail = typeof feedback.mistake_feedback === 'object' ? feedback.mistake_feedback : {}
  const asText = (value) => {
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ')
    if (value && typeof value === 'object') return value.explanation || value.message || value.title || ''
    return ''
  }
  const rows = [
    ['Correct answer', feedback.correct_answer],
    ['Explanation', detail.explanation || (typeof feedback.feedback === 'string' ? feedback.feedback : '')],
    ['Correction', detail.correction], ['Example', detail.example], ['Practice tip', detail.practice_tip],
  ].map(([label, value]) => [label, asText(value)]).filter(([, value]) => value)
  const tags = Array.isArray(detail.concept_tags) ? detail.concept_tags : []
  return <aside className="mt-6 rounded-2xl bg-[#fff3ed] p-5 text-[#8a3d27]">
    <strong>Let’s fix this</strong>
    {rows.map(([label, value]) => <p className="mt-2" key={label}><b>{label}:</b> {value}</p>)}
    {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{tags.map((tag) => <span className="rounded-full bg-white px-3 py-1 text-sm" key={tag}>{tag}</span>)}</div>}
  </aside>
}
