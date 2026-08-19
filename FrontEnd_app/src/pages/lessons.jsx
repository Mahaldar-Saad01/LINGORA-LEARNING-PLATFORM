import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LessonNode from '../components/pag_lesson/lessonnode'
import AnimatedBackgroundPaths from '../components/AnimatedBackgroundpaths'
import AnimalAvatar from '../components/AnimalAvatar'
import {
  createPersonalizedPath,
  generateLesson,
  getLearningPath,
  getPersonalizedPath,
  getProgress,
  startPathItem,
} from '../services/lessonApi'
import { useEnergy } from '../context/EnergyContext'
import EnergyIndicator from '../components/energy/EnergyIndicator'
import {
  getLessonProgress,
  migrateLessonProgress,
  saveLessonPositions,
} from '../utils/lessonProgress'

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || '{}') || {}
  } catch {
    return {}
  }
}

function getFirstName(user) {
  if (typeof user?.name === 'string' && user.name.trim()) {
    return user.name.trim().split(' ')[0]
  }
  if (typeof user?.username === 'string' && user.username.trim()) {
    return user.username.trim()
  }
  if (typeof user?.email === 'string' && user.email.trim()) {
    return user.email.trim().split('@')[0]
  }
  return 'Learner'
}

const flattenLessons = (path) => (path?.categories || []).flatMap((category) =>
  category.lessons.flatMap((lesson) => {
    const contents = (lesson.contents && lesson.contents.length > 0)
      ? lesson.contents
      : (lesson.content ? [lesson.content] : [])

    if (!contents.length) return []

    return contents.map((c) => ({
      ...lesson,
      id: lesson.id,
      nodeId: `lesson_${lesson.id}_content_${c.id}`,
      content_id: c.id,
      content_title: c.title,
      content_order_no: c.order_no,
      title: `${lesson.title} · ${c.title || `Part ${c.order_no}`}`,
      category: category.name,
    }))
  })
)

export default function Lessons() {
  const navigate = useNavigate()
  const scrollContainerRef = useRef(null)
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const [path, setPath] = useState(null)
  const [pathError, setPathError] = useState('')
  const [generationError, setGenerationError] = useState('')
  const [generatingLessonId, setGeneratingLessonId] = useState(null)
  const [currentLesson, setCurrentLesson] = useState(() => getLessonProgress())
  const [personalized, setPersonalized] = useState(null)
  const [buildingPath, setBuildingPath] = useState(false)
  const { openInsufficientModal, refreshEnergy } = useEnergy()

  const firstName = useMemo(() => getFirstName(currentUser), [currentUser])
  const userAvatarId = currentUser.avatar || 'owl'

  useEffect(() => {
    let active = true
    refreshEnergy()

    getProgress()
      .then((data) => {
        if (active && data) {
          if (data.avatar || data.name) {
            setCurrentUser((prev) => ({
              ...prev,
              ...(data.avatar ? { avatar: data.avatar } : {}),
              ...(data.name ? { name: data.name } : {}),
            }))
          }
        }
      })
      .catch(() => {})

    Promise.all([getLearningPath(), getPersonalizedPath()])
      .then(([data, savedPath]) => {
        if (!active) return
        const orderedLessons = flattenLessons(data)
        saveLessonPositions(orderedLessons)
        setCurrentLesson(migrateLessonProgress(orderedLessons))
        setPath(data)
        if (savedPath) setPersonalized(savedPath)
      })
      .catch((requestError) => {
        if (active) setPathError(requestError.message)
      })

    return () => {
      active = false
    }
  }, [])

  const lessons = useMemo(() => {
    if (personalized?.nodes && personalized.nodes.length > 0) {
      return personalized.nodes.map((node) => ({
        id: node.lesson_id,
        nodeId: node.node_id,
        title: `${node.lesson_title} · ${node.content_title || `Part ${node.content_order_no}`}`,
        lesson_title: node.lesson_title,
        content_title: node.content_title,
        content_id: node.content_id,
        content_order_no: node.content_order_no,
        pathItemId: node.path_item_id,
        pathStatus: node.status,
        reason: node.reason,
      }))
    }
    if (personalized?.items && personalized.items.length > 0) {
      return personalized.items.flatMap((item) => {
        const contents = (item.contents && item.contents.length > 0)
          ? item.contents
          : (item.lesson?.contents && item.lesson.contents.length > 0)
            ? item.lesson.contents
            : (item.lesson?.content ? [item.lesson.content] : [])

        if (!contents.length) return []

        return contents.map((c) => ({
          ...item.lesson,
          id: item.lesson.id,
          nodeId: `item_${item.id}_content_${c.id}`,
          content_id: c.id,
          content_title: c.title,
          content_order_no: c.order_no,
          title: `${item.lesson.title} · ${c.title || `Part ${c.order_no}`}`,
          pathItemId: item.id,
          pathStatus: item.status,
          reason: item.reason_snapshot?.summary,
          generation: item.generation,
        }))
      })
    }
    return flattenLessons(path)
  }, [path, personalized])

  const effectiveCurrentLesson = useMemo(() => {
    if (!lessons.length) return currentLesson

    const hasPathStatuses = lessons.some((node) => node.pathStatus)
    if (hasPathStatuses) {
      const firstUncompletedIndex = lessons.findIndex((node) => node.pathStatus !== 'completed')
      if (firstUncompletedIndex >= 0) {
        return firstUncompletedIndex + 1
      }
      return lessons.length + 1
    }

    return currentLesson
  }, [lessons, currentLesson])

  const lessonStatuses = useMemo(() => lessons.map((lesson, index) => {
    const position = index + 1

    if (lesson.pathStatus === 'completed') return 'completed'
    if (lesson.pathStatus === 'locked') return 'locked'
    if (lesson.pathStatus === 'available' || lesson.pathStatus === 'in_progress') return 'current'

    if (position < effectiveCurrentLesson) return 'completed'
    if (position === effectiveCurrentLesson) return 'current'
    return 'locked'
  }), [lessons, effectiveCurrentLesson])

  const completedCount = lessonStatuses.filter((status) => status === 'completed').length
  const progressPercent = lessons.length
    ? Math.round((completedCount / lessons.length) * 100)
    : 0
  const currentIndex = Math.max(0, lessonStatuses.findIndex((status) => status === 'current'))
  const currentPathLesson = lessons[currentIndex]

  const nodeSpacing = 240
  const mapStartX = 180
  const mapWidth = Math.max(1180, lessons.length * nodeSpacing + 300)
  const mapHeight = 660

  const getNodeX = (index) => mapStartX + index * nodeSpacing
  const getNodeY = (index) => (index % 2 === 0 ? 410 : 225)

  useEffect(() => {
    if (!lessons.length || !scrollContainerRef.current) return
    const currentX = getNodeX(currentIndex)
    const containerWidth = scrollContainerRef.current.clientWidth
    const targetScrollLeft = Math.max(0, currentX - containerWidth / 2)

    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: targetScrollLeft,
          behavior: 'smooth',
        })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [lessons, currentIndex])


  const pathData = lessons.length
    ? `M ${getNodeX(0)} ${getNodeY(0)} ${lessons.slice(1).map((_, index) => {
      const actualIndex = index + 1
      const previousX = getNodeX(actualIndex - 1)
      const nextX = getNodeX(actualIndex)
      const middleX = (previousX + nextX) / 2
      return `C ${middleX} ${getNodeY(actualIndex - 1)}, ${middleX} ${getNodeY(actualIndex)}, ${nextX} ${getNodeY(actualIndex)}`
    }).join(' ')}`
    : ''

  const startLesson = async (lesson, position) => {
    const status = lessonStatuses[position - 1]
    if (status === 'locked') return
    if (generatingLessonId) return

    setGeneratingLessonId(lesson.nodeId || lesson.id)
    setGenerationError('')

    try {
      if (lesson.pathItemId) await startPathItem(lesson.pathItemId)

      const generatedLesson = await generateLesson(lesson.id, lesson.content_id)

      navigate(`/lessons/${lesson.id}`, {
        state: {
          generatedLesson,
          contentId: lesson.content_id,
          lessonPosition: position,
        },
      })
    } catch (requestError) {
      setGeneratingLessonId(null)
      const errMsg = requestError.message || ''
      if (requestError.status === 402 || errMsg.includes('Insufficient energy') || errMsg.includes('INSUFFICIENT_ENERGY') || errMsg.includes('402')) {
        refreshEnergy()
        openInsufficientModal(requestError.data?.energy || requestError.data)
      } else {
        setGenerationError(errMsg)
      }
    }
  }

  const buildPersonalizedPath = async () => {
    if (buildingPath) return

    setBuildingPath(true)
    setGenerationError('')

    try {
      setPersonalized(await createPersonalizedPath())
    } catch (requestError) {
      setGenerationError(requestError.message)
    } finally {
      setBuildingPath(false)
    }
  }

  if (pathError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f7f2] px-6">
        <div className="max-w-lg rounded-[28px] border border-red-100 bg-white p-9 text-center shadow-[0_20px_60px_rgba(45,55,43,0.10)]">
          <span className="material-symbols-outlined text-5xl text-red-500" aria-hidden="true">
            error
          </span>
          <h1 className="mt-4 text-2xl font-black">Learning path unavailable</h1>
          <p className="mt-3 leading-6 text-red-700">{pathError}</p>
          <Link
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#0f6f25] px-6 font-bold text-white"
            to="/dashboard"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  if (!path) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f7f2]">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-5xl text-[#0f6f25]" aria-hidden="true">
            progress_activity
          </span>
          <p className="mt-4 font-bold text-[#0f6f25]">Loading your learning path…</p>
        </div>
      </main>
    )
  }

  if (!lessons.length) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f7f2] px-6">
        <div className="max-w-xl rounded-[28px] border border-[#e0e8dd] bg-white p-9 text-center shadow-[0_20px_60px_rgba(45,55,43,0.10)]">
          <span className="material-symbols-outlined text-5xl text-[#0f6f25]" aria-hidden="true">
            menu_book
          </span>
          <h1 className="mt-4 text-2xl font-black text-[#0f6f25]">
            No lessons found for {path.level.name}
          </h1>
          <p className="mt-3 leading-6 text-[#566056]">
            Your learning level and curriculum do not currently share lesson
            categories. Refresh after the curriculum data is synchronized.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="route-fade min-h-screen bg-[#eef5e9] text-[#172018] [box-sizing:border-box] [&_*]:box-border [&_a]:no-underline">
      <AnimatedBackgroundPaths />
      <header className="sticky top-0 z-40 border-b border-[#dce7d8] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] w-full max-w-[1500px] items-center justify-between gap-6 px-6 lg:px-10 xl:px-14">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0f6f25] text-white shadow-[0_8px_18px_rgba(15,111,37,0.2)]"
              to="/dashboard"
              aria-label="Dashboard"
            >
              <span className="material-symbols-outlined" aria-hidden="true">school</span>
            </Link>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#508058]">
                {path.level.name} learning path
              </p>
              <h1 className="truncate text-xl font-black tracking-[-0.025em] text-[#0f6f25] lg:text-2xl">
                {personalized?.title || path.curriculum.title}
              </h1>
            </div>
          </div>

          <nav className="flex shrink-0 items-center gap-2" aria-label="Lesson navigation">

            <Link
              className="inline-flex h-11 items-center gap-2 rounded-xl px-3 font-bold text-[#536052] transition hover:bg-[#edf5ee] hover:text-[#0f6f25] sm:px-4"
              to="/learning-insights"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">insights</span>
              <span className="hidden md:inline">Insights</span>
            </Link>
            <Link
              className="hidden h-11 items-center gap-2 rounded-xl px-4 font-bold text-[#536052] transition hover:bg-[#edf5ee] hover:text-[#0f6f25] sm:inline-flex"
              to="/dashboard"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">dashboard</span>
              Dashboard
            </Link>

            <Link
              className="hidden h-11 items-center gap-2 rounded-xl px-4 font-bold text-[#536052] transition hover:bg-[#edf5ee] hover:text-[#0f6f25] sm:inline-flex"
              to="/community"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">groups</span>
              Community
            </Link>
            <EnergyIndicator />

            <Link
              className="flex items-center gap-3 rounded-2xl border border-[#dbe8dc] bg-[#f4f8f4] p-1.5 pr-4 transition hover:border-[#0f6f25] hover:bg-[#ebf4ec]"
              to="/profile"
              aria-label="Learner Profile"
            >
              <AnimalAvatar avatarId={userAvatarId} size="sm" />

              <div className="hidden flex-col text-left sm:flex">
                <span className="text-xs font-bold leading-tight text-[#102112]">
                  {firstName}
                </span>
                <span className="text-[11px] font-semibold text-[#5a665b]">
                  Learner Profile
                </span>
              </div>
            </Link>

            {!personalized && (
              <button
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0f6f25] px-4 font-bold text-white shadow-[0_8px_18px_rgba(15,111,37,0.18)] transition hover:bg-[#0b5f1f] disabled:cursor-wait disabled:opacity-70"
                disabled={buildingPath}
                onClick={buildPersonalizedPath}
                type="button"
              >
                <span className={`material-symbols-outlined text-xl ${buildingPath ? 'animate-spin' : ''}`} aria-hidden="true">
                  {buildingPath ? 'progress_activity' : 'auto_awesome'}
                </span>
                <span className="hidden md:inline">
                  {buildingPath ? 'Building path…' : 'Personalize path'}
                </span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {generationError && (
        <div className="sticky top-[76px] z-50 border-b border-red-200 bg-[#fff0eb]">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-6 py-3 text-sm font-bold text-[#9d352b] lg:px-10 xl:px-14">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl" aria-hidden="true">error</span>
              Lesson generation failed: {generationError}
            </span>
            <button
              className="rounded-lg border border-[#9d352b]/40 px-3 py-1.5 transition hover:bg-red-100"
              onClick={() => setGenerationError('')}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <section className="mx-auto w-full max-w-[1500px] px-6 py-7 lg:px-10 xl:px-14">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[26px] border border-[#dce7d8] bg-white px-6 py-5 shadow-[0_16px_40px_rgba(37,73,38,0.07)] lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#edf6eb] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#0f6f25]">
                  <span className="size-2 rounded-full bg-[#35a34d]" />
                  {personalized ? 'Personalized journey' : 'Curriculum journey'}
                </span>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] lg:text-3xl">
                  Keep moving forward
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#657064]">
                  Complete each lesson to unlock the next step in your path.
                </p>
              </div>

              <div className="min-w-[240px] flex-1 sm:max-w-[390px]">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>{completedCount} of {lessons.length} completed</span>
                  <span className="text-[#0f6f25]">{progressPercent}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e3ece0]">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-[#0f6f25] to-[#70bf7c] transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-[26px] bg-[#174f25] px-6 py-5 text-white shadow-[0_16px_40px_rgba(19,73,31,0.16)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#acd6b4]">Up next</p>
            <h2 className="mt-2 line-clamp-1 text-lg font-black">
              {currentPathLesson?.title || 'Continue learning'}
            </h2>
            <p className="mt-1 line-clamp-1 text-sm text-[#c8e2cd]">
              {currentPathLesson?.category || path.level.name}
            </p>
            <button
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white font-black text-[#0f6f25] transition hover:bg-[#edf7ed] disabled:cursor-wait disabled:opacity-70"
              disabled={!currentPathLesson || Boolean(generatingLessonId)}
              onClick={() => currentPathLesson && startLesson(currentPathLesson, currentIndex + 1)}
              type="button"
            >
              <span className={`material-symbols-outlined text-lg ${generatingLessonId ? 'animate-spin' : ''}`} aria-hidden="true">
                {generatingLessonId ? 'progress_activity' : 'play_arrow'}
              </span>
              {generatingLessonId ? 'Preparing lesson…' : 'Continue lesson'}
            </button>
          </aside>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-[1500px] px-6 pb-10 lg:px-10 xl:px-14">
        <div className="overflow-hidden rounded-[32px] border border-[#d5e4d0] bg-[#dff0d8] shadow-[0_24px_60px_rgba(37,73,38,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#cfe0ca] bg-white/75 px-6 py-4 backdrop-blur lg:px-8">
            <div className="flex flex-wrap items-center gap-5 text-xs font-bold text-[#596457]">
              <LegendItem color="bg-[#0f6f25]" label="Completed" />
              <LegendItem color="bg-[#ff9c3a]" label="Current lesson" />
              <LegendItem color="bg-[#c7d1c4]" label="Locked" />
            </div>
            <p className="flex items-center gap-2 text-xs font-bold text-[#647062]">
              <span className="material-symbols-outlined text-lg" aria-hidden="true">swipe</span>
              Scroll horizontally to explore your path
            </p>
          </div>

          <div className="relative overflow-x-auto overflow-y-hidden" ref={scrollContainerRef}>
            <div
              className="relative"
              style={{
                width: mapWidth,
                height: mapHeight,
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(45, 101, 52, 0.10) 1px, transparent 0)',
                backgroundSize: '30px 30px',
              }}
            >
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#b8dda9] via-[#cde8c1]/75 to-transparent" />

              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 overflow-hidden"
                aria-hidden="true"
              >
                {Array.from({ length: Math.ceil(mapWidth / 100) }).map((_, index) => {
                  const emojis = ["🐰", "🦊", "🐼", "🐨", "🐯", "🚗", "🚌", "🐶"];
                  const emoji = emojis[index % emojis.length];

                  return (
                    <span
                      key={index}
                      className="
          absolute
          bottom-[-18px]
          flex
          size-24
          items-center
          justify-center
          rounded-full
          bg-[#9ccc8e]/70
          text-3xl
          select-none
        "
                      style={{ left: index * 100 }}
                    >
                      {emoji}
                    </span>
                  );
                })}
              </div>

              <div className="pointer-events-none absolute left-16 top-16 text-[#78aa6e]/45" aria-hidden="true">
                <span className="material-symbols-outlined text-7xl">cloud</span>
              </div>
              <div className="pointer-events-none absolute right-32 top-12 text-[#78aa6e]/35" aria-hidden="true">
                <span className="material-symbols-outlined text-8xl">cloud</span>
              </div>

              <svg
                className="pointer-events-none absolute inset-0 size-full"
                aria-hidden="true"
                preserveAspectRatio="none"
              >
                <path
                  d={pathData}
                  fill="none"
                  stroke="#bdd7b8"
                  strokeLinecap="round"
                  strokeWidth="22"
                />
                <path
                  d={pathData}
                  fill="none"
                  stroke="#f8fbf6"
                  strokeDasharray="10 16"
                  strokeLinecap="round"
                  strokeWidth="5"
                />
              </svg>

              {lessons.map((lesson, index) => {
                const position = index + 1
                const status = lessonStatuses[index]
                const isGenerating = generatingLessonId === lesson.id

                return (
                  <div key={lesson.nodeId || `${lesson.id}_${lesson.content_id}_${index}`}>
                    <div
                      className="absolute z-10 w-[190px] -translate-x-1/2 text-center"
                      style={{
                        left: getNodeX(index),
                        top: getNodeY(index) - 126,
                      }}
                    >
                      <span className="inline-block max-w-full truncate rounded-full border border-white/70 bg-white/85 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#5d6b5c] shadow-sm backdrop-blur">
                        {lesson.content_order_no ? `${lesson.category || 'Lesson'} · Part ${lesson.content_order_no}` : (lesson.category || `Lesson ${position}`)}
                      </span>

                      {/* {lesson.reason && (
                        <p className="mt-2 line-clamp-2 rounded-xl bg-[#174f25]/90 px-3 py-2 text-xs leading-4 text-white shadow-lg">
                          {lesson.reason}
                        </p>
                      )} */}
                    </div>

                    <LessonNode
                      isCurrent={status === 'current'}
                      lessonNumber={position}
                      onStart={() => startLesson(lesson, position)}
                      status={status}
                      title={isGenerating ? 'Preparing lesson…' : lesson.title}
                      x={getNodeX(index)}
                      y={getNodeY(index)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}

function LegendItem({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-3 rounded-full ${color}`} />
      {label}
    </span>
  )
}
