import { useState } from 'react'
import { cancelPremium, upgradeToPremium } from '../../services/energyApi'

export default function UpgradePremiumModal({ isOpen, onClose, energy, onEnergyUpdated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  const isPremium = energy?.is_premium

  const handleUpgrade = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await upgradeToPremium(30)
      setSuccess('🎉 Successfully upgraded to Premium! You now have Unlimited Energy.')
      if (onEnergyUpdated) onEnergyUpdated(res.energy)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to process upgrade.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await cancelPremium()
      setSuccess('Subscription cancelled. Returned to Free plan.')
      if (onEnergyUpdated) onEnergyUpdated(res.energy)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to cancel subscription.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 transition"
          type="button"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl text-[#0f5025] border border-emerald-100 shadow-sm">
            ⚡
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#0f5025]">
            <span>PRO SUBSCRIPTION</span>
          </div>

          <h2 className="mt-3 text-2xl font-black text-neutral-900 tracking-tight">
            {isPremium ? 'You are a Premium Learner!' : 'Unlock Unlimited Energy'}
          </h2>
          <p className="mt-2 text-sm font-medium text-neutral-500">
            {isPremium
              ? 'Enjoy zero waiting time, unlimited lessons, and accelerated language learning progression.'
              : 'Never wait for energy regeneration again. Learn at your own pace with unlimited progression lessons.'}
          </p>

          <div className="mt-6 grid w-full grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4">
              <span className="text-xl">⚡</span>
              <h4 className="mt-1 text-sm font-extrabold text-neutral-900">Unlimited Energy</h4>
              <p className="text-[11px] font-medium text-neutral-500">No waiting limit between lessons.</p>
            </div>

            <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4">
              <span className="text-xl">🚀</span>
              <h4 className="mt-1 text-sm font-extrabold text-neutral-900">Fast Progression</h4>
              <p className="text-[11px] font-medium text-neutral-500">Complete paths without delays.</p>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-[#0f5025]">
              {success}
            </p>
          )}

          <div className="mt-7 flex w-full flex-col gap-3">
            {!isPremium ? (
              <button
                disabled={loading}
                onClick={handleUpgrade}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f5025] py-3.5 text-base font-extrabold text-white shadow-md transition hover:bg-[#0c401d] active:scale-[0.98] disabled:opacity-50"
                type="button"
              >
                {loading ? 'Processing Upgrade...' : '🚀 Upgrade to Premium Now'}
              </button>
            ) : (
              <button
                disabled={loading}
                onClick={handleCancel}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                type="button"
              >
                {loading ? 'Cancelling...' : 'Cancel Premium Subscription'}
              </button>
            )}

            <button
              onClick={onClose}
              className="py-1 text-xs font-bold text-neutral-400 hover:text-neutral-600 transition"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}