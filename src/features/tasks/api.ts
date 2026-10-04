import { apiRequest } from '../../api'
import type { StopTaskSeriesResponse, Task, TaskListResponse, TaskPlanInput, TaskSeries, TaskSeriesInput, TaskSeriesResponse, TaskSummary, TaskSummaryRangeResponse } from './types'

async function listAll(from: string, to: string, signal?: AbortSignal) {
  const query = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const firstPage = await apiRequest<TaskListResponse>(`/api/tasks?${query}&page=1&limit=100`, { signal })
  const tasks = [...firstPage.tasks]
  for (let page = 2; page <= firstPage.pagination.pages; page += 1) {
    const result = await apiRequest<TaskListResponse>(`/api/tasks?${query}&page=${page}&limit=100`, { signal })
    tasks.push(...result.tasks)
  }
  return tasks
}

function jsonInit(method: 'POST' | 'PATCH' | 'DELETE', body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }
}

export const taskApi = {
  async listAllForDate(date: string, signal?: AbortSignal) {
    return listAll(date, date, signal)
  },
  listAllForRange(from: string, to: string, signal?: AbortSignal) {
    return listAll(from, to, signal)
  },
  summary(date: string, signal?: AbortSignal) {
    return apiRequest<TaskSummary>(`/api/tasks/summary?date=${encodeURIComponent(date)}`, { signal })
  },
  summaries(from: string, to: string, signal?: AbortSignal) {
    return apiRequest<TaskSummaryRangeResponse>(`/api/tasks/summaries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { signal })
  },
  create(date: string, input: TaskPlanInput, signal?: AbortSignal) {
    return apiRequest<{ task: Task }>('/api/tasks', jsonInit('POST', { date, ...input }, signal))
  },
  createSeries(date: string, input: TaskSeriesInput, signal?: AbortSignal) {
    return apiRequest<TaskSeriesResponse>('/api/tasks/series', jsonInit('POST', { date, ...input }, signal))
  },
  get(id: string, signal?: AbortSignal) {
    return apiRequest<{ task: Task }>(`/api/tasks/${id}`, { signal })
  },
  series(seriesId: string, signal?: AbortSignal) {
    return apiRequest<{ series: TaskSeries }>(`/api/tasks/series/${seriesId}`, { signal })
  },
  stopSeries(seriesId: string, fromDate: string, signal?: AbortSignal) {
    return apiRequest<StopTaskSeriesResponse>(`/api/tasks/series/${seriesId}/stop`, jsonInit('POST', { fromDate }, signal))
  },
  update(id: string, input: Omit<TaskPlanInput, 'repeat'> | { note: string | null }, signal?: AbortSignal) {
    return apiRequest<{ task: Task }>(`/api/tasks/${id}`, jsonInit('PATCH', input, signal))
  },
  move(id: string, date: string, signal?: AbortSignal) {
    return apiRequest<{ task: Task }>(`/api/tasks/${id}/date`, jsonInit('PATCH', { date }, signal))
  },
  setCompletion(id: string, completed: boolean, signal?: AbortSignal) {
    return apiRequest<{ task: Task }>(`/api/tasks/${id}/completion`, jsonInit('PATCH', { completed }, signal))
  },
  delete(id: string, signal?: AbortSignal) {
    return apiRequest<void>(`/api/tasks/${id}`, jsonInit('DELETE', {}, signal))
  },
}
