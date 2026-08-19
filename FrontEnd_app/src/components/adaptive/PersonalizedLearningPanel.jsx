import { useEffect, useMemo, useState } from 'react'
import { getPersonalizedPath, getSkillProfile } from '../../services/lessonApi'
import SkillScoreCard from './SkillScoreCard'

const skills = ['reading', 'writing', 'listening', 'speaking', 'vocabulary', 'grammar']

export default function PersonalizedLearningPanel() {
  const [profile, setProfile] = useState(null)
  const [path, setPath] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [nextProfile, currentPath] = await Promise.all([getSkillProfile(), getPersonalizedPath()])
      setProfile(nextProfile)
      setPath(currentPath)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([getSkillProfile(), getPersonalizedPath()])
      .then(([nextProfile, currentPath]) => {
        if (active) {
          setProfile(nextProfile)
          setPath(currentPath)
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const ordered = useMemo(() => profile?.priorities || [], [profile])
  if (loading) return <section className="mt-10 animate-pulse rounded-3xl bg-white p-8"><div className="h-6 w-56 rounded bg-green-100" /><div className="mt-5 h-32 rounded bg-green-50" /></section>
  if (error) return <section className="mt-10 rounded-3xl bg-red-50 p-8"><h2 className="font-black">Personalized learning unavailable</h2><p className="mt-2">{error}</p><button className="mt-4 rounded-xl bg-[#0f6f25] px-4 py-2 text-white" onClick={load}>Retry</button></section>

  return <div className="mt-10">
    <section className="rounded-3xl bg-[#f0f8f1] p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-bold text-[#0f6f25]">Overall proficiency</p><h2 className="text-4xl font-black">{Math.round(profile?.overall_score || 0)}%</h2><p className="mt-1 text-sm text-slate-600">Focus: {ordered.slice(0, 2).map((item) => item.skill).join(' and ') || 'building evidence'}</p></div>
        <div className="text-right"><strong>{path?.progress_percentage || 0}% path complete</strong><p className="text-sm text-slate-600">{path?.items?.filter((item) => !['completed', 'skipped'].includes(item.status)).length || 0} upcoming lessons</p></div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{skills.map((skill) => <SkillScoreCard key={skill} skill={skill} score={profile?.[`${skill}_score`]} />)}</div>
    </section>
  </div>
}
