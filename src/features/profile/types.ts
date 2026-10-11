export type ProfileImage = {
  id: string
  byteSize: number
  caption: string
  createdAt: string
  fullHeight: number
  fullUrl: string
  fullWidth: number
  mimeType: 'image/webp'
  role: 'avatar' | 'decoration'
  thumbnailHeight: number
  thumbnailUrl: string
  thumbnailWidth: number
  updatedAt: string
  version: number
}

export type Profile = {
  about: string
  aspiration: string
  avatar: ProfileImage | null
  createdAt: string
  decorations: ProfileImage[]
  displayName: string
  tagline: string
  updatedAt: string
  version: number
}

export type ProfileDraft = Pick<Profile, 'about' | 'aspiration' | 'avatar' | 'decorations' | 'displayName' | 'tagline' | 'version'>
