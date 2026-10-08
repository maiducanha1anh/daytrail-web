import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api'
import { mediaApi } from './api'

export function PrivateImage({ alt, className, onUnauthorized, path, showRetry = true }: {
  alt: string
  className?: string
  onUnauthorized: () => void
  path: string
  showRetry?: boolean
}) {
  const [result, setResult] = useState<{ error?: string; key: string; objectUrl?: string }>({ key: '' })
  const [revision, setRevision] = useState(0)
  const objectUrlRef = useRef<string | undefined>(undefined)
  const requestKey = `${path}:${revision}`

  const releaseUrl = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = undefined
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    releaseUrl()
    void mediaApi.file(path, controller.signal).then((blob) => {
      if (controller.signal.aborted) return
      const nextUrl = URL.createObjectURL(blob)
      objectUrlRef.current = nextUrl
      setResult({ key: requestKey, objectUrl: nextUrl })
    }).catch((caught: unknown) => {
      if (controller.signal.aborted) return
      if (caught instanceof ApiError && caught.status === 401) {
        onUnauthorized()
        return
      }
      setResult({
        error: caught instanceof ApiError && caught.status === 503 ? 'Kho ảnh đang gián đoạn.' : 'Chưa tải được ảnh.',
        key: requestKey,
      })
    })
    return () => {
      controller.abort()
      releaseUrl()
    }
  }, [onUnauthorized, path, releaseUrl, requestKey])

  const current = result.key === requestKey ? result : undefined
  if (current?.error) return <div className={`private-image-state ${className ?? ''}`} role="alert"><span>{current.error}</span>{showRetry && <button type="button" onClick={() => setRevision((value) => value + 1)}>Thử lại</button>}</div>
  if (!current?.objectUrl) return <div className={`private-image-state is-loading ${className ?? ''}`} role="status">Đang tải ảnh…</div>
  return <img className={className} src={current.objectUrl} alt={alt} />
}
