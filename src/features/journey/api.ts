import { apiRequest } from '../../api'
import type {
  JourneyCoverOptions,
  JourneyDayResponse,
  JourneyDaysResponse,
  JourneyHighlight,
  JourneyMonthResponse,
  JourneyPhase,
  JourneyPhaseInput,
  JourneyYearResponse,
} from './types'

function query(values: Record<string, string | number>) {
  return new URLSearchParams(Object.entries(values).map(([key, value]) => [key, String(value)])).toString()
}

const jsonHeaders = { 'Content-Type': 'application/json' }

export const journeyApi = {
  year(year: number, signal?: AbortSignal) {
    return apiRequest<JourneyYearResponse>(`/api/journey/year/${year}`, { signal })
  },
  month(year: number, month: number, signal?: AbortSignal) {
    return apiRequest<JourneyMonthResponse>(`/api/journey/month/${year}/${month}`, { signal })
  },
  days(from: string, to: string, page: number, signal?: AbortSignal) {
    return apiRequest<JourneyDaysResponse>(`/api/journey/days?${query({ from, to, page, limit: 20 })}`, { signal })
  },
  day(date: string, signal?: AbortSignal) {
    return apiRequest<JourneyDayResponse>(`/api/journey/days/${encodeURIComponent(date)}`, { signal })
  },
  updateAlbum(year: number, month: number, title: string, coverImageId: string | null, signal?: AbortSignal) {
    return apiRequest<JourneyMonthResponse>(`/api/journey/albums/${year}/${month}`, {
      method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ title, coverImageId }), signal,
    })
  },
  coverOptions(from: string, to: string, page: number, signal?: AbortSignal) {
    return apiRequest<JourneyCoverOptions>(`/api/journey/covers?${query({ from, to, page, limit: 20 })}`, { signal })
  },
  addHighlight(sourceId: string, signal?: AbortSignal) {
    return apiRequest<{ highlight: JourneyHighlight }>('/api/journey/highlights', {
      method: 'POST', headers: jsonHeaders, body: JSON.stringify({ sourceType: 'journal', sourceId }), signal,
    })
  },
  removeHighlight(highlightId: string, signal?: AbortSignal) {
    return apiRequest<void>(`/api/journey/highlights/${encodeURIComponent(highlightId)}`, {
      method: 'DELETE', headers: jsonHeaders, body: '{}', signal,
    })
  },
  listPhases(signal?: AbortSignal) {
    return apiRequest<{ phases: JourneyPhase[] }>('/api/journey/phases', { signal })
  },
  phaseDays(id: string, page: number, signal?: AbortSignal) {
    return apiRequest<JourneyDaysResponse>(`/api/journey/phases/${encodeURIComponent(id)}/days?${query({ page, limit: 20 })}`, { signal })
  },
  createPhase(input: JourneyPhaseInput, signal?: AbortSignal) {
    return apiRequest<{ phase: JourneyPhase }>('/api/journey/phases', {
      method: 'POST', headers: jsonHeaders, body: JSON.stringify(input), signal,
    })
  },
  updatePhase(id: string, input: JourneyPhaseInput, signal?: AbortSignal) {
    return apiRequest<{ phase: JourneyPhase }>(`/api/journey/phases/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(input), signal,
    })
  },
  deletePhase(id: string, signal?: AbortSignal) {
    return apiRequest<void>(`/api/journey/phases/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: jsonHeaders, body: '{}', signal,
    })
  },
}
