export type TaskPriority = 'low' | 'normal' | 'high'
export type TaskRepeat = 'none' | 'daily' | 'weekly' | 'monthly'

export type TaskRecurrence = {
  seriesId: string
  originalDate: string
  frequency: Exclude<TaskRepeat, 'none'>
}

export type Task = {
  id: string
  date: string
  name: string
  startTime: string
  endTime: string
  priority: TaskPriority
  group: string | null
  description: string | null
  note: string | null
  repeat: TaskRepeat
  recurrence: TaskRecurrence | null
  completed: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type TaskSummary = {
  date: string
  total: number
  completed: number
  incomplete: number
  completionPercentage: number
}

export type TaskPlanInput = {
  name: string
  startTime: string
  endTime: string
  priority: TaskPriority
  group: string | null
  description: string | null
  repeat: 'none'
}

export type TaskSeries = {
  id: string
  startDate: string
  endDate: string
  frequency: Exclude<TaskRepeat, 'none'>
  weekdays: number[]
  name: string
  startTime: string
  endTime: string
  priority: TaskPriority
  group: string | null
  description: string | null
  stoppedFromDate: string | null
  createdAt: string
  updatedAt: string
}

export type TaskSeriesInput = Omit<TaskPlanInput, 'repeat'> & {
  repeat: {
    frequency: Exclude<TaskRepeat, 'none'>
    endDate: string
    weekdays?: number[]
  }
}

export type TaskSeriesResponse = {
  series: TaskSeries
  createdCount: number
}

export type StopTaskSeriesResponse = {
  series: TaskSeries
  removedCount: number
  keptCount: number
}

export type TaskListResponse = {
  tasks: Task[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export type TaskSummaryRangeResponse = {
  from: string
  to: string
  summaries: TaskSummary[]
}
