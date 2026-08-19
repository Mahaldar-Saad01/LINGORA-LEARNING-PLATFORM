import aiAvatar from "../../assets/images/ai_avatar.png";

function LessonNode({
  lessonNumber,
  x,
  y,
  status = "locked",
  isCurrent = false,
  onStart,
  title,
  isBusy = false,
}) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";

  return (
    <div
      className="absolute h-32 w-32"
      style={{
        left: `${x - 64}px`,
        top: `${y - 64}px`,
      }}
    >
      {isCurrent && (
        <div className="pointer-events-none absolute -top-36 left-1/2 z-20 flex -translate-x-1/2 items-end gap-3">
          <img
            className="floating w-32 drop-shadow-[0_20px_28px_rgba(46,125,50,0.26)]"
            src={aiAvatar}
            alt="AI avatar marking current lesson"
          />
          <span className="mb-8 min-w-[160px] rounded-2xl border-3 border-green-200 bg-white/95 px-4 py-3 text-sm font-black leading-snug text-black-300 shadow-[0_16px_32px_rgba(28,67,39,0.10)]">
            Keep going. This one is yours.
          </span>
        </div>
      )}

      {isCurrent && (
        <span className="absolute -inset-3 rounded-full border-4 border-[#f7c85f]/70 bg-[#f7c85f]/10" aria-hidden="true" />
      )}

      <button
        aria-label={
          isLocked
            ? `Lesson ${lessonNumber} locked`
            : isCompleted
              ? `Lesson ${lessonNumber} completed`
              : `Start lesson ${lessonNumber}${title ? `: ${title}` : ''}`
        }
        className={`
          relative
          z-10
          grid
          h-32
          w-32
          place-items-center
          rounded-full
          text-3xl
          font-bold
          text-white
          shadow-[0_8px_0_#2f8f46]
          transition-all
          ${isLocked ? "cursor-not-allowed bg-[#aeb8ad] shadow-[0_8px_0_#7d887c]" : "bg-[#58cc6c] hover:scale-110"}
          ${isCompleted ? "bg-[#0f6f25] shadow-[0_8px_0_#084719]" : ""}
          ${isCurrent ? "ring-4 ring-[#f7c85f]/80" : ""}
        `}
        disabled={isLocked || isBusy}
        onClick={!isLocked ? onStart : undefined}
        type="button"
      >
        {isBusy ? (
          <span className="size-9 animate-spin rounded-full border-4 border-white/40 border-t-white" aria-hidden="true" />
        ) : isLocked ? (
          <span className="material-symbols-outlined text-4xl" aria-hidden="true">lock</span>
        ) : isCompleted ? (
          <span className="material-symbols-outlined text-4xl" aria-hidden="true">check</span>
        ) : (
          lessonNumber
        )}
      </button>
    </div>
  );
}

export default LessonNode;
