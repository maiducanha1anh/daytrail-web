export type MediaAsset = {
  id: string
  byteSize: number
  caption: string
  createdAt: string
  fullHeight: number
  fullUrl: string
  fullWidth: number
  mimeType: 'image/webp'
  thumbnailHeight: number
  thumbnailUrl: string
  thumbnailWidth: number
  updatedAt: string
  version: number
}

export type MediaOwner =
  | { type: 'task'; taskId: string }
  | { type: 'journal'; date: string; journalVersion: number | null }

export type UploadState = 'queued' | 'uploading' | 'success' | 'error'

export type PendingUpload = {
  caption: string
  clientUploadId: string
  error?: string
  file: File
  previewUrl: string
  state: UploadState
}
