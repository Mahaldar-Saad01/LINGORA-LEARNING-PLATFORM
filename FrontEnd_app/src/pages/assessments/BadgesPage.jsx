import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBadges } from '../../services/lessonApi'

export default function BadgesPage() {
  const [badges, setBadges] = useState([])
  useEffect(() => { let active = true; getBadges().then((items) => { if (active) setBadges(items) }); return () => { active = false } }, [])
  return <main className="min-h-screen bg-[#f7f8f5] px-6 py-10"><div className="mx-auto max-w-[1100px]"><Link className="font-bold text-[#0f6f25]" to="/assessments">Back to assessments</Link><h1 className="mt-5 text-4xl font-black">Assessment badges</h1><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{badges.map((badge) => <article className={`border p-5 ${badge.earned ? 'bg-white' : 'bg-[#eef1ed] opacity-65'}`} key={badge.code}><span className="material-symbols-outlined text-3xl text-[#0f6f25]">{badge.icon}</span><h2 className="mt-3 text-lg font-black">{badge.name}</h2><p className="mt-1 text-sm text-[#657064]">{badge.description}</p><p className="mt-3 text-xs font-black uppercase text-[#508058]">{badge.earned ? 'Earned' : 'Locked'}</p></article>)}</div></div></main>
}
