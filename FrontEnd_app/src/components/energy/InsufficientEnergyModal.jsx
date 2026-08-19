import { useEffect, useState } from 'react'

function formatTimer(nextEnergyAt) {
  if (!nextEnergyAt) return 'Calculating...'
  const diffMs = new Date(nextEnergyAt).getTime() - Date.now()
  if (diffMs <= 0) return 'Ready to refill!'

  const totalSec = Math.floor(diffMs / 1000)
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`
}

export default function InsufficientEnergyModal({
  isOpen,
  onClose,
  energy,
  onOpenUpgrade,
  onStartFreeReview,
}) {
  const [timerText, setTimerText] = useState('')

  useEffect(() => {
    if (!isOpen || !energy?.next_energy_at) return undefined

    const update = () => setTimerText(formatTimer(energy.next_energy_at))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [isOpen, energy])

  if (!isOpen) return null

  const current = energy?.current_energy || 0
  const required = energy?.required_energy || energy?.normal_lesson_cost || 6
  const needed = Math.max(0, required - current)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-100 bg-white p-7 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 transition"
          type="button"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 flex size-20 items-center justify-center rounded-3xl bg-emerald-50 text-3xl shadow-inner border border-emerald-100">
            <span>⚡</span>
            <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-[#0f5025] text-xs font-extrabold text-white">
              {current}
            </span>
          </div>

          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
            Need More Energy!
          </h2>
          <p className="mt-2 text-sm font-medium text-neutral-500">
            You need <strong className="text-[#0f5025]">{required} energy</strong> to start a new progression lesson. You currently have <strong className="text-neutral-800">{current}</strong>.
          </p>

          <div className="mt-5 w-full rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
              <span>Next +1 Energy in:</span>
              <span className="font-mono text-sm font-black text-[#0f5025]">{timerText}</span>
            </div>
            <p className="mt-1.5 text-left text-[11px] font-medium text-neutral-500">
              Need {needed} more energy ({needed} hrs full wait or upgrade for instant access).
            </p>
          </div>

          <div className="mt-6 flex w-full flex-col gap-3">
            <button
              onClick={() => {
                onClose()
                if (onOpenUpgrade) onOpenUpgrade()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f5025] py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-[#0c401d] active:scale-[0.98]"
              type="button"
            >
              <span>⚡</span> Upgrade for Unlimited Energy
            </button>

            {onStartFreeReview && (
              <button
                onClick={() => {
                  onClose()
                  onStartFreeReview()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50"
                type="button"
              >
                <span>📖</span> Practice Free Review (0 Energy)
              </button>
            )}

            <button
              onClick={onClose}
              className="py-1 text-xs font-bold text-neutral-400 hover:text-neutral-600 transition"
              type="button"
            >
              Wait for regeneration
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}