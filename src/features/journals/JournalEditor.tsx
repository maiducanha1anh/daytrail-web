import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api'
import type { GuardRegistrar } from '../../navigation'
import { MediaManager, type MediaManagerHandle } from '../media/MediaManager'
import { DialogFrame } from '../tasks/DialogFrame'
import { formatLocalDate } from '../tasks/date'
import { journalApi } from './api'
import type { Journal } from './types'

const CONTENT_MAX_LENGTH = 20_000

type BusyState = 'saving' | 'deleting'
type ConflictState = {
  latest: Journal | null
  latestLoaded: boolean
  loadError?: string
  message: string
}

function journalErrorMessage(error: unknown, action: 'load' | 'save' | 'delete') {
  if (error instanceof ApiError) {
    if (error.status === 503) return 'Cơ sở dữ liệu đang gián đoạn. Bản nháp vẫn được giữ; hãy thử lại sau.'
    if (error.kind === 'network') return 'Không thể kết nối đến máy chủ. Bản nháp vẫn được giữ; hãy kiểm tra kết nối rồi thử lại.'
    if ((error.status ?? 0) >= 500) return 'Máy chủ đang gặp lỗi. Bản nháp vẫn được giữ; hãy thử lại sau.'
    return error.message
  }
  if (action === 'load') return 'Chưa thể tải nhật ký. Hãy thử lại.'
  return action === 'save' ? 'Chưa thể lưu nhật ký. Bản nháp vẫn được giữ.' : 'Chưa thể xóa nhật ký.'
}

export function JournalEditor({ date, onUnauthorized, registerNavigationGuard }: {
  date: string
  onUnauthorized: (message?: string) => void
  registerNavigationGuard: GuardRegistrar
}) {
  const [journal, setJournal] = useState<Journal | null | undefined>(undefined)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<BusyState>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [conflict, setConflict] = useState<ConflictState>()
  const [conflictLoading, setConflictLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | undefined>()
  const [mediaCount, setMediaCount] = useState(0)
  const [mediaBusy, setMediaBusy] = useState(false)
  const journalRef = useRef<Journal | null | undefined>(undefined)
  const mediaRef = useRef<MediaManagerHandle>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const loadControllerRef = useRef<AbortController | undefined>(undefined)
  const mutationControllerRef = useRef<AbortController | undefined>(undefined)
  const conflictControllerRef = useRef<AbortController | undefined>(undefined)
  const requestIdRef = useRef(0)

  const dirty = journal !== undefined && draft !== (journal?.content ?? '')

  const replaceJournal = useCallback((next: Journal | null) => {
    journalRef.current = next
    setJournal(next)
  }, [])

  const loadJournal = useCallback(async () => {
    loadControllerRef.current?.abort()
    const controller = new AbortController()
    loadControllerRef.current = controller
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError('')
    setNotice('')
    setConflict(undefined)
    try {
      const result = await journalApi.get(date, controller.signal)
      if (controller.signal.aborted || requestId !== requestIdRef.current) return
      replaceJournal(result.journal)
      setDraft(result.journal?.content ?? '')
    } catch (caught) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return
      if (caught instanceof ApiError && caught.status === 401) {
        onUnauthorized('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.')
        return
      }
      journalRef.current = undefined
      setJournal(undefined)
      setError(journalErrorMessage(caught, 'load'))
    } finally {
      if (!controller.signal.aborted && requestId === requestIdRef.current) setLoading(false)
    }
  }, [date, onUnauthorized, replaceJournal])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadJournal(), 0)
    return () => {
      window.clearTimeout(timer)
      requestIdRef.current += 1
      loadControllerRef.current?.abort()
      mutationControllerRef.current?.abort()
      conflictControllerRef.current?.abort()
    }
  }, [loadJournal])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const continuePending = useCallback(() => {
    const action = pendingAction
    setPendingAction(undefined)
    action?.()
  }, [pendingAction])

  const requestAction = useCallback((next: () => void) => {
    const continueThroughMedia = () => {
      if (mediaRef.current) mediaRef.current.requestLeave(next)
      else next()
    }
    if (!dirty) {
      continueThroughMedia()
      return
    }
    setPendingAction(() => continueThroughMedia)
  }, [dirty])

  useEffect(() => registerNavigationGuard(requestAction), [registerNavigationGuard, requestAction])

  function startConflict(message: string) {
    setConflict({ latest: journalRef.current ?? null, latestLoaded: false, message })
    setError('')
    setNotice('')
  }

  const saveDraft = useCallback(async () => {
    if (busy || mediaBusy || journal === undefined || conflict) return false
    if (draft.trim().length === 0 && mediaCount === 0) {
      setError(journal ? 'Nhật ký không thể chỉ có khoảng trắng. Hãy dùng Xóa nếu muốn xóa nhật ký.' : 'Hãy nhập nội dung trước khi lưu nhật ký.')
      textareaRef.current?.focus()
      return false
    }
    if (draft.length > CONTENT_MAX_LENGTH) {
      setError(`Nội dung vượt quá ${CONTENT_MAX_LENGTH.toLocaleString('vi-VN')} ký tự.`)
      return false
    }

    mutationControllerRef.current?.abort()
    const controller = new AbortController()
    mutationControllerRef.current = controller
    setBusy('saving')
    setError('')
    setNotice('')
    try {
      const result = await journalApi.save(date, draft, journal?.version ?? null, controller.signal)
      if (controller.signal.aborted) return false
      if (!result.journal) throw new Error('Máy chủ không trả nhật ký sau khi lưu.')
      replaceJournal(result.journal)
      setDraft(result.journal.content)
      setNotice('Đã lưu nhật ký.')
      return true
    } catch (caught) {
      if (controller.signal.aborted) return false
      if (caught instanceof ApiError && caught.status === 401) {
        onUnauthorized('Phiên đăng nhập đã hết hạn. Nhật ký chưa được lưu.')
      } else if (caught instanceof ApiError && (caught.status === 409 || (caught.status === 404 && journal !== null))) {
        startConflict('Nhật ký trên máy chủ đã thay đổi hoặc bị xóa ở nơi khác. Bản nháp của bạn chưa bị mất.')
      } else {
        setError(journalErrorMessage(caught, 'save'))
      }
      return false
    } finally {
      if (!controller.signal.aborted) setBusy(undefined)
    }
  }, [busy, conflict, date, draft, journal, mediaBusy, mediaCount, onUnauthorized, replaceJournal])

  const acceptMediaVersion = useCallback((version: number | null) => {
    const current = journalRef.current
    if (version === null) {
      replaceJournal(null)
      return
    }
    const now = new Date().toISOString()
    replaceJournal(current ? { ...current, updatedAt: now, version } : {
      content: '',
      createdAt: now,
      date,
      updatedAt: now,
      version,
    })
  }, [date, replaceJournal])

  const saveThenContinue = useCallback(async () => {
    if (await saveDraft()) continuePending()
  }, [continuePending, saveDraft])

  const discardThenContinue = useCallback(() => {
    setDraft(journalRef.current?.content ?? '')
    setError('')
    setConflict(undefined)
    continuePending()
  }, [continuePending])

  const deleteCurrentJournal = useCallback(async () => {
    const current = journalRef.current
    if (!current || busy) return
    if (!window.confirm(`Xóa nhật ký ngày ${formatLocalDate(date)}? Thao tác này không thể hoàn tác.`)) return
    mutationControllerRef.current?.abort()
    const controller = new AbortController()
    mutationControllerRef.current = controller
    setBusy('deleting')
    setError('')
    setNotice('')
    try {
      await journalApi.delete(date, current.version, controller.signal)
      if (controller.signal.aborted) return
      replaceJournal(null)
      setDraft('')
      setConflict(undefined)
      setNotice('Đã xóa nhật ký.')
      window.setTimeout(() => mediaRef.current?.reload(), 0)
    } catch (caught) {
      if (controller.signal.aborted) return
      if (caught instanceof ApiError && caught.status === 401) {
        onUnauthorized('Phiên đăng nhập đã hết hạn. Nhật ký chưa được xóa.')
      } else if (caught instanceof ApiError && (caught.status === 409 || caught.status === 404)) {
        startConflict('Nhật ký trên máy chủ đã thay đổi hoặc bị xóa ở nơi khác nên chưa thể xóa bằng phiên bản cũ.')
      } else {
        setError(journalErrorMessage(caught, 'delete'))
      }
    } finally {
      if (!controller.signal.aborted) setBusy(undefined)
    }
  }, [busy, date, onUnauthorized, replaceJournal])

  const requestDelete = useCallback(() => requestAction(() => void deleteCurrentJournal()), [deleteCurrentJournal, requestAction])

  async function readLatestForConflict() {
    conflictControllerRef.current?.abort()
    const controller = new AbortController()
    conflictControllerRef.current = controller
    setConflictLoading(true)
    setConflict((current) => current ? { ...current, loadError: undefined } : current)
    try {
      const result = await journalApi.get(date, controller.signal)
      if (controller.signal.aborted) return
      replaceJournal(result.journal)
      setConflict((current) => current ? { ...current, latest: result.journal, latestLoaded: true } : current)
      window.setTimeout(() => mediaRef.current?.reload(), 0)
    } catch (caught) {
      if (controller.signal.aborted) return
      if (caught instanceof ApiError && caught.status === 401) {
        onUnauthorized('Phiên đăng nhập đã hết hạn. Bản nháp chưa được lưu.')
      } else {
        setConflict((current) => current ? { ...current, loadError: journalErrorMessage(caught, 'load') } : current)
      }
    } finally {
      if (!controller.signal.aborted) setConflictLoading(false)
    }
  }

  const refreshJournalForMedia = useCallback(async (message: string) => {
    conflictControllerRef.current?.abort()
    const controller = new AbortController()
    conflictControllerRef.current = controller
    setConflictLoading(true)
    try {
      const result = await journalApi.get(date, controller.signal)
      if (controller.signal.aborted) return undefined
      replaceJournal(result.journal)
      setConflict({ latest: result.journal, latestLoaded: true, message })
      return result.journal?.version ?? null
    } catch (caught) {
      if (controller.signal.aborted) return undefined
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized('Phiên đăng nhập đã hết hạn. Bản nháp chưa được lưu.')
      else setConflict((current) => ({ latest: current?.latest ?? journalRef.current ?? null, latestLoaded: false, loadError: journalErrorMessage(caught, 'load'), message }))
      return undefined
    } finally {
      if (!controller.signal.aborted) setConflictLoading(false)
    }
  }, [date, onUnauthorized, replaceJournal])

  function useLatestVersion() {
    if (!conflict?.latestLoaded) return
    if (!window.confirm('Dùng bản mới nhất sẽ bỏ bản nháp đang viết. Bạn có chắc chắn?')) return
    setDraft(conflict.latest?.content ?? '')
    setConflict(undefined)
    setError('')
    setNotice('Đã dùng bản mới nhất từ máy chủ.')
  }

  function keepDraft() {
    if (!conflict?.latestLoaded) return
    setConflict(undefined)
    setError('')
    setNotice(conflict.latest ? 'Đang giữ bản nháp. Hãy đối chiếu, chỉnh nội dung rồi bấm Lưu để dùng phiên bản mới nhất.' : 'Bản trên máy chủ đã bị xóa. Bấm Lưu khi muốn tạo lại từ bản nháp.')
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const statusText = loading ? 'Đang tải…' : busy === 'saving' ? 'Đang lưu…' : busy === 'deleting' ? 'Đang xóa…' : dirty ? 'Chưa lưu' : journal ? 'Đã lưu' : 'Chưa có nhật ký'
  const showCharacterCount = draft.length >= CONTENT_MAX_LENGTH * 0.9

  return <section className="content-card journal-card" aria-labelledby={`journal-title-${date}`}>
    <div className="section-heading journal-heading">
      <div><h2 id={`journal-title-${date}`}>Nhật ký</h2><p>{formatLocalDate(date)}</p></div>
      <span className={`journal-status${dirty ? ' is-dirty' : ''}`} aria-live="polite">{statusText}</span>
    </div>
    {loading && <div className="loading-panel compact" role="status">Đang tải nhật ký…</div>}
    {!loading && journal === undefined && <div className="error-panel" role="alert">
      <p>{error}</p><button className="secondary-button" type="button" onClick={() => void loadJournal()}>Thử lại</button>
    </div>}
    {!loading && journal !== undefined && <>
      {!journal && !draft && <p className="journal-empty">Chưa có nhật ký cho ngày này.</p>}
      <label className="field journal-field"><span>Nội dung nhật ký</span>
        <textarea ref={textareaRef} value={draft} maxLength={CONTENT_MAX_LENGTH} rows={7} disabled={Boolean(busy)} placeholder="Viết lại điều bạn muốn ghi nhớ trong ngày…" onChange={(event) => { setDraft(event.target.value); setError(''); setNotice('') }} />
      </label>
      {showCharacterCount && <div className="journal-meta"><span>{draft.length.toLocaleString('vi-VN')} / {CONTENT_MAX_LENGTH.toLocaleString('vi-VN')} ký tự</span></div>}
      <MediaManager
        ref={mediaRef}
        owner={{ type: 'journal', date, journalVersion: journal?.version ?? null }}
        disabled={Boolean(busy) || Boolean(conflict)}
        onBusyChange={setMediaBusy}
        onImageCountChange={setMediaCount}
        onJournalConflict={startConflict}
        onJournalRefresh={refreshJournalForMedia}
        onJournalVersionChange={acceptMediaVersion}
        onUnauthorized={onUnauthorized}
      />
      {error && <p className="form-message error" role="alert">{error}</p>}
      {notice && <p className="form-message success" role="status">{notice}</p>}
      {conflict && <div className="journal-conflict" role="alert">
        <h3>Nhật ký có thay đổi ở nơi khác</h3>
        <p>{conflict.message}</p>
        {!conflict.latestLoaded && <button className="secondary-button" type="button" disabled={conflictLoading} onClick={() => void readLatestForConflict()}>{conflictLoading ? 'Đang đọc…' : 'Đọc bản mới nhất để đối chiếu'}</button>}
        {conflict.loadError && <p className="form-message error">{conflict.loadError}</p>}
        {conflict.latestLoaded && <>
          <div className="journal-latest">
            <strong>Bản mới nhất trên máy chủ</strong>
            {conflict.latest ? <pre>{conflict.latest.content}</pre> : <p>Nhật ký này đã bị xóa ở nơi khác.</p>}
          </div>
          <div className="dialog-actions">
            <button className="secondary-button" type="button" onClick={useLatestVersion}>Dùng bản mới nhất</button>
            <button className="primary-button" type="button" onClick={keepDraft}>Giữ bản nháp để chỉnh</button>
          </div>
        </>}
      </div>}
      <div className="journal-actions">
        {journal && <button className="danger-button" type="button" disabled={Boolean(busy)} onClick={requestDelete}>Xóa nhật ký</button>}
        <button className="primary-button" type="button" disabled={Boolean(busy) || mediaBusy || !dirty || Boolean(conflict)} onClick={() => void saveDraft()}>{busy === 'saving' ? 'Đang lưu…' : 'Lưu nhật ký'}</button>
      </div>
    </>}
    {pendingAction && <DialogFrame labelledBy="journal-unsaved-title" onClose={() => setPendingAction(undefined)}>
      <h2 id="journal-unsaved-title">Nhật ký chưa được lưu</h2>
      <p>Bạn có thay đổi chưa lưu cho ngày {formatLocalDate(date)}. Bạn muốn làm gì trước khi tiếp tục?</p>
      <p className="field-help">Khi đóng hoặc tải lại trang, trình duyệt chỉ có thể hiện cảnh báo chung và không cho tùy chỉnh nội dung.</p>
      <div className="dialog-actions stacked-mobile">
        <button className="primary-button" type="button" disabled={Boolean(busy) || Boolean(conflict)} onClick={() => void saveThenContinue()}>{busy === 'saving' ? 'Đang lưu…' : 'Lưu và tiếp tục'}</button>
        <button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={discardThenContinue}>Bỏ thay đổi</button>
        <button className="text-button" type="button" disabled={Boolean(busy)} onClick={() => setPendingAction(undefined)}>Tiếp tục chỉnh</button>
      </div>
    </DialogFrame>}
  </section>
}
