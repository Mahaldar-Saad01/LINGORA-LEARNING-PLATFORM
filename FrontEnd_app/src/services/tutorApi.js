import { apiRequest } from './lessonApi'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const getConversations = () => apiRequest('/api/tutor/conversations/')

export const getConversation = (id) => apiRequest(`/api/tutor/conversations/${id}/`)

export const createConversation = (title = 'New Conversation') =>
  apiRequest('/api/tutor/conversations/', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })

export const deleteConversation = (id) =>
  apiRequest(`/api/tutor/conversations/${id}/`, { method: 'DELETE' })

export const getTutorStats = () => apiRequest('/api/tutor/stats/')

export async function streamTutorChat({ conversationId, message }, { onMeta, onChunk, onDone, onError, signal }) {
  try {
    const token = localStorage.getItem('accessToken')
    const response = await fetch(`${API_BASE_URL}/api/tutor/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        conversation_id: conversationId || undefined,
        message,
      }),
      signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || errorData.detail || 'Failed to connect to AI Tutor.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep unfinished line in buffer

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue

        const jsonStr = trimmed.replace(/^data:\s*/, '')
        if (!jsonStr) continue

        try {
          const payload = JSON.parse(jsonStr)
          if (payload.type === 'meta') {
            if (onMeta) onMeta(payload)
          } else if (payload.type === 'chunk') {
            if (onChunk) onChunk(payload.text)
          } else if (payload.type === 'done') {
            if (onDone) onDone(payload)
          }
        } catch (err) {
          // ignore parse errors for partial json
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return
    }
    if (onError) onError(err)
  }
}
