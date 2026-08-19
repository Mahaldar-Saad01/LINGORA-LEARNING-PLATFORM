import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import aiAvatar from '../../assets/images/ai_avatar.png'
import { getAssessmentStatus } from '../../services/lessonApi'
import AssessmentCards from './AssessmentCards'

export default function DashboardAssessments() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAssessmentStatus()
      .then((value) => {
        if (active) setStatus(value)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="mt-10 rounded-3xl bg-[#f4fbf5]/60 p-2 sm:p-8 border border-emerald-900/5 shadow-[0_20px_60px_rgba(31,73,40,0.08)]">
      {/* Header Section */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/15 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0f6f25]">
            <span className="h-2 w-2 rounded-full bg-[#0f6f25]"></span>
            Practice Checkpoints
          </span>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">
            Assessments
          </h2>
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-2xl border border-emerald-900/10 bg-white px-5 py-2.5 text-sm font-bold text-[#0f6f25] shadow-xs transition-all hover:bg-emerald-50/60"
          to="/assessments"
        >
          View history and badges
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </Link>
      </div>

      {/* AI Motivation Banner */}
      <div className="mb-5 flex items-center gap-4 rounded-2xl border border-emerald-900/10 bg-white p-0 shadow-sm">
        <div className="relative shrink-0">
          <img className="h-25 w-25 object-contain" src={aiAvatar} alt="AI Avatar" />
        </div>
        <p className="text-sm font-bold text-slate-700">
          Complete today&apos;s challenge to continue your streak.
        </p>
      </div>

      {/* Content / Loading / Error State */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-0 font-semibold text-red-600">
          {error}
        </div>
      ) : status ? (
        <AssessmentCards status={status} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              className="h-64 animate-pulse rounded-2xl border border-emerald-900/5 bg-white p-6"
              key={item}
            >
              <div className="h-10 w-10 rounded-xl bg-emerald-100/60" />
              <div className="mt-3 h-6 w-3/4 rounded-md bg-emerald-100/60" />
              <div className="mt-1 h-4 w-full rounded-md bg-emerald-100/40" />
              <div className="mt-4 h-10 rounded-xl bg-emerald-100/60" />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}