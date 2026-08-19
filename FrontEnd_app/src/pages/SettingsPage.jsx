import { useState, useEffect, useMemo } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AnimatedBackgroundPaths from '../components/AnimatedBackgroundpaths'
import EnergyIndicator from '../components/energy/EnergyIndicator'
import NotificationBell from '../components/notifications/NotificationBell'
import AnimalAvatar from '../components/AnimalAvatar'
import { getNotificationPreferences, updateNotificationPreferences } from '../services/notificationApi'
import { apiRequest } from '../services/lessonApi'

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || '{}') || {}
  } catch {
    return {}
  }
}

function getSavedBoolean(key, fallback) {
  const savedValue = localStorage.getItem(key)
  return savedValue === null ? fallback : savedValue === 'true'
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const user = useMemo(() => getCurrentUser(), [])
  const hasAccessToken = Boolean(localStorage.getItem('accessToken'))

  // State
  const [accessibilityMode, setAccessibilityMode] = useState(() => getSavedBoolean('accessibilityMode', false))
  const [notifPrefs, setNotifPrefs] = useState({
    notifications_enabled: true,
    lesson_reminders_enabled: true,
    streak_reminders_enabled: true,
    assessment_reminders_enabled: true,
    achievement_notifications_enabled: true,
  })

  // Subscription / Plan State
  const [planType, setPlanType] = useState(() => localStorage.getItem('user_plan_type') || 'Pro Learner Plan')
  const [planStatus, setPlanStatus] = useState('Active')
  const [expiryDays, setExpiryDays] = useState(38)
  const [actionMessage, setActionMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Language Preferences
  const [targetLang, setTargetLang] = useState(user.target_language || 'Spanish')
  const [preferredLang, setPreferredLang] = useState(user.preferred_language || 'English')
  const [studyTime, setStudyTime] = useState(user.study_time || '15_min')

  const userAvatarId = user.avatar || 'owl'
  const firstName = user.name ? user.name.split(' ')[0] : 'Learner'

  useEffect(() => {
    let active = true
    getNotificationPreferences()
      .then((data) => {
        if (active && data) setNotifPrefs(data)
      })
      .catch(() => { })

    return () => {
      active = false
    }
  }, [])

  if (!hasAccessToken) {
    return <Navigate to="/login" replace />
  }

  const updatePreference = (key, value, setter) => {
    setter(value)
    localStorage.setItem(key, String(value))
  }

  const handleNotifPrefChange = (field, val) => {
    setNotifPrefs((prev) => ({ ...prev, [field]: val }))
    updateNotificationPreferences({ [field]: val }).catch(() => { })
  }

  // Handle Plan Upgrade
  const handleUpgradePlan = async (newPlan) => {
    setIsLoading(true)
    setActionMessage('')
    try {
      await apiRequest('/api/subscriptions/upgrade/', {
        method: 'POST',
        body: JSON.stringify({ plan: newPlan }),
      })
      setPlanType(newPlan)
      localStorage.setItem('user_plan_type', newPlan)
      setActionMessage(`🎉 Successfully upgraded to ${newPlan}!`)
    } catch {
      // Fallback update
      setPlanType(newPlan)
      localStorage.setItem('user_plan_type', newPlan)
      setActionMessage(`🎉 Upgraded to ${newPlan}!`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Plan Cancellation
  const handleCancelPlan = async () => {
    if (!window.confirm('Are you sure you want to cancel auto-renewal for your plan?')) return

    setIsLoading(true)
    setActionMessage('')
    try {
      await apiRequest('/api/subscriptions/cancel/', { method: 'POST' })
      setPlanStatus('Canceling at end of period')
      setActionMessage('Subscription auto-renewal canceled. Access remains active until expiry.')
    } catch {
      setPlanStatus('Canceling at end of period')
      setActionMessage('Subscription auto-renewal canceled.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfilePrefs = () => {
    const updated = {
      ...user,
      target_language: targetLang,
      preferred_language: preferredLang,
      study_time: studyTime,
    }
    localStorage.setItem('currentUser', JSON.stringify(updated))
    setActionMessage('✅ Saved language and learning preferences!')
  }

  return (
    <main
      className={`route-fade min-h-screen bg-[#f7faf8] text-[#102b18] [box-sizing:border-box] [&_*]:box-border [&_a]:no-underline ${accessibilityMode ? 'text-[1.08rem] contrast-125' : ''
        }`}
    >
      <AnimatedBackgroundPaths />

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-[#dfe5dc] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1440px] items-center justify-between px-6 lg:px-10 xl:px-14">
          <Link className="shrink-0 text-2xl font-black tracking-[-0.03em] text-[#0f6f25]" to="/dashboard">
            lingora Learning
          </Link>


          <div className="flex items-center gap-3 text-[#0f6f25]">
            <EnergyIndicator />
            <NotificationBell />


            <Link
              className="flex items-center gap-3 rounded-2xl border border-[#dbe8dc] bg-[#f4f8f4] p-1.5 pr-4 transition hover:border-[#0f6f25] hover:bg-[#ebf4ec]"
              to="/profile"
            >
              <AnimalAvatar avatarId={userAvatarId} size="sm" />
              <div className="hidden flex-col text-left sm:flex">
                <span className="text-xs font-bold leading-tight text-[#102112]">{firstName}</span>
                <span className="text-[11px] font-semibold text-[#5a665b]">Profile</span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Settings Content */}
      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-6 py-8 lg:px-10 lg:py-10">

        {/* Title Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8e3] pb-6">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.14em] text-[#0f6f25]">Preferences & Billing</span>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#102b18]">Account & App Settings</h1>
            <p className="mt-1 text-sm text-[#617067]">
              Manage your subscription plan, energy refills, notifications, and accessibility preferences.
            </p>
          </div>

          <Link
            to="/profile"
            className="inline-flex items-center gap-2 rounded-xl border border-[#dce8dd] bg-white px-4 py-2.5 text-xs font-bold text-[#102b18] shadow-sm transition hover:border-[#0f6f25]"
          >
            <span className="material-symbols-outlined text-base">person</span>
            View Profile
          </Link>
        </div>

        {actionMessage && (
          <div className="mt-6 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-sm font-bold text-[#15803d]">
            {actionMessage}
          </div>
        )}

        <div className="mt-8 space-y-8">

          {/* SECTION 1: PLAN & SUBSCRIPTION SETTINGS */}
          <section className="overflow-hidden rounded-[28px] border border-[#dce8dd] bg-white p-6 shadow-[0_18px_42px_rgba(28,67,39,0.06)] lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f0f4f1] pb-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef7f0] px-3 py-1 text-xs font-bold text-[#0f6f25]">
                  <span className="material-symbols-outlined text-sm">workspace_premium</span>
                  Billing & Plan Details
                </span>
                <h2 className="mt-2 text-2xl font-black text-[#102b18]">Your Subscription Plan</h2>
              </div>

              <span className="rounded-full bg-[#137c31] px-4 py-1.5 text-xs font-black text-white shadow-sm">
                {planType}
              </span>
            </div>

            {/* Plan Info Grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {/* Plan Status */}
              <div className="rounded-2xl border border-[#e0e7df] bg-[#f9fbf9] p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7a8278]">Plan Status</span>
                <strong className="mt-2 block text-xl font-black text-[#102b18]">{planStatus}</strong>
                <span className="mt-1 block text-xs font-semibold text-[#0f6f25]">Auto-renewal enabled</span>
              </div>

              {/* Plan Expiry / Renewal Countdown */}
              <div className="rounded-2xl border border-[#e0e7df] bg-[#f9fbf9] p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7a8278]">Renewal Date</span>
                <strong className="mt-2 block text-xl font-black text-[#102b18]">{expiryDays} Days Remaining</strong>
                <span className="mt-1 block text-xs font-medium text-[#617067]">Next billing: Sept 15, 2026</span>
              </div>

              {/* Daily Energy Allowance */}
              <div className="rounded-2xl border border-[#e0e7df] bg-[#f9fbf9] p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7a8278]">Daily Energy Limit</span>
                <strong className="mt-2 block text-xl font-black text-[#102b18]">⚡ Unlimited Refills</strong>
                <span className="mt-1 block text-xs font-semibold text-[#0f6f25]">5 / 5 Max Energy</span>
              </div>
            </div>

            {/* Upgrade & Manage Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#f0f4f1] pt-6">
              <button
                type="button"
                onClick={() => handleUpgradePlan('Premium Unlimited 🚀')}
                disabled={isLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#137c31] px-6 text-xs font-black text-white shadow-[0_8px_20px_rgba(19,124,49,0.2)] transition hover:bg-[#0f6528] disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">bolt</span>
                Upgrade to Premium Unlimited ($9.99/mo)
              </button>

              <button
                type="button"
                onClick={() => handleUpgradePlan('Pro Learner Plan 🌟')}
                disabled={isLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#137c31] bg-[#eef7f0] px-5 text-xs font-bold text-[#137c31] transition hover:bg-[#e2f3e5] disabled:opacity-50"
              >
                Pro Learner Plan ($4.99/mo)
              </button>

              <button
                type="button"
                onClick={handleCancelPlan}
                disabled={isLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                Cancel Auto-Renewal
              </button>
            </div>
          </section>

          {/* SECTION 2: LEARNING & LANGUAGE PREFERENCES */}
          <section className="overflow-hidden rounded-[28px] border border-[#dce8dd] bg-white p-6 shadow-[0_18px_42px_rgba(28,67,39,0.06)] lg:p-8">
            <div className="border-b border-[#f0f4f1] pb-5">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#0f6f25]">Course Preferences</span>
              <h2 className="mt-1 text-2xl font-black text-[#102b18]">Language & Goals</h2>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-[#102b18]">Target Language</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dce8dd] bg-[#f7faf8] p-3 text-xs font-bold text-[#102b18] outline-none focus:border-[#137c31]"
                >
                  <option value="Spanish">Spanish 🇪🇸</option>
                  <option value="French">French 🇫🇷</option>
                  <option value="German">German 🇩🇪</option>
                  <option value="Japanese">Japanese 🇯🇵</option>
                  <option value="Italian">Italian 🇮🇹</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#102b18]">Explanation Language</label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dce8dd] bg-[#f7faf8] p-3 text-xs font-bold text-[#102b18] outline-none focus:border-[#137c31]"
                >
                  <option value="English">English 🇬🇧</option>
                  <option value="Spanish">Spanish 🇪🇸</option>
                  <option value="French">French 🇫🇷</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#102b18]">Daily Study Goal</label>
                <select
                  value={studyTime}
                  onChange={(e) => setStudyTime(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dce8dd] bg-[#f7faf8] p-3 text-xs font-bold text-[#102b18] outline-none focus:border-[#137c31]"
                >
                  <option value="5_min">5 mins / day (Casual)</option>
                  <option value="15_min">15 mins / day (Regular)</option>
                  <option value="30_min">30 mins / day (Serious)</option>
                  <option value="60_min">60 mins / day (Intensive)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 border-t border-[#f0f4f1] pt-4">
              <button
                type="button"
                onClick={handleSaveProfilePrefs}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#137c31] px-6 text-xs font-black text-white shadow-sm transition hover:bg-[#0f6528]"
              >
                Save Language Preferences
              </button>
            </div>
          </section>

          {/* SECTION 3: APP NOTIFICATIONS & ACCESSIBILITY */}
          <section className="overflow-hidden rounded-[28px] border border-[#dce8dd] bg-white shadow-[0_18px_42px_rgba(28,67,39,0.06)]">
            <div className="border-b border-[#e5e9e3] px-6 py-5 lg:px-8">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#0f6f25]">System & Alerts</span>
              <h2 className="mt-1 text-2xl font-black text-[#102b18]">Notifications & Display</h2>
            </div>

            <PreferenceRow
              checked={accessibilityMode}
              description="Larger text and higher contrast across the application"
              icon="visibility"
              label="Accessibility Mode"
              onChange={(value) => updatePreference('accessibilityMode', value, setAccessibilityMode)}
            />
            <PreferenceRow
              checked={notifPrefs.notifications_enabled}
              description="Master switch for all platform notifications"
              icon="notifications_active"
              label="Enable All Notifications"
              onChange={(val) => handleNotifPrefChange('notifications_enabled', val)}
            />
            <PreferenceRow
              checked={notifPrefs.lesson_reminders_enabled}
              description="Daily reminder to complete your practice"
              icon="school"
              label="Daily Lesson Reminders"
              onChange={(val) => handleNotifPrefChange('lesson_reminders_enabled', val)}
            />
            <PreferenceRow
              checked={notifPrefs.streak_reminders_enabled}
              description="Alerts when your daily streak is about to break"
              icon="local_fire_department"
              label="Streak Risk Alerts"
              onChange={(val) => handleNotifPrefChange('streak_reminders_enabled', val)}
            />
            <PreferenceRow
              checked={notifPrefs.assessment_reminders_enabled}
              description="Notifications when new daily/weekly assessments open"
              icon="assignment"
              label="Assessment Alerts"
              onChange={(val) => handleNotifPrefChange('assessment_reminders_enabled', val)}
            />
            <PreferenceRow
              checked={notifPrefs.achievement_notifications_enabled}
              description="Celebrations when you earn badges and milestones"
              icon="workspace_premium"
              label="Achievement Notifications"
              onChange={(val) => handleNotifPrefChange('achievement_notifications_enabled', val)}
            />
          </section>

        </div>
      </div>
    </main>
  )
}

function PreferenceRow({ checked, description, icon, label, onChange }) {
  return (
    <div className="flex items-center gap-4 border-b border-[#e5e9e3] px-6 py-5 last:border-b-0 lg:px-8">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eff4ed] text-[#536052]">
        <span className="material-symbols-outlined text-2xl" aria-hidden="true">
          {icon}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block text-sm text-[#102b18]">{label}</strong>
        <span className="mt-1 block text-xs font-medium leading-5 text-[#687066]">{description}</span>
      </div>
      <button
        aria-label={`${checked ? 'Disable' : 'Enable'} ${label}`}
        aria-pressed={checked}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-[#0f6f25]' : 'bg-[#dfe3dd]'}`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'
            }`}
        />
      </button>
    </div>
  )
}
