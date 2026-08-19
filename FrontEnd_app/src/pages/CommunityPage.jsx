import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import AnimatedBackgroundPaths from '../components/AnimatedBackgroundpaths'
import EnergyIndicator from '../components/energy/EnergyIndicator'
import NotificationBell from '../components/notifications/NotificationBell'
import { getProgress } from '../services/lessonApi'
import AnimalAvatar from '../components/AnimalAvatar'
import {
  getCommunityPosts,
  createCommunityPost,
  togglePostReaction,
  getCommunityLeaderboard,
} from '../services/communityApi'

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

function getTargetLanguageName(user) {
  if (!user) return 'Spanish'
  if (typeof user.target_language === 'string' && user.target_language.trim()) {
    return user.target_language.trim()
  }
  if (typeof user.target_language === 'object' && user.target_language?.name) {
    return user.target_language.name
  }
  if (typeof user.target_language_name === 'string' && user.target_language_name.trim()) {
    return user.target_language_name.trim()
  }
  return 'Spanish'
}

function getLanguageFlag(langName = '') {
  const lower = String(langName).toLowerCase()
  if (lower.includes('french')) return '🇫🇷'
  if (lower.includes('german')) return '🇩🇪'
  if (lower.includes('japanese')) return '🇯🇵'
  if (lower.includes('italian')) return '🇮🇹'
  if (lower.includes('portuguese')) return '🇵🇹'
  if (lower.includes('english')) return '🇬🇧'
  return '🇪🇸'
}

// Fallback Initial Posts if API offline
const INITIAL_FALLBACK_POSTS = [
  {
    id: 1,
    author_name: 'Elena Rostova',
    username: '@elena_r',
    avatar_id: 'fox',
    target_lang: 'Spanish',
    flag: '🇪🇸',
    xp_badge: '2,840 XP',
    streak_badge: '21 Days',
    milestone: '🎯 20% Spanish Proficiency Reached',
    text: 'Just hit 20% overall proficiency in Spanish! The AI Tutor real-time practice really helped me get past intermediate conversation blocks! 🚀',
    timestamp: '2 hours ago',
    fires: 18,
    likes: 24,
    user_fired: false,
    user_liked: false,
  },
  {
    id: 2,
    author_name: 'Marcus Chen',
    username: '@marcus_c',
    avatar_id: 'panda',
    target_lang: 'Japanese',
    flag: '🇯🇵',
    xp_badge: '3,450 XP',
    streak_badge: '45 Days',
    milestone: '🏆 Monthly Assessment Master',
    text: 'Completed 30 days straight of monthly assessment challenges with 95% average score! Kanji writing practice and daily reviews pay off! 📝✨',
    timestamp: '5 hours ago',
    fires: 32,
    likes: 41,
    user_fired: false,
    user_liked: false,
  },
  {
    id: 3,
    author_name: 'Sophia Al-Mansoor',
    username: '@sophia_m',
    avatar_id: 'owl',
    target_lang: 'French',
    flag: '🇫🇷',
    xp_badge: '2,120 XP',
    streak_badge: '14 Days',
    milestone: '🌟 2,000 XP Milestone',
    text: 'Just unlocked the "Weekly Reviewer" badge and hit over 2,000 total XP in French! Onto Level B1 listening exercises! 🥐🥖',
    timestamp: '1 day ago',
    fires: 14,
    likes: 28,
    user_fired: false,
    user_liked: false,
  },
  {
    id: 4,
    author_name: 'Alex Rivera',
    username: '@alex_r',
    avatar_id: 'bear',
    target_lang: 'German',
    flag: '🇩🇪',
    xp_badge: '1,280 XP',
    streak_badge: '9 Days',
    milestone: '📚 Story Completed',
    text: 'Finished my first German short story translation without hints! Der Weg ist das Ziel! 🇩🇪 Keep pushing everyone!',
    timestamp: '2 days ago',
    fires: 15,
    likes: 22,
    user_fired: false,
    user_liked: false,
  },
]

export default function CommunityPage() {
  const user = useMemo(() => getCurrentUser(), [])
  const firstName = getFirstName(user)
  const userTargetLang = getTargetLanguageName(user)
  const userFlag = getLanguageFlag(userTargetLang)
  const userAvatarId = user.avatar || 'owl'

  const [progress, setProgress] = useState(null)
  const [activeTab, setActiveTab] = useState('feed') // 'feed' | 'leaderboard'

  // Posts & Reactions State
  const [posts, setPosts] = useState(INITIAL_FALLBACK_POSTS)
  const [newPostText, setNewPostText] = useState('')
  const [selectedTag, setSelectedTag] = useState(`🎯 20% ${userTargetLang} Proficiency`)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Leaderboard State
  const [leaderboardData, setLeaderboardData] = useState([])
  const [timeFilter, setTimeFilter] = useState('all') // 'all' | 'week'
  const [langFilter, setLangFilter] = useState('all')

  // Fetch User Progress
  useEffect(() => {
    let active = true
    getProgress()
      .then((data) => {
        if (active && data) setProgress(data)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  // Fetch Posts from Backend Database API
  useEffect(() => {
    let active = true
    getCommunityPosts()
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setPosts(data)
        }
      })
      .catch(() => {
        // Fallback to local state if backend API offline
      })

    return () => {
      active = false
    }
  }, [])

  // Fetch Leaderboard from Backend Database API
  useEffect(() => {
    let active = true
    getCommunityLeaderboard(langFilter)
      .then((data) => {
        if (active && Array.isArray(data)) {
          setLeaderboardData(data)
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [langFilter])

  // Handle New Post Submission
  const handleCreatePost = async (e) => {
    e.preventDefault()
    if (!newPostText.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      // Call Backend API to create post in Django DB
      const createdPost = await createCommunityPost(newPostText.trim(), selectedTag)
      if (createdPost && createdPost.id) {
        setPosts((prev) => [createdPost, ...prev])
      } else {
        throw new Error('Fallback create')
      }
    } catch {
      // Offline fallback post creation
      const localPost = {
        id: Date.now(),
        author_name: user.name || firstName,
        username: `@${(firstName || 'learner').toLowerCase().replace(/\s+/g, '_')}`,
        avatar_id: userAvatarId,
        target_lang: userTargetLang,
        flag: userFlag,
        xp_badge: `${progress?.total_xp ?? 1450} XP`,
        streak_badge: `${progress?.current_streak ?? 7} Days`,
        milestone: selectedTag,
        text: newPostText.trim(),
        timestamp: 'Just now',
        fires: 1,
        likes: 1,
        user_fired: true,
        user_liked: true,
      }
      setPosts((prev) => [localPost, ...prev])
    } finally {
      setNewPostText('')
      setIsSubmitting(false)
    }
  }

  // Handle Reaction Toggles (Fires & Likes) via Backend API
  const handleToggleReaction = async (postId, type) => {
    // Optimistic UI Update
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post
        const isFire = type === 'fire'
        const currentActive = isFire ? post.user_fired : post.user_liked
        const newActive = !currentActive
        const delta = newActive ? 1 : -1

        return {
          ...post,
          fires: isFire ? Math.max(0, post.fires + delta) : post.fires,
          likes: !isFire ? Math.max(0, post.likes + delta) : post.likes,
          user_fired: isFire ? newActive : post.user_fired,
          user_liked: !isFire ? newActive : post.user_liked,
        }
      }),
    )

    try {
      const res = await togglePostReaction(postId, type)
      if (res && typeof res.fires === 'number') {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id !== postId) return post
            return {
              ...post,
              fires: res.fires,
              likes: res.likes,
              user_fired: res.user_fired,
              user_liked: res.user_liked,
            }
          }),
        )
      }
    } catch {
      // Keep optimistic state if network glitch
    }
  }

  // Construct Leaderboard fallback if backend API fetching
  const userXp = progress?.total_xp ?? 1450
  const userStreak = progress?.current_streak ?? 7

  const currentUserLeaderboardItem = {
    rank: 4,
    name: user.name || firstName,
    username: `@${(firstName || 'learner').toLowerCase().replace(/\s+/g, '_')}`,
    avatarId: userAvatarId,
    targetLang: userTargetLang,
    flag: userFlag,
    xp: userXp,
    streak: userStreak,
    isCurrentUser: true,
  }

  const displayedLeaderboard = leaderboardData.length > 0 ? leaderboardData : [
    { rank: 1, name: 'Marcus Chen', username: '@marcus_c', avatarId: 'panda', targetLang: 'Japanese', flag: '🇯🇵', xp: 3450, streak: 45 },
    { rank: 2, name: 'Elena Rostova', username: '@elena_r', avatarId: 'fox', targetLang: 'Spanish', flag: '🇪🇸', xp: 2840, streak: 21 },
    { rank: 3, name: 'Sophia Al-Mansoor', username: '@sophia_m', avatarId: 'owl', targetLang: 'French', flag: '🇫🇷', xp: 2120, streak: 14 },
    currentUserLeaderboardItem,
    { rank: 5, name: 'Alex Rivera', username: '@alex_r', avatarId: 'bear', targetLang: 'German', flag: '🇩🇪', xp: 1280, streak: 9 },
    { rank: 6, name: 'Lucas Silva', username: '@lucas_s', avatarId: 'penguin', targetLang: 'Portuguese', flag: '🇵🇹', xp: 1150, streak: 12 },
    { rank: 7, name: 'Emma Watson', username: '@emma_w', avatarId: 'bunny', targetLang: 'Italian', flag: '🇮🇹', xp: 980, streak: 5 },
    { rank: 8, name: 'Priya Sharma', username: '@priya_s', avatarId: 'cat', targetLang: 'Spanish', flag: '🇪🇸', xp: 890, streak: 8 },
  ].filter((item) => {
    if (langFilter === 'all') return true
    return String(item.targetLang || '').toLowerCase().includes(langFilter.toLowerCase())
  })

  return (
    <main className="route-fade min-h-screen bg-[#f7faf8] text-[#102b18] [box-sizing:border-box] [&_*]:box-border [&_a]:no-underline">
      <AnimatedBackgroundPaths />

      {/* Header Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[#dfe5dc] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1440px] items-center justify-between px-6 lg:px-10 xl:px-14">
          <Link
            className="shrink-0 text-2xl font-black tracking-[-0.03em] text-[#0f6f25]"
            to="/dashboard"
          >
            lingora Learning
          </Link>

          {/* Nav Switcher */}
          <nav
            className="hidden items-center gap-2 rounded-2xl bg-[#f3f6f1] p-1.5 text-sm font-bold text-[#30382f] md:flex"
            aria-label="Community navigation"
          >
            <Link
              className="rounded-xl px-5 py-2.5 transition-colors hover:bg-white hover:text-[#0f6f25]"
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
              className="rounded-xl bg-white px-5 py-2.5 text-[#102b18] shadow-sm font-bold"
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
              to="/profile#preferences"
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
              className="flex items-center gap-3 rounded-2xl border border-[#dbe8dc] bg-[#f4f8f4] p-1.5 pr-4 transition hover:border-[#0f6f25] hover:bg-[#ebf4ec]"
              to="/profile"
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
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 py-8 lg:px-10 lg:py-10 xl:px-14">
        
        {/* Top Hero Banner (Learner Profile & Stats) */}
        <section className="relative overflow-hidden rounded-[28px] border border-[#dce8dd] bg-gradient-to-br from-[#f0f8f2] to-[#e8f4eb] px-6 py-8 shadow-[0_20px_60px_rgba(31,73,40,0.08)] sm:px-8 lg:px-10 lg:py-10 xl:px-12">
          <div
            className="pointer-events-none absolute -right-24 -top-32 size-[400px] rounded-full bg-[#bfe1c2]/35 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto] xl:gap-16">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe4d0] bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#0f6f25]">
                <span className="size-2 rounded-full bg-[#22a340]" />
                Welcome to the Lingora Hub
              </span>

              <h1 className="mt-5 text-[clamp(32px,3.5vw,52px)] font-black leading-[1.08] tracking-[-0.04em] text-[#102b18]">
                Connect, Share & Compete with Global Learners
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-[#617067] lg:text-lg">
                Showcase your language milestones, gain inspiration from fellow learners, and climb the weekly XP leaderboard.
              </p>
            </div>

            {/* Top Right Stats Widgets */}
            <div className="grid grid-cols-2 gap-4 lg:min-w-[340px]">
              {/* STREAK WIDGET */}
              <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-[0_14px_35px_rgba(28,67,39,0.08)] backdrop-blur">
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
                    STREAK
                  </span>
                </div>

                <strong className="mt-5 block text-3xl font-black tracking-tight text-[#102b18]">
                  {progress?.current_streak ?? 7}
                </strong>

                <span className="mt-1 block text-sm text-[#617067]">
                  Consecutive days
                </span>
              </div>

              {/* TOTAL XP WIDGET */}
              <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-[0_14px_35px_rgba(28,67,39,0.08)] backdrop-blur">
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
                    TOTAL XP
                  </span>
                </div>

                <strong className="mt-5 block text-3xl font-black tracking-tight text-[#102b18]">
                  {progress?.total_xp ?? 1450}
                </strong>

                <span className="mt-1 block text-sm text-[#617067]">
                  Experience earned
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Sub-Navigation Tabs */}
        <div className="mt-8 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-[#f3f6f1] p-1.5 text-sm font-bold text-[#30382f]">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 transition-all ${
                activeTab === 'feed'
                  ? 'bg-white text-[#102b18] shadow-sm font-black'
                  : 'text-[#617067] hover:bg-white/60 hover:text-[#102b18]'
              }`}
            >
              <span className="material-symbols-outlined text-xl">forum</span>
              Showcase Feed
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-[#102b18] shadow-sm font-black'
                  : 'text-[#617067] hover:bg-white/60 hover:text-[#102b18]'
              }`}
            >
              <span className="material-symbols-outlined text-xl">leaderboard</span>
              XP Leaderboard
            </button>
          </div>
        </div>

        {/* TAB 1: SHOWCASE FEED */}
        {activeTab === 'feed' && (
          <div className="mt-6 space-y-6">
            
            {/* Post Creator Widget */}
            <div className="rounded-2xl border border-[#dce8dd] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <AnimalAvatar avatarId={userAvatarId} size="md" />

                <div className="w-full">
                  <textarea
                    rows={3}
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder={`Share an achievement or milestone with the community (e.g. 'Just hit 20% overall proficiency in ${userTargetLang}!')...`}
                    className="w-full rounded-xl border border-[#dce8dd] bg-[#f7faf8] p-4 text-sm font-medium text-[#102b18] outline-none transition placeholder:text-[#809085] focus:border-[#137c31] focus:bg-white"
                  />

                  {/* Preset Milestone Tags */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#617067]">Quick Milestone:</span>
                    {[
                      `🎯 20% ${userTargetLang} Proficiency`,
                      '🔥 7-Day Streak Achieved',
                      '🏆 Perfect Daily Assessment',
                      '🌟 1,500 XP Milestone',
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(tag)}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                          selectedTag === tag
                            ? 'bg-[#137c31] text-white shadow-sm'
                            : 'bg-[#eef7f0] text-[#137c31] hover:bg-[#e2f3e5]'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  {/* Submit Row */}
                  <div className="mt-4 flex items-center justify-between border-t border-[#f0f4f1] pt-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#617067]">
                      <span className="material-symbols-outlined text-lg text-[#137c31]">verified</span>
                      Posting as <span className="font-bold text-[#102b18]">{firstName}</span> ({userTargetLang})
                    </div>

                    <button
                      onClick={handleCreatePost}
                      disabled={!newPostText.trim() || isSubmitting}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#137c31] px-6 text-sm font-black text-white shadow-[0_8px_20px_rgba(19,124,49,0.2)] transition hover:bg-[#0f6528] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>{isSubmitting ? 'Posting...' : 'Post Achievement'}</span>
                      <span className="material-symbols-outlined text-lg">send</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievement Cards Feed List */}
            <div className="space-y-5">
              {posts.map((post) => {
                const authorName = post.author_name || post.author || 'Learner'
                const username = post.username || `@${authorName.toLowerCase().replace(/\s+/g, '_')}`
                const avatarId = post.avatar_id || post.avatarId || 'owl'
                const targetLang = post.target_lang || post.targetLang || 'Spanish'
                const flag = post.flag || getLanguageFlag(targetLang)
                const xpBadge = post.xp_badge || post.xpBadge || '1,450 XP'
                const streakBadge = post.streak_badge || post.streakBadge || '7 Days'
                const firesCount = post.fires ?? 0
                const likesCount = post.likes ?? 0
                const userFired = Boolean(post.user_fired)
                const userLiked = Boolean(post.user_liked)

                return (
                  <article
                    key={post.id}
                    className="rounded-2xl border border-[#dce8dd] bg-white p-6 shadow-sm transition hover:shadow-md"
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <AnimalAvatar avatarId={avatarId} size="md" />

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[#102b18]">{authorName}</h3>
                            <span className="text-xs text-[#7a8278]">{username}</span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f8f2] px-2.5 py-0.5 font-semibold text-[#137c31]">
                              <span>{flag}</span>
                              {targetLang}
                            </span>
                            <span className="font-semibold text-[#617067]">• {post.timestamp}</span>
                          </div>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#e8f5e9] px-3 py-1 text-xs font-bold text-[#137c31]">
                          <span className="material-symbols-outlined text-sm">stars</span>
                          {xpBadge}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#fff0e5] px-3 py-1 text-xs font-bold text-[#aa4f14]">
                          <span className="material-symbols-outlined text-sm">local_fire_department</span>
                          {streakBadge}
                        </span>
                      </div>
                    </div>

                    {/* Shared Achievement Container */}
                    <div className="mt-4 rounded-xl border border-[#dce8dd] bg-[#f0f8f2] p-4 text-[#102b18]">
                      {post.milestone && (
                        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#137c31]">
                          {post.milestone}
                        </div>
                      )}
                      <p className="text-sm leading-relaxed text-[#102b18] font-medium">{post.text}</p>
                    </div>

                    {/* Interactive Reactions Bar (NO comments option) */}
                    <div className="mt-4 flex items-center justify-between border-t border-[#f0f4f1] pt-3">
                      <div className="flex items-center gap-3">
                        {/* Fire Reaction Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(post.id, 'fire')}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                            userFired
                              ? 'bg-[#fff0e5] text-[#ea580c] ring-1 ring-[#fdba74]'
                              : 'bg-[#f4f7f5] text-[#617067] hover:bg-[#eef4f0] hover:text-[#102b18]'
                          }`}
                        >
                          <span className="text-sm">🔥</span>
                          <span>{firesCount}</span>
                        </button>

                        {/* Like Reaction Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(post.id, 'like')}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                            userLiked
                              ? 'bg-[#ffe4e6] text-[#e11d48] ring-1 ring-[#fda4af]'
                              : 'bg-[#f4f7f5] text-[#617067] hover:bg-[#eef4f0] hover:text-[#102b18]'
                          }`}
                        >
                          <span className="text-sm">❤️</span>
                          <span>{likesCount}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        className="text-xs font-bold text-[#137c31] hover:underline"
                        onClick={() => handleToggleReaction(post.id, 'fire')}
                      >
                        Congratulate 🎉
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2: XP & LANGUAGE LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="mt-6 rounded-2xl border border-[#dce8dd] bg-white p-6 shadow-sm">
            {/* Leaderboard Header & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f0f4f1] pb-6">
              <div>
                <h2 className="text-xl font-black tracking-tight text-[#102b18]">
                  Global Language Champions
                </h2>
                <p className="mt-1 text-sm text-[#617067]">
                  Learners earning the most XP and building active streaks across all courses.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Language Filter */}
                <select
                  value={langFilter}
                  onChange={(e) => setLangFilter(e.target.value)}
                  className="rounded-xl border border-[#dce8dd] bg-[#f7faf8] px-4 py-2 text-xs font-bold text-[#102b18] outline-none transition focus:border-[#137c31]"
                >
                  <option value="all">All Languages 🌐</option>
                  <option value="spanish">Spanish 🇪🇸</option>
                  <option value="french">French 🇫🇷</option>
                  <option value="german">German 🇩🇪</option>
                  <option value="japanese">Japanese 🇯🇵</option>
                </select>

                {/* Time Filter */}
                <div className="inline-flex rounded-xl bg-[#f4f7f5] p-1 text-xs font-bold">
                  <button
                    onClick={() => setTimeFilter('all')}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      timeFilter === 'all' ? 'bg-white text-[#102b18] shadow-sm' : 'text-[#617067]'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    onClick={() => setTimeFilter('week')}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      timeFilter === 'week' ? 'bg-white text-[#102b18] shadow-sm' : 'text-[#617067]'
                    }`}
                  >
                    This Week
                  </button>
                </div>
              </div>
            </div>

            {/* Leaderboard Table Container */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#eef4f0] text-xs font-bold uppercase tracking-wider text-[#7a8278]">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Learner Name</th>
                    <th className="py-3 px-4">Target Language</th>
                    <th className="py-3 px-4 text-right">Total XP</th>
                    <th className="py-3 px-4 text-right">Streak Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f7f3]">
                  {displayedLeaderboard.map((item) => {
                    const isTop1 = item.rank === 1
                    const isTop2 = item.rank === 2
                    const isTop3 = item.rank === 3
                    const isTop3Pos = isTop1 || isTop2 || isTop3
                    const isUser = item.isCurrentUser || item.is_current_user

                    return (
                      <tr
                        key={item.username + item.rank}
                        className={`transition-colors ${
                          isUser
                            ? 'bg-[#eef7f0] border-l-4 border-[#137c31]'
                            : isTop3Pos
                            ? 'bg-[#fbfdfe]/80'
                            : 'hover:bg-[#f9fbf9]'
                        }`}
                      >
                        {/* Rank Column */}
                        <td className="py-4 px-4 font-black">
                          {isTop1 && (
                            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-[#fef9c3] text-base border border-[#fde047]">
                              🥇
                            </span>
                          )}
                          {isTop2 && (
                            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-[#f1f5f9] text-base border border-[#cbd5e1]">
                              🥈
                            </span>
                          )}
                          {isTop3 && (
                            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-[#ffedd5] text-base border border-[#fed7aa]">
                              🥉
                            </span>
                          )}
                          {!isTop3Pos && (
                            <span className="inline-flex size-8 items-center justify-center text-sm font-bold text-[#617067]">
                              #{item.rank}
                            </span>
                          )}
                        </td>

                        {/* Learner Name Column */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <AnimalAvatar avatarId={item.avatarId || item.avatar_id || 'owl'} size="md" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#102b18]">{item.name}</span>
                                {isUser && (
                                  <span className="rounded-md bg-[#137c31] px-2 py-0.5 text-[10px] font-black text-white">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-[#7a8278]">{item.username}</span>
                            </div>
                          </div>
                        </td>

                        {/* Target Language */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f8f2] px-3 py-1 text-xs font-bold text-[#137c31]">
                            <span>{item.flag}</span>
                            <span>{item.targetLang || item.target_lang}</span>
                          </span>
                        </td>

                        {/* Total XP */}
                        <td className="py-4 px-4 text-right">
                          <span className="inline-flex items-center gap-1 font-black text-[#137c31]">
                            <span className="material-symbols-outlined text-base">stars</span>
                            {item.xp ? item.xp.toLocaleString() : 0} XP
                          </span>
                        </td>

                        {/* Streak Days */}
                        <td className="py-4 px-4 text-right">
                          <span className="inline-flex items-center gap-1 font-bold text-[#aa4f14]">
                            <span className="material-symbols-outlined text-base">local_fire_department</span>
                            {item.streak ?? 0} Days
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
