import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getAssessmentResult } from '../../services/lessonApi'
import { useEnergy } from '../../context/EnergyContext'

export default function AssessmentResultsPage() {
  const { assessmentId } = useParams()
  const location = useLocation()
  const [result, setResult] = useState(location.state?.result || null)
  const [error, setError] = useState('')
  const { updateEnergy } = useEnergy()

  useEffect(() => {
    if (result) {
      if (result.energy) updateEnergy(result.energy)
      return undefined
    }
    let active = true
    getAssessmentResult(assessmentId)
      .then((value) => {
        if (active) {
          setResult(value)
          if (value?.energy) updateEnergy(value.energy)
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
    return () => {
      active = false
    }
  }, [assessmentId, result, updateEnergy])

  if (error) return <main className="grid min-h-screen place-items-center"><p className="text-red-700">{error}</p></main>
  if (!result) return <main className="min-h-screen animate-pulse bg-green-50" aria-busy="true" />
  return <main className="min-h-screen bg-[#f7f8f5] px-6 py-10 text-[#172018]">
    <div className="mx-auto max-w-[1000px]">
      <div className="text-center">
        <p className="text-xs font-black uppercase text-[#508058]">Assessment complete</p>
        <h1 className="mt-2 text-5xl font-black">{Math.round(result.score)}%</h1>
        <p className="mt-3 text-[#657064]">{result.correct_count} correct · {result.xp_awarded} XP earned · {Math.round(result.duration_seconds / 60)} minutes</p>
        
        {result.energy && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-5 py-2 text-sm font-bold text-amber-900 shadow-sm">
            <span>⚡</span>
            <span><strong>+20 Energy Rewarded!</strong> Current: {result.energy.current_energy}/{result.energy.max_energy}</span>
          </div>
        )}
      </div>
      {result.new_badges?.length > 0 && <section className="mt-8 bg-[#edf6eb] p-6"><h2 className="text-xl font-black">New badges</h2><div className="mt-3 flex flex-wrap gap-3">{result.new_badges.map((badge) => <span className="rounded-full bg-white px-4 py-2 font-bold" key={badge.code}>{badge.name}</span>)}</div></section>}
      <section className="mt-8"><h2 className="text-2xl font-black">Skill results</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{result.skills.map((skill) => <article className="border bg-white p-4" key={skill.skill}><strong className="capitalize">{skill.skill}</strong><span className="float-right font-black text-[#0f6f25]">{skill.score}%</span><p className="mt-2 text-sm text-[#657064]">{skill.correct}/{skill.graded} graded answers</p></article>)}</div></section>
      <section className="mt-8"><h2 className="text-2xl font-black">Mistakes to review</h2>{result.mistakes.length ? <div className="mt-4 space-y-3">{result.mistakes.map((item) => <article className="border bg-white p-5" key={item.activity_id}><h3 className="font-bold" dir="auto">{item.question_display}</h3><div className="mt-3 grid gap-2 sm:grid-cols-2"><p className="min-w-0 break-words bg-red-50 p-3" dir="auto">Your answer: {item.user_answer_display}</p><p className="min-w-0 break-words bg-green-50 p-3" dir="auto">Correct answer: {item.correct_answer_display}</p></div></article>)}</div> : <p className="mt-3">No automatically graded mistakes.</p>}</section>
      <div className="mt-9 flex flex-wrap justify-center gap-3"><Link className="rounded-md bg-[#0f6f25] px-6 py-3 font-black text-white" to="/dashboard">Return to dashboard</Link><Link className="rounded-md border px-6 py-3 font-black" to="/assessments">Assessment history</Link></div>
    </div>
  </main>
}
