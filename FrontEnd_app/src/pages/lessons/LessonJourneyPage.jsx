import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ActivityRenderer from '../../components/lessons/ActivityRenderer'
import LessonNavigation from '../../components/lessons/LessonNavigation'
import LessonProgress from '../../components/lessons/LessonProgress'
import LessonBackground from '../../components/lessons/LessonBackground'
import useSpeechSynthesis from '../../hooks/useSpeechSynthesis'
import { completeLesson, generateLesson, submitActivity } from '../../services/lessonApi'
import { getLessonPosition, getLessonProgress, saveLessonProgress } from '../../utils/lessonProgress'
import AchievementCelebrationPage from './AchievementCelebrationPage'
import LessonResultsPage from './LessonResultsPage'

import { useEnergy } from '../../context/EnergyContext'

const hasAnswer = (answer) => Boolean(answer && Object.values(answer).some((value) => Array.isArray(value) ? value.length : String(value ?? '').trim()))

export default function LessonJourneyPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation()
  const contentId = location.state?.contentId
  const prefetched = (location.state?.generatedLesson?.lesson_id === Number(lessonId) && (!contentId || location.state?.generatedLesson?.payload?.content_id === Number(contentId)))
    ? location.state.generatedLesson
    : null
  const speech = useSpeechSynthesis(); const stopSpeech = speech.stop; const startedAtRef = useRef(0); const submittingRef = useRef(false); const completingRef = useRef(false); const contentRef = useRef(null)
  const [lesson, setLesson] = useState(prefetched); const [currentActivityIndex, setCurrentActivityIndex] = useState(0); const [answers, setAnswers] = useState({}); const [results, setResults] = useState({}); const [completion, setCompletion] = useState(null); const [achievementIndex, setAchievementIndex] = useState(0); const [achievementsSeen, setAchievementsSeen] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(!prefetched); const [isSubmitting, setIsSubmitting] = useState(false)
  const { updateEnergy, openInsufficientModal } = useEnergy()

  useEffect(() => {
    if (completion) return undefined

    setCurrentActivityIndex(0)
    setAnswers({})
    setResults({})
    setError('')
    setAchievementsSeen(false)
    setAchievementIndex(0)

    const currentPrefetched = (
      location.state?.generatedLesson?.lesson_id === Number(lessonId) &&
      (!contentId || location.state?.generatedLesson?.payload?.content_id === Number(contentId))
    ) ? location.state.generatedLesson : null

    if (currentPrefetched) {
      setLesson(currentPrefetched)
      setLoading(false)
      return undefined
    }

    let active = true
    setLoading(true)
    generateLesson(lessonId, contentId)
      .then(data => { if (active) setLesson(data) })
      .catch(e => {
        if (active) {
          setError(e.message)
          if (e.status === 402 || e.message?.includes('Insufficient energy')) {
            openInsufficientModal(e.data?.energy || e.data)
          }
        }
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [lessonId, contentId, location.key, openInsufficientModal, completion])

  const activities = useMemo(() => Array.isArray(lesson?.activities) ? lesson.activities : [], [lesson]); const activity = activities[currentActivityIndex] ?? null; const answerState = activity ? answers[activity.id] ?? {} : {}; const result = activity ? results[activity.id] : null; const overview = activity?.activity_type === 'lesson_overview'
  useEffect(() => { startedAtRef.current = Date.now(); stopSpeech(); contentRef.current?.focus() }, [currentActivityIndex, stopSpeech])
  useEffect(() => () => stopSpeech(), [stopSpeech])
  const updateActivityAnswer = (activityId, value) => setAnswers(previous => ({ ...previous, [activityId]: value }))
  const handleRetryActivity = (activityId) => { setResults(previous => { const next = { ...previous }; delete next[activityId]; return next }); setAnswers(previous => { const next = { ...previous }; delete next[activityId]; return next }) }
  const submitCurrent = async () => { if (!activity || overview || result?.correct) return result; if (submittingRef.current) return null; submittingRef.current = true; setIsSubmitting(true); setError(''); try { const response = await submitActivity(lesson.generation_id, activity.id, { answer: answerState, skipped: false, attempt_count: 1, response_time_ms: Date.now() - startedAtRef.current, hint_used: false, audio_replay_count: 0 }); setResults(previous => ({ ...previous, [activity.id]: response })); return response } catch (e) { setError(e.message); return null } finally { submittingRef.current = false; setIsSubmitting(false) } }
  const moveNext = async () => {
    if (isSubmitting) return
    if (!overview && !result) {
      const response = await submitCurrent()
      if (!response) return
    }
    if (currentActivityIndex < activities.length - 1) {
      setCurrentActivityIndex((i) => i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (completingRef.current) return
    completingRef.current = true
    setLoading(true)
    try {
      const response = await completeLesson(lesson.generation_id)
      setCompletion(response)
      if (response?.energy) updateEnergy(response.energy)
      if (response?.is_completed) {
        const activePos = location.state?.lessonPosition || getLessonPosition(lessonId, contentId) || 1
        saveLessonProgress(Math.max(getLessonProgress(), activePos + 1))
      }
    } catch (e) {
      setError(e.message)
      if (e.status === 402 || e.message?.includes('Insufficient energy') || e.message?.includes('INSUFFICIENT_ENERGY')) {
        openInsufficientModal(e.data?.energy || e.data)
      }
    } finally {
      setLoading(false)
      completingRef.current = false
    }
  }

  const handleRetryLesson = () => {
    setCompletion(null)
    setCurrentActivityIndex(0)
    setAnswers({})
    setResults({})
    setError('')
    setAchievementsSeen(false)
    setAchievementIndex(0)
    setLoading(true)
    generateLesson(lessonId, contentId)
      .then((data) => setLesson(data))
      .catch((e) => {
        setError(e.message)
        if (e.status === 402 || e.message?.includes('Insufficient energy') || e.message?.includes('INSUFFICIENT_ENERGY')) {
          openInsufficientModal(e.data?.energy || e.data)
        }
      })
      .finally(() => setLoading(false))
  }

  const skip = async () => { if (!activity || submittingRef.current) return; submittingRef.current = true; setIsSubmitting(true); try { await submitActivity(lesson.generation_id, activity.id, { answer: null, skipped: true, attempt_count: 1, response_time_ms: Date.now() - startedAtRef.current, hint_used: false, audio_replay_count: 0 }); setResults(p => ({ ...p, [activity.id]: { skipped: true } })); if (currentActivityIndex < activities.length - 1) setCurrentActivityIndex(i => i + 1); else await moveNext() } catch (e) { setError(e.message) } finally { submittingRef.current = false; setIsSubmitting(false) } }
  if (loading) return <main className="min-h-screen bg-[#f8faf6]" aria-busy="true" />
  if (error && !lesson) return <main className="grid min-h-screen place-items-center bg-[#f8faf6] px-6"><div className="max-w-xl rounded-2xl bg-white p-8 text-center shadow-lg"><h1 className="text-2xl font-black">Lesson could not be generated</h1><p className="mt-4 text-red-700">{error}</p><button className="mt-6 rounded-full bg-[#0f6f25] px-7 py-3 font-bold text-white" onClick={() => navigate('/lessons')} type="button">Back to lessons</button></div></main>
  const newAchievements = Array.isArray(completion?.new_achievements) ? completion.new_achievements : []
  const handleFinish = () => {
    setCompletion(null)
    setLesson(null)
    navigate('/lessons')
  }

  const targetLang = lesson?.target_language_code || lesson?.target_language || lesson?.audio_locale || 'hindi'

  if (completion) {
    return (
      <LessonResultsPage
        completion={completion}
        lesson={lesson}
        mistakes={(completion.attempts ?? []).filter(item => !item.correct && !item.skipped)}
        onFinish={handleFinish}
        onRetry={handleRetryLesson}
      />
    )
  }
  if (!activity) return <main className="grid min-h-screen place-items-center bg-[#f8faf6] px-6"><div className="rounded-2xl bg-white p-8 text-center shadow"><h1 className="text-2xl font-black">This lesson has no activities yet.</h1><button className="mt-6 rounded-full bg-[#0f6f25] px-7 py-3 font-bold text-white" onClick={() => navigate('/lessons')} type="button">Back to lessons</button></div></main>

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8faf6]">
      <LessonBackground language={targetLang} />
      <main className="route-fade relative z-10 flex min-h-screen flex-col text-[#101c31]">
        <LessonProgress current={currentActivityIndex + 1} total={activities.length} />
        <section className="mx-auto w-full max-w-[1120px] flex-1 px-6 pb-12 pt-5 sm:px-10 sm:pt-10" ref={contentRef} tabIndex="-1">
          <ActivityRenderer activity={activity} answerState={answerState} feedback={result} isCorrect={result?.correct} isLoading={isSubmitting} isSubmitted={Boolean(result)} lesson={lesson} onAnswerChange={value => updateActivityAnswer(activity.id, value)} onRetry={handleRetryActivity} onSubmit={submitCurrent} speech={speech} />
          {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
          {!overview && !result && <button className="mx-auto mt-8 block rounded-full bg-[#0f6f25] px-8 py-3 font-bold text-white disabled:opacity-40" disabled={!hasAnswer(answerState) || isSubmitting} onClick={submitCurrent} type="button">{isSubmitting ? 'Checking…' : 'Check answer'}</button>}
        </section>
        <LessonNavigation canContinue={overview || Boolean(result)} isFinal={currentActivityIndex === activities.length - 1} isLoading={isSubmitting || loading} onNext={moveNext} onPrevious={currentActivityIndex > 0 ? () => setCurrentActivityIndex(i => i - 1) : null} onSkip={!overview && !result ? skip : undefined} />
      </main>
    </div>
  )
}
