import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import aiAvatar from '../assets/images/ai_avatar.png'
import AnimalAvatar, { ANIMAL_AVATARS } from '../components/AnimalAvatar'
import { getLessonProgress } from '../utils/lessonProgress'
import { getProgress } from '../services/lessonApi'
import AnimatedBackgroundPaths from '../components/AnimatedBackgroundpaths'
import EnergyIndicator from '../components/energy/EnergyIndicator'
import { getNotificationPreferences, updateNotificationPreferences } from '../services/notificationApi'


function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || '{}')
  } catch {
    return {}
  }
}

function getSavedBoolean(key, fallback) {
  const savedValue = localStorage.getItem(key)
  return savedValue === null ? fallback : savedValue === 'true'
}

function Profile() {
  const navigate = useNavigate()
  const user = useMemo(() => getCurrentUser(), [])
  const [selectedAvatarId, setSelectedAvatarId] = useState(() => user.avatar || 'owl')
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [accessibilityMode, setAccessibilityMode] = useState(() => (
    getSavedBoolean('accessibilityMode', false)));
  const [notifPrefs, setNotifPrefs] = useState({
    notifications_enabled: true,
    lesson_reminders_enabled: true,
    streak_reminders_enabled: true,
    assessment_reminders_enabled: true,
    achievement_notifications_enabled: true,
  })

  const handleSelectAvatar = (avatarId) => {
    setSelectedAvatarId(avatarId)
    const updatedUser = { ...user, avatar: avatarId }
    localStorage.setItem('currentUser', JSON.stringify(updatedUser))
  }
  const [progress, setProgress] = useState(null)
  const [progressError, setProgressError] = useState('')
  const hasAccessToken = Boolean(localStorage.getItem('accessToken'))
  const completedLessons = progress?.completed_lessons ?? Math.max(getLessonProgress(user) - 1, 0)
  const displayName = user.name || 'Lingora Learner'
  const targetLanguage = user.target_language || 'your new language'
  const preferredLanguage = user.preferred_language || 'your preferred language'

  useEffect(() => {
    let active = true
    getProgress().then((data) => {
      if (active) setProgress(data)
    }).catch((error) => {
      if (active) setProgressError(error.message)
    })
    getNotificationPreferences().then((data) => {
      if (active && data) setNotifPrefs(data)
    }).catch(() => { })
    return () => { active = false }
  }, [])

  const handleNotifPrefChange = (field, val) => {
    setNotifPrefs((prev) => ({ ...prev, [field]: val }))
    updateNotificationPreferences({ [field]: val }).catch(() => { })
  }

  if (!hasAccessToken) {
    return <Navigate to="/login" replace />
  }

  const updatePreference = (key, value, setter) => {
    setter(value)
    localStorage.setItem(key, String(value))
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('currentUser')
    navigate('/login', { replace: true })
  }

  const stats = [
    { icon: 'stars', value: progress?.total_xp ?? 0, label: 'Total XP', color: 'text-[#0f6f25]', background: 'bg-[#e9f6eb]' },
    { icon: 'local_fire_department', value: progress?.current_streak ?? 0, label: 'Day Streak', color: 'text-[#a95118]', background: 'bg-[#fff0e5]' },
    { icon: 'menu_book', value: completedLessons, label: 'Lessons', color: 'text-[#0f6f25]', background: 'bg-[#e9f6eb]' },
    { icon: 'workspace_premium', value: progress?.unlocked_achievements ?? 0, label: 'Badges', color: 'text-[#b66f13]', background: 'bg-[#fff5d9]' },
  ]

  const achievements = progress?.achievements ?? []
  const pathProgress = Math.min(100, (completedLessons / 8) * 100)

  return (
    <main className={`route-fade min-h-screen bg-[#f5f7f3] text-[#101010] [box-sizing:border-box] [&_*]:box-border [&_a]:no-underline ${accessibilityMode ? 'text-[1.08rem] contrast-125' : ''}`}>
      <AnimatedBackgroundPaths />
      <header className="sticky top-0 z-30 border-b border-[#dfe5dc] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1440px] items-center justify-between px-6 lg:px-10 xl:px-14">
          <Link className="text-2xl font-black tracking-[-0.03em] text-[#0f6f25]" to="/dashboard">
            lingora Learning
          </Link>

          <div className="flex items-center gap-3">
            <EnergyIndicator />
            <Link
              aria-label="Dashboard"
              className="icon-bounce inline-flex h-10 items-center gap-2 rounded-xl px-3 font-bold text-[#526052] transition hover:bg-[#e9f3e9] hover:text-[#0f6f25]"
              to="/dashboard"
            >
              <span className="material-symbols-outlined" aria-hidden="true">dashboard</span>
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link
              aria-label="Settings"
              className="icon-bounce inline-flex h-10 items-center gap-2 rounded-xl px-3 font-bold text-[#526052] transition hover:bg-[#e9f3e9] hover:text-[#0f6f25]"
              to="/settings"
            >
              <span className="material-symbols-outlined" aria-hidden="true">settings</span>
              <span className="hidden sm:inline">Settings</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1440px] z-10 px-6 py-8 lg:px-10 lg:py-10 xl:px-14">
        <div className="grid items-start gap-8 lg:grid-cols-[310px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-6 lg:sticky lg:top-[104px]">
            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#176f29] to-[#0a4d19] p-7 text-white shadow-[0_20px_50px_rgba(15,111,37,0.18)]">
              <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-lime-200/15 blur-3xl" aria-hidden="true" />

              <div className="relative z-10">
                <div className="relative w-fit">
                  <div
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="group relative cursor-pointer grid size-28 place-items-center overflow-hidden rounded-2xl border border-white/25 bg-[#1f2b20] shadow-xl transition hover:border-white/60"
                    title="Click to change avatar"
                  >
                    <AnimalAvatar avatarId={selectedAvatarId} size="xl" showBadge />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="material-symbols-outlined text-xl text-white">edit</span>
                      <span className="text-[11px] font-bold text-white">Change</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="absolute -bottom-2 -right-4 inline-flex items-center gap-1 rounded-full border-2 border-[#125f23] bg-white px-2.5 py-1 text-[11px] font-black text-[#0f6f25] shadow-md transition hover:bg-[#eef7f0]"
                  >
                    <span className="material-symbols-outlined text-xs">edit</span>
                    Avatar
                  </button>
                </div>

                <h1 className="premium-text mt-7 break-words text-3xl font-black leading-tight tracking-[-0.04em]">
                  {displayName}
                </h1>
                <p className="mt-2 font-bold text-[#bce5c3]">The Curious Explorer</p>
                <p className="mt-5 text-sm leading-6 text-[#d1ead5]">
                  Learning {targetLanguage} with help in {preferredLanguage}.
                  Growing one lesson at a time.
                </p>
              </div>
            </section>

            <section className="rounded-[24px] border border-[#e0e6de] bg-white p-5 shadow-[0_14px_35px_rgba(28,67,39,0.06)]">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#7a8278]">Current path</span>
              <div className="mt-4 flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0f6f25] font-black text-white">A1</span>
                <div className="min-w-0">
                  <h2 className="truncate font-black">{targetLanguage} Fundamentals</h2>
                  <p className="mt-0.5 text-xs font-medium text-[#687066]">{completedLessons} of 8 lessons</p>
                </div>
              </div>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#e7eee5]">
                <span className="block h-full rounded-full bg-[#49a65b]" style={{ width: `${pathProgress}%` }} />
              </div>
              <Link className="premium-button mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0f6f25] px-5 text-sm font-black text-white" to="/lessons">
                Resume Path
                <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span>
              </Link>
            </section>

            <button
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-red-200 bg-white font-black text-red-700 transition hover:border-red-500 hover:bg-red-50"
              onClick={handleLogout}
              type="button"
            >
              <span className="material-symbols-outlined" aria-hidden="true">logout</span>
              Log Out
            </button>
          </aside>

          <div className="min-w-0">
            <section>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-[#778076]">Profile overview</span>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[#172018]">Your learning activity</h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-[#687066]">
                  Track your learning consistency, completed lessons, and earned achievements.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Learning statistics">
                {stats.map((stat) => (
                  <article className="premium-card rounded-[22px] border border-[#e1e7df] bg-white p-5 shadow-[0_14px_35px_rgba(28,67,39,0.06)]" key={stat.label}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`grid size-11 place-items-center rounded-xl ${stat.background}`}>
                        <span className={`material-symbols-outlined text-2xl ${stat.color}`} aria-hidden="true">{stat.icon}</span>
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#7b8379]">{stat.label}</span>
                    </div>
                    <strong className="mt-5 block text-3xl font-black tracking-tight">{stat.value}</strong>
                  </article>
                ))}
              </div>

              {progressError && (
                <p className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  Could not refresh progress: {progressError}
                </p>
              )}
            </section>

            <section className="mt-8 rounded-[28px] border border-[#e1e7df] bg-white p-6 shadow-[0_18px_42px_rgba(28,67,39,0.06)] lg:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#778076]">Milestones</span>
                  <h2 className="mt-2 text-2xl font-black">My Achievements</h2>
                </div>
                <button className="rounded-xl px-4 py-2 text-sm font-black text-[#0f6f25] transition hover:bg-[#edf5ee]" type="button">
                  View all →
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {achievements.map((achievement) => {
                  const achievementProgress = achievement.target
                    ? Math.min(100, (achievement.progress / achievement.target) * 100)
                    : 0

                  return (
                    <article
                      className={`relative rounded-2xl border p-5 z-10 ${achievement.unlocked ? 'border-[#b9dfbd] bg-[#f3fbf4]' : 'border-[#e0e3df] bg-[#f5f6f4] text-[#747c73]'}`}
                      key={achievement.key}
                    >
                      {!achievement.unlocked && (
                        <span className="material-symbols-outlined absolute right-4 top-4 text-lg" aria-label="Locked">lock</span>
                      )}
                      <span className={`grid size-12 place-items-center rounded-xl ${achievement.unlocked ? 'bg-[#d9f3dd] text-[#0f6f25]' : 'bg-[#e3e6e1] text-[#818980]'}`}>
                        <span className="material-symbols-outlined text-3xl" aria-hidden="true">{achievement.icon}</span>
                      </span>
                      <strong className="mt-5 block text-base">{achievement.title}</strong>
                      <p className="mt-2 min-h-10 text-sm leading-5">{achievement.description}</p>
                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dfe3dd]">
                        <span className={`block h-full rounded-full ${achievement.unlocked ? 'bg-[#0f6f25]' : 'bg-[#aeb6ad]'}`} style={{ width: `${achievementProgress}%` }} />
                      </div>
                      <small className="mt-2 block font-bold">
                        {achievement.unlocked ? 'Unlocked' : `${achievement.progress}/${achievement.target}`}
                      </small>
                    </article>
                  )
                })}
                {!progress && <p className="col-span-full py-10 text-center font-bold text-[#687066]">Loading achievements…</p>}
              </div>
            </section>

            <section className="mt-8 overflow-hidden rounded-[28px] border border-[#dce8dd] bg-white p-6 shadow-[0_18px_42px_rgba(28,67,39,0.06)] lg:p-8">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#0f6f25]">Account Preferences</span>
                  <h2 className="mt-1 text-2xl font-black text-[#102b18]">Subscription, Energy & App Settings</h2>
                  <p className="mt-1 max-w-xl text-sm text-[#617067]">
                    Manage your subscription plan, view plan expiration dates, energy limits, language choices, and notification preferences.
                  </p>
                </div>

                <Link
                  to="/settings"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0f6f25] px-6 font-black text-white shadow-[0_8px_20px_rgba(15,111,37,0.2)] transition hover:bg-[#0a4e18]"
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">settings</span>
                  Manage Account & App Settings
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Interactive Avatar Selection Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-[28px] border border-[#dce8dd] bg-white p-6 shadow-2xl lg:p-8">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(false)}
              className="absolute right-6 top-6 grid size-9 place-items-center rounded-xl bg-[#f4f7f5] text-[#617067] hover:bg-[#eef4f0] hover:text-[#102b18]"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            {/* Header */}
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#0f6f25]">Identity & Avatar</span>
              <h2 className="mt-1 text-2xl font-black text-[#102b18]">Select Your Lingora Animal Mascot</h2>
              <p className="mt-1 text-sm text-[#617067]">
                Choose your avatar. Displayed on your profile, Community posts, and global leaderboards.
              </p>
            </div>

            {/* Avatars Grid */}
            <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-5 max-h-[60vh] overflow-y-auto p-1">
              {ANIMAL_AVATARS.map((avatar) => {
                const isSelected = selectedAvatarId === avatar.id

                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      handleSelectAvatar(avatar.id)
                      setIsAvatarModalOpen(false)
                    }}
                    className={`group flex flex-col items-center justify-center rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? 'border-[#0f6f25] bg-[#eef7f0] ring-2 ring-[#0f6f25] shadow-md'
                        : 'border-[#e0e7df] bg-[#f9fbf9] hover:border-[#0f6f25]/50 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <AnimalAvatar avatarId={avatar.id} size="lg" showBadge={isSelected} />
                    <span className="mt-3 text-xs font-bold text-[#102b18] group-hover:text-[#0f6f25]">{avatar.name}</span>
                    <span className="mt-0.5 text-[10px] font-semibold text-[#617067]">{avatar.desc}</span>
                    {isSelected && (
                      <span className="mt-2 rounded-full bg-[#0f6f25] px-2.5 py-0.5 text-[10px] font-black text-white">
                        Active ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function PreferenceRow({ checked, description, icon, label, onChange }) {
  return (
    <div className="flex items-center gap-4 z-30 border-b border-[#e5e9e3] px-6 py-5 last:border-b-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eff4ed] text-[#536052]">
        <span className="material-symbols-outlined text-2xl" aria-hidden="true">{icon}</span>
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block text-sm">{label}</strong>
        <span className="mt-1 block text-xs font-medium leading-5 text-[#687066]">{description}</span>
      </div>
      <button
        aria-label={`${checked ? 'Disable' : 'Enable'} ${label}`}
        aria-pressed={checked}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-[#0f6f25]' : 'bg-[#dfe3dd]'}`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}

export default Profile