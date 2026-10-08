export type DayTrailUser = {
  id: string
  displayName: string
  email: string
  createdAt: string
  updatedAt: string
}

type UserResponse = {
  user: DayTrailUser
}

type ErrorResponse = {
  code?: string
  error?: string
}

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message: string, readonly status?: number, readonly kind: 'http' | 'network' = 'http', readonly code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...init.headers,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new ApiError('Không thể kết nối đến máy chủ DayTrail.', undefined, 'network')
  }

  if (response.status === 204) return undefined as T

  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }

  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body && typeof (body as ErrorResponse).error === 'string'
      ? (body as ErrorResponse).error as string
      : 'Máy chủ không thể xử lý yêu cầu.'
    const code = body && typeof body === 'object' && 'code' in body && typeof (body as ErrorResponse).code === 'string'
      ? (body as ErrorResponse).code
      : undefined
    throw new ApiError(message, response.status, 'http', code)
  }

  return body as T
}

export async function apiBlobRequest(path: string, signal?: AbortSignal) {
  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      credentials: 'include',
      headers: { Accept: 'image/webp' },
      signal,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new ApiError('Không thể kết nối đến máy chủ DayTrail.', undefined, 'network')
  }

  if (!response.ok) {
    let body: ErrorResponse | undefined
    try {
      body = await response.json() as ErrorResponse
    } catch {
      body = undefined
    }
    throw new ApiError(body?.error ?? 'Máy chủ không thể tải ảnh.', response.status, 'http', body?.code)
  }
  return response.blob()
}

function jsonRequest<T>(path: string, body: Record<string, string>, signal?: AbortSignal) {
  return apiRequest<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

export const dayTrailApi = {
  health(signal?: AbortSignal) {
    return apiRequest<{ service: string; status: 'ok' }>('/api/health', { signal })
  },
  ready(signal?: AbortSignal) {
    return apiRequest<{ status: 'ready' }>('/api/ready', { signal })
  },
  login(email: string, password: string, signal?: AbortSignal) {
    return jsonRequest<UserResponse>('/api/auth/login', { email, password }, signal)
  },
  logout(signal?: AbortSignal) {
    return jsonRequest<void>('/api/auth/logout', {}, signal)
  },
  me(signal?: AbortSignal) {
    return apiRequest<UserResponse>('/api/auth/me', { signal })
  },
  register(displayName: string, email: string, password: string, signal?: AbortSignal) {
    return jsonRequest<UserResponse>('/api/auth/register', { displayName, email, password }, signal)
  },
}
