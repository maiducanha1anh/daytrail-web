import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api'
import { taskApi } from '../tasks/api'
import { taskErrorMessage } from '../tasks/useTaskDay'
import type { Task, TaskSummary } from '../tasks/types'

export function useCalendarRange(from: string, to: string, includeTasks: boolean, revision: number, onUnauthorized: () => void) {
  const [data, setData] = useState<{ key: string; summaries: TaskSummary[]; tasks: Task[] }>({ key: '', summaries: [], tasks: [] })
  const [loadingKey, setLoadingKey] = useState<string>()
  const [error, setError] = useState<string>()
  const requestId = useRef(0)
  const controller = useRef<AbortController | undefined>(undefined)
  const key = `${from}:${to}:${includeTasks ? 'tasks' : 'summary'}:${revision}`

  const load = useCallback(() => {
    controller.current?.abort()
    const nextController = new AbortController()
    controller.current = nextController
    const currentRequest = ++requestId.current
    setLoadingKey(key)
    setError(undefined)
    void Promise.all([
      taskApi.summaries(from, to, nextController.signal),
      includeTasks ? taskApi.listAllForRange(from, to, nextController.signal) : Promise.resolve([] as Task[]),
    ]).then(([summaryResult, tasks]) => {
      if (nextController.signal.aborted || currentRequest !== requestId.current) return
      setData({ key, summaries: summaryResult.summaries, tasks })
    }).catch((loadError: unknown) => {
      if (nextController.signal.aborted || currentRequest !== requestId.current) return
      if (loadError instanceof ApiError && loadError.status === 401) {
        onUnauthorized()
        return
      }
      setError(taskErrorMessage(loadError))
    }).finally(() => {
      if (!nextController.signal.aborted && currentRequest === requestId.current) setLoadingKey(undefined)
    })
  }, [from, includeTasks, key, onUnauthorized, to])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => {
      window.clearTimeout(timer)
      requestId.current += 1
      controller.current?.abort()
    }
  }, [load])

  return {
    summaries: data.key === key ? data.summaries : [],
    tasks: data.key === key ? data.tasks : [],
    loading: data.key !== key || loadingKey === key,
    error,
    reload: load,
  }
}
