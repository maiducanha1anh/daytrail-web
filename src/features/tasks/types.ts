export type TaskPriority = 'low' | 'normal' | 'high'

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
  repeat: 'none'
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

export type TaskListResponse = {
  tasks: Task[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export type TaskSummaryRangeResponse = {
  from: string
  to: string
  summaries: TaskSummary[]
}
