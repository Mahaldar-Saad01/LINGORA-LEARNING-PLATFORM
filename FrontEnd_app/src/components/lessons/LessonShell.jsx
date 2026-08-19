import JourneyFooter from './JourneyFooter'
import JourneyHeader from './JourneyHeader'
import LessonBackground from './LessonBackground'

export default function LessonShell({ children, current, total, canContinue = true, continueLabel, onContinue, onSkip, language = 'hindi' }) {
  const skipQuestion = onSkip || (() => onContinue({ skipped: true }))
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8faf6]">
      <LessonBackground language={language} />
      <main className="route-fade relative z-10 flex min-h-screen flex-col text-[#101c31]">
        <JourneyHeader current={current} total={total} />
        <section className="mx-auto w-full max-w-[1120px] flex-1 px-6 pb-12 pt-5 sm:px-10 sm:pt-10">{children}</section>
        <JourneyFooter disabled={!canContinue} onClick={onContinue} onSkip={skipQuestion}>{continueLabel}</JourneyFooter>
      </main>
    </div>
  )
}
