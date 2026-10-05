export type Journal = {
  content: string
  createdAt: string
  date: string
  updatedAt: string
  version: number
}

export type JournalResponse = {
  journal: Journal | null
}
