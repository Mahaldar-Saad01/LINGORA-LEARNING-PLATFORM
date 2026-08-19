import { useEffect, useRef, useState } from 'react'
import AudioButton from '../../components/lessons/AudioButton'
import CelebrationFall from '../../components/lessons/CelebrationFall'
import LessonIcon from '../../components/lessons/LessonIcon'
import LessonShell from '../../components/lessons/LessonShell'

export default function SpeakingPracticePage({ activity, onSubmit, onNext }) {
  const [recording, setRecording] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const recorder = useRef(null)
  const stream = useRef(null)
  useEffect(() => () => stream.current?.getTracks().forEach((track) => track.stop()), [])
  const toggle = async () => {
    if (recording) {
      recorder.current?.stop(); stream.current?.getTracks().forEach((track) => track.stop()); setRecording(false)
      setResult(await onSubmit(activity.prompt_text || activity.title, { pronunciation_score: 80 }))
      return
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      recorder.current = new MediaRecorder(stream.current); recorder.current.start(); setRecording(true); setError('')
    } catch { setError('Microphone permission is required for speaking practice.') }
  }
  const handleRetry = () => {
    setResult(null)
    setError('')
  }
  const phrase = activity.prompt_text || activity.title
  return <LessonShell canContinue={Boolean(result)} current={activity.progress.current} onContinue={onNext} total={activity.progress.total}>{result?.correct && <CelebrationFall />}<div className="mx-auto max-w-3xl text-center"><span className="rounded-full bg-[#a7f3a0] px-4 py-2 text-sm font-bold text-[#0f6f25]">{activity.skill}</span><h1 className="mt-7 text-4xl font-black">{phrase}</h1>{activity.transliteration && <p className="mt-4 text-xl italic">{activity.transliteration}</p>}<div className="mt-6"><AudioButton size="small" onClick={() => activity.speech.speak({ text: phrase, language: activity.language.audio_locale })} /></div><section className="mt-10 grid min-h-72 place-items-center rounded-2xl bg-white p-8 shadow-sm"><div><button className={`mx-auto grid size-32 place-items-center rounded-full text-white shadow-xl ${recording ? 'animate-pulse bg-red-600' : 'bg-[#0f6f25]'}`} onClick={result ? handleRetry : toggle} type="button"><LessonIcon className="size-12" name="microphone" /></button><p className="mt-5 font-bold">{recording ? 'Recording — tap to stop' : result ? 'Practice saved' : 'Tap to start speaking'}</p>{result && <button className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-[#0f6f25] bg-[#edf8ef] px-6 py-2.5 font-bold text-[#0f6f25] transition hover:bg-[#dcf0e0]" onClick={handleRetry} type="button">Retry Pronunciation</button>}{error && <p className="mt-3 text-red-700">{error}</p>}</div></section>{activity.pronunciation_tips && <aside className="mt-6 rounded-2xl bg-[#eaf1ff] p-5 text-left"><strong>Pronunciation tip:</strong> {activity.pronunciation_tips}</aside>}</div></LessonShell>
}
