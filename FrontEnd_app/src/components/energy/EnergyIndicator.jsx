import { useEffect, useState } from 'react'
import { useEnergy } from '../../context/EnergyContext'

function formatCountdown(nextEnergyAt) {
  if (!nextEnergyAt) return ''
  const diffMs = new Date(nextEnergyAt).getTime() - Date.now()
  if (diffMs <= 0) return 'refilling...'

  const totalSec = Math.floor(diffMs / 1000)
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `+1 in ${mins}m ${secs < 10 ? '0' : ''}${secs}s`
}

export default function EnergyIndicator({ energy: propEnergy, onOpenUpgrade: propOnOpenUpgrade, className = '' }) {
  const { energy: contextEnergy, openUpgradeModal } = useEnergy()
  const energy = propEnergy || contextEnergy
  const onOpenUpgrade = propOnOpenUpgrade || openUpgradeModal

  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!energy || energy.is_premium || !energy.next_energy_at) {
      setCountdown('')
      return undefined
    }

    const updateTimer = () => setCountdown(formatCountdown(energy.next_energy_at))
    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [energy])

  if (!energy) return null

  if (energy.is_premium) {
    return (
      <div className={`inline-flex items-center gap-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-2 shadow-sm ${className}`}>
        <span className="flex size-7 items-center justify-center rounded-xl bg-[#0f5025] text-xs font-bold text-white shadow-sm">
          ⚡
        </span>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-extrabold text-[#0f5025]">Unlimited</span>
            <span className="rounded-md bg-[#0f5025] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
              PRO
            </span>
          </div>
        </div>
      </div>
    )
  }

  const isFull = energy.current_energy >= energy.max_energy
  const isLow = energy.current_energy < (energy.normal_lesson_cost || 6)

  return (
    <div className={`inline-flex items-center gap-3.5 rounded-2xl border border-emerald-100 bg-white p-2 px-3.5 shadow-sm transition-all hover:border-[#0f5025]/30 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className={`flex size-8 items-center justify-center rounded-xl text-xs font-bold shadow-sm ${isLow ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-emerald-100/70 text-[#0f5025]'
          }`}>
          ⚡
        </span>
        <div className="flex flex-col text-left">
          <div className="flex items-baseline gap-1">
            <span className={`text-base font-extrabold ${isLow ? 'text-amber-600' : 'text-neutral-800'}`}>
              {energy.current_energy}
            </span>
            <span className="text-xs font-bold text-neutral-400">/ {energy.max_energy}</span>
          </div>
          <span className="text-[10px] font-semibold text-neutral-500">
            {isFull ? 'Energy Full' : countdown || 'Regenerating'}
          </span>
        </div>
      </div>

      {onOpenUpgrade && (
        <button
          onClick={onOpenUpgrade}
          className="inline-flex items-center gap-1 rounded-xl bg-[#0f5025] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0c401d] active:scale-95"
          type="button"
          title="Upgrade for Unlimited Energy"
        >
          <span className="text-xs">⚡</span>
          <span>GET PRO</span>
        </button>
      )}
    </div>
  )
}