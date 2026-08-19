import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import aiAvatar from '../assets/images/ai_avatar.png'
import ProficiencyForecastCard from '../components/adaptive/ProficiencyForecastCard'
import RecommendationCard from '../components/adaptive/RecommendationCard'
import AnimatedBackgroundPaths from '../components/AnimatedBackgroundpaths'
import {
  acceptRecommendation,
  dismissRecommendation,
  getRecommendations,
  refreshRecommendations,
} from '../services/lessonApi'

function getSavedInsight() {
  try {
    return JSON.parse(
      sessionStorage.getItem('latestLearningInsight') || 'null',
    )
  } catch {
    return null
  }
}

function ArrowIcon({ className = 'size-4' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14m-5-5 5 5-5 5"
      />
    </svg>
  )
}

function RefreshIcon({ className = 'size-4' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 11a8.1 8.1 0 00-15.5-2M4 4v5h5m-5 4a8.1 8.1 0 0015.5 2M20 20v-5h-5"
      />
    </svg>
  )
}

function CheckIcon({ className = 'size-5' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5 12 4 4L19 6"
      />
    </svg>
  )
}

function SparkIcon({ className = 'size-5' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Zm6 10 .9 2.6 2.6.9-2.6.9L18 20l-.9-2.6-2.6-.9 2.6-.9L18 13Z"
      />
    </svg>
  )
}

function LearningCoach({ completedLesson, accuracy }) {
  let message =
    'Choose a recommended lesson below and keep your learning progress moving.'

  if (completedLesson && accuracy >= 80) {
    message =
      'Great result! Your next lessons will help you build on that progress.'
  } else if (completedLesson) {
    message =
      'Every mistake shows what to practise next. I selected lessons that target those areas.'
  }

  return (
    <div className="relative flex min-h-[250px] items-end justify-center lg:min-h-[280px]">
      <div
        aria-hidden="true"
        className="absolute bottom-2 size-52 rounded-full bg-[#d8efdc]/80 blur-2xl sm:size-60"
      />

      <div className="absolute right-0 top-0 z-10 max-w-[230px] rounded-2xl rounded-br-sm border border-[#d3e5d6] bg-white/95 p-4 shadow-[0_12px_30px_rgba(20,70,35,0.08)]">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#13752f]">
          Your learning coach
        </p>

        <p className="mt-1.5 text-sm font-bold leading-5 text-[#405046]">
          {message}
        </p>

        <span
          aria-hidden="true"
          className="absolute -bottom-2 right-7 size-4 rotate-45 border-b border-r border-[#d3e5d6] bg-white"
        />
      </div>

      <img
        alt="AI learning coach"
        className="relative z-[2] mr-24 w-[175px] animate-[learning-coach-float_4s_ease-in-out_infinite] object-contain drop-shadow-[0_24px_22px_rgba(46,125,50,0.22)] sm:w-[210px] lg:mr-32 lg:w-[235px]"
        src={aiAvatar}
      />
    </div>
  )
}

function EmptyRecommendations({ refreshing, onRefresh }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cbdccc] bg-[#fbfdfb] px-6 py-12 text-center">

      <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#e7f4e9] text-[#13752f]">
        <SparkIcon className="size-6" />
      </div>

      <h3 className="mt-4 text-lg font-black text-[#102b18]">
        Your next lesson is being prepared
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#677168]">
        Generate a new set of lessons based on your latest progress.
      </p>

      <button
        className="mt-5 rounded-xl bg-[#137c31] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0c6726] disabled:cursor-wait disabled:opacity-60"
        disabled={refreshing}
        onClick={onRefresh}
        type="button"
      >
        {refreshing
          ? 'Creating lessons...'
          : 'Create recommendations'}
      </button>
    </div>
  )
}

function RecommendationSkeleton() {
  return (
    <div
      aria-label="Loading recommendations"
      className="grid gap-4 md:grid-cols-2"
      role="status"
    >
      {[1, 2].map((item) => (
        <div
          className="h-56 animate-pulse rounded-2xl border border-[#e0e9e1] bg-white p-5"
          key={item}
        >
          <div className="h-4 w-24 rounded bg-[#e8f1e9]" />
          <div className="mt-5 h-6 w-3/4 rounded bg-[#e8f1e9]" />
          <div className="mt-3 h-4 w-full rounded bg-[#f0f5f0]" />
          <div className="mt-2 h-4 w-2/3 rounded bg-[#f0f5f0]" />
          <div className="mt-8 h-10 w-full rounded-xl bg-[#e8f1e9]" />
        </div>
      ))}
    </div>
  )
}

export default function LearningInsightsPage() {
  const { state } = useLocation()

  const insight = state?.lesson ? state : getSavedInsight()
  const completedLesson = insight?.lesson
  const completion = insight?.completion

  const [recommendations, setRecommendations] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeRecommendationId, setActiveRecommendationId] =
    useState(null)

  useEffect(() => {
    let active = true

    async function loadRecommendations() {
      try {
        const items = await getRecommendations()

        if (active) {
          setRecommendations(Array.isArray(items) ? items : [])
          setError('')
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError?.message ||
            'Recommendations could not be loaded.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadRecommendations()

    return () => {
      active = false
    }
  }, [])

  async function refresh() {
    if (refreshing) return

    setRefreshing(true)
    setError('')

    try {
      const items = await refreshRecommendations()
      setRecommendations(Array.isArray(items) ? items : [])
    } catch (requestError) {
      setError(
        requestError?.message ||
        'Recommendations could not be refreshed.',
      )
    } finally {
      setRefreshing(false)
    }
  }

  async function dismiss(id) {
    if (activeRecommendationId !== null) return

    setActiveRecommendationId(id)
    setError('')

    try {
      await dismissRecommendation(id)

      setRecommendations((items) =>
        items.filter((item) => item.id !== id),
      )
    } catch (requestError) {
      setError(
        requestError?.message ||
        'The recommendation could not be dismissed.',
      )
    } finally {
      setActiveRecommendationId(null)
    }
  }

  async function addPath(recommendation) {
    if (activeRecommendationId !== null) return

    setActiveRecommendationId(recommendation.id)
    setError('')

    try {
      await acceptRecommendation(recommendation.id)

      setRecommendations((items) =>
        items.filter(
          (item) => item.id !== recommendation.id,
        ),
      )
    } catch (requestError) {
      setError(
        requestError?.message ||
        'The lesson could not be added to your path.',
      )
    } finally {
      setActiveRecommendationId(null)
    }
  }

  const accuracy = Math.max(
    0,
    Math.min(100, Math.round(Number(completion?.accuracy) || 0)),
  )

  const earnedXp = Math.max(
    0,
    Number(completion?.xp_earned) || 0,
  )

  const visibleRecommendations = recommendations.slice(0, 4)

  return (
    <main className="min-h-screen bg-[#f7f9f6] text-[#172018]">
      <style>
        {`
          html {
            scroll-behavior: smooth;
          }

          @keyframes learning-coach-float {
            0%, 100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-10px);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            html {
              scroll-behavior: auto;
            }

            .animate-\\[learning-coach-float_4s_ease-in-out_infinite\\] {
              animation: none;
            }
          }
        `}
      </style>
      <AnimatedBackgroundPaths />


      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#e1e8df] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1500px] items-center justify-between gap-5 px-5 sm:px-8">
          {/* Left Section: Logo Icon & Text */}
          <div className="flex items-center gap-3">
            <Link
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0f6f25] text-white shadow-[0_8px_18px_rgba(15,111,37,0.2)]"
              to="/dashboard"
              aria-label="Dashboard"
            >
              <span className="material-symbols-outlined" aria-hidden="true">school</span>
            </Link>
            <Link
              className="text-3xl font-black tracking-[-0.02em] text-[#0f6f25]"
              to="/dashboard"
            >
              lingora Learning
            </Link>
          </div>

          {/* Right Section: Navigation Links */}
          <nav
            aria-label="Learning insights navigation"
            className="flex items-center gap-1 rounded-xl bg-[#f1f4ef] p-1"
          >
            <Link
              className="rounded-lg px-4 py-2 text-sm font-bold text-[#465148] transition hover:bg-white"
              to="/dashboard"
            >
              Dashboard
            </Link>

            <Link
              className="rounded-lg bg-white px-4 py-2 text-sm font-black text-[#0f6f25] shadow-sm"
              to="/lessons"
            >
              Lessons
            </Link>
          </nav>
        </div>

      </header>

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-5 py-8 sm:px-8 sm:py-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[28px] border border-[#d9e6da] bg-gradient-to-br from-white via-[#fbfdf8] to-[#e8f5e9] px-6 py-8 sm:px-10 sm:py-10">
          <div
            aria-hidden="true"
            className="absolute -left-20 -top-24 size-64 rounded-full bg-[#e6f3d9]/60 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-32 right-0 size-80 rounded-full bg-[#cdebd2]/60 blur-3xl"
          />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_420px]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#cae3ce] bg-white/80 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-[#25a348]" />

                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#13752f]">
                  Personalized learning
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-[#102b18] sm:text-4xl lg:text-5xl">
                Your next step is ready
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-[#617067]">
                Your recent performance has been turned into a
                simpler, personalized plan. Pick one lesson and keep
                moving forward.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  className="inline-flex items-center gap-2 rounded-xl bg-[#137c31] px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(19,124,49,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0d6927]"
                  href="#recommended-lessons"
                >
                  See recommended lessons
                  <ArrowIcon />
                </a>

                <Link
                  className="rounded-xl border border-[#c9ddcc] bg-white px-5 py-3 text-sm font-black text-[#28462f] transition hover:bg-[#f3f9f4]"
                  to="/dashboard"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>

            <LearningCoach
              accuracy={accuracy}
              completedLesson={completedLesson}
            />
          </div>
        </section>

        {/* Latest result */}
        {completedLesson && (
          <section className="relative mt-6 overflow-hidden rounded-2xl border border-[#dce8dd] bg-white shadow-[0_10px_30px_rgba(23,72,35,0.05)]">
            <div className="grid gap-6 p-6 sm:p-7 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex min-w-0 items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e3f4e6] text-[#13752f]">
                  <CheckIcon />
                </span>

                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-[#54815b]">
                    Latest achievement
                  </p>

                  <h2 className="mt-1 truncate text-xl font-black text-[#102b18]">
                    {completedLesson.title}
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-[#68746a]">
                    Your progress has been included in the
                    recommendations below.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-[#e3ebe4] rounded-xl bg-[#f5f9f5] px-2 py-3">
                <div className="min-w-24 px-4 text-center">
                  <strong className="block text-2xl font-black text-[#13752f]">
                    {accuracy}%
                  </strong>

                  <span className="text-xs font-bold text-[#738077]">
                    Accuracy
                  </span>
                </div>

                <div className="min-w-24 px-4 text-center">
                  <strong className="block text-2xl font-black text-[#13752f]">
                    {earnedXp}
                  </strong>

                  <span className="text-xs font-bold text-[#738077]">
                    XP earned
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Recommendations */}
        <section
          className="mt-12 scroll-mt-24"
          id="recommended-lessons"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#13752f]">
                  01
                </span>

                <span className="h-px w-8 bg-[#9cc9a4]" />

                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#65806a]">
                  Recommended next
                </p>
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-[#102b18] sm:text-3xl">
                Pick your next lesson
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#68746a]">
                These lessons target the skills that need the most
                attention.
              </p>
            </div>

            <button
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#c9ddcc] bg-white px-4 text-sm font-black text-[#13752f] transition hover:border-[#99c5a0] hover:bg-[#f3f9f4] disabled:cursor-wait disabled:opacity-60"
              disabled={refreshing || loading}
              onClick={refresh}
              type="button"
            >
              <RefreshIcon
                className={`size-4 ${refreshing ? 'animate-spin' : ''
                  }`}
              />

              {refreshing ? 'Refreshing...' : 'Refresh choices'}
            </button>
          </div>

          {error && (
            <div
              className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              <span>{error}</span>

              <button
                className="shrink-0 font-black underline"
                onClick={() => setError('')}
                type="button"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="mt-6">
            {loading ? (
              <RecommendationSkeleton />
            ) : visibleRecommendations.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {visibleRecommendations.map((recommendation) => (
                  <div
                    className={
                      activeRecommendationId === recommendation.id
                        ? 'pointer-events-none opacity-60'
                        : ''
                    }
                    key={recommendation.id}
                  >
                    <RecommendationCard
                      recommendation={recommendation}
                      onDismiss={dismiss}
                      onStart={addPath}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyRecommendations
                refreshing={refreshing}
                onRefresh={refresh}
              />
            )}
          </div>

          {recommendations.length > 4 && (
            <div className="mt-5 text-center">
              <Link
                className="inline-flex items-center gap-2 text-sm font-black text-[#13752f] hover:underline"
                to="/lessons"
              >
                View all recommendations
                <ArrowIcon />
              </Link>
            </div>
          )}
        </section>

        {/* Forecast Section Container */}
        <section className="mt-14 border-t border-[#edf2ed] pt-10">
          <div className="mb-8 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e3f3e6] text-[11px] font-black text-[#13752f]">
                  02
                </span>
                <span className="h-px w-6 bg-[#9cc9a4]" />
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#65806a]">
                  Progress Outlook
                </p>
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-[#102b18] sm:text-3xl">
                Preview your progress
              </h2>
            </div>

            <p className="max-w-xs text-xs font-medium leading-5 text-[#68746a]">
              Adjust parameters below to dynamically recalculate projected growth targets.
            </p>
          </div>

          <ProficiencyForecastCard />
        </section>

        {/* Bottom call to action */}
        <section className="mt-10 flex flex-col items-center justify-between gap-5 rounded-2xl bg-[#123d20] px-6 py-6 text-white sm:flex-row sm:px-8">
          <div>
            <h2 className="text-lg font-black">
              Ready to continue?
            </h2>

            <p className="mt-1 text-sm text-green-100">
              Return to your lesson path and start your next
              activity.
            </p>
          </div>

          <Link
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#b9e6a9] px-5 py-3 text-sm font-black text-[#12341d] transition hover:bg-white"
            to="/lessons"
          >
            Continue learning
            <ArrowIcon />
          </Link>
        </section>
      </div>
    </main>
  )
}