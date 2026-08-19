const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function clearSession() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('currentUser')
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem('refreshToken')
  if (!refresh) return null

  const response = await fetch(`${API_BASE_URL}/api/accounts/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!response.ok) {
    clearSession()
    return null
  }
  const data = await response.json()
  if (!data.access) {
    clearSession()
    return null
  }
  localStorage.setItem('accessToken', data.access)
  if (data.refresh) localStorage.setItem('refreshToken', data.refresh)
  return data.access
}

export async function safeParseJson(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      throw new Error(`Invalid JSON received from server (${response.status}).`)
    }
  }
  const text = await response.text()
  if (response.status === 404) {
    throw new Error('API route not found (404). Please ensure backend Django server is running.')
  }
  if (response.status >= 500) {
    throw new Error(`Server error (${response.status}). Please check Django backend logs.`)
  }
  throw new Error(`Server error (${response.status}): ${text.slice(0, 100)}`)
}

export async function apiRequest(path, options = {}, allowRefresh = true) {
  const token = localStorage.getItem('accessToken')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (response.status === 401 && allowRefresh) {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) return apiRequest(path, options, false)
    throw new Error('Your session has expired. Please log in again.')
  }
  let data = {}
  try {
    data = await safeParseJson(response)
  } catch (err) {
    if (!response.ok) throw err
  }
  if (!response.ok) {
    const error = new Error(data.detail || data.message || 'Lesson request failed.')
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export async function generateLesson(lessonId, contentId) {
  const params = contentId ? `?content_id=${contentId}` : ''
  const body = contentId ? JSON.stringify({ content_id: contentId }) : undefined
  const options = { method: 'POST', ...(body ? { body } : {}) }
  const lesson = await apiRequest(`/api/learning/lessons/${lessonId}/generate/${params}`, options)
  return lesson
}

export const getLearningPath = () => apiRequest('/api/learning/path/')

export const getProgress = () => apiRequest('/api/progress/me/')

export const submitActivity = (generationId, activityId, payload) => apiRequest(
  `/api/learning/generated-lessons/${generationId}/activities/${activityId}/submit/`,
  { method: 'POST', body: JSON.stringify(payload) },
)

export const completeLesson = (generationId) => apiRequest(
  `/api/learning/generated-lessons/${generationId}/complete/`,
  { method: 'POST' },
)

export const getSkillProfile = () => apiRequest('/api/me/skill-profile/')
export const getSkillHistory = (page = 1) => apiRequest(`/api/me/skill-history/?page=${page}`)
export const getRecommendations = () => apiRequest('/api/recommendations/')
export const refreshRecommendations = () => apiRequest('/api/recommendations/refresh/', { method: 'POST' })
export const acceptRecommendation = (id) => apiRequest(`/api/recommendations/${id}/accept/`, { method: 'POST' })
export const dismissRecommendation = (id) => apiRequest(`/api/recommendations/${id}/dismiss/`, { method: 'POST' })
export const getPersonalizedPath = () => apiRequest('/api/learning-paths/current/')
export const createPersonalizedPath = () => apiRequest('/api/learning-paths/generate/', { method: 'POST' })
export const startPathItem = (id) => apiRequest(`/api/learning-path-items/${id}/start/`, { method: 'POST' })
export const skipPathItem = (id) => apiRequest(`/api/learning-path-items/${id}/skip/`, { method: 'POST' })
export function getForecast({ days = 14, lessons = 2, consistency = 80 } = {}) {
  const params = new URLSearchParams({
    days: String(days),
    lessons: String(lessons),
    consistency: String(consistency),
  })
  return apiRequest(`/api/proficiency-forecast/?${params.toString()}`)
}

export const getAssessmentStatus = () => apiRequest('/api/assessments/status/')
export const getCurrentAssessment = (type) => apiRequest(`/api/assessments/current/?type=${encodeURIComponent(type)}`)
export const startAssessment = (id) => apiRequest(`/api/assessments/${id}/start/`, { method: 'POST' })
export const saveAssessmentAnswer = (id, activityId, answer) => apiRequest(
  `/api/assessments/${id}/answer/`,
  { method: 'POST', body: JSON.stringify({ activity_id: activityId, answer }) },
)
export const completeAssessment = (id) => apiRequest(`/api/assessments/${id}/complete/`, { method: 'POST' })
export const getAssessmentHistory = (page = 1) => apiRequest(`/api/assessments/history/?page=${page}`)
export const getAssessmentResult = (id) => apiRequest(`/api/assessments/${id}/result/`)
export const getBadges = () => apiRequest('/api/badges/')
export const getMyBadges = () => apiRequest('/api/badges/mine/')
