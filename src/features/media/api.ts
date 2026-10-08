import { apiBlobRequest, apiRequest } from '../../api'
import type { MediaAsset, MediaOwner } from './types'

type UploadResponse = { image: MediaAsset; journalVersion?: number }
type ListResponse = { images: MediaAsset[]; journalVersion?: number | null }
type MutationResponse = { image: MediaAsset; journalVersion?: number }
type DeleteResponse = { cleanupStatus: 'deleted' | 'pending'; journalVersion?: number | null }

function ownerPath(owner: MediaOwner) {
  return owner.type === 'task'
    ? `/api/tasks/${encodeURIComponent(owner.taskId)}/images`
    : `/api/journals/${encodeURIComponent(owner.date)}/images`
}

export const mediaApi = {
  list(owner: MediaOwner, signal?: AbortSignal) {
    return apiRequest<ListResponse>(ownerPath(owner), { signal })
  },
  upload(owner: MediaOwner, file: File, clientUploadId: string, caption: string, signal?: AbortSignal) {
    const body = new FormData()
    body.append('file', file)
    body.append('clientUploadId', clientUploadId)
    if (caption) body.append('caption', caption)
    if (owner.type === 'journal') body.append('version', owner.journalVersion === null ? 'null' : String(owner.journalVersion))
    return apiRequest<UploadResponse>(ownerPath(owner), { method: 'POST', body, signal })
  },
  updateCaption(owner: MediaOwner, image: MediaAsset, caption: string, signal?: AbortSignal) {
    return apiRequest<MutationResponse>(`/api/images/${encodeURIComponent(image.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption,
        version: image.version,
        ...(owner.type === 'journal' ? { journalVersion: owner.journalVersion } : {}),
      }),
      signal,
    })
  },
  delete(owner: MediaOwner, image: MediaAsset, signal?: AbortSignal) {
    return apiRequest<DeleteResponse>(`/api/images/${encodeURIComponent(image.id)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: image.version,
        ...(owner.type === 'journal' ? { journalVersion: owner.journalVersion } : {}),
      }),
      signal,
    })
  },
  file(path: string, signal?: AbortSignal) {
    return apiBlobRequest(path, signal)
  },
}
