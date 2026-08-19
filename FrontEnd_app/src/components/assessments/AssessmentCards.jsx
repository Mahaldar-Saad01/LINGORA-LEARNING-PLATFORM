import { Link } from 'react-router-dom'

const DETAILS = {
  daily: {
    title: 'Daily Challenge',
    description: 'A short practice to continue your streak.',
    icon: 'today',
  },
  weekly: {
    title: 'Weekly Skill Check',
    description: 'Review several skills from this week.',
    icon: 'date_range',
  },
  monthly: {
    title: 'Monthly Review',
    description: 'A broader review of your available skills.',
    icon: 'calendar_month',
  },
}

export default function AssessmentCards({ status }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {Object.entries(DETAILS).map(([type, details]) => {
        const item = status?.[type] || {}
        const action = item.completed
          ? 'Completed'
          : item.status === 'in_progress'
          ? 'Continue'
          : 'Start'

        return (
          <article
            className="flex flex-col justify-between rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
            key={type}
          >
            <div>
              {/* Header: Icon & XP Badge */}
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#edf6eb] text-[#0f6f25]">
                  <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                    {details.icon}
                  </span>
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#0f6f25]">
                  +{item.reward_xp || 0} XP
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="mt-2 text-xl font-black text-slate-900">{details.title}</h3>
              <p className="mt-2 min-h-[2.75rem] text-sm font-medium text-slate-500 leading-relaxed">
                {details.description}
              </p>

              {/* Stats pill */}
              <div className="mt-2 flex items-center gap-4 text-xs font-bold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-base text-slate-400">
                    quiz
                  </span>
                  {item.question_count || 0} questions
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-base text-slate-400">
                    schedule
                  </span>
                  {item.estimated_minutes || '-'} min
                </span>
              </div>
            </div>

            {/* Bottom Button / Lock Notice */}
            <div className="mt-3">
              {item.available === false ? (
                <div className="rounded-xl bg-amber-50 p-3 text-center text-xs font-bold text-amber-800 border border-amber-200/60">
                  More lesson activities are needed.
                </div>
              ) : (
                <Link
                  className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold shadow-xs transition-all ${
                    item.completed
                      ? 'bg-[#edf6eb] text-[#0f6f25] hover:bg-emerald-100/70'
                      : 'bg-[#0f6f25] text-white hover:bg-[#0b471b]'
                  }`}
                  to={
                    item.completed
                      ? `/assessments/${item.assessment_id}/results`
                      : `/assessments/${type}`
                  }
                >
                  {action}
                  <span className="material-symbols-outlined text-base">
                    {item.completed ? 'check_circle' : 'play_arrow'}
                  </span>
                </Link>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}