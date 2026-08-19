import { useState } from 'react'
import CelebrationFall from '../../components/lessons/CelebrationFall'
import LessonShell from '../../components/lessons/LessonShell'

export default function WordArrangementPage({ activity, onSubmit, onNext }) {
  const [answer, setAnswer] = useState([])
  const [result, setResult] = useState(null)
  const add = (token, index) => setAnswer((current) => [...current, { token, index }])
  const check = async () => setResult(await onSubmit(answer.map((item) => item.token)))
  return <LessonShell canContinue={result?.correct} current={activity.progress.current} onContinue={onNext} total={activity.progress.total}>{result?.correct && <CelebrationFall />}<div className="text-center"><h1 className="text-4xl font-black">{activity.title}</h1><p className="mt-3 text-lg">{activity.instruction}</p></div><div className="mt-10 flex min-h-40 flex-wrap items-center justify-center gap-4 rounded-2xl bg-white p-7 shadow-sm">{answer.map((item, position) => <button className="rounded-xl border-b-2 border-[#2e7d32] px-5 py-3 text-2xl font-bold" key={`${item.index}-${position}`} onClick={() => setAnswer((current) => current.filter((_, index) => index !== position))} type="button">{item.token}</button>)}</div><div className="mt-8 flex flex-wrap justify-center gap-4">{(activity.tokens || []).map((token, index) => <button className="min-w-32 rounded-2xl border-2 border-[#dce3d9] bg-white px-5 py-4 text-xl font-bold" key={`${token}-${index}`} onClick={() => add(token, index)} type="button">{token}</button>)}</div><button className="mx-auto mt-8 block rounded-full bg-[#0f6f25] px-8 py-3 font-bold text-white" onClick={check} type="button">Check arrangement</button>{result && !result.correct && <p className="mt-5 rounded-xl bg-[#fff3ed] p-5 text-[#8a3d27]">{result.mistake_feedback?.explanation || 'Try arranging the words again.'}</p>}</LessonShell>
}
