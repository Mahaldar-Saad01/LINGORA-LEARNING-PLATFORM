import { useState } from 'react'

export default function RecommendationCard({ recommendation, onStart, onDismiss }) {
  const { lesson, primary_skill: skill, reason, recommendation_score: score } = recommendation
  const [pendingAction, setPendingAction] = useState('')
  const act = async (action, callback) => {
    setPendingAction(action)
    try { await callback() } finally { setPendingAction('') }
  }
  return <article className="rounded-2xl z-10 border border-green-100 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-wider text-[#0f6f25]">{skill || 'Personalized'}</p><h3 className="mt-1 text-lg font-black">{lesson.title}</h3></div>
      <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-bold">{Math.round(score)}</span>
    </div>
    <p className="mt-3 text-sm text-slate-600">{reason?.summary || 'Selected to match your current learning needs.'}</p>
    <div className="mt-4 flex gap-2">
      <button className="rounded-xl bg-[#0f6f25] px-4 py-2 font-bold text-white disabled:opacity-60" disabled={Boolean(pendingAction)} onClick={() => act('add', () => onStart(recommendation))} type="button">{pendingAction === 'add' ? 'Queuing…' : 'Queue up next'}</button>
      <button className="rounded-xl border px-4 py-2 font-bold disabled:opacity-60" disabled={Boolean(pendingAction)} onClick={() => act('dismiss', () => onDismiss(recommendation.id))} type="button">{pendingAction === 'dismiss' ? 'Removing…' : 'Dismiss'}</button>
    </div>
  </article>
}
