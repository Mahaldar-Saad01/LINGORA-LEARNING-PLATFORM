import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ActivityRenderer from '../../components/lessons/ActivityRenderer'
import LessonProgress from '../../components/lessons/LessonProgress'
import useSpeechSynthesis from '../../hooks/useSpeechSynthesis'
import { completeAssessment, getCurrentAssessment, saveAssessmentAnswer, startAssessment } from '../../services/lessonApi'

import { useEnergy } from '../../context/EnergyContext'

const hasAnswer = (answer) => Boolean(answer && Object.values(answer).some((value) => value === false || value === 0 || (Array.isArray(value) ? value.length : String(value ?? '').trim())))

export default function AssessmentTakingPage() {
  const { assessmentId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const type = location.pathname.split('/')[2] || 'daily'
  const speech = useSpeechSynthesis()
  const cancelSpeech = speech.cancel
  const { updateEnergy } = useEnergy()
  const [assessment, setAssessment] = useState(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    const request = assessmentId ? startAssessment(assessmentId) : getCurrentAssessment(type).then((item) => (
      item.status === 'completed' ? navigate(`/assessments/${item.id}/results`, { replace: true }) : startAssessment(item.id)
    ))
    request
      .then((item) => { if (mounted.current && item) { setAssessment(item); setAnswers(Object.fromEntries((item.answers || []).map((answer) => [answer.activity_id, answer.answer]))) } })
      .catch((requestError) => { if (mounted.current) setError(requestError.message) })
    return () => { mounted.current = false; cancelSpeech() }
  }, [assessmentId, cancelSpeech, navigate, type])
  const questions = useMemo(() => assessment?.questions || [], [assessment])
  const activity = questions[index]
  const answer = activity ? answers[activity.id] || {} : {}
  const saveAndContinue = async () => {
    if (!activity || !hasAnswer(answer) || saving) return
    setSaving(true); setError('')
    try {
      await saveAssessmentAnswer(assessment.id, activity.id, answer)
      if (index < questions.length - 1) { speech.cancel(); setIndex((value) => value + 1); window.scrollTo(0, 0) }
      else {
        const result = await completeAssessment(assessment.id)
        if (result?.energy) updateEnergy(result.energy)
        navigate(`/assessments/${assessment.id}/results`, { state: { result } })
      }
    } catch (requestError) { setError(requestError.message) } finally { setSaving(false) }
  }
  if (error && !assessment) return <main className="grid min-h-screen place-items-center bg-[#f7f8f5] p-6"><div className="max-w-lg bg-white p-7"><h1 className="text-2xl font-black">Assessment unavailable</h1><p className="mt-3 text-red-700">{error}</p></div></main>
  if (!activity) return <main className="min-h-screen animate-pulse bg-[#f7f8f5]" aria-busy="true" />
  return <main className="min-h-screen bg-[#f7f8f5] text-[#172018]"><LessonProgress current={index + 1} total={questions.length} /><div className="mx-auto max-w-[1100px] px-6 py-8"><div className="mb-5 flex items-center justify-between"><span className="rounded-full bg-[#edf6eb] px-3 py-1 text-xs font-black uppercase text-[#0f6f25]">{activity.skill || 'Mixed'}</span><span className="text-sm font-bold">Question {index + 1} of {questions.length}</span></div><ActivityRenderer activity={activity} answerState={answer} feedback={null} isCorrect={false} isLoading={saving} isSubmitted={false} lesson={assessment} onAnswerChange={(value) => setAnswers((current) => ({ ...current, [activity.id]: value }))} speech={speech} />{error && <p className="mt-4 rounded-md bg-red-50 p-4 text-red-700">{error}</p>}<div className="mt-7 flex justify-between"><button className="rounded-md border px-5 py-3 font-bold disabled:opacity-40" disabled={index === 0 || saving} onClick={() => { speech.cancel(); setIndex((value) => value - 1) }} type="button">Previous</button><button className="rounded-md bg-[#0f6f25] px-6 py-3 font-black text-white disabled:opacity-40" disabled={!hasAnswer(answer) || saving} onClick={saveAndContinue} type="button">{saving ? 'Saving...' : index === questions.length - 1 ? 'Complete assessment' : 'Save and continue'}</button></div></div></main>
}
