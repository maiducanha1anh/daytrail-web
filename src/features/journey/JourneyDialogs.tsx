import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../api'
import type { GuardRegistrar } from '../../navigation'
import { PrivateImage } from '../media/PrivateImage'
import { DialogFrame } from '../tasks/DialogFrame'
import { formatLocalDate, todayKey } from '../tasks/date'
import { journeyApi } from './api'
import type { JourneyAlbum, JourneyCoverOptions, JourneyMonthResponse, JourneyPhase, JourneyPhaseInput } from './types'

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 503) return 'Dữ liệu tạm thời gián đoạn. Hãy thử lại sau.'
    if (error.kind === 'network') return 'Không thể kết nối đến máy chủ. Hãy kiểm tra kết nối rồi thử lại.'
    return error.message
  }
  return 'Chưa thể hoàn tất thao tác. Hãy thử lại.'
}

function CoverChooser({ from, onChange, onUnauthorized, selected, to }: {
  from: string
  onChange: (value: string | null) => void
  onUnauthorized: () => void
  selected: string | null
  to: string
}) {
  const [result, setResult] = useState<JourneyCoverOptions>()
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const controllerRef = useRef<AbortController | undefined>(undefined)

  const load = useCallback(async (page = 1) => {
    if (page === 1) controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    if (page === 1) setLoading(true)
    else setLoadingMore(true)
    setError('')
    try {
      const next = await journeyApi.coverOptions(from, to, page, controller.signal)
      if (controller.signal.aborted) return
      setResult((current) => page === 1 ? next : { ...next, images: [...(current?.images ?? []), ...next.images] })
    } catch (caught) {
      if (controller.signal.aborted) return
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized()
      else setError(errorMessage(caught))
    } finally {
      if (controllerRef.current === controller) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [from, onUnauthorized, to])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 0)
    return () => {
      window.clearTimeout(timer)
      controllerRef.current?.abort()
    }
  }, [load])

  return <fieldset className="memory-cover-picker">
    <legend>Ảnh bìa</legend>
    <label className={`memory-cover-option is-auto${selected === null ? ' selected' : ''}`}><input type="radio" name="memory-cover" checked={selected === null} onChange={() => onChange(null)} /><span>Tự động chọn từ ảnh nhật ký</span></label>
    {loading ? <p className="muted-copy">Đang tải ảnh có thể dùng…</p> : result?.images.length ? <div className="memory-cover-options">{result.images.map(({ date, image }) => <label key={image.id} className={selected === image.id ? 'selected' : ''}>
      <input type="radio" name="memory-cover" checked={selected === image.id} onChange={() => onChange(image.id)} />
      <PrivateImage path={image.thumbnailUrl} alt={image.caption || `Ảnh ngày ${date}`} onUnauthorized={onUnauthorized} showRetry={false} />
      <span>{formatLocalDate(date, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
    </label>)}</div> : <p className="muted-copy">Khoảng này chưa có ảnh nhật ký.</p>}
    {result && result.pagination.page < result.pagination.pages && <button className="secondary-button compact" type="button" disabled={loadingMore} onClick={() => void load(result.pagination.page + 1)}>{loadingMore ? 'Đang tải…' : 'Xem thêm ảnh'}</button>}
    {error && <p className="form-message error" role="alert">{error}</p>}
  </fieldset>
}

function useUnsavedGuard(dirty: boolean, registerNavigationGuard: GuardRegistrar) {
  const requestClose = useCallback((next: () => void) => {
    if (!dirty || window.confirm('Bỏ thay đổi chưa lưu?')) next()
  }, [dirty])
  useEffect(() => registerNavigationGuard(requestClose), [registerNavigationGuard, requestClose])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  return requestClose
}

export function AlbumSettingsDialog({ album, from, onClose, onSaved, onUnauthorized, registerNavigationGuard, to }: {
  album: JourneyAlbum & { year: number }
  from: string
  onClose: () => void
  onSaved: (value: JourneyMonthResponse) => void
  onUnauthorized: () => void
  registerNavigationGuard: GuardRegistrar
  to: string
}) {
  const initial = useMemo(() => ({ title: album.customTitle, coverImageId: album.selectedCoverImageId }), [album])
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dirty = draft.title !== initial.title || draft.coverImageId !== initial.coverImageId
  const requestClose = useUnsavedGuard(dirty, registerNavigationGuard)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = await journeyApi.updateAlbum(album.year, album.month, draft.title, draft.coverImageId)
      onSaved(result)
      onClose()
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized()
      else setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return <DialogFrame labelledBy="album-settings-title" onClose={() => requestClose(onClose)}>
    <form className="journey-phase-form" onSubmit={(event) => void submit(event)}>
      <div><p className="eyebrow">Album tháng</p><h2 id="album-settings-title">Tùy chỉnh {album.title}</h2></div>
      <label className="field"><span>Tiêu đề tùy chọn</span><input maxLength={100} value={draft.title} placeholder={`Tháng ${album.month}`} onChange={(event) => { setDraft((current) => ({ ...current, title: event.target.value })); setError('') }} /><small>Để trống để dùng tên tháng mặc định.</small></label>
      <CoverChooser from={from} to={to} selected={draft.coverImageId} onChange={(coverImageId) => setDraft((current) => ({ ...current, coverImageId }))} onUnauthorized={onUnauthorized} />
      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="dialog-actions"><button className="secondary-button" type="button" disabled={busy} onClick={() => requestClose(onClose)}>Hủy</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu album'}</button></div>
    </form>
  </DialogFrame>
}

const newPhase = (): JourneyPhaseInput => ({ name: '', startDate: todayKey(), endDate: todayKey(), coverImageId: null, introduction: '', summary: '' })

export function PhaseDialog({ onClose, onSaved, onUnauthorized, phase, registerNavigationGuard }: {
  onClose: () => void
  onSaved: (phase: JourneyPhase) => void
  onUnauthorized: () => void
  phase?: JourneyPhase
  registerNavigationGuard: GuardRegistrar
}) {
  const initial = useMemo<JourneyPhaseInput>(() => phase ? {
    coverImageId: phase.coverImageId, endDate: phase.endDate, introduction: phase.introduction, name: phase.name, startDate: phase.startDate, summary: phase.summary,
  } : newPhase(), [phase])
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const requestClose = useUnsavedGuard(dirty, registerNavigationGuard)

  function change<K extends keyof JourneyPhaseInput>(key: K, value: JourneyPhaseInput[K]) {
    setDraft((current) => ({ ...current, [key]: value, ...((key === 'startDate' || key === 'endDate') ? { coverImageId: null } : {}) }))
    setError('')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!draft.name.trim()) { setError('Tên giai đoạn là bắt buộc.'); return }
    if (draft.endDate < draft.startDate) { setError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'); return }
    setBusy(true)
    setError('')
    try {
      const result = phase ? await journeyApi.updatePhase(phase.id, draft) : await journeyApi.createPhase(draft)
      onSaved(result.phase)
      onClose()
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized()
      else setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return <DialogFrame labelledBy="journey-phase-title" onClose={() => requestClose(onClose)}>
    <form className="journey-phase-form" onSubmit={(event) => void submit(event)}>
      <h2 id="journey-phase-title">{phase ? 'Sửa giai đoạn' : 'Tạo giai đoạn'}</h2>
      <label className="field"><span>Tên giai đoạn</span><input maxLength={120} value={draft.name} onChange={(event) => change('name', event.target.value)} /></label>
      <div className="form-grid two-columns"><label className="field"><span>Từ ngày</span><input type="date" value={draft.startDate} onChange={(event) => change('startDate', event.target.value)} /></label><label className="field"><span>Đến ngày</span><input type="date" value={draft.endDate} onChange={(event) => change('endDate', event.target.value)} /></label></div>
      <CoverChooser from={draft.startDate} to={draft.endDate} selected={draft.coverImageId} onChange={(value) => change('coverImageId', value)} onUnauthorized={onUnauthorized} />
      <label className="field"><span>Lời giới thiệu</span><textarea rows={3} maxLength={2000} value={draft.introduction} onChange={(event) => change('introduction', event.target.value)} /></label>
      <label className="field"><span>Tổng kết</span><textarea rows={4} maxLength={5000} value={draft.summary} onChange={(event) => change('summary', event.target.value)} /></label>
      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="dialog-actions"><button className="secondary-button" type="button" disabled={busy} onClick={() => requestClose(onClose)}>Hủy</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu giai đoạn'}</button></div>
    </form>
  </DialogFrame>
}
