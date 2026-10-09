import type { MediaAsset } from '../media/types'

export type JourneyView = 'year' | 'month' | 'week' | 'day'

export type JourneyHighlight = {
  createdAt: string
  id: string
  sourceId: string
  sourceType: 'journal'
}

export type JourneyExcerpt = { date: string; text: string }

export type JourneyDayCard = {
  date: string
  excerpt: string | null
  highlight: JourneyHighlight | null
  imageCount: number
  images: MediaAsset[]
  journalId: string
}

export type JourneyAlbum = {
  coverImage: MediaAsset | null
  coverSource: 'manual' | 'automatic' | 'none'
  customTitle: string
  dayCount: number
  excerpt: JourneyExcerpt | null
  imageCount: number
  month: number
  selectedCoverImageId: string | null
  title: string
  year?: number
}

export type JourneyYearResponse = { months: JourneyAlbum[]; year: number }
export type JourneyMonthResponse = { album: JourneyAlbum & { year: number }; previewDays: JourneyDayCard[] }
export type JourneyDaysResponse = {
  days: JourneyDayCard[]
  from: string
  pagination: { limit: number; page: number; pages: number; total: number }
  to: string
}

export type JourneyDayEntry = {
  content: string
  createdAt: string
  date: string
  highlight: JourneyHighlight | null
  images: MediaAsset[]
  journalId: string
  updatedAt: string
  version: number
}

export type JourneyDayResponse = { date: string; entry: JourneyDayEntry | null }

export type JourneyPhase = {
  coverImage: MediaAsset | null
  coverImageId: string | null
  createdAt: string
  endDate: string
  id: string
  introduction: string
  name: string
  startDate: string
  summary: string
  updatedAt: string
}

export type JourneyPhaseInput = Pick<JourneyPhase, 'name' | 'startDate' | 'endDate' | 'coverImageId' | 'introduction' | 'summary'>

export type JourneyCoverOptions = {
  images: Array<{ date: string; image: MediaAsset }>
  pagination: { limit: number; page: number; pages: number; total: number }
}
