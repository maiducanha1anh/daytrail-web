import { apiRequest } from '../../api'
import type { Profile, ProfileDraft, ProfileImage } from './types'

export const profileApi = {
  get(signal?: AbortSignal) {
    return apiRequest<{ profile: Profile }>('/api/profile', { signal })
  },
  update(draft: ProfileDraft, signal?: AbortSignal) {
    const images = [...(draft.avatar ? [draft.avatar] : []), ...draft.decorations]
    return apiRequest<{ profile: Profile }>('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        about: draft.about,
        aspiration: draft.aspiration,
        avatarImageId: draft.avatar?.id ?? null,
        captions: Object.fromEntries(images.map((image) => [image.id, image.caption])),
        decorationImageIds: draft.decorations.map((image) => image.id),
        displayName: draft.displayName,
        tagline: draft.tagline,
        version: draft.version,
      }),
      signal,
    })
  },
  upload(file: File, role: 'avatar' | 'decoration', caption: string, clientUploadId: string, signal?: AbortSignal) {
    const body = new FormData()
    body.append('file', file)
    body.append('role', role)
    body.append('caption', caption)
    body.append('clientUploadId', clientUploadId)
    return apiRequest<{ image: ProfileImage }>('/api/profile/images', { method: 'POST', body, signal })
  },
  discard(imageIds: string[], signal?: AbortSignal) {
    return apiRequest<{ cleanupStatus: 'deleted' | 'pending' }>('/api/profile/images/discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIds }),
      signal,
    })
  },
}
