import { apiRequest } from '../../api'
import type { JournalResponse } from './types'

function jsonInit(method: 'PUT' | 'DELETE', body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }
}

export const journalApi = {
  get(date: string, signal?: AbortSignal) {
    return apiRequest<JournalResponse>(`/api/journals/${encodeURIComponent(date)}`, { signal })
  },
  save(date: string, content: string, version: number | null, signal?: AbortSignal) {
    return apiRequest<JournalResponse>(`/api/journals/${encodeURIComponent(date)}`, jsonInit('PUT', { content, version }, signal))
  },
  delete(date: string, version: number, signal?: AbortSignal) {
    return apiRequest<void>(`/api/journals/${encodeURIComponent(date)}`, jsonInit('DELETE', { version }, signal))
  },
}
