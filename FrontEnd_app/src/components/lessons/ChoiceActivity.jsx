import { useState } from 'react'
import CelebrationFall from './CelebrationFall'
import ChoiceCard from './ChoiceCard'
import LessonShell from './LessonShell'

export default function ChoiceActivity({ activity, children, onNext, onSubmit }) {
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const choose = async (value) => {
    setSelected(value)
    setSubmitting(true)
    try {
      setResult(await onSubmit(value))
    } finally {
      setSubmitting(false)
    }
  }

  return <LessonShell canContinue={result?.correct} current={activity.progress.current} onContinue={onNext} onSkip={() => onNext({ skipped: true })} total={activity.progress.total}>
    {result?.correct && <CelebrationFall />}
    {children}
    <div className="mt-10 grid gap-5 md:grid-cols-2">{(activity.options || []).map((option, index) => {
      const value = typeof option === 'object' ? option.value ?? option.text : option
      const label = typeof option === 'object' ? option.text ?? option.label : option
      return <ChoiceCard index={index} key={`${value}-${index}`} onClick={() => choose(value)} selected={selected === value}>{label}</ChoiceCard>
    })}</div>
    {submitting && <p className="mt-5 text-center font-bold text-[#0f6f25]">Checking…</p>}
    {result && !result.correct && <aside className="mt-6 rounded-2xl bg-[#fff3ed] p-5 text-[#8a3d27]"><strong>Let’s fix this:</strong> {result.mistake_feedback?.explanation || result.feedback || 'Try another answer.'}{result.mistake_feedback?.practice_tip && <p className="mt-2">Tip: {result.mistake_feedback.practice_tip}</p>}</aside>}
  </LessonShell>
}
