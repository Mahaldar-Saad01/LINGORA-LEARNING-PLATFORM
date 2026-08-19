import LessonIcon from './LessonIcon'

export default function JourneyFooter({ children = 'Continue', disabled, onClick, onSkip, secondaryButton }) {
  return (
    <footer className="sticky bottom-0 z-20 mt-auto border-t border-[#cbd6c6] bg-white/95 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[720px] items-center justify-center gap-4 max-sm:flex-col-reverse">
        {secondaryButton && (
          <button
            className="min-h-12 min-w-44 rounded-full border-2 border-[#2e7d32] bg-white px-7 font-bold text-[#176d2a] transition hover:bg-[#edf8ee] disabled:opacity-50"
            disabled={disabled}
            onClick={secondaryButton.onClick}
            type="button"
          >
            {secondaryButton.text}
          </button>
        )}
        {onSkip && <button className="min-h-12 min-w-44 rounded-full border-2 border-[#2e7d32] bg-white px-7 font-bold text-[#176d2a] transition hover:bg-[#edf8ee]" onClick={onSkip} type="button">Skip question</button>}
        <button className="flex min-h-12 w-full max-w-[560px] items-center justify-center gap-4 rounded-full bg-[#0f6f25] px-8 font-bold text-white shadow-[0_8px_18px_rgba(15,111,37,0.18)] transition hover:bg-[#0a591c] disabled:cursor-not-allowed disabled:bg-[#b7c0b7] disabled:text-[#7b8780] disabled:shadow-none" disabled={disabled} onClick={onClick} type="button">
          {children}<LessonIcon className="size-5" name="arrow" />
        </button>
      </div>
    </footer>
  )
}
