import LessonIcon from './LessonIcon'

export default function AudioButton({ disabled = false, isSpeaking, label = 'Play audio', onClick, size = 'large' }) {
  const large = size === 'large'
  const compact = size === 'compact'
  return (
    <button aria-label={label} className={`premium-button inline-flex shrink-0 items-center justify-center rounded-full bg-[#0f6f25] text-white shadow-[0_12px_25px_rgba(15,111,37,0.2)] disabled:cursor-not-allowed disabled:opacity-50 ${large ? 'size-32 ring-[16px] ring-[#dbe8e5]' : compact ? 'size-10' : 'size-14'}`} disabled={disabled || isSpeaking} onClick={onClick} type="button">
      <LessonIcon className={large ? 'size-12' : compact ? 'size-5' : 'size-7'} name="audio" />
      <span className="sr-only">{isSpeaking ? 'Stop audio' : label}</span>
    </button>
  )
}
