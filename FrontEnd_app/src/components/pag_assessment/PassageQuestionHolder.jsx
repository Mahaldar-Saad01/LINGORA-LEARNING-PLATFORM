function PassageQuestionHolder({
  isSubmitting,
  onNext,
  onOptionSelect,
  question,
  questionStartNumber,
  selectedOptions,
  submitError,
  totalQuestions,
  speech,
}) {
  const passage = question.passage || {
    label: question.passage_label,
    title: question.passage_title,
    text: question.passage_text,
    readTime: question.passage_read_time,
    hintTitle: question.passage_hint_title,
    hintText: question.passage_hint_text,
  }
  const questions = Array.isArray(question.questions)
    ? question.questions.slice(0, 2)
    : [question]
  const hasAnsweredAll = questions.every((_, index) => selectedOptions[index])
  return (
    <div className="mx-auto mt-12 grid max-w-[920px] grid-cols-[minmax(0,1.1fr)_minmax(320px,0.78fr)] gap-7 max-lg:grid-cols-1">
      <article className="premium-card glass-panel rounded-[28px] px-8 py-8 shadow-[0_24px_55px_rgba(28,67,39,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <span className="rounded-full bg-[#dff2e2] px-4 py-1.5 text-sm font-black text-[#0f6f25]">
            {passage.label}
          </span>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-[#243024]">
            <span className="material-symbols-outlined text-lg text-[#0f6f25]" aria-hidden="true">
              timer
            </span>
            {passage.readTime}
          </span>
        </div>

        <h1 className="mt-7 text-[clamp(30px,4vw,42px)] font-black leading-tight text-[#101010]">
          {passage.title}
        </h1>
        <p className="mt-5 max-w-[720px] text-lg leading-9 text-[#303030]">
          {passage.text}
        </p>
        <button
          className="mt-5 inline-flex h-11 items-center gap-3 rounded-full bg-[#e1e8db] px-6 text-base font-bold text-[#243024]"
          aria-label={speech.isSpeaking ? 'Stop reading passage' : 'Listen to passage'}
          disabled={!speech.supported}
          onClick={() => speech.isSpeaking ? speech.stop() : speech.speak()}
          type="button"
        >
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">volume_up</span>
          {speech.isSpeaking ? 'Stop' : 'Listen'}
        </button>
        <div className="mt-9 flex items-center gap-5 rounded-[24px] border border-[#d7d7d2] bg-[#f4f3f1] px-5 py-4 shadow-[0_14px_28px_rgba(28,67,39,0.05)]">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#243024] text-2xl">
            AI
          </span>
          <div>
            <strong className="text-base font-black text-[#0f6f25]">
              {passage.hintTitle}
            </strong>
            <p className="mt-1 text-sm font-medium text-[#555f52]">{passage.hintText}</p>
          </div>
        </div>
      </article>

      <aside className="premium-card glass-panel rounded-[28px] px-7 py-8 shadow-[0_24px_55px_rgba(28,67,39,0.08)]">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#8a4f16] text-white">
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">
              quiz
            </span>
          </span>
          <h2 className="text-2xl font-black text-[#243024]">Knowledge Check</h2>
        </div>

        <p className="mt-8 text-sm font-black uppercase tracking-[0.24em] text-[#6e756b]">
          {questions.length === 1
            ? `Question ${questionStartNumber} of ${totalQuestions}`
            : `Questions ${questionStartNumber}-${questionStartNumber + questions.length - 1} of ${totalQuestions}`}
        </p>

        <div className="mt-5 grid gap-7">
          {questions.map((groupQuestion, groupQuestionIndex) => (
            <div
              className="rounded-[24px] border border-[#e4e4df] bg-white/55 p-4"
              key={groupQuestion.prompt}
            >
              <h3 className="text-xl font-black leading-snug text-[#243024]">
                {groupQuestion.prompt}
              </h3>

              <div className="mt-4 grid gap-3">
                {groupQuestion.options.map((option) => {
                  const isSelected = selectedOptions[groupQuestionIndex]?.text === option.text

                  return (
                    <div
                      className={`relative flex min-h-[58px] items-center rounded-[20px] border-2 bg-white shadow-[0_12px_25px_rgba(28,67,39,0.04)] transition hover:border-[#0f6f25] ${isSelected
                          ? 'border-[#0f6f25] bg-[#f3faf4] text-[#0f6f25]'
                          : 'border-[#d7d7d2] text-[#303030]'
                        }`}
                      key={option.text}
                    >
                      <button
                        className="flex min-h-[54px] flex-1 items-center gap-4 px-5 py-3 pr-12 text-left"
                        onClick={() => onOptionSelect(groupQuestionIndex, option)}
                        type="button"
                      >
                        <span
                          className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${isSelected ? 'border-[#0f6f25]' : 'border-[#7b8978]'
                            }`}
                          aria-hidden="true"
                        >
                          {isSelected && <span className="size-2 rounded-full bg-[#0f6f25]" />}
                        </span>
                        <span className="font-bold">{option.text}</span>
                      </button>
                      <button
                        aria-label={`Listen to option ${option.text}`}
                        className="absolute right-3 grid size-8 place-items-center rounded-full bg-[#e1e8db] text-[#243024]"
                        disabled={!speech.supported}
                        onClick={() => speech.speakText(option.text)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-lg" aria-hidden="true">volume_up</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

        </div>

        {submitError && (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800">
            {submitError}
          </p>
        )}

        <button
          className="premium-button mt-8 inline-flex h-14 w-full items-center justify-center gap-3 rounded-3xl bg-[#0f6f25] px-6 text-base font-black text-white shadow-[0_14px_26px_rgba(15,111,37,0.22)] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none"
          disabled={!hasAnsweredAll || isSubmitting}
          onClick={onNext}
          type="button"
        >
          {isSubmitting ? 'Saving Assessment...' : 'Check Answer'}
          <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span>
        </button>
      </aside>
    </div>
  )
}

export default PassageQuestionHolder
