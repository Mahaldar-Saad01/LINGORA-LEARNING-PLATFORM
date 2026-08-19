import aiAvatar from '../../assets/images/ai_avatar.png'

function getNextQuestionText(isLastGroup, questionStartNumber) {
  return isLastGroup ? 'Results' : `Question ${questionStartNumber + 1}`
}

function WritingQuestionHolder({
  answer,
  isLastGroup,
  isSubmitting,
  onAnswerChange,
  onNext,
  onSkip,
  question,
  questionStartNumber,
  submitError,
  totalQuestions,
  speech,
}) {
  const maxCharacters = question.maxCharacters || 150
  const minCharacters = question.minCharacters || 1
  const minimumWords = question.minimumWords || 1
  const trimmedAnswer = answer.trim()
  const wordCount = trimmedAnswer.split(/\s+/).filter(Boolean).length
  const hasEnoughWriting = trimmedAnswer.length >= minCharacters && wordCount >= minimumWords
  const nextQuestionText = getNextQuestionText(isLastGroup, questionStartNumber)

  const handleAnswerChange = (event) => {
    onAnswerChange(event.target.value.slice(0, maxCharacters))
  }

  return (
    <div className="mx-auto mt-12 grid max-w-[920px] grid-cols-[minmax(0,1fr)_180px] gap-7 max-md:grid-cols-1">
      <section>
        <h2 className="text-[clamp(32px,5vw,44px)] font-black leading-tight text-[#101010]">
          Writing Practice
        </h2>

        <article className="premium-card glass-panel mt-5 rounded-[18px] px-7 py-6 shadow-[0_18px_40px_rgba(28,67,39,0.06)]">
          <p className="text-[clamp(20px,3vw,25px)] font-bold leading-relaxed text-[#6d746b]">
            {question.prompt}
          </p>
          <button
            className="mt-5 inline-flex h-11 items-center gap-3 rounded-full bg-[#e1e8db] px-6 text-base font-bold text-[#243024]"
            aria-label={speech.isSpeaking ? 'Stop reading instruction' : 'Listen to instruction'}
            disabled={!speech.supported}
            onClick={() => speech.isSpeaking ? speech.stop() : speech.speak()}
            type="button"
          >
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">volume_up</span>
            {speech.isSpeaking ? 'Stop' : 'Listen'}
          </button>
        </article>

        <div className="mt-16 max-md:mt-8">
          <label className="sr-only" htmlFor={`writing-answer-${questionStartNumber}`}>
            Writing answer
          </label>
          <div className="relative">
            <textarea
              className="min-h-[220px] w-full resize-none rounded-[24px] border-2 border-[#c8d5c6] bg-white px-7 py-7 pr-10 text-xl font-bold leading-relaxed text-[#243024] shadow-[0_18px_35px_rgba(28,67,39,0.06)] outline-none transition focus:border-[#0f6f25] focus:ring-4 focus:ring-[#0f6f25]/10"
              id={`writing-answer-${questionStartNumber}`}
              maxLength={maxCharacters}
              onChange={handleAnswerChange}
              placeholder="Start typing your answer here..."
              value={answer}
            />
            <span className="absolute bottom-5 right-7 text-base font-black text-[#6d746b]">
              {answer.length} / {maxCharacters} characters
            </span>
          </div>
          <p className="mt-3 text-sm font-bold text-[#6d746b]">
            Write at least one word so I can check your answer.
          </p>
        </div>

        <div className="mt-9 flex items-center gap-5 max-sm:flex-col">
          <button
            className="premium-button inline-flex h-16 min-w-[280px] items-center justify-center gap-3 rounded-[24px] bg-[#0f6f25] px-8 text-lg font-black text-white shadow-[0_14px_26px_rgba(15,111,37,0.22)] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none max-sm:w-full max-sm:min-w-0"
            disabled={!hasEnoughWriting || isSubmitting}
            onClick={onNext}
            type="button"
          >
            {isSubmitting ? 'Saving Assessment...' : 'Check Answer'}
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">
              {isLastGroup ? 'check' : 'auto_fix_high'}
            </span>
          </button>
          <button
            className="inline-flex h-16 min-w-[120px] items-center justify-center rounded-[24px] border-2 border-[#0f6f25] bg-white px-7 text-lg font-black text-[#0f6f25] shadow-[0_10px_22px_rgba(28,67,39,0.05)] max-sm:w-full"
            disabled={isSubmitting}
            onClick={onSkip}
            type="button"
          >
            Skip
          </button>
        </div>

        {submitError && (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800">
            {submitError}
          </p>
        )}
      </section>

      <aside className="grid content-start gap-4 justify-self-center max-md:w-full max-md:max-w-[260px]">
        <div className="premium-card glass-panel rounded-[20px] px-5 py-5 text-center shadow-[0_18px_35px_rgba(28,67,39,0.06)]">
          <p className="text-base font-black leading-snug text-[#6d746b]">
            {question.hint || 'Take your time, friend. Every word is a step forward!'}
          </p>
        </div>
        <img
          className="mx-auto size-32 object-contain drop-shadow-[0_18px_28px_rgba(46,125,50,0.22)]"
          src={aiAvatar}
          alt="Lumina AI avatar encouraging writing practice"
        />
        <div className="rounded-2xl border border-dashed border-[#d7d7d2] bg-white/70 px-4 py-3 text-sm font-bold italic text-[#b4b4af]">
          Next up: {nextQuestionText}
        </div>
        <p className="text-center text-sm font-black uppercase tracking-[0.18em] text-[#6e756b]">
          Question {questionStartNumber} of {totalQuestions}
        </p>
      </aside>
    </div>
  )
}

export default WritingQuestionHolder
