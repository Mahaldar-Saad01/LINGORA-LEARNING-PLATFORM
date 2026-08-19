import CelebrationFall from '../../components/lessons/CelebrationFall'
import JourneyFooter from '../../components/lessons/JourneyFooter'
import LessonIcon from '../../components/lessons/LessonIcon'
import LessonBackground from '../../components/lessons/LessonBackground'
import { normalizeMistake } from '../../utils/lessonResultFormatting'

const skillDetails = {
  reading: { title: 'Reading', color: '#2e7d32', description: 'Word recognition, meaning and translation' },
  writing: { title: 'Writing', color: '#5b8def', description: 'Sentence building and grammar' },
  speaking: { title: 'Speaking', color: '#9b6bd3', description: 'Recognized text and spoken practice' },
}

export default function LessonResultsPage({ completion, lesson, mistakes, onFinish, onRetry }) {
  const normalizedMistakes = mistakes.map(normalizeMistake)
  const proficiency = Array.isArray(completion?.skill_proficiency) ? completion.skill_proficiency : []
  const skills = Object.keys(skillDetails).map((key) => ({
    key,
    ...skillDetails[key],
    ...(proficiency.find((item) => item.skill === key) || {}),
  }))
  const scoredSkills = skills.filter((skill) => skill.score !== null && skill.score !== undefined)
  const overall = scoredSkills.length
    ? Math.round(scoredSkills.reduce((total, skill) => total + skill.score, 0) / scoredSkills.length)
    : completion?.accuracy ?? 0

  const isCompleted = completion?.is_completed ?? (overall === 100)
  const targetLang = lesson?.target_language_code || lesson?.target_language || 'hindi'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8faf6]">
      <LessonBackground language={targetLang} />
      <main className="route-fade relative z-10 flex min-h-screen flex-col text-[#101c31]">
        {isCompleted && <CelebrationFall />}
    <section className="mx-auto w-full max-w-[1100px] flex-1 px-6 py-12 sm:px-10">
      <div className="text-center">
        <span className={`mx-auto grid size-20 place-items-center rounded-full ${isCompleted ? 'bg-[#dff5df] text-[#0f6f25] shadow-[0_10px_30px_rgba(15,111,37,.14)]' : 'bg-[#fff0e5] text-[#d96b27] shadow-[0_10px_30px_rgba(217,107,39,.14)]'}`}>
          <LessonIcon className="size-10" name={isCompleted ? "check" : "refresh"} />
        </span>
        <p className={`mt-6 text-sm font-black uppercase tracking-[.24em] ${isCompleted ? 'text-[#0f6f25]' : 'text-[#d96b27]'}`}>
          {isCompleted ? 'Lesson Completed & Unlocked' : 'Lesson Requires 100% to Unlock'}
        </p>
        <h1 className="mt-3 text-4xl font-black sm:text-5xl">Your skill preview</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[#566056]">
          {isCompleted
            ? <>Great job! You answered all questions correctly in <strong>{lesson.title}</strong>.</>
            : <>You must answer <strong>every question correctly (100%)</strong> to complete <strong>{lesson.title}</strong> and unlock the next lesson.</>}
        </p>
        <div className="mx-auto mt-7 flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 shadow-sm">
            <LessonIcon className="size-5 text-[#f0a41f]" name="star" />
            <strong>{overall}% overall · {completion?.xp_earned ?? 0} XP earned</strong>
          </div>

          {completion?.energy && (
            <div className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold shadow-sm ${completion.energy_deducted
                ? 'border-amber-200/80 bg-amber-50 text-amber-900'
                : 'border-emerald-200/80 bg-emerald-50 text-emerald-900'
              }`}>
              <span>⚡</span>
              {completion.energy.is_premium ? (
                <span><strong>Unlimited Energy</strong> (Premium)</span>
              ) : completion.energy_deducted ? (
                <span><strong>-6 Energy deducted</strong> · Current: {completion.energy.current_energy}/{completion.energy.max_energy}</span>
              ) : (
                <span><strong>0 Energy deducted</strong> · Try again for 100% completion</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {skills.map((skill) => {
          const score = skill.score ?? 0
          return <article className="rounded-2xl bg-white p-6 shadow-[0_12px_30px_rgba(28,67,39,.08)]" key={skill.key}>
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">{skill.title}</h2><strong style={{ color: skill.color }}>{skill.attempted ? `${score}%` : 'Not tested'}</strong></div>
            <p className="mt-2 min-h-12 text-sm text-[#667066]">{skill.description}</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e8edf4]"><div className="h-full rounded-full transition-[width] duration-700" style={{ backgroundColor: skill.color, width: `${score}%` }} /></div>
            <p className="mt-4 text-sm font-bold text-[#475047]">{skill.attempted ? `${skill.correct}/${skill.attempted} correct · ${score >= 90 ? 'Excellent work' : score >= 75 ? 'Good progress' : 'Keep practising'}` : 'No question attempted in this lesson'}</p>
          </article>
        })}
      </div>

      <section className="mt-10 rounded-2xl bg-white p-6 shadow-[0_12px_30px_rgba(28,67,39,.08)] sm:p-8">
        <div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-xl bg-[#fff0e8] text-[#b6532d]"><LessonIcon name="lightbulb" /></span><div><h2 className="text-2xl font-black">Mistakes to review</h2><p className="text-[#667066]">Use these corrections to make the next lesson easier.</p></div></div>
        {normalizedMistakes.length === 0 ? <div className="mt-7 rounded-2xl border border-[#cde2ce] bg-[#f1fbf1] p-6 text-center"><strong className="text-lg text-[#0f6f25]">Perfect lesson - no mistakes to review!</strong></div> : <div className="mt-7 space-y-4">
          {normalizedMistakes.map((mistake, index) => <article className="rounded-2xl border border-[#f0d8cf] bg-[#fffaf7] p-5" key={mistake.id}>
            <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-[#f4e9ff] px-3 py-1 text-xs font-black text-[#71429c]">{mistake.skill}</span><span className="text-sm font-bold text-[#7a837a]">{mistake.manuallyConfirmed ? 'Unverified practice' : `Mistake ${index + 1}`}</span></div>
            <h3 className="mt-3 break-words whitespace-pre-wrap font-bold" dir="auto">{mistake.question}</h3>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p className="min-w-0 break-words whitespace-pre-wrap rounded-lg bg-[#fde9e5] px-4 py-3 text-[#9d352b]" dir="auto"><strong>Your answer:</strong> {mistake.userAnswerDisplay}</p>
              <p className="min-w-0 break-words whitespace-pre-wrap rounded-lg bg-[#e5f6e6] px-4 py-3 text-[#176d2a]" dir="auto"><strong>Correct answer:</strong> {mistake.correctAnswerDisplay}</p>
            </div>
            {mistake.explanation && <p className="mt-3 break-words whitespace-pre-wrap text-sm text-[#566056]" dir="auto">{mistake.explanation}</p>}
          </article>)}
        </div>}
      </section>
    </section>
    <JourneyFooter
      onClick={isCompleted ? onFinish : (onRetry || onFinish)}
      secondaryButton={!isCompleted && onRetry ? { text: 'Back to Learning Path', onClick: onFinish } : null}
    >
      {isCompleted ? 'Return to Learning Path' : 'Try Again (100% Required)'}
    </JourneyFooter>
  </main>
</div>
  )
}
