import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api'
import { taskApi } from './api'
import type { Task, TaskSummary } from './types'

const emptySummary = (date: string): TaskSummary => ({ date, total: 0, completed: 0, incomplete: 0, completionPercentage: 0 })

export function taskErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.kind === 'network') return 'Không thể kết nối đến máy chủ. Hãy kiểm tra backend rồi thử lại.'
    if (error.status === 503) return 'Database tạm thời chưa sẵn sàng. Dữ liệu hoặc bản nháp hiện tại vẫn được giữ; hãy kiểm tra trạng thái kết nối rồi thử lại.'
    if (error.status && error.status >= 500) return 'Máy chủ đang gặp lỗi. Vui lòng thử lại.'
    return error.message
  }
  return 'Đã xảy ra lỗi không mong đợi. Vui lòng thử lại.'
}

export function useTaskDay(date: string, onUnauthorized: () => void) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [summary, setSummary] = useState<TaskSummary>(() => emptySummary(date))
  const [loadedDate, setLoadedDate] = useState<string>()
  const [loadingDate, setLoadingDate] = useState<string>()
  const [refreshingDate, setRefreshingDate] = useState<string>()
  const [error, setError] = useState<string>()
  const requestId = useRef(0)
  const controller = useRef<AbortController | undefined>(undefined)

  const load = useCallback(async (showLoading = false) => {
    controller.current?.abort()
    const nextController = new AbortController()
    controller.current = nextController
    const currentRequest = ++requestId.current
    if (showLoading) setLoadingDate(date)
    else setRefreshingDate(date)
    setError(undefined)
    try {
      const [nextTasks, nextSummary] = await Promise.all([
        taskApi.listAllForDate(date, nextController.signal),
        taskApi.summary(date, nextController.signal),
      ])
      if (nextController.signal.aborted || currentRequest !== requestId.current) return
      setTasks(nextTasks)
      setSummary(nextSummary)
      setLoadedDate(date)
    } catch (loadError: unknown) {
      if (nextController.signal.aborted || currentRequest !== requestId.current) return
      if (loadError instanceof ApiError && loadError.status === 401) {
        onUnauthorized()
        return
      }
      setError(taskErrorMessage(loadError))
    } finally {
      if (!nextController.signal.aborted && currentRequest === requestId.current) {
        setLoadingDate((current) => current === date ? undefined : current)
        setRefreshingDate((current) => current === date ? undefined : current)
      }
    }
  }, [date, onUnauthorized])

  useEffect(() => {
    controller.current?.abort()
    const nextController = new AbortController()
    controller.current = nextController
    const currentRequest = ++requestId.current
    void Promise.all([
      taskApi.listAllForDate(date, nextController.signal),
      taskApi.summary(date, nextController.signal),
    ]).then(([nextTasks, nextSummary]) => {
      if (nextController.signal.aborted || currentRequest !== requestId.current) return
      setTasks(nextTasks)
      setSummary(nextSummary)
      setLoadedDate(date)
      setError(undefined)
    }).catch((loadError: unknown) => {
      if (nextController.signal.aborted || currentRequest !== requestId.current) return
      if (loadError instanceof ApiError && loadError.status === 401) {
        onUnauthorized()
        return
      }
      setTasks([])
      setSummary(emptySummary(date))
      setLoadedDate(date)
      setError(taskErrorMessage(loadError))
    })
    return () => {
      requestId.current += 1
      controller.current?.abort()
    }
  }, [date, onUnauthorized])

  const acceptTask = useCallback((task: Task) => {
    setTasks((current) => {
      const withoutTask = current.filter((item) => item.id !== task.id)
      if (task.date !== date) return withoutTask
      return [...withoutTask, task].sort((left, right) => left.startTime.localeCompare(right.startTime) || left.id.localeCompare(right.id))
    })
    void load(false)
  }, [date, load])

  const removeTask = useCallback((taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId))
    void load(false)
  }, [load])

  return {
    tasks: loadedDate === date ? tasks : [],
    summary: loadedDate === date ? summary : emptySummary(date),
    loading: loadedDate !== date || loadingDate === date,
    refreshing: refreshingDate === date,
    error: loadedDate === date ? error : undefined,
    reload: () => load(true),
    acceptTask,
    removeTask,
  }
}
