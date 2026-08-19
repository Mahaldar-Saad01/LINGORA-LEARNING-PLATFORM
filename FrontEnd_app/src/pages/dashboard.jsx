import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getProgress } from '../services/lessonApi'
import { getEnergyStatus } from '../services/energyApi'
import PersonalizedLearningPanel from '../components/adaptive/PersonalizedLearningPanel'
import EnergyIndicator from '../components/energy/EnergyIndicator'
import UpgradePremiumModal from '../components/energy/UpgradePremiumModal'
import aiAvatar from '../assets/images/ai_avatar.png'
import DashboardAssessments from '../components/assessments/DashboardAssessments'
import AnimatedBackgroundPaths from '../components/AnimatedBackgroundpaths'
import NotificationBell from '../components/notifications/NotificationBell'
const weekDays = [
  { day: 'Mon', value: 62 },
  { day: 'Tue', value: 38 },
  { day: 'Wed', value: 76 },
  { day: 'Thu', value: 54 },
  { day: 'Fri', value: 88 },
  { day: 'Sat', value: 46 },
  { day: 'Sun', value: 70 },
]

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || '{}')
  } catch {
    return {}
  }
}

function getAssessmentKey(user) {
  return `firstAssessmentScore:${user.id || user.email || 'guest'}`
}

function hasCompletedFirstAssessment(user) {
  if (typeof user.has_completed_assessment === 'boolean') {
    return user.has_completed_assessment
  }

  return localStorage.getItem(getAssessmentKey(user)) !== null
}

function getFirstName(user) {
  return user.name?.split(' ')[0] || 'Learner'
}

function Dashboard() {
  const user = useMemo(() => getCurrentUser(), [])
  const firstName = getFirstName(user)

  const hasCompletedAssessment = useMemo(
    () => hasCompletedFirstAssessment(user),
    [user],
  )

  const [progress, setProgress] = useState(null)

  useEffect(() => {
    let active = true

    getProgress()
      .then((data) => {
        if (active) setProgress(data)
      })
      .catch(() => { })

    return () => {
      active = false
    }
  }, [])

  if (!hasCompletedAssessment) {
    return <Navigate to="/assessment" replace />
  }

  return (
    <main className="route-fade min-h-screen bg-[#f7f8f5] text-[#101010] [box-sizing:border-box] [&_*]:box-border [&_a]:no-underline">
      <AnimatedBackgroundPaths />
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#dfe5dc] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1440px] items-center justify-between px-6 lg:px-10 xl:px-14">
          <Link
            className="shrink-0 text-2xl font-black tracking-[-0.03em] text-[#0f6f25]"
            to="/dashboard"
          >
            lingora Learning
          </Link>

          <nav
            className="hidden items-center gap-2 rounded-2xl bg-[#f3f6f1] p-1.5 text-sm font-bold text-[#30382f] md:flex"
            aria-label="Dashboard"
          >
            <Link
              className="rounded-xl bg-white px-5 py-2.5 text-[#0f6f25] shadow-sm"
              to="/dashboard"
            >
              Dashboard
            </Link>

            <Link
              className="rounded-xl px-5 py-2.5 transition-colors hover:bg-white hover:text-[#0f6f25]"
              to="/lessons"
            >
              Lessons
            </Link>

            <Link
              className="rounded-xl px-5 py-2.5 transition-colors hover:bg-white hover:text-[#0f6f25]"
              to="/community"
            >
              Community
            </Link>

            <Link
              className="rounded-xl px-5 py-2.5 transition-colors hover:bg-white hover:text-[#0f6f25]"
              to="/tutor"
            >
              AI_Tutor
            </Link>
          </nav>

          <div className="flex items-center gap-3 text-[#0f6f25]">
            <EnergyIndicator />
            <NotificationBell />

            <Link
              className="icon-bounce grid size-10 place-items-center rounded-xl border border-transparent transition hover:border-[#dbe8dc] hover:bg-[#edf5ee]"
              to="/settings"
              aria-label="Settings"
            >
              <span
                className="material-symbols-outlined text-[22px]"
                aria-hidden="true"
              >
                settings
              </span>
            </Link>

            <Link
              className="icon-bounce grid size-10 place-items-center rounded-xl border border-transparent transition hover:border-[#dbe8dc] hover:bg-[#edf5ee]"
              to="/profile"
              aria-label="Profile"
            >
              <span
                className="material-symbols-outlined text-[24px]"
                aria-hidden="true"
              >
                account_circle
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Dashboard content */}
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 py-8 lg:px-10 lg:py-10 xl:px-14">
        {/* Desktop hero */}
        <section className="relative overflow-hidden rounded-[32px] border border-[#dce7da] bg-gradient-to-br from-white via-[#f8fbf6] to-[#eaf5e9] px-6 py-8 shadow-[0_20px_60px_rgba(31,73,40,0.08)] sm:px-8 lg:px-10 lg:py-10 xl:px-12">
          <div
            className="pointer-events-none absolute -right-24 -top-32 size-[400px] rounded-full bg-[#bfe1c2]/35 blur-3xl"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute bottom-[-180px] left-[35%] size-[360px] rounded-full bg-[#e6bd91]/20 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto] xl:gap-16">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe4d0] bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#0f6f25]">
                <span className="size-2 rounded-full bg-[#22a340]" />
                Your learning dashboard
              </span>

              <h1 className="premium-text mt-5 text-[clamp(36px,4vw,58px)] font-black leading-[1.05] tracking-[-0.045em] text-[#102112]">
                Good morning, {firstName}.
              </h1>

              <p className="premium-text-delay mt-4 max-w-xl text-base leading-7 text-[#536054] lg:text-lg">
                Continue building your language skills with lessons selected for
                your current progress.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link
                  className="premium-button inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0f6f25] px-7 text-sm font-black text-white shadow-[0_12px_24px_rgba(15,111,37,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0c5e20]"
                  to="/lessons"
                >
                  Continue Learning

                  <span
                    className="material-symbols-outlined text-lg"
                    aria-hidden="true"
                  >
                    play_arrow
                  </span>
                </Link>

                <Link
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#cbdaca] bg-white px-7 text-sm font-bold text-[#244429] transition hover:border-[#0f6f25] hover:text-[#0f6f25]"
                  to="/lessons"
                >
                  Browse Lessons
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:min-w-[340px]">
              <div className="premium-card rounded-2xl border border-white bg-white/85 p-5 shadow-[0_14px_35px_rgba(28,67,39,0.08)] backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#fff0e5] text-[#aa4f14]">
                    <span
                      className="material-symbols-outlined text-2xl"
                      aria-hidden="true"
                    >
                      local_fire_department
                    </span>
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-[#7a8278]">
                    Streak
                  </span>
                </div>

                <strong className="mt-5 block text-3xl font-black tracking-tight text-[#172018]">
                  {progress?.current_streak ?? 0}
                </strong>

                <span className="mt-1 block text-sm text-[#687067]">
                  Consecutive days
                </span>
              </div>

              <div className="premium-card rounded-2xl border border-white bg-white/85 p-5 shadow-[0_14px_35px_rgba(28,67,39,0.08)] backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#e8f5e9] text-[#0f6f25]">
                    <span
                      className="material-symbols-outlined text-2xl"
                      aria-hidden="true"
                    >
                      stars
                    </span>
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-[#7a8278]">
                    Total XP
                  </span>
                </div>

                <strong className="mt-5 block text-3xl font-black tracking-tight text-[#172018]">
                  {progress?.total_xp ?? 0}
                </strong>

                <span className="mt-1 block text-sm text-[#687067]">
                  Experience earned
                </span>
              </div>
            </div>
          </div>
        </section>
        <DashboardAssessments />
        {/* Personalized learning section */}
        <section className="mt-8">
          <PersonalizedLearningPanel />
        </section>

        {/* Tutor and weekly progress */}
        <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-[minmax(310px,0.7fr)_minmax(500px,1.3fr)]">
          {/* AI tutor */}
          <section className="premium-card relative min-h-[390px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#176f29] to-[#0b4f1a] p-7 text-white shadow-[0_20px_45px_rgba(15,111,37,0.18)] lg:p-8">
            <div
              className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full bg-lime-200/15 blur-3xl"
              aria-hidden="true"
            />

            <div
              className="ai-avatar-float absolute right-3 top-2 size-44 opacity-95 xl:size-52"
              aria-hidden="true"
            >
              <span className="ai-avatar-pulse absolute inset-8 rounded-full bg-lime-200/25 blur-xl" />
              <img
                className="relative size-full object-contain mix-blend-screen"
                src={aiAvatar}
                alt=""
              />
            </div>

            <div className="relative z-10 flex h-full flex-col">
              <span className="grid size-12 place-items-center rounded-2xl bg-[#d4f2d8] text-[#0f6f25]">
                <span
                  className="material-symbols-outlined text-2xl"
                  aria-hidden="true"
                >
                  psychology
                </span>
              </span>

              <div className="mt-auto max-w-[330px] pt-28">
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#a9dcb1]">
                  Available anytime
                </span>

                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  lingora AI Tutor
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#c7e4cc]">
                  Need a hint or a quick explanation? I&apos;m here whenever you
                  get stuck.
                </p>

                <Link
                  className="premium-button mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/40 bg-white text-sm font-bold text-[#0f6f25] transition hover:bg-[#edf7ee]"
                  to="/tutor"
                >
                  <span
                    className="material-symbols-outlined text-lg"
                    aria-hidden="true"
                  >
                    chat
                  </span>

                  Ask a question
                </Link>
              </div>
            </div>
          </section>

          {/* Weekly chart */}
          <section className="premium-card rounded-[28px] border border-[#e1e7df] bg-white p-7 shadow-[0_20px_45px_rgba(28,67,39,0.07)] lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#788077]">
                  Activity overview
                </span>

                <h2 className="mt-2 text-2xl font-black tracking-tight text-[#182019]">
                  Weekly Progress
                </h2>

                <p className="mt-2 text-sm text-[#687067] lg:text-base">
                  {progress?.weekly_time_display || 'Focused learning time this week'}
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5e9] px-4 py-2 text-sm font-bold text-[#0f6f25]">
                <span
                  className="material-symbols-outlined text-base"
                  aria-hidden="true"
                >
                  timer
                </span>
                Active Learning Time
              </span>
            </div>

            <div className="mt-8 rounded-2xl bg-[#f7f9f6] px-4 pb-4 pt-6 sm:px-6">
              <div className="grid h-[230px] grid-cols-7 items-end gap-3 sm:gap-5">
                {(progress?.weekly_progress || weekDays).map((item) => (
                  <div
                    className="flex h-full min-w-0 flex-col items-center justify-end"
                    key={item.day}
                  >
                    <span className="mb-2 text-xs font-bold text-[#0f6f25]">
                      {item.minutes !== undefined ? `${item.minutes}m` : `${item.value}%`}
                    </span>

                    <div className="flex h-[165px] w-full max-w-10 items-end overflow-hidden rounded-full bg-[#dfe9dd]">
                      <i
                        className="progress-column block w-full rounded-full bg-gradient-to-t from-[#0f6f25] to-[#49a65b]"
                        style={{ height: `${item.value}%` }}
                      />
                    </div>

                    <small className="mt-3 text-xs font-bold text-[#687067] sm:text-sm">
                      {item.day}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Quote */}
        <figure className="mt-8 grid gap-6 rounded-[28px] border border-[#eadfd4] bg-[#fffaf5] px-7 py-8 md:grid-cols-[auto_1fr_auto] md:items-center lg:px-10">
          <span
            className="font-serif text-7xl font-black leading-none text-[#c06a30]"
            aria-hidden="true"
          >
            “
          </span>

          <blockquote className="max-w-4xl text-xl font-medium italic leading-relaxed text-[#302820] lg:text-2xl">
            The beautiful thing about learning is that no one can take it away
            from you.
          </blockquote>

          <figcaption className="whitespace-nowrap text-sm font-black text-[#715f51]">
            — B.B. King
          </figcaption>
        </figure>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-8 border-t border-[#d9e1d7] bg-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-6 px-6 py-8 md:flex-row lg:px-10 xl:px-14">
          <div>
            <Link
              className="text-xl font-black tracking-[-0.03em] text-[#0f6f25]"
              to="/dashboard"
            >
              lingora Learning
            </Link>

            <p className="mt-2 text-xs text-[#687067]">
              (c) 2024 lingora Learning. Nurturing your curiosity.
            </p>
          </div>

          <nav
            className="flex flex-wrap justify-center gap-6 text-sm font-medium text-[#4e584d]"
            aria-label="Footer navigation"
          >
            <Link
              className="transition hover:text-[#0f6f25]"
              to="/dashboard"
            >
              Help Center
            </Link>

            <Link
              className="transition hover:text-[#0f6f25]"
              to="/dashboard"
            >
              Accessibility
            </Link>

            <Link
              className="transition hover:text-[#0f6f25]"
              to="/dashboard"
            >
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}

export default Dashboard
