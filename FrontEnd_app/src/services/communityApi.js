import { apiRequest } from './lessonApi'

export async function getCommunityPosts() {
  return apiRequest('/api/community/posts/')
}

export async function createCommunityPost(text, milestone = '') {
  return apiRequest('/api/community/posts/', {
    method: 'POST',
    body: JSON.stringify({ text, milestone }),
  })
}

export async function togglePostReaction(postId, reactionType = 'fire') {
  return apiRequest(`/api/community/posts/${postId}/react/`, {
    method: 'POST',
    body: JSON.stringify({ reaction_type: reactionType }),
  })
}

export async function getCommunityLeaderboard(lang = 'all') {
  return apiRequest(`/api/community/leaderboard/?lang=${encodeURIComponent(lang)}`)
}
