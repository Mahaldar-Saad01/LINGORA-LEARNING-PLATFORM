import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AssessmentCards from '../../components/assessments/AssessmentCards'
import { getAssessmentHistory, getAssessmentStatus } from '../../services/lessonApi'
import EnergyIndicator from '../../components/energy/EnergyIndicator'

export default function AssessmentsPage() {
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([getAssessmentStatus(), getAssessmentHistory()]).then(([nextStatus, nextHistory]) => {
      if (active) { setStatus(nextStatus); setHistory(nextHistory.results || []) }
    }).catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [])
  return <main className="min-h-screen bg-[#f7f8f5] text-[#172018]">
    <header className="border-b bg-white">
      <div className="mx-auto flex min-h-[72px] max-w-[1280px] items-center justify-between px-6">
        <Link className="text-xl font-black text-[#0f6f25]" to="/dashboard">lingora Learning</Link>
        <div className="flex items-center gap-4">
          <EnergyIndicator />
          <Link className="font-bold text-[#0f6f25]" to="/badges">Badges</Link>
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-[1280px] px-6 py-10">
      <p className="text-xs font-black uppercase text-[#508058]">Practice and review</p><h1 className="mt-2 text-4xl font-black">Assessments</h1>
      {status && <p className="mt-3 text-[#657064]">Current streak: <strong>{status.streak?.current || 0} days</strong></p>}
      <div className="mt-7">{error ? <p className="rounded-md bg-red-50 p-4 text-red-700">{error}</p> : status ? <AssessmentCards status={status} /> : <div className="h-56 animate-pulse rounded-lg bg-green-50" />}</div>
      <section className="mt-10"><h2 className="text-2xl font-black">Recent history</h2>{history.length ? <div className="mt-4 divide-y border bg-white">{history.map((item) => <Link className="flex items-center justify-between gap-4 p-4" key={item.id} to={`/assessments/${item.id}/results`}><span className="font-bold capitalize">{item.assessment_type} · {item.period_key}</span><span>{Math.round(Number(item.score))}% · {item.xp_awarded} XP</span></Link>)}</div> : <p className="mt-3 text-[#657064]">No completed recurring assessments yet.</p>}</section>
    </div>
  </main>
}
