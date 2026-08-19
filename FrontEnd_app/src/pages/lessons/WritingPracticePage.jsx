import { useState } from 'react'
import CelebrationFall from '../../components/lessons/CelebrationFall'
import LessonShell from '../../components/lessons/LessonShell'

export default function WritingPracticePage({ activity, onSubmit, onNext }) {
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null)
  const submit = async () => setResult(await onSubmit(answer, { writing_score: answer.trim().length >= 20 ? 80 : 50 }))
  return <LessonShell canContinue={result?.correct} current={activity.progress.current} onContinue={onNext} total={activity.progress.total}>{result?.correct && <CelebrationFall />}<h1 className="text-4xl font-black">{activity.title}</h1><p className="mt-3 text-lg">{activity.instruction}</p><label className="mt-9 block font-bold" htmlFor="writing-answer">Your answer</label><textarea className="mt-2 min-h-56 w-full rounded-2xl border border-[#cbd6c6] bg-white p-6 text-lg outline-none focus:border-[#2e7d32] focus:ring-4 focus:ring-green-100" id="writing-answer" onChange={(event) => setAnswer(event.target.value)} placeholder={activity.prompt_text} value={answer} /><button className="mt-5 rounded-full bg-[#0f6f25] px-8 py-3 font-bold text-white disabled:opacity-40" disabled={!answer.trim()} onClick={submit} type="button">Submit writing</button>{result && !result.correct && <aside className="mt-6 rounded-2xl bg-[#fff3ed] p-5">{result.mistake_feedback?.explanation || result.feedback}</aside>}</LessonShell>
}
