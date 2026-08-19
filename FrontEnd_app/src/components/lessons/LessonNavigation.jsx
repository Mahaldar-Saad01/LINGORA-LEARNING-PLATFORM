import JourneyFooter from './JourneyFooter'
export default function LessonNavigation({ canContinue, isLoading, isFinal, onNext, onPrevious, onSkip }) {
  return <><div className="mx-auto w-full max-w-[1120px] px-6 pb-3 sm:px-10">{onPrevious && <button className="font-bold text-[#0f6f25] disabled:opacity-40" disabled={isLoading} onClick={onPrevious} type="button">← Previous</button>}</div><JourneyFooter disabled={!canContinue || isLoading} onClick={onNext} onSkip={onSkip}>{isLoading ? 'Please wait…' : isFinal ? 'Complete lesson' : 'Continue'}</JourneyFooter></>
}
