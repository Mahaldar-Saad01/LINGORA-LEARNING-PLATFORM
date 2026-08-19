import { useEffect, useMemo, useRef, useState } from 'react'
import { getSpeechLanguage } from '../../../hooks/useSpeechSynthesis'
import AudioButton from '../AudioButton'
import LessonIcon from '../LessonIcon'
import ActivityFrame from './ActivityFrame'

function normalizeText(value, language) {
  return String(value ?? '')
    .toLocaleLowerCase(language)
    .normalize('NFKC')
    .replace(/[.,!?;:'"()[\]{}\-–—]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function calculateWordAccuracy(expectedText, spokenText, language) {
  const expected = normalizeText(expectedText, language)
  const spoken = normalizeText(spokenText, language)

  if (!expected || !spoken) return 0
  if (expected === spoken) return 100

  const expectedWords = expected.split(' ')
  const spokenWords = spoken.split(' ')

  const matchedWords = expectedWords.filter((word) =>
    spokenWords.some(
      (spokenWord) =>
        spokenWord === word ||
        spokenWord.includes(word) ||
        word.includes(spokenWord) ||
        (word.length >= 3 &&
          spokenWord.length >= 3 &&
          word.slice(0, 3) === spokenWord.slice(0, 3)),
    ),
  ).length

  if (matchedWords > 0) {
    const ratio = matchedWords / expectedWords.length
    return Math.max(Math.round(ratio * 100), 35)
  }

  return 0
}

function getRecognitionErrorMessage(errorCode) {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission was denied. Allow microphone access in your browser settings and try again.'

    case 'audio-capture':
      return 'No working microphone was detected. Check your microphone connection and browser settings.'

    case 'no-speech':
      return 'No speech was detected. Move closer to the microphone and try again.'

    case 'network':
      return 'The browser speech-recognition service could not connect. Check your internet connection and try again.'

    case 'aborted':
      return ''

    case 'language-not-supported':
      return 'Speech recognition does not support this language on your browser.'

    default:
      return 'Speech recognition could not complete. Please try again.'
  }
}

export default function SpeakingPracticeActivity(props) {
  const {
    activity,
    lesson,
    onAnswerChange,
    answerState,
    isSubmitted,
    speech,
    onRetry,
  } = props

  const content = activity?.content ?? {}
  const cancelSpeech = speech?.cancel
  const targetPhrase = String(
    content.phrase ??
      content.target_text ??
      content.word ??
      content.text ??
      '',
  ).trim()

  const language = useMemo(
    () =>
      getSpeechLanguage(
        content.language_code ||
          lesson?.audio_locale ||
          lesson?.target_language_code,
      ),
    [
      content.language_code,
      lesson?.audio_locale,
      lesson?.target_language_code,
    ],
  )

  const recognitionRef = useRef(null)
  const recordingStartedAtRef = useRef(0)
  const mountedRef = useRef(true)

  const [recording, setRecording] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [requestingPermission, setRequestingPermission] =
    useState(false)

  const [transcript, setTranscript] = useState(() => answerState?.transcript || '')
  const [accuracy, setAccuracy] = useState(() => answerState?.match_accuracy ?? null)
  const [error, setError] = useState('')
  const [recognitionUnavailable, setRecognitionUnavailable] =
    useState(false)

  const hasSuccessfulAttempt =
    typeof accuracy === 'number' && accuracy >= 30

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false

      if (recognitionRef.current) {
        recognitionRef.current.onstart = null
        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onend = null

        try {
          recognitionRef.current.abort()
        } catch {
          // The recognition session may already be closed.
        }

        recognitionRef.current = null
      }

      cancelSpeech?.()
    }
  }, [cancelSpeech])

  async function listen(rate = 1) {
    if (!targetPhrase) {
      setError('This activity does not contain a phrase to play.')
      return
    }

    if (recording) {
      setError('Stop the microphone before playing the example.')
      return
    }

    setError('')
    setPlaying(true)

    try {
      if (speech?.supported && typeof speech.speak === 'function') {
        await speech.speak({ text: targetPhrase, language, rate })
        if (mountedRef.current) setPlaying(false)
        return
      }
      throw new Error('Speech playback is not supported in this browser.')
    } catch (caught) {
      if (!mountedRef.current) return

      setPlaying(false)
      setError(
        caught?.message ||
          'Speech playback could not be started.',
      )
    }
  }

  function finishRecognition() {
    if (!mountedRef.current) return

    recognitionRef.current = null
    setRecording(false)
    setRequestingPermission(false)
  }

  function handleRecognitionResults(event) {
    const result = event.results?.[0]

    if (!result?.length) {
      setError('No speech result was returned. Please try again.')
      return
    }

    const alternatives = Array.from(result)
      .map((alternative) => ({
        transcript: alternative.transcript?.trim() || '',
        confidence: Number(alternative.confidence) || 0,
      }))
      .filter((alternative) => alternative.transcript)

    if (!alternatives.length) {
      setError('No speech was detected. Please try again.')
      return
    }

    const scoredAlternatives = alternatives.map((alternative) => ({
      ...alternative,
      accuracy: calculateWordAccuracy(
        targetPhrase,
        alternative.transcript,
        language,
      ),
    }))

    const bestResult = scoredAlternatives.reduce(
      (best, current) =>
        current.accuracy > best.accuracy ? current : best,
      scoredAlternatives[0],
    )

    const duration = Math.max(
      0,
      Date.now() - recordingStartedAtRef.current,
    )

    const matched = bestResult.accuracy >= 30

    setTranscript(bestResult.transcript)
    setAccuracy(bestResult.accuracy)
    setError('')

    onAnswerChange?.({
      transcript: bestResult.transcript,
      expected_text: targetPhrase,
      recording_duration_ms: duration,
      recognition_confidence: bestResult.confidence,
      match_accuracy: bestResult.accuracy,
      is_correct: matched,
      was_manually_confirmed: false,
      alternatives: scoredAlternatives,
    })
  }

  async function startRecognition() {
    if (recording || requestingPermission) return

    if (playing) {
      setError('Wait until the example finishes playing.')
      return
    }

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!Recognition) {
      setRecognitionUnavailable(true)
      setError(
        'Automatic speech checking is not supported by this browser. Use Google Chrome or confirm the practice manually.',
      )
      return
    }

    if (!window.isSecureContext) {
      setRecognitionUnavailable(true)
      setError(
        'Microphone access requires HTTPS. During development, open the project through localhost.',
      )
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecognitionUnavailable(true)
      setError(
        'This browser does not provide microphone access.',
      )
      return
    }

    setRequestingPermission(true)
    setError('')
    setTranscript('')
    setAccuracy(null)

    try {
      /*
       * Request permission explicitly so permission errors can be shown
       * before starting SpeechRecognition.
       */
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      stream.getTracks().forEach((track) => track.stop())

      if (!mountedRef.current) return

      const recognition = new Recognition()
      recognitionRef.current = recognition

      recognition.lang = language
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 5

      recognition.onstart = () => {
        if (!mountedRef.current) return

        recordingStartedAtRef.current = Date.now()
        setRecording(true)
        setRequestingPermission(false)
        setRecognitionUnavailable(false)
        setError('')
      }

      recognition.onresult = handleRecognitionResults

      recognition.onerror = (event) => {
        if (!mountedRef.current) return

        const message = getRecognitionErrorMessage(event.error)

        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed' ||
          event.error === 'language-not-supported'
        ) {
          setRecognitionUnavailable(true)
        }

        if (message) setError(message)
      }

      recognition.onend = finishRecognition

      recognition.start()
    } catch (caught) {
      if (!mountedRef.current) return

      setRecording(false)
      setRequestingPermission(false)

      if (
        caught?.name === 'NotAllowedError' ||
        caught?.name === 'SecurityError'
      ) {
        setRecognitionUnavailable(true)
        setError(
          'Microphone permission was denied. Open your browser site settings, allow microphone access, and reload the page.',
        )
        return
      }

      if (caught?.name === 'NotFoundError') {
        setRecognitionUnavailable(true)
        setError(
          'No microphone was found. Connect a microphone and try again.',
        )
        return
      }

      if (caught?.name === 'NotReadableError') {
        setError(
          'The microphone is being used by another application. Close that application and try again.',
        )
        return
      }

      setRecognitionUnavailable(true)
      setError(
        caught?.message ||
          'The microphone could not be started.',
      )
    }
  }

  function stopRecognition() {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.stop()
    } catch {
      finishRecognition()
    }
  }

  function handleRetry() {
    setTranscript('')
    setAccuracy(null)
    setError('')
    onAnswerChange?.(null)
    onRetry?.(activity?.id)
  }

  function toggleRecording() {
    if (isSubmitted) {
      handleRetry()
      return
    }

    if (recording) {
      stopRecognition()
      return
    }

    startRecognition()
  }

  function confirmPractice() {
    const duration = Math.max(
      0,
      Date.now() - recordingStartedAtRef.current,
    )

    setTranscript(targetPhrase)
    setAccuracy(null)
    setRecording(false)
    setError('')

    onAnswerChange?.({
      transcript: targetPhrase,
      expected_text: targetPhrase,
      recording_duration_ms: duration,
      recognition_confidence: null,
      match_accuracy: null,
      is_correct: null,
      was_manually_confirmed: true,
      alternatives: [],
    })
  }

  return (
    <ActivityFrame {...props}>
      <div
        className="mx-auto mt-8 max-w-3xl text-center"
        dir={lesson?.direction || 'ltr'}
      >
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#13752f]">
          Speaking practice
        </p>

        <h2 className="mt-2 text-2xl font-black text-[#102b18]">
          Listen and repeat
        </h2>

        <p className="mt-2 text-sm text-[#68756c]">
          Listen to the phrase, then tap the microphone and repeat it
          clearly.
        </p>

        <div className="mt-7 rounded-3xl border border-[#dbe9dd] bg-[#f2f9f3] px-5 py-8">
          <p className="break-words text-4xl font-black text-[#102b18]">
            {targetPhrase || 'No phrase available'}
          </p>

          {content.transliteration && (
            <p className="mt-3 text-xl italic text-[#53675a]">
              {content.transliteration}
            </p>
          )}

          {content.meaning && (
            <p className="mt-3 text-[#68756c]" dir="auto">
              {content.meaning}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <AudioButton
            disabled={
              playing || recording || !targetPhrase
            }
            label={playing ? 'Playing...' : 'Play phrase'}
            size="small"
            onClick={() => listen(1)}
          />

          <AudioButton
            disabled={
              playing || recording || !targetPhrase
            }
            label="Play slowly"
            size="small"
            onClick={() => listen(0.7)}
          />
        </div>

        <div className="mt-9">
          <button
            aria-label={
              recording ? 'Stop microphone' : 'Start microphone'
            }
            className={`
              mx-auto grid size-28 place-items-center rounded-full
              text-white shadow-[0_12px_30px_rgba(15,111,37,0.22)]
              transition
              hover:scale-105
              disabled:cursor-not-allowed disabled:opacity-50
              ${
                recording
                  ? 'animate-pulse bg-red-600'
                  : 'bg-[#0f6f25] hover:bg-[#0b5d1e]'
              }
            `}
            disabled={
              playing ||
              requestingPermission ||
              !targetPhrase
            }
            onClick={toggleRecording}
            type="button"
          >
            <LessonIcon className="size-11" name="microphone" />
          </button>

          {requestingPermission && (
            <p className="mt-4 font-bold text-[#68756c]">
              Waiting for microphone permission…
            </p>
          )}

          {recording && (
            <div className="mt-4" role="status">
              <p className="font-black text-[#0f6f25]">
                Listening…
              </p>

              <p className="mt-1 text-sm text-[#68756c]">
                Speak now, then tap the microphone to stop.
              </p>
            </div>
          )}
        </div>

        {transcript && (
          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#dde8df] bg-white p-5 text-left">
            <p className="text-xs font-black uppercase tracking-wider text-[#79857c]">
              We heard
            </p>

            <p className="mt-2 text-lg font-black text-[#102b18]">
              {transcript}
            </p>

            {typeof accuracy === 'number' && (
              <>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e8f2e9]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      hasSuccessfulAttempt
                        ? 'bg-[#188038]'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${accuracy}%` }}
                  />
                </div>

                <p
                  className={`mt-3 text-sm font-black ${
                    hasSuccessfulAttempt
                      ? 'text-[#13752f]'
                      : 'text-amber-700'
                  }`}
                >
                  {hasSuccessfulAttempt
                    ? 'Good match. You repeated the phrase correctly.'
                    : `${accuracy}% text match. Listen and try again.`}
                </p>
              </>
            )}
          </div>
        )}

        {isSubmitted && (
          <div className="mx-auto mt-6 max-w-xl text-center">
            <button
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#0f6f25] bg-[#edf8ef] px-6 py-3 font-bold text-[#0f6f25] shadow-sm transition hover:bg-[#dcf0e0] hover:shadow"
              onClick={handleRetry}
              type="button"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">refresh</span>
              Retry Pronunciation
            </button>
            <p className="mt-2 text-xs font-medium text-[#59665b]">
              Want to improve your pronunciation? Tap retry to listen and try speaking again.
            </p>
          </div>
        )}

        {error && (
          <p
            className="mx-auto mt-5 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        {recognitionUnavailable && !isSubmitted && (
          <div className="mt-5">
            <button
              className="rounded-full border-2 border-[#0f6f25] bg-white px-6 py-3 font-bold text-[#0f6f25] transition hover:bg-[#edf8ef]"
              onClick={confirmPractice}
              type="button"
            >
              I listened and repeated it
            </button>

            <p className="mt-2 text-xs text-[#77827a]">
              Use this only when automatic microphone checking is
              unavailable.
            </p>
          </div>
        )}

        <p className="mx-auto mt-5 max-w-xl text-xs text-[#77827a]">
          Your browser may process speech through its recognition service. Audio is not stored by this application.
        </p>

        {content.pronunciation_tip && (
          <div className="mt-7 rounded-2xl border border-[#d8e2f4] bg-[#eef4ff] p-5 text-left text-[#304563]">
            <p>
              <strong>Pronunciation tip:</strong>{' '}
              {content.pronunciation_tip}
            </p>
          </div>
        )}
      </div>
    </ActivityFrame>
  )
}
