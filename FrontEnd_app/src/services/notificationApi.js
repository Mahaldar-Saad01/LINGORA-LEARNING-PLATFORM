import { apiRequest } from './lessonApi'

export async function getNotifications(unreadOnly = false) {
  const query = unreadOnly ? '?unread=true' : ''
  return apiRequest(`/api/notifications/${query}`)
}

export async function getUnreadNotifications() {
  return apiRequest('/api/notifications/unread/')
}

export async function markNotificationAsRead(id) {
  return apiRequest(`/api/notifications/${id}/read/`, {
    method: 'PATCH',
  })
}

export async function markAllNotificationsAsRead() {
  return apiRequest('/api/notifications/read-all/', {
    method: 'PATCH',
  })
}

export async function getNotificationPreferences() {
  return apiRequest('/api/notification-preferences/')
}

export async function updateNotificationPreferences(data) {
  return apiRequest('/api/notification-preferences/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
