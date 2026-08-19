import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import PassageQuestionHolder from '../components/pag_assessment/PassageQuestionHolder'
import WritingQuestionHolder from '../components/pag_assessment/WritingQuestionHolder'
import aiAvatar from '../assets/images/ai_avatar.png'
import useSpeechSynthesis from '../hooks/useSpeechSynthesis'
import { safeParseJson } from '../services/lessonApi'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || '{}')
  } catch {
    return {}
  }
}

function getAssessmentKey(user) {
  return `firstAssessmentScore:${user.id || user.email || 'guest'}`
}

function hasCompletedFirstAssessment(user) {
  if (typeof user.has_completed_assessment === 'boolean') {
    return user.has_completed_assessment
  }

  return localStorage.getItem(getAssessmentKey(user)) !== null
}

function getQuestionGroup(question) {
  if (question.type === 'writing') {
    return [question]
  }

  if (Array.isArray(question.questions)) {
    return question.questions.slice(0, 2)
  }

  return [question]
}

function getAnswerableQuestionCount(question) {
  return getQuestionGroup(question).length
}

function getQuestionStartNumber(questionIndex, questions) {
  return questions
    .slice(0, questionIndex)
    .reduce((total, question) => total + getAnswerableQuestionCount(question), 0) + 1
}

function isPassageQuestion(question) {
  return Boolean(question.passage || question.passage_title)
}

function isWritingQuestion(question) {
  return question.type === 'writing'
}

function getWordCount(answer) {
  return answer.trim().split(/\s+/).filter(Boolean).length
}

function isWritingAnswerCorrect(question, answer) {
  return (
    answer.trim().length >= (question.minCharacters || 1)
    && getWordCount(answer) >= (question.minimumWords || 1)
  )
}

function Assessment() {
  const navigate = useNavigate()
  const user = useMemo(() => getCurrentUser(), [])
  const firstName = user.name?.split(' ')[0] || 'Learner'
  const assessmentKey = getAssessmentKey(user)
  const hasCompletedAssessment = useMemo(() => hasCompletedFirstAssessment(user), [user])
  const [assessmentStarted, setAssessmentStarted] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [selectedPassageOptions, setSelectedPassageOptions] = useState({})
  const [writingAnswer, setWritingAnswer] = useState('')
  const [assessmentAnswers, setAssessmentAnswers] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assessmentResult, setAssessmentResult] = useState(null)
  const [assessmentQuestions, setAssessmentQuestions] = useState([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)
  const [questionLoadError, setQuestionLoadError] = useState('')
  const [languagePair, setLanguagePair] = useState({})
  const speech = useSpeechSynthesis()
  const stopSpeech = speech.stop

  useEffect(() => {
    if (hasCompletedAssessment) {
      setIsLoadingQuestions(false)
      return undefined
    }

    const controller = new AbortController()

    async function loadFirstAssessment() {
      const accessToken = localStorage.getItem('accessToken')

      if (!accessToken) {
        setQuestionLoadError('Please log in again before starting the assessment.')
        setIsLoadingQuestions(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/learning/first-assessment/`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        })
        const data = await safeParseJson(response)

        if (!response.ok) {
          throw new Error(data.detail || 'Could not load the first assessment.')
        }

        setAssessmentQuestions(data.questions || [])
        setLanguagePair(data.language_pair || {})
        setQuestionLoadError('')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setQuestionLoadError(error.message || 'Could not load the first assessment.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingQuestions(false)
        }
      }
    }

    loadFirstAssessment()

    return () => controller.abort()
  }, [hasCompletedAssessment])

  const currentQuestion = assessmentQuestions[questionIndex]
  useEffect(() => stopSpeech(), [questionIndex, stopSpeech])
  useEffect(() => {
    if (assessmentResult) stopSpeech()
  }, [assessmentResult, stopSpeech])

  const explanationLanguage = languagePair.explanation_language || 'en-IN'
  const targetLanguage = languagePair.target_language || 'en-IN'
  const writingSpeech = {
    ...speech,
    speak: () => speech.speakMultilingualText(currentQuestion?.prompt, {
      targetLanguage, explanationLanguage,
    }),
  }
  const passageSpeech = {
    ...speech,
    speak: () => speech.speakMultilingualText(currentQuestion?.passage?.text, {
      targetLanguage, explanationLanguage, latinLanguage: targetLanguage,
    }),
    speakText: (text) => speech.speakMultilingualText(text, {
      targetLanguage, explanationLanguage, latinLanguage: targetLanguage,
    }),
  }
  const mcqSpeech = {
    ...speech,
    speak: () => speech.speak([
      {
        text: currentQuestion?.prompt,
        targetLanguage,
        explanationLanguage,
        pauseAfter: 450,
      },
      ...(currentQuestion?.options || []).map((option, index) => ({
        text: `Option ${index + 1}: ${option.text}`,
        targetLanguage,
        explanationLanguage,
        latinLanguage: targetLanguage,
        pauseAfter: 300,
      })),
    ]),
    speakText: (text) => speech.speakMultilingualText(text, {
      targetLanguage, explanationLanguage, latinLanguage: targetLanguage,
    }),
  }
  const totalAssessmentQuestions = useMemo(
    () => assessmentQuestions.reduce(
      (total, question) => total + getAnswerableQuestionCount(question),
      0,
    ),
    [assessmentQuestions],
  )
  const currentQuestionStartNumber = getQuestionStartNumber(questionIndex, assessmentQuestions)
  const currentQuestionCount = currentQuestion ? getAnswerableQuestionCount(currentQuestion) : 0
  const currentQuestionEndNumber = currentQuestionStartNumber + currentQuestionCount - 1

  const submitFirstAssessment = async (answers) => {
    const accessToken = localStorage.getItem('accessToken')

    if (!accessToken) {
      throw new Error('Please log in again before submitting the assessment.')
    }

    const response = await fetch(`${API_BASE_URL}/api/learning/first-assessment/submit/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answers,
      }),
    })
    const data = await safeParseJson(response)

    if (!response.ok) {
      throw new Error(data.detail || data.score || 'Could not save assessment result.')
    }

    return data
  }

  const handleOptionSelect = (option) => {
    setSelectedOption(option)
  }

  const handlePassageOptionSelect = (groupQuestionIndex, option) => {
    setSelectedPassageOptions((current) => ({
      ...current,
      [groupQuestionIndex]: option,
    }))
  }

  const handleNextQuestion = async ({ skipWriting = false } = {}) => {
    if (!currentQuestion) {
      return
    }

    const passageQuestion = isPassageQuestion(currentQuestion)
    const writingQuestion = isWritingQuestion(currentQuestion)
    const passageQuestions = passageQuestion ? getQuestionGroup(currentQuestion) : []
    const hasAnsweredCurrentQuestion = passageQuestion
      ? passageQuestions.every((_, index) => selectedPassageOptions[index])
      : writingQuestion
        ? skipWriting || isWritingAnswerCorrect(currentQuestion, writingAnswer)
        : Boolean(selectedOption)

    if (!hasAnsweredCurrentQuestion || isSubmitting) {
      return
    }

    const currentAnswers = passageQuestion
      ? passageQuestions.map((question, index) => ({
        question_id: question.id,
        option_id: selectedPassageOptions[index].id,
      }))
      : writingQuestion
        ? [{
          question_id: currentQuestion.id,
          answer_text: skipWriting ? '' : writingAnswer.trim(),
        }]
        : [{
          question_id: currentQuestion.id,
          option_id: selectedOption.id,
        }]
    const nextAnswers = { ...assessmentAnswers }
    currentAnswers.forEach((answer) => {
      nextAnswers[answer.question_id] = answer
    })
    setAssessmentAnswers(nextAnswers)

    if (questionIndex === assessmentQuestions.length - 1) {
      stopSpeech()
      setSubmitError('')
      setIsSubmitting(true)

      try {
        const result = await submitFirstAssessment(Object.values(nextAnswers))
        // TODO: Replace this localStorage completion check with backend profile/current_level
        // data once the auth/profile API returns first-assessment completion status.
        localStorage.setItem(assessmentKey, String(result.score))
        localStorage.setItem(
          'currentUser',
          JSON.stringify({
            ...user,
            has_completed_assessment: true,
          }),
        )
        setAssessmentResult({
          level: result.level,
          score: result.score,
          totalMarks: result.total_marks,
          writingFeedback: result.writing_feedback || [],
        })
      } catch (error) {
        setSubmitError(error.message || 'Assessment result could not be saved. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    setQuestionIndex((current) => current + 1)
    setSelectedOption(null)
    setSelectedPassageOptions({})
    setWritingAnswer('')
  }

  const renderAssessmentProgress = () => {
    const progressPercent = Math.round((currentQuestionEndNumber / totalAssessmentQuestions) * 100)
    const questionLabel = currentQuestionStartNumber === currentQuestionEndNumber
      ? `Question ${currentQuestionStartNumber} of ${totalAssessmentQuestions}`
      : `Questions ${currentQuestionStartNumber}-${currentQuestionEndNumber} of ${totalAssessmentQuestions}`

    return (
      <div className="mx-auto max-w-[920px]">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f6f25]">
              {questionLabel}
            </p>
            <h1 className="mt-2 text-[clamp(30px,4vw,42px)] font-black text-[#101010]">
              First Assessment
            </h1>
          </div>
          <strong className="text-4xl font-black text-[#0f6f25]">
            {progressPercent}%
          </strong>
        </div>
        <div className="mt-4 h-4 overflow-hidden rounded-full border border-[#d7d7d2] bg-[#efeeec]">
          <div
            className="h-full rounded-full bg-[#0f6f25] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    )
  }

  if (assessmentResult) {
    const scorePercent = Math.round((assessmentResult.score / assessmentResult.totalMarks) * 100)
    const levelName = assessmentResult.level?.name || 'your learning level'

    return (
      <main className="route-fade relative grid min-h-screen place-items-center overflow-hidden bg-[#fbfaf9] px-6 py-12 text-[#101010] [box-sizing:border-box] [&_*]:box-border [&_a]:no-underline">
        <div className="particle-field" aria-hidden="true">
          {[10, 18, 29, 41, 52, 66, 77, 88].map((left, index) => (
            <span
              className="particle"
              key={left}
              style={{
                left: `${left}%`,
                animationDelay: `${index * 0.45}s`,
                animationDuration: `${7 + (index % 3)}s`,
              }}
            />
          ))}
        </div>

        <section className="relative z-10 grid w-full max-w-[760px] justify-items-center text-center">
          <div className="relative">
            <span className="absolute -left-8 top-10 size-5 rounded-full bg-[#ffcf7a]" aria-hidden="true" />
            <span className="absolute -right-10 top-4 size-7 rounded-full bg-[#8ad58b]" aria-hidden="true" />
            <span className="absolute -bottom-2 right-8 size-4 rounded-full bg-[#ff9f5a]" aria-hidden="true" />
            <img
              className="floating w-48 drop-shadow-[0_26px_34px_rgba(46,125,50,0.24)]"
              src={aiAvatar}
              alt="Lumina AI avatar cheering"
            />
          </div>

          <article className="glass-panel premium-card relative mt-8 w-full rounded-[32px] px-8 py-9 !border-[#0f6f25] shadow-[0_28px_70px_rgba(28,67,39,0.12)] after:absolute after:-top-[16px] after:left-1/2 after:size-8 after:-translate-x-1/2 after:rotate-45 after:border-l after:border-t after:border-[#0f6f25] after:bg-white/70">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f6f25]">
              Assessment complete
            </p>
            <h1 className="mt-4 text-[clamp(34px,6vw,58px)] font-black leading-tight text-[#101010]">
              Great job, {firstName}.
            </h1>
            <p className="mx-auto mt-3 max-w-[480px] text-lg leading-relaxed text-[#555f52]">
              Your first assessment is saved. I have your starting level ready.
            </p>

            <div className="mx-auto mt-8 grid size-44 place-items-center rounded-full border-[14px] border-[#dff2e2] bg-white shadow-[0_18px_45px_rgba(15,111,37,0.12)]">
              <div>
                <strong className="block text-5xl font-black text-[#0f6f25]">{scorePercent}%</strong>
                <span className="mt-1 block text-sm font-bold text-[#555f52]">
                  {assessmentResult.score}/{assessmentResult.totalMarks} marks
                </span>
              </div>
            </div>

            <p className="mx-auto mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#dff2e2] px-5 py-2 text-sm font-black text-[#0f6f25]">
              <span className="material-symbols-outlined text-lg" aria-hidden="true">school</span>
              Level from backend: {levelName}
            </p>

            <div className="mx-auto mt-8 max-w-[520px]">
              <div className="flex items-center justify-between gap-4 text-sm font-black text-[#243024]">
                <span>Score</span>
                <span>{scorePercent}%</span>
              </div>
              <div className="mt-3 h-4 overflow-hidden rounded-full border border-[#d7d7d2] bg-[#efeeec]">
                <div
                  className="h-full rounded-full bg-[#0f6f25] transition-all duration-700"
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
            </div>

            <button
              className="premium-button mt-9 inline-flex h-14 w-full items-center justify-center gap-3 rounded-3xl bg-[#0f6f25] px-6 text-base font-black text-white shadow-[0_14px_26px_rgba(15,111,37,0.22)]"
              onClick={() => navigate('/dashboard', { replace: true })}
              type="button"
            >
              Open Dashboard
              <span className="material-symbols-outlined text-lg" aria-hidden="true">dashboard</span>
            </button>
          </article>
        </section>
      </main>
    )
  }

  if (hasCompletedAssessment) {
    return <Navigate to="/dashboard" replace />
  }

  if (isLoadingQuestions || questionLoadError || assessmentQuestions.length === 0) {
    return (
      <main className="route-fade relative grid min-h-screen place-items-center overflow-hidden bg-[#fbfaf9] px-6 py-12 text-[#101010] [box-sizing:border-box] [&_*]:box-border [&_a]:no-underline">
        <section className="relative z-10 grid w-full max-w-[560px] justify-items-center text-center">
          <img
            className="floating w-44 drop-shadow-[0_24px_30px_rgba(46,125,50,0.24)]"
            src={aiAvatar}
            alt="Lingora AI avatar"
          />
          <article className="glass-panel premium-card relative mt-8 w-full rounded-[30px] px-8 py-8 shadow-[0_24px_55px_rgba(28,67,39,0.10)]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f6f25]">
              First assessment
            </p>
            <h1 className="mt-4 text-[clamp(30px,6vw,44px)] font-black leading-tight text-[#101010]">
              {isLoadingQuestions ? 'Loading your questions...' : 'Questions unavailable'}
            </h1>
            <p className="mx-auto mt-4 max-w-[420px] text-lg leading-relaxed text-[#555f52]">
              {isLoadingQuestions
                ? 'I am fetching your beginner assessment from the backend.'
                : questionLoadError || 'No first assessment questions were found.'}
            </p>
          </article>
        </section>
      </main>
    )
  }

  if (!assessmentStarted) {
    return (
      <main className="route-fade relative grid min-h-screen place-items-center overflow-hidden bg-[#fbfaf9] px-6 py-12 text-[#101010] [box-sizing:border-box] [&_*]:box-border [&_a]:no-underline">
        <div className="particle-field" aria-hidden="true">
          {[12, 22, 34, 46, 58, 70, 82, 92].map((left, index) => (
            <span
              className="particle"
              key={left}
              style={{
                left: `${left}%`,
                animationDelay: `${index * 0.75}s`,
                animationDuration: `${8 + (index % 3)}s`,
              }}
            />
          ))}
        </div>

        <section className="relative z-10 grid w-full max-w-[620px] justify-items-center text-center">
          <div className="relative">
            <span className="absolute -left-8 top-10 size-5 rounded-full bg-[#ffcf7a]" aria-hidden="true" />
            <span className="absolute -right-10 top-4 size-7 rounded-full bg-[#8ad58b]" aria-hidden="true" />
            <span className="absolute -bottom-2 right-8 size-4 rounded-full bg-[#ff9f5a]" aria-hidden="true" />
            <img
              className="floating w-48 drop-shadow-[0_26px_34px_rgba(46,125,50,0.24)]"
              src={aiAvatar}
              alt="Lingora AI avatar"
            />
          </div>

          <article className="glass-panel premium-card relative mt-8 w-full rounded-[32px] px-8 py-9 shadow-[0_28px_70px_rgba(28,67,39,0.12)] after:absolute after:-top-[16px] after:left-1/2 after:size-8 after:-translate-x-1/2 after:rotate-45 after:border-l after:border-t after:border-white/80 after:bg-white/70">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f6f25]">
              First assessment pending
            </p>
            <h1 className="mt-4 text-[clamp(34px,6vw,54px)] font-black leading-tight text-[#101010]">
              Hi, {firstName}.
            </h1>
            <p className="mx-auto mt-4 max-w-[460px] text-lg leading-relaxed text-[#555f52]">
              You have not given your first assessment yet. I will use it to understand your
              starting level and prepare your learning path.
            </p>
            <button
              className="premium-button mt-8 inline-flex h-14 min-w-[180px] items-center justify-center gap-3 rounded-full bg-[#0f6f25] px-8 text-lg font-black text-white shadow-[0_14px_26px_rgba(15,111,37,0.24)] hover:bg-[#0b5f1f]"
              onClick={() => setAssessmentStarted(true)}
              type="button"
            >
              Let&apos;s go
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </article>
        </section>
      </main>
    )
  }

  if (isWritingQuestion(currentQuestion)) {
    return (
      <main className="route-fade min-h-screen bg-[#fbfaf9] text-[#101010] [box-sizing:border-box] [&_*]:box-border [&_a]:no-underline">
        <section className="route-fade mx-auto w-full max-w-[1120px] px-6 py-12">
          {renderAssessmentProgress()}
          <WritingQuestionHolder
            answer={writingAnswer}
            isLastGroup={questionIndex === assessmentQuestions.length - 1}
            isSubmitting={isSubmitting}
            onAnswerChange={setWritingAnswer}
            onNext={handleNextQuestion}
            onSkip={() => handleNextQuestion({ skipWriting: true })}
            question={currentQuestion}
            questionStartNumber={currentQuestionStartNumber}
            submitError={submitError}
            totalQuestions={totalAssessmentQuestions}
            speech={writingSpeech}
          />
        </section>
      </main>
    )
  }

  if (isPassageQuestion(currentQuestion)) {
    return (
      <main className="route-fade min-h-screen bg-[#fbfaf9] text-[#101010] [box-sizing:border-box] [&_*]:box-border [&_a]:no-underline">
        <section className="route-fade mx-auto w-full max-w-[1120px] px-6 py-12">
          {renderAssessmentProgress()}
          <PassageQuestionHolder
            isLastGroup={questionIndex === assessmentQuestions.length - 1}
            isSubmitting={isSubmitting}
            onNext={handleNextQuestion}
            onOptionSelect={handlePassageOptionSelect}
            question={currentQuestion}
            questionStartNumber={currentQuestionStartNumber}
            selectedOptions={selectedPassageOptions}
            submitError={submitError}
            totalQuestions={totalAssessmentQuestions}
            speech={passageSpeech}
          />
        </section>
      </main>
    )
  }

  return (
    <main className="route-fade min-h-screen bg-[#fbfaf9] text-[#101010] [box-sizing:border-box] [&_*]:box-border [&_a]:no-underline">
      <section className="route-fade mx-auto w-full max-w-[1120px] px-6 py-12">
        {renderAssessmentProgress()}

        <div className="mx-auto mt-12 grid max-w-[920px] grid-cols-[280px_1fr] gap-8 max-md:grid-cols-1">
          <aside className="premium-card glass-panel relative min-h-[430px] rounded-[28px] px-8 py-9 text-center shadow-[0_24px_55px_rgba(28,67,39,0.08)]">
            <h2 className="text-xl font-black text-[#0f6f25]">Current Path</h2>
            <div className="relative mx-auto mt-12 h-[260px] w-[120px]">
              <span className="absolute left-1/2 top-2 size-5 -translate-x-1/2 rounded-full bg-[#7b8978]" />
              {[22, 44, 66, 88, 110, 132, 154, 176].map((top, index) => (
                <span
                  className="absolute size-3 rounded-full bg-[#0f6f25]"
                  key={top}
                  style={{
                    top,
                    left: `${42 + Math.sin(index * 0.8) * 28}%`,
                  }}
                />
              ))}
              <span className="absolute bottom-9 left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-full bg-[#0f6f25] text-white">
                <span className="material-symbols-outlined text-base" aria-hidden="true">flag</span>
              </span>
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-lg font-bold">Clearing</span>
            </div>
          </aside>

          <div>
            <article className="premium-card glass-panel rounded-[28px] px-8 py-8 shadow-[0_24px_55px_rgba(28,67,39,0.08)]">
              <div className="flex gap-6 max-sm:flex-col">
                <span className="grid size-16 shrink-0 place-items-center rounded-full border-4 border-[#8ad58b] bg-[#238331] text-white">
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">psychology</span>
                </span>
                <div>
                  <h2 className="text-2xl font-black leading-snug text-[#101010]">
                    &quot;{currentQuestion.prompt}&quot;
                  </h2>
                  <p className="mt-3 text-lg text-[#555f52]">{currentQuestion.helper}</p>
                  <button
                    className="mt-5 inline-flex h-11 items-center gap-3 rounded-full bg-[#e1e8db] px-6 text-base font-bold text-[#243024]"
                    aria-label={mcqSpeech.isSpeaking ? 'Stop reading question' : 'Listen to question and options'}
                    disabled={!mcqSpeech.supported}
                    onClick={() => mcqSpeech.isSpeaking ? mcqSpeech.stop() : mcqSpeech.speak()}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-2xl" aria-hidden="true">volume_up</span>
                    {mcqSpeech.isSpeaking ? 'Stop' : 'Listen'}
                  </button>
                </div>
              </div>
            </article>

            <div className="mt-8 grid grid-cols-2 gap-5 max-sm:grid-cols-1">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOption?.text === option.text

                return (
                  <div
                    className={`relative min-h-[120px] rounded-[24px] border-2 bg-white shadow-[0_18px_35px_rgba(28,67,39,0.06)] transition hover:-translate-y-1 hover:border-[#0f6f25] ${isSelected
                        ? 'border-[#0f6f25] ring-4 ring-[#0f6f25]/15'
                        : 'border-[#b9c8b5]'
                      }`}
                    key={option.text}
                  >
                    <button
                      className="min-h-[116px] w-full px-14 py-5 text-center"
                      onClick={() => handleOptionSelect(option)}
                      type="button"
                    >
                      <strong className="block text-[clamp(25px,3vw,34px)] font-black text-[#101010]">
                        {option.text}
                      </strong>
                      <span className="mt-1 block text-lg font-bold text-[#7a8178]">{option.meaning}</span>
                    </button>
                    <button
                      aria-label={`Listen to option ${option.text}`}
                      className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-[#e1e8db] text-[#243024]"
                      disabled={!mcqSpeech.supported}
                      onClick={() => mcqSpeech.speakText(option.text)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-xl" aria-hidden="true">volume_up</span>
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="mt-9 flex items-center gap-5 max-sm:flex-col">
              <button
                className="premium-button inline-flex h-16 min-w-[320px] items-center justify-center gap-3 rounded-[24px] bg-[#0f6f25] px-8 text-lg font-black text-white shadow-[0_14px_26px_rgba(15,111,37,0.22)] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none max-sm:w-full max-sm:min-w-0"
                disabled={!selectedOption || isSubmitting}
                onClick={handleNextQuestion}
                type="button"
              >
                <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                  {questionIndex === assessmentQuestions.length - 1 ? 'check' : 'arrow_forward'}
                </span>
                {questionIndex === assessmentQuestions.length - 1
                  ? (isSubmitting ? 'Saving Assessment...' : 'Finish Assessment')
                  : 'Next Question'}
              </button>
              <button
                className="grid size-16 place-items-center rounded-[22px] border-2 border-[#0f6f25] text-[#0f6f25] max-sm:size-14"
                type="button"
                aria-label="Keyboard answer"
              >
                <span className="material-symbols-outlined text-3xl" aria-hidden="true">keyboard</span>
              </button>
            </div>

            {submitError && (
              <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800">
                {submitError}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Assessment
