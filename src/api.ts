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
  error?: string
}

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message: string, readonly status?: number, readonly kind: 'http' | 'network' = 'http') {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}) {
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
    throw new ApiError(message, response.status)
  }

  return body as T
}

function jsonRequest<T>(path: string, body: Record<string, string>, signal?: AbortSignal) {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

export const dayTrailApi = {
  health(signal?: AbortSignal) {
    return request<{ service: string; status: 'ok' }>('/api/health', { signal })
  },
  login(email: string, password: string, signal?: AbortSignal) {
    return jsonRequest<UserResponse>('/api/auth/login', { email, password }, signal)
  },
  logout(signal?: AbortSignal) {
    return jsonRequest<void>('/api/auth/logout', {}, signal)
  },
  me(signal?: AbortSignal) {
    return request<UserResponse>('/api/auth/me', { signal })
  },
  register(displayName: string, email: string, password: string, signal?: AbortSignal) {
    return jsonRequest<UserResponse>('/api/auth/register', { displayName, email, password }, signal)
  },
}
