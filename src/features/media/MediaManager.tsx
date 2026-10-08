import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ApiError } from '../../api'
import { DialogFrame } from '../tasks/DialogFrame'
import { mediaApi } from './api'
import { PrivateImage } from './PrivateImage'
import type { MediaAsset, MediaOwner, PendingUpload } from './types'

const MAX_IMAGES = 12
const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_CAPTION_LENGTH = 500
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type MediaManagerHandle = {
  reload: () => void
  requestLeave: (next: () => void) => void
}

type MediaManagerProps = {
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
  onImageCountChange?: (count: number) => void
  onJournalConflict?: (message: string) => void
  onJournalRefresh?: (message: string) => Promise<number | null | undefined>
  onJournalVersionChange?: (version: number | null) => void
  onUnauthorized: (message?: string) => void
  owner: MediaOwner
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 503) return 'Kho ảnh hoặc dữ liệu đang gián đoạn. Thay đổi chưa được báo thành công; hãy thử lại sau.'
    if (error.status === 429) return 'Máy chủ đang xử lý nhiều ảnh. Hãy chờ một chút rồi thử lại.'
    if (error.kind === 'network') return 'Mất kết nối khi xử lý ảnh. Hãy thử lại; DayTrail sẽ dùng lại mã upload để tránh tạo ảnh trùng.'
    return error.message
  }
  return fallback
}

function fileLabel(file: File) {
  return file.name || 'Ảnh đã chọn'
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KiB`
  return `${(bytes / (1024 * 1024)).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MiB`
}

function validationMessage(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (file.type === 'image/heic' || file.type === 'image/heif' || extension === 'heic' || extension === 'heif') {
    return `${fileLabel(file)}: chưa hỗ trợ HEIC/HEIF. Hãy chọn JPEG, PNG hoặc WebP.`
  }
  if (!ACCEPTED_TYPES.has(file.type)) return `${fileLabel(file)}: định dạng chưa hỗ trợ. Hãy chọn JPEG, PNG hoặc WebP.`
  if (file.size > MAX_FILE_BYTES) return `${fileLabel(file)}: lớn hơn giới hạn 8 MiB.`
  return undefined
}

export const MediaManager = forwardRef<MediaManagerHandle, MediaManagerProps>(function MediaManager({
  disabled = false,
  onBusyChange,
  onImageCountChange,
  onJournalConflict,
  onJournalRefresh,
  onJournalVersionChange,
  onUnauthorized,
  owner,
}, ref) {
  const [images, setImages] = useState<MediaAsset[]>([])
  const [uploads, setUploads] = useState<PendingUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [uploadAnnouncement, setUploadAnnouncement] = useState('')
  const [selectionError, setSelectionError] = useState('')
  const [viewerImage, setViewerImage] = useState<MediaAsset>()
  const [captionDraft, setCaptionDraft] = useState('')
  const [viewerError, setViewerError] = useState('')
  const [captionSaving, setCaptionSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pendingLeave, setPendingLeave] = useState<(() => void)>()
  const [finishingLeave, setFinishingLeave] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadControllerRef = useRef<AbortController | undefined>(undefined)
  const mutationControllerRef = useRef<AbortController | undefined>(undefined)
  const uploadControllersRef = useRef(new Map<string, AbortController>())
  const uploadsRef = useRef<PendingUpload[]>([])
  const ownerRef = useRef(owner)
  const startingRef = useRef(new Set<string>())
  const uploadWaitersRef = useRef<Array<(success: boolean) => void>>([])
  const requestIdRef = useRef(0)
  const ownerIdentity = owner.type === 'task' ? `task:${owner.taskId}` : `journal:${owner.date}`

  useEffect(() => {
    ownerRef.current = owner
  }, [owner])

  const replaceUploads = useCallback((update: PendingUpload[] | ((current: PendingUpload[]) => PendingUpload[])) => {
    const next = typeof update === 'function' ? update(uploadsRef.current) : update
    uploadsRef.current = next
    setUploads(next)
  }, [])

  const applyJournalVersion = useCallback((version: number | null | undefined) => {
    if (version === undefined || ownerRef.current.type !== 'journal') return
    ownerRef.current = { ...ownerRef.current, journalVersion: version }
    onJournalVersionChange?.(version)
  }, [onJournalVersionChange])

  const loadImages = useCallback(async () => {
    loadControllerRef.current?.abort()
    const controller = new AbortController()
    loadControllerRef.current = controller
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError('')
    try {
      const result = await mediaApi.list(ownerRef.current, controller.signal)
      if (controller.signal.aborted || requestId !== requestIdRef.current) return
      setImages(result.images)
      setViewerImage((current) => current ? result.images.find((image) => image.id === current.id) ?? current : undefined)
      if (ownerRef.current.type === 'journal' && result.journalVersion !== ownerRef.current.journalVersion) {
        setLoadError('Nhật ký đã thay đổi ở nơi khác. Hãy đọc bản mới nhất trước khi sửa ảnh hoặc chú thích.')
      }
    } catch (caught: unknown) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return
      if (caught instanceof ApiError && caught.status === 401) {
        onUnauthorized('Phiên đăng nhập đã hết hạn. Ảnh riêng tư không được tải.')
        return
      }
      setLoadError(errorMessage(caught, 'Chưa thể tải danh sách ảnh.'))
    } finally {
      if (!controller.signal.aborted && requestId === requestIdRef.current) setLoading(false)
    }
  }, [onUnauthorized])

  useEffect(() => {
    const uploadControllers = uploadControllersRef.current
    const uploadWaiters = uploadWaitersRef.current
    const timer = window.setTimeout(() => void loadImages(), 0)
    return () => {
      window.clearTimeout(timer)
      requestIdRef.current += 1
      loadControllerRef.current?.abort()
      mutationControllerRef.current?.abort()
      for (const controller of uploadControllers.values()) controller.abort()
      uploadControllers.clear()
      for (const upload of uploadsRef.current) URL.revokeObjectURL(upload.previewUrl)
      uploadWaiters.splice(0).forEach((resolve) => resolve(false))
    }
  }, [loadImages, ownerIdentity])

  useEffect(() => onImageCountChange?.(images.length), [images.length, onImageCountChange])

  const activeUploads = uploads.filter((upload) => upload.state === 'uploading').length
  const unsettledUploads = uploads.some((upload) => upload.state === 'queued' || upload.state === 'uploading' || upload.state === 'error')
  const captionDirty = viewerImage !== undefined && captionDraft !== viewerImage.caption
  const busy = activeUploads > 0 || captionSaving || deleting || finishingLeave
  const blocking = unsettledUploads || captionDirty || busy

  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange])

  useEffect(() => {
    if (!blocking) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [blocking])

  useEffect(() => {
    const isSettled = !uploads.some((upload) => upload.state === 'queued' || upload.state === 'uploading')
    if (!isSettled || uploadWaitersRef.current.length === 0) return
    const success = !uploads.some((upload) => upload.state === 'error')
    uploadWaitersRef.current.splice(0).forEach((resolve) => resolve(success))
  }, [uploads])

  const handleMutationError = useCallback((caught: unknown, fallback: string) => {
    if (caught instanceof ApiError && caught.status === 401) {
      onUnauthorized('Phiên đăng nhập đã hết hạn. Thay đổi ảnh chưa được lưu.')
      return
    }
    const message = errorMessage(caught, fallback)
    setViewerError(message)
    if (caught instanceof ApiError && (caught.status === 409 || caught.status === 404)) {
      if (ownerRef.current.type === 'journal') onJournalConflict?.('Nhật ký hoặc ảnh đã thay đổi ở tab khác. Bản nháp của bạn vẫn được giữ.')
    }
  }, [onJournalConflict, onUnauthorized])

  const runUpload = useCallback(async (clientUploadId: string) => {
    if (startingRef.current.has(clientUploadId)) return
    const item = uploadsRef.current.find((upload) => upload.clientUploadId === clientUploadId)
    if (!item || item.state !== 'queued') return
    startingRef.current.add(clientUploadId)
    replaceUploads((current) => current.map((upload) => upload.clientUploadId === clientUploadId ? { ...upload, error: undefined, state: 'uploading' } : upload))
    const controller = new AbortController()
    uploadControllersRef.current.set(clientUploadId, controller)
    try {
      const result = await mediaApi.upload(ownerRef.current, item.file, item.clientUploadId, item.caption, controller.signal)
      if (controller.signal.aborted) return
      applyJournalVersion(result.journalVersion)
      setImages((current) => current.some((image) => image.id === result.image.id) ? current.map((image) => image.id === result.image.id ? result.image : image) : [...current, result.image])
      URL.revokeObjectURL(item.previewUrl)
      replaceUploads((current) => current.filter((upload) => upload.clientUploadId !== clientUploadId))
      setUploadAnnouncement(`Đã thêm ${fileLabel(item.file)} vào thư viện ảnh.`)
    } catch (caught: unknown) {
      if (controller.signal.aborted) return
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized('Phiên đăng nhập đã hết hạn. Ảnh chưa được xác nhận tải lên.')
      replaceUploads((current) => current.map((upload) => upload.clientUploadId === clientUploadId ? { ...upload, error: errorMessage(caught, 'Chưa thể tải ảnh lên.'), state: 'error' } : upload))
      if (caught instanceof ApiError && caught.status === 409 && ownerRef.current.type === 'journal') onJournalConflict?.('Nhật ký đã thay đổi ở tab khác trong lúc tải ảnh. Hãy đọc bản mới nhất rồi thử lại.')
    } finally {
      uploadControllersRef.current.delete(clientUploadId)
      startingRef.current.delete(clientUploadId)
    }
  }, [applyJournalVersion, onJournalConflict, onUnauthorized, replaceUploads])

  useEffect(() => {
    const limit = ownerRef.current.type === 'journal' ? 1 : 2
    const occupied = new Set([
      ...uploads.filter((upload) => upload.state === 'uploading').map((upload) => upload.clientUploadId),
      ...startingRef.current,
    ]).size
    const slots = Math.max(0, limit - occupied)
    if (slots === 0) return
    uploads.filter((upload) => upload.state === 'queued' && !startingRef.current.has(upload.clientUploadId)).slice(0, slots).forEach((upload) => void runUpload(upload.clientUploadId))
  }, [activeUploads, runUpload, uploads])

  function chooseFiles(fileList: FileList | null) {
    if (!fileList || disabled) return
    setSelectionError('')
    setNotice('')
    const errors: string[] = []
    const valid = Array.from(fileList).filter((file) => {
      const message = validationMessage(file)
      if (message) errors.push(message)
      return !message
    })
    const occupied = images.length + uploadsRef.current.length
    const available = Math.max(0, MAX_IMAGES - occupied)
    const accepted = valid.slice(0, available)
    if (valid.length > available) errors.push(`Chỉ còn ${available} vị trí ảnh; các ảnh vượt giới hạn 12 ảnh chưa được thêm.`)
    const next = accepted.map<PendingUpload>((file) => ({ caption: '', clientUploadId: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), state: 'queued' }))
    replaceUploads((current) => [...current, ...next])
    if (errors.length > 0) setSelectionError(errors.join(' '))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function retryUpload(clientUploadId: string) {
    replaceUploads((current) => current.map((upload) => upload.clientUploadId === clientUploadId ? { ...upload, error: undefined, state: 'queued' } : upload))
  }

  function removePending(clientUploadId: string) {
    const item = uploadsRef.current.find((upload) => upload.clientUploadId === clientUploadId)
    if (!item || item.state === 'uploading') return
    URL.revokeObjectURL(item.previewUrl)
    replaceUploads((current) => current.filter((upload) => upload.clientUploadId !== clientUploadId))
  }

  function openViewer(image: MediaAsset) {
    setViewerImage(image)
    setCaptionDraft(image.caption)
    setViewerError('')
  }

  const saveCaption = useCallback(async () => {
    const image = viewerImage
    if (!image || captionSaving || deleting || captionDraft === image.caption) return true
    if (captionDraft.length > MAX_CAPTION_LENGTH) {
      setViewerError('Chú thích không được vượt quá 500 ký tự.')
      return false
    }
    const controller = new AbortController()
    mutationControllerRef.current = controller
    setCaptionSaving(true)
    setViewerError('')
    try {
      const result = await mediaApi.updateCaption(ownerRef.current, image, captionDraft, controller.signal)
      if (controller.signal.aborted) return false
      applyJournalVersion(result.journalVersion)
      setImages((current) => current.map((item) => item.id === result.image.id ? result.image : item))
      setViewerImage(result.image)
      setCaptionDraft(result.image.caption)
      setNotice('Đã lưu chú thích ảnh.')
      return true
    } catch (caught: unknown) {
      if (!controller.signal.aborted) handleMutationError(caught, 'Chưa thể lưu chú thích. Bản nháp vẫn được giữ.')
      return false
    } finally {
      if (!controller.signal.aborted) setCaptionSaving(false)
    }
  }, [applyJournalVersion, captionDraft, captionSaving, deleting, handleMutationError, viewerImage])

  async function deleteImage() {
    const image = viewerImage
    if (!image || deleting || captionSaving) return
    if (!window.confirm('Xóa ảnh này? Thao tác sẽ xóa cả ảnh đầy đủ và thumbnail.')) return
    const controller = new AbortController()
    mutationControllerRef.current = controller
    setDeleting(true)
    setViewerError('')
    try {
      const result = await mediaApi.delete(ownerRef.current, image, controller.signal)
      if (controller.signal.aborted) return
      applyJournalVersion(result.journalVersion)
      setImages((current) => current.filter((item) => item.id !== image.id))
      setViewerImage(undefined)
      setCaptionDraft('')
      setNotice(result.cleanupStatus === 'pending' ? 'Ảnh đã được ẩn; hệ thống sẽ tiếp tục dọn file nền.' : 'Đã xóa ảnh.')
    } catch (caught: unknown) {
      if (!controller.signal.aborted) handleMutationError(caught, 'Chưa thể xóa ảnh.')
    } finally {
      if (!controller.signal.aborted) setDeleting(false)
    }
  }

  const waitForUploads = useCallback(() => {
    const current = uploadsRef.current
    if (!current.some((upload) => upload.state === 'queued' || upload.state === 'uploading' || upload.state === 'error')) return Promise.resolve(true)
    if (current.some((upload) => upload.state === 'error')) replaceUploads((items) => items.map((upload) => upload.state === 'error' ? { ...upload, error: undefined, state: 'queued' } : upload))
    return new Promise<boolean>((resolve) => uploadWaitersRef.current.push(resolve))
  }, [replaceUploads])

  const requestLeave = useCallback((next: () => void) => {
    if (!blocking) next()
    else setPendingLeave(() => next)
  }, [blocking])

  useImperativeHandle(ref, () => ({ reload: () => void loadImages(), requestLeave }), [loadImages, requestLeave])

  async function finishAndLeave() {
    if (!pendingLeave || finishingLeave) return
    setFinishingLeave(true)
    const uploadsSaved = await waitForUploads()
    const captionSaved = uploadsSaved ? await saveCaption() : false
    setFinishingLeave(false)
    if (!uploadsSaved || !captionSaved) return
    const action = pendingLeave
    setPendingLeave(undefined)
    action()
  }

  function discardAndLeave() {
    if (!pendingLeave || activeUploads > 0) return
    const action = pendingLeave
    for (const upload of uploadsRef.current) URL.revokeObjectURL(upload.previewUrl)
    replaceUploads([])
    setCaptionDraft(viewerImage?.caption ?? '')
    setViewerError('')
    setPendingLeave(undefined)
    action()
  }

  async function refreshAfterConflict() {
    if (ownerRef.current.type === 'journal' && onJournalRefresh) {
      const version = await onJournalRefresh('Nhật ký hoặc ảnh đã thay đổi ở tab khác. Bản nháp văn bản và chú thích vẫn được giữ để bạn đối chiếu.')
      if (version !== undefined) ownerRef.current = { ...ownerRef.current, journalVersion: version }
    }
    await loadImages()
  }

  const remaining = Math.max(0, MAX_IMAGES - images.length - uploads.length)

  return <section className="detail-section media-manager" aria-labelledby={`media-title-${ownerIdentity.replace(':', '-')}`}>
    <div className="media-heading"><h3 id={`media-title-${ownerIdentity.replace(':', '-')}`}>Ảnh</h3><span className="count-badge">{images.length}/{MAX_IMAGES}</span></div>
    <div className="media-toolbar"><label className={`secondary-button media-picker${disabled || remaining === 0 ? ' is-disabled' : ''}`}><span>+ Thêm ảnh</span><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple disabled={disabled || remaining === 0} onChange={(event) => chooseFiles(event.target.files)} /></label>{remaining === 0 && <span>Đã đủ {MAX_IMAGES} ảnh</span>}</div>
    {selectionError && <p className="form-message error" role="alert">{selectionError}</p>}
    {notice && <p className="form-message success" role="status">{notice}</p>}
    {loadError && <div className="load-error compact-error" role="alert"><p>{loadError}</p><button className="secondary-button" type="button" onClick={() => void refreshAfterConflict()}>Tải lại</button></div>}
    {uploads.length > 0 && <div className="upload-queue" aria-label="Danh sách ảnh đang tải">{uploads.map((upload) => <article className={`upload-item is-${upload.state}`} key={upload.clientUploadId}><img src={upload.previewUrl} alt="Bản xem trước ảnh đã chọn" /><div><strong>{fileLabel(upload.file)}</strong><span>{formatBytes(upload.file.size)} · {upload.state === 'queued' ? 'Đang chờ' : upload.state === 'uploading' ? 'Đang tải…' : 'Tải lên thất bại'}</span>{upload.error && <p role="alert">{upload.error}</p>}</div>{upload.state === 'error' && <button className="secondary-button compact" type="button" onClick={() => retryUpload(upload.clientUploadId)}>Thử lại</button>}{upload.state !== 'uploading' && <button className="text-button" type="button" onClick={() => removePending(upload.clientUploadId)}>Bỏ ảnh</button>}</article>)}</div>}
    {loading ? <div className="loading-panel compact" role="status">Đang tải ảnh…</div> : images.length === 0 ? <p className="media-empty">Chưa có ảnh.</p> : <div className="media-grid">{images.map((image, index) => <button type="button" className="media-thumbnail" key={image.id} onClick={() => openViewer(image)} aria-label={`Xem ảnh ${index + 1}${image.caption ? `: ${image.caption}` : ''}`}><PrivateImage path={image.thumbnailUrl} alt={image.caption || `Ảnh ${index + 1}`} onUnauthorized={() => onUnauthorized()} showRetry={false} /><span>{image.caption || 'Chưa có chú thích'}</span></button>)}</div>}
    {viewerImage && <DialogFrame labelledBy="media-viewer-title" onClose={() => requestLeave(() => { setViewerImage(undefined); setCaptionDraft(''); setViewerError('') })} wide><div className="dialog-heading"><p className="eyebrow">Ảnh riêng tư</p><h2 id="media-viewer-title">Xem ảnh</h2><p>{viewerImage.fullWidth} × {viewerImage.fullHeight} px · {formatBytes(viewerImage.byteSize)}</p></div><PrivateImage className="media-full-image" path={viewerImage.fullUrl} alt={viewerImage.caption || 'Ảnh đang xem'} onUnauthorized={() => onUnauthorized()} /><label className="field media-caption"><span>Chú thích</span><textarea rows={3} maxLength={MAX_CAPTION_LENGTH} value={captionDraft} disabled={captionSaving || deleting} onChange={(event) => { setCaptionDraft(event.target.value); setViewerError('') }} /></label><div className="note-meta"><span>{captionDraft.length}/{MAX_CAPTION_LENGTH} ký tự</span>{captionDirty && <span className="unsaved-badge">Chưa lưu</span>}</div>{viewerError && <div className="form-message error" role="alert">{viewerError}<button className="text-button" type="button" onClick={() => void refreshAfterConflict()}>Đọc dữ liệu ảnh mới nhất</button></div>}<div className="dialog-actions media-viewer-actions"><button className="danger-button" type="button" disabled={captionSaving || deleting} onClick={() => void deleteImage()}>{deleting ? 'Đang xóa…' : 'Xóa ảnh'}</button><button className="primary-button" type="button" disabled={!captionDirty || captionSaving || deleting} onClick={() => void saveCaption()}>{captionSaving ? 'Đang lưu…' : 'Lưu chú thích'}</button></div></DialogFrame>}
    {pendingLeave && <DialogFrame labelledBy="media-unsaved-title" onClose={() => setPendingLeave(undefined)}><h2 id="media-unsaved-title">Ảnh hoặc chú thích chưa hoàn tất</h2><p>Hãy hoàn tất thay đổi trước khi rời màn hình.</p>{activeUploads > 0 && <p className="field-help" role="status">Đang tải {activeUploads} ảnh.</p>}<div className="dialog-actions stacked-mobile"><button className="primary-button" type="button" disabled={finishingLeave} onClick={() => void finishAndLeave()}>{finishingLeave ? 'Đang hoàn tất…' : 'Hoàn tất và tiếp tục'}</button><button className="secondary-button" type="button" disabled={activeUploads > 0 || finishingLeave} onClick={discardAndLeave}>Bỏ thay đổi và tiếp tục</button><button className="text-button" type="button" disabled={finishingLeave} onClick={() => setPendingLeave(undefined)}>Tiếp tục chỉnh</button></div></DialogFrame>}
    <span className="sr-only" role="status" aria-live="polite">{uploadAnnouncement}</span>
  </section>
})
