import { useState } from 'react'
import CelebrationFall from '../../components/lessons/CelebrationFall'
import LessonShell from '../../components/lessons/LessonShell'

export default function MatchingPage({ activity, onSubmit, onNext }) {
  const pairs = activity.matching_pairs || []
  const [active, setActive] = useState('')
  const [matches, setMatches] = useState([])
  const [result, setResult] = useState(null)
  const rightValues = [...pairs.map((pair) => pair.right)].reverse()
  const chooseRight = async (right) => {
    if (!active) return
    const next = [...matches.filter((pair) => pair.left !== active), { left: active, right }]
    setMatches(next)
    setActive('')
    if (next.length === pairs.length) setResult(await onSubmit(next))
  }
  return <LessonShell canContinue={result?.correct} current={activity.progress.current} onContinue={onNext} total={activity.progress.total}>{result?.correct && <CelebrationFall />}
    <div className="text-center">
      <h1 className="text-4xl font-black">{activity.title}</h1>
      <p className="mt-3 text-lg">{activity.instruction}</p>
    </div>
    <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
      <div className="space-y-4">{pairs.map((pair) =>
        <button className={`min-h-20 w-full rounded-2xl border-2 bg-white p-5 text-xl font-bold ${active === pair.left ? 'border-[#2e7d32]' : 'border-[#cbd6c6]'}`} key={pair.left} onClick={() => setActive(pair.left)} type="button">{pair.left}</button>)}</div>
      <div className="space-y-4">{rightValues.map((right) =>
        <button className="min-h-20 w-full rounded-2xl border-2 border-[#cbd6c6] bg-white p-5 text-xl font-bold hover:border-[#2e7d32]" key={right} onClick={() => chooseRight(right)} type="button">{right}</button>)}
      </div>
    </div>{result && !result.correct && <p className="mt-6 rounded-xl bg-[#fff3ed] p-5 text-[#8a3d27]">{result.mistake_feedback?.explanation || 'Review the pairs and try again.'}</p>}
  </LessonShell>
}
