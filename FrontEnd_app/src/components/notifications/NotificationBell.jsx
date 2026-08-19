import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getUnreadNotifications,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateNotificationPreferences,
} from '../../services/notificationApi'

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function getTypeIcon(type) {
  switch (type) {
    case 'lesson_reminder':
    case 'lesson_completed':
      return 'school'
    case 'streak_reminder':
      return 'local_fire_department'
    case 'lesson_ready':
      return 'auto_awesome'
    case 'assessment_reminder':
    case 'assessment_available':
      return 'assignment'
    case 'achievement':
      return 'workspace_premium'
    case 'inactivity_reminder':
      return 'schedule'
    case 'daily_goal_reminder':
      return 'flag'
    default:
      return 'notifications'
  }
}

function getTypeColor(type) {
  switch (type) {
    case 'streak_reminder':
      return 'text-amber-500 bg-amber-50'
    case 'lesson_ready':
      return 'text-emerald-600 bg-emerald-50'
    case 'assessment_reminder':
    case 'assessment_available':
      return 'text-indigo-600 bg-indigo-50'
    case 'achievement':
      return 'text-purple-600 bg-purple-50'
    default:
      return 'text-[#0f6f25] bg-[#edf5ee]'
  }
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  // Detect and sync timezone once on load
  useEffect(() => {
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (userTz) {
        updateNotificationPreferences({ timezone: userTz }).catch(() => {})
      }
    } catch {
      // Ignore fallback
    }
  }, [])

  const fetchUnread = useCallback(async () => {
    try {
      const data = await getUnreadNotifications()
      setUnreadCount(data.unread_count || 0)
      if (!isOpen && data.notifications) {
        setNotifications(data.notifications)
      }
    } catch {
      // Silent fail on background poll
    }
  }, [isOpen])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getNotifications()
      const list = data.results || data
      setNotifications(list)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch and 30s polling
  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [fetchUnread])

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchAll()
    }
  }, [isOpen, fetchAll])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (item) => {
    if (!item.is_read) {
      try {
        await markNotificationAsRead(item.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        console.error('Error marking read:', err)
      }
    }

    setIsOpen(false)

    // Navigation logic based on metadata
    const meta = item.metadata || {}
    if (meta.lesson_id || meta.generated_lesson_id) {
      navigate('/lessons')
    } else if (meta.assessment_id || meta.assessment_type) {
      navigate('/assessment')
    } else if (meta.achievement_key) {
      navigate('/learning-insights')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="icon-bounce relative grid size-10 place-items-center rounded-xl border border-transparent transition hover:border-[#dbe8dc] hover:bg-[#edf5ee] focus:outline-none"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        type="button"
      >
        <span className="material-symbols-outlined text-[22px] text-[#0f6f25]">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-[#dce7d8] bg-white p-4 shadow-[0_20px_50px_rgba(20,40,20,0.15)] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-[#edf2eb] pb-3 mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-[#172018] text-base">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#edf5ee] px-2 py-0.5 text-xs font-bold text-[#0f6f25]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-[#0f6f25] hover:underline"
                type="button"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1 divide-y divide-[#f4f7f2]">
            {loading ? (
              <div className="py-8 text-center text-xs font-bold text-gray-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <span className="material-symbols-outlined text-3xl text-gray-300">
                  notifications_paused
                </span>
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  No notifications yet.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const icon = getTypeIcon(item.notification_type)
                const colorClass = getTypeColor(item.notification_type)
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-start gap-3 hover:bg-[#f6f9f5] ${
                      !item.is_read ? 'bg-[#f4f8f3]/60 font-medium' : 'opacity-85'
                    }`}
                  >
                    <div className={`shrink-0 size-9 rounded-xl grid place-items-center ${colorClass}`}>
                      <span className="material-symbols-outlined text-lg">{icon}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-bold truncate ${!item.is_read ? 'text-[#0f6f25]' : 'text-gray-800'}`}>
                          {item.title}
                        </p>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 mt-0.5 leading-snug">
                        {item.message}
                      </p>
                    </div>

                    {!item.is_read && (
                      <span className="shrink-0 mt-1 size-2 rounded-full bg-[#0f6f25]" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
