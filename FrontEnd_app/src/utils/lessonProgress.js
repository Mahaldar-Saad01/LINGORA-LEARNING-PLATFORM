const lessonProgressPrefix = 'lessonPathProgress'
const lessonPositionPrefix = 'lessonPathPositions'
const lessonProgressVersion = '2'

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || '{}')
  } catch {
    return {}
  }
}

export function getLessonProgressKey(user = getCurrentUser()) {
  const userIdentifier = user.id || user.email || user.username
  return userIdentifier
    ? `${lessonProgressPrefix}:${userIdentifier}`
    : `${lessonProgressPrefix}:guest`
}

export function getLessonProgress(user = getCurrentUser()) {
  try {
    return Number(localStorage.getItem(getLessonProgressKey(user)) || 1)
  } catch {
    return 1
  }
}

export function saveLessonProgress(progress, user = getCurrentUser()) {
  localStorage.setItem(getLessonProgressKey(user), String(progress))
  localStorage.setItem(`${getLessonProgressKey(user)}:version`, lessonProgressVersion)
}

function getLessonPositionsKey(user = getCurrentUser()) {
  const userIdentifier = user.id || user.email || user.username || 'guest'
  return `${lessonPositionPrefix}:${userIdentifier}`
}

export function saveLessonPositions(lessons, user = getCurrentUser()) {
  const positions = {}
  lessons.forEach((lesson, index) => {
    const pos = index + 1
    if (lesson.nodeId) positions[lesson.nodeId] = pos
    if (lesson.id && lesson.content_id) positions[`${lesson.id}_${lesson.content_id}`] = pos
    if (lesson.id && !positions[String(lesson.id)]) positions[String(lesson.id)] = pos
  })
  localStorage.setItem(getLessonPositionsKey(user), JSON.stringify(positions))
}

export function getLessonPosition(lessonId, contentId = null, user = getCurrentUser()) {
  try {
    const positions = JSON.parse(localStorage.getItem(getLessonPositionsKey(user)) || '{}')
    if (contentId && positions[`${lessonId}_${contentId}`]) {
      return Number(positions[`${lessonId}_${contentId}`])
    }
    return Number(positions[String(lessonId)]) || null
  } catch {
    return null
  }
}

export function migrateLessonProgress(lessons, user = getCurrentUser()) {
  const key = getLessonProgressKey(user)
  const current = getLessonProgress(user)
  if (localStorage.getItem(`${key}:version`) === lessonProgressVersion) return current

  // Previous code stored database lesson_id + 1 instead of the ordered path position.
  const completedLessonId = current - 1
  const completedIndex = lessons.findIndex((lesson) => Number(lesson.id) === completedLessonId)
  const migrated = completedIndex >= 0
    ? completedIndex + 2
    : Math.min(Math.max(current, 1), lessons.length + 1)
  saveLessonProgress(migrated, user)
  return migrated
}
