import { apiRequest } from './lessonApi'

export async function getEnergyStatus() {
  return apiRequest('/api/energy/')
}

export async function upgradeToPremium(durationDays = 30) {
  return apiRequest('/api/subscriptions/upgrade/', {
    method: 'POST',
    body: JSON.stringify({ duration_days: durationDays }),
  })
}

export async function cancelPremium() {
  return apiRequest('/api/subscriptions/cancel/', {
    method: 'POST',
  })
}
