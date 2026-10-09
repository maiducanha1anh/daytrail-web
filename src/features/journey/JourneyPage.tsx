import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../api'
import type { GuardRegistrar } from '../../navigation'
import { PrivateImage } from '../media/PrivateImage'
import type { MediaAsset } from '../media/types'
import { DialogFrame } from '../tasks/DialogFrame'
import { addDays, endOfWeek, formatLocalDate, moveToMonth, moveToYear, parseLocalDate, startOfWeek, toLocalDateKey, todayKey } from '../tasks/date'
import { journeyApi } from './api'
import { AlbumCover, MemoryDayCard } from './JourneyCards'
import { AlbumSettingsDialog, PhaseDialog } from './JourneyDialogs'
import type { JourneyDayResponse, JourneyDaysResponse, JourneyMonthResponse, JourneyPhase, JourneyView, JourneyYearResponse } from './types'

const labels: Record<JourneyView, string> = { year: 'Năm', month: 'Tháng', week: 'Tuần', day: 'Ngày' }

type JourneyLocation = { anchor: string; view: JourneyView }

function locationFromHash(): JourneyLocation {
  const fallback = { anchor: todayKey(), view: 'month' as const }
  if (!window.location.hash.startsWith('#journey')) return fallback
  const query = window.location.hash.split('?')[1]
  if (!query) return fallback
  const values = new URLSearchParams(query)
  const view = values.get('view')
  const anchor = values.get('date')
  return view && ['year', 'month', 'week', 'day'].includes(view) && anchor && parseLocalDate(anchor)
    ? { anchor, view: view as JourneyView }
    : fallback
}

function hashFor(location: JourneyLocation) {
  return `#journey?view=${location.view}&date=${location.anchor}`
}

function rangeFor(view: JourneyView, anchor: string) {
  const date = parseLocalDate(anchor) ?? new Date()
  if (view === 'year') return { from: `${date.getFullYear()}-01-01`, to: `${date.getFullYear()}-12-31` }
  if (view === 'month') return { from: toLocalDateKey(new Date(date.getFullYear(), date.getMonth(), 1)), to: toLocalDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)) }
  if (view === 'week') return { from: startOfWeek(anchor), to: endOfWeek(anchor) }
  return { from: anchor, to: anchor }
}

function periodLabel(view: JourneyView, anchor: string, from: string, to: string) {
  const date = parseLocalDate(anchor)
  if (!date) return anchor
  if (view === 'year') return `Năm ${date.getFullYear()}`
  if (view === 'month') return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(date)
  if (view === 'week') return `${formatLocalDate(from, { day: 'numeric', month: 'short' })} – ${formatLocalDate(to, { day: 'numeric', month: 'short', year: 'numeric' })}`
  return formatLocalDate(anchor)
}

function shifted(view: JourneyView, anchor: string, direction: number) {
  if (view === 'year') return moveToYear(anchor, direction)
  if (view === 'month') return moveToMonth(anchor, direction)
  return addDays(anchor, direction * (view === 'week' ? 7 : 1))
}

function messageFor(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 503) return 'Dữ liệu tạm thời gián đoạn. Hãy thử lại sau.'
    if (error.kind === 'network') return 'Không thể kết nối đến máy chủ. Hãy kiểm tra kết nối rồi thử lại.'
    return error.message
  }
  return 'Chưa thể tải Album ký ức. Hãy thử lại.'
}

export function JourneyPage({ onEditJournal, onUnauthorized, registerNavigationGuard }: {
  onEditJournal: (date: string) => void
  onUnauthorized: () => void
  registerNavigationGuard: GuardRegistrar
}) {
  const initial = useMemo(() => locationFromHash(), [])
  const [view, setView] = useState<JourneyView>(initial.view)
  const [anchor, setAnchor] = useState(initial.anchor)
  const [yearData, setYearData] = useState<JourneyYearResponse>()
  const [monthData, setMonthData] = useState<JourneyMonthResponse>()
  const [daysData, setDaysData] = useState<JourneyDaysResponse>()
  const [dayData, setDayData] = useState<JourneyDayResponse>()
  const [showAllMonthDays, setShowAllMonthDays] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activeImage, setActiveImage] = useState<MediaAsset>()
  const [albumSettings, setAlbumSettings] = useState(false)
  const [showPhases, setShowPhases] = useState(false)
  const [phases, setPhases] = useState<JourneyPhase[]>([])
  const [phasesLoaded, setPhasesLoaded] = useState(false)
  const [phaseDialog, setPhaseDialog] = useState<JourneyPhase | 'new'>()
  const [activePhase, setActivePhase] = useState<JourneyPhase>()
  const [phaseDays, setPhaseDays] = useState<JourneyDaysResponse>()
  const [mutating, setMutating] = useState(false)
  const requestRef = useRef(0)
  const controllerRef = useRef<AbortController | undefined>(undefined)
  const { from, to } = useMemo(() => rangeFor(view, anchor), [anchor, view])

  const navigate = useCallback((next: JourneyLocation, replace = false) => {
    const currentState = { ...(window.history.state ?? {}), journey: { anchor, view }, journeyScrollY: window.scrollY }
    window.history.replaceState(currentState, '', hashFor({ anchor, view }))
    const nextState = { ...(window.history.state ?? {}), journey: next, journeyScrollY: 0 }
    if (replace) window.history.replaceState(nextState, '', hashFor(next))
    else window.history.pushState(nextState, '', hashFor(next))
    setView(next.view)
    setAnchor(next.anchor)
    setShowAllMonthDays(false)
    setShowPhases(false)
    window.scrollTo({ top: 0 })
  }, [anchor, view])

  useEffect(() => {
    window.history.replaceState({ ...(window.history.state ?? {}), journey: initial, journeyScrollY: window.scrollY }, '', hashFor(initial))
    const pop = (event: PopStateEvent) => {
      const next = event.state?.journey as JourneyLocation | undefined
      const location = next && parseLocalDate(next.anchor) ? next : locationFromHash()
      setView(location.view)
      setAnchor(location.anchor)
      setShowAllMonthDays(false)
      setShowPhases(false)
      window.setTimeout(() => window.scrollTo({ top: Number(event.state?.journeyScrollY ?? 0) }), 0)
    }
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  }, [initial])

  const load = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const requestId = ++requestRef.current
    setLoading(true)
    setError('')
    try {
      const parsed = parseLocalDate(anchor) ?? new Date()
      const result = view === 'year'
        ? await journeyApi.year(parsed.getFullYear(), controller.signal)
        : view === 'month'
          ? await journeyApi.month(parsed.getFullYear(), parsed.getMonth() + 1, controller.signal)
          : view === 'week'
            ? await journeyApi.days(from, to, 1, controller.signal)
            : await journeyApi.day(anchor, controller.signal)
      if (controller.signal.aborted || requestId !== requestRef.current) return
      if (view === 'year') setYearData(result as JourneyYearResponse)
      else if (view === 'month') setMonthData(result as JourneyMonthResponse)
      else if (view === 'week') setDaysData(result as JourneyDaysResponse)
      else setDayData(result as JourneyDayResponse)
    } catch (caught) {
      if (controller.signal.aborted || requestId !== requestRef.current) return
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized()
      else setError(messageFor(caught))
    } finally {
      if (!controller.signal.aborted && requestId === requestRef.current) setLoading(false)
    }
  }, [anchor, from, onUnauthorized, to, view])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => { window.clearTimeout(timer); requestRef.current += 1; controllerRef.current?.abort() }
  }, [load])

  async function loadAllMonthDays(page = 1) {
    if (loadingMore) return
    setLoadingMore(true)
    setError('')
    try {
      const next = await journeyApi.days(from, to, page)
      setDaysData((current) => page === 1 ? next : { ...next, days: [...(current?.days ?? []), ...next.days] })
      setShowAllMonthDays(true)
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized()
      else setError(messageFor(caught))
    } finally {
      setLoadingMore(false)
    }
  }

  async function toggleHighlight() {
    const entry = dayData?.entry
    if (!entry || mutating) return
    setMutating(true)
    setError('')
    try {
      if (entry.highlight) await journeyApi.removeHighlight(entry.highlight.id)
      else await journeyApi.addHighlight(entry.journalId)
      await load()
      setNotice(entry.highlight ? 'Đã bỏ đánh dấu nổi bật.' : 'Đã lưu nhật ký này vào ký ức nổi bật.')
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized()
      else setError(messageFor(caught))
    } finally {
      setMutating(false)
    }
  }

  async function openPhases() {
    setShowPhases(true)
    if (phasesLoaded) return
    try {
      const result = await journeyApi.listPhases()
      setPhases(result.phases)
      setPhasesLoaded(true)
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized()
      else setError(messageFor(caught))
    }
  }

  async function openPhase(phase: JourneyPhase) {
    setActivePhase(phase)
    setPhaseDays(undefined)
    try {
      setPhaseDays(await journeyApi.phaseDays(phase.id, 1))
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized()
      else setError(messageFor(caught))
    }
  }

  async function loadMorePhase() {
    if (!activePhase || !phaseDays || loadingMore || phaseDays.pagination.page >= phaseDays.pagination.pages) return
    setLoadingMore(true)
    try {
      const next = await journeyApi.phaseDays(activePhase.id, phaseDays.pagination.page + 1)
      setPhaseDays({ ...next, days: [...phaseDays.days, ...next.days] })
    } catch (caught) { setError(messageFor(caught)) } finally { setLoadingMore(false) }
  }

  async function deletePhase(phase: JourneyPhase) {
    if (!window.confirm(`Xóa giai đoạn “${phase.name}”? Nhật ký và ảnh gốc vẫn được giữ.`)) return
    try {
      await journeyApi.deletePhase(phase.id)
      setPhases((current) => current.filter((item) => item.id !== phase.id))
      if (activePhase?.id === phase.id) { setActivePhase(undefined); setPhaseDays(undefined) }
      setNotice('Đã xóa giai đoạn; ký ức gốc không thay đổi.')
    } catch (caught) { setError(messageFor(caught)) }
  }

  return <section className="journey-page" aria-labelledby="journey-title">
    <header className="journey-heading"><div><p className="eyebrow">Album ký ức</p><h1 id="journey-title">Hành trình</h1></div><button className="secondary-button compact" type="button" aria-expanded={showPhases} onClick={() => showPhases ? setShowPhases(false) : void openPhases()}>Giai đoạn</button></header>
    <div className="journey-controls content-card">
      <div className="calendar-view-switch" aria-label="Chế độ Album">{(Object.keys(labels) as JourneyView[]).map((item) => <button key={item} type="button" className={view === item ? 'active' : ''} onClick={() => navigate({ anchor, view: item })} aria-pressed={view === item}>{labels[item]}</button>)}</div>
      <div className="calendar-period-nav"><button className="icon-button" type="button" aria-label="Khoảng trước" onClick={() => navigate({ anchor: shifted(view, anchor, -1), view })}>‹</button><h2>{periodLabel(view, anchor, from, to)}</h2><button className="icon-button" type="button" aria-label="Khoảng sau" onClick={() => navigate({ anchor: shifted(view, anchor, 1), view })}>›</button></div>
      <button className="secondary-button compact" type="button" onClick={() => navigate({ anchor: todayKey(), view })}>Hiện tại</button>
    </div>

    {notice && <p className="form-message success" role="status">{notice}</p>}
    {error && <div className="load-error" role="alert"><p>{error}</p><button className="secondary-button" type="button" onClick={() => void load()}>Thử lại</button></div>}

    {showPhases ? <section className="memory-phases content-card" aria-labelledby="memory-phases-title">
      <div className="section-heading"><div><h2 id="memory-phases-title">Giai đoạn cá nhân</h2><p>Những khoảng thời gian bạn muốn gom lại để đọc riêng.</p></div><button className="primary-button compact" type="button" onClick={() => setPhaseDialog('new')}>+ Tạo giai đoạn</button></div>
      {activePhase ? <div className="phase-detail"><button className="text-button" type="button" onClick={() => { setActivePhase(undefined); setPhaseDays(undefined) }}>← Danh sách giai đoạn</button><h3>{activePhase.name}</h3><p className="muted-copy">{formatLocalDate(activePhase.startDate)} – {formatLocalDate(activePhase.endDate)}</p>{activePhase.introduction && <p>{activePhase.introduction}</p>}{activePhase.summary && <blockquote>{activePhase.summary}</blockquote>}
        <div className="memory-day-grid">{phaseDays?.days.map((day) => <MemoryDayCard key={day.date} day={day} onOpen={() => navigate({ anchor: day.date, view: 'day' })} onOpenImage={setActiveImage} onUnauthorized={onUnauthorized} />)}</div>
        {phaseDays && phaseDays.pagination.page < phaseDays.pagination.pages && <button className="secondary-button journey-more" type="button" disabled={loadingMore} onClick={() => void loadMorePhase()}>{loadingMore ? 'Đang tải…' : 'Xem thêm ngày'}</button>}
      </div> : phases.length === 0 ? <div className="empty-state"><span className="empty-icon" aria-hidden="true">✦</span><h3>Chưa có giai đoạn</h3><p>Bạn có thể tạo một khoảng ký ức từ những nhật ký đã lưu.</p></div> : <div className="phase-card-grid">{phases.map((phase) => <article className="phase-card" key={phase.id}>{phase.coverImage && <button type="button" className="phase-card-cover" onClick={() => setActiveImage(phase.coverImage ?? undefined)}><PrivateImage path={phase.coverImage.thumbnailUrl} alt={phase.coverImage.caption || `Ảnh bìa ${phase.name}`} onUnauthorized={onUnauthorized} /></button>}<button className="phase-card-main" type="button" onClick={() => void openPhase(phase)}><h3>{phase.name}</h3><span>{formatLocalDate(phase.startDate, { day: '2-digit', month: '2-digit', year: 'numeric' })} – {formatLocalDate(phase.endDate, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>{phase.introduction && <p>{phase.introduction}</p>}</button><div className="inline-actions"><button type="button" onClick={() => setPhaseDialog(phase)}>Sửa</button><button className="danger-link" type="button" onClick={() => void deletePhase(phase)}>Xóa</button></div></article>)}</div>}
    </section> : loading ? <div className="content-card loading-block"><span className="spinner" aria-hidden="true" />Đang mở Album ký ức…</div> : <>
      {view === 'year' && yearData && <div className="memory-year-grid">{yearData.months.map((album) => <button className={`memory-month-card${album.dayCount === 0 ? ' is-empty' : ''}`} type="button" key={album.month} onClick={() => navigate({ anchor: `${yearData.year}-${String(album.month).padStart(2, '0')}-01`, view: 'month' })}><AlbumCover album={album} onUnauthorized={onUnauthorized} /><span className="memory-month-copy"><strong>{album.title}</strong>{album.excerpt ? <span>{album.excerpt.text}</span> : <span>{album.dayCount === 0 ? 'Chưa có ký ức' : `${album.dayCount} ngày đã lưu`}</span>}</span></button>)}</div>}

      {view === 'month' && monthData && <div className="memory-month-view"><section className="memory-album-hero content-card"><div className="memory-hero-cover"><AlbumCover album={monthData.album} onUnauthorized={onUnauthorized} /></div><div className="memory-hero-copy"><p className="eyebrow">{periodLabel('month', anchor, from, to)}</p><h2>{monthData.album.title}</h2>{monthData.album.excerpt && <button className="memory-excerpt" type="button" onClick={() => navigate({ anchor: monthData.album.excerpt?.date ?? anchor, view: 'day' })}><q>{monthData.album.excerpt.text}</q><span>{formatLocalDate(monthData.album.excerpt.date)}</span></button>}<button className="text-button" type="button" onClick={() => setAlbumSettings(true)}>Tùy chỉnh tiêu đề và ảnh bìa</button></div></section>
        {monthData.previewDays.length === 0 ? <div className="content-card empty-state"><span className="empty-icon" aria-hidden="true">✦</span><h2>Tháng này chưa có ký ức</h2><p>Nhật ký và ảnh nhật ký sẽ tự xuất hiện tại đây.</p></div> : <><div className="section-heading"><div><h2>Những ngày đáng nhớ</h2><p>{monthData.previewDays.length} ngày được chọn ổn định từ nội dung trong tháng.</p></div></div><div className="memory-day-grid">{monthData.previewDays.map((day) => <MemoryDayCard key={day.date} day={day} onOpen={() => navigate({ anchor: day.date, view: 'day' })} onOpenImage={setActiveImage} onUnauthorized={onUnauthorized} />)}</div>
          <button className="secondary-button journey-more" type="button" onClick={() => void loadAllMonthDays(1)}>Xem tất cả ngày</button></>}
        {showAllMonthDays && daysData && <section className="memory-all-days content-card"><div className="section-heading"><div><h2>Tất cả ngày trong tháng</h2><p>{daysData.pagination.total} ngày có nhật ký hoặc ảnh.</p></div><button className="text-button" type="button" onClick={() => setShowAllMonthDays(false)}>Thu gọn</button></div><div className="memory-day-grid">{daysData.days.map((day) => <MemoryDayCard key={day.date} day={day} onOpen={() => navigate({ anchor: day.date, view: 'day' })} onOpenImage={setActiveImage} onUnauthorized={onUnauthorized} />)}</div>{daysData.pagination.page < daysData.pagination.pages && <button className="secondary-button journey-more" type="button" disabled={loadingMore} onClick={() => void loadAllMonthDays(daysData.pagination.page + 1)}>{loadingMore ? 'Đang tải…' : 'Xem thêm ngày'}</button>}</section>}
      </div>}

      {view === 'week' && daysData && (daysData.days.length === 0 ? <div className="content-card empty-state"><span className="empty-icon" aria-hidden="true">✦</span><h2>Tuần này chưa có ký ức</h2><p>Chỉ nhật ký và ảnh nhật ký được hiển thị trong Hành trình.</p></div> : <div className="memory-week-list">{daysData.days.map((day) => <MemoryDayCard key={day.date} day={day} onOpen={() => navigate({ anchor: day.date, view: 'day' })} onOpenImage={setActiveImage} onUnauthorized={onUnauthorized} />)}</div>)}

      {view === 'day' && dayData && <article className={`memory-day-detail content-card${dayData.entry?.highlight ? ' is-highlight' : ''}`}><div className="section-heading"><div><p className="eyebrow">Ký ức ngày</p><h2>{formatLocalDate(anchor)}</h2></div>{dayData.entry && <button className="highlight-button" type="button" disabled={mutating} aria-pressed={Boolean(dayData.entry.highlight)} onClick={() => void toggleHighlight()}>{dayData.entry.highlight ? '★ Nổi bật' : '☆ Đánh dấu'}</button>}</div>{dayData.entry ? <>{dayData.entry.content && <div className="memory-journal-content">{dayData.entry.content}</div>}{dayData.entry.images.length > 0 && <div className="memory-day-images">{dayData.entry.images.map((image) => <figure key={image.id}><button type="button" onClick={() => setActiveImage(image)}><PrivateImage path={image.thumbnailUrl} alt={image.caption || `Ảnh ngày ${anchor}`} onUnauthorized={onUnauthorized} /></button>{image.caption && <figcaption>{image.caption}</figcaption>}</figure>)}</div>}<button className="primary-button compact" type="button" onClick={() => onEditJournal(anchor)}>Sửa trong nhật ký</button></> : <div className="empty-state"><span className="empty-icon" aria-hidden="true">✦</span><h3>Ngày này chưa có ký ức</h3><p>Bạn có thể viết nhật ký từ chế độ Ngày trong Lịch.</p><button className="primary-button compact" type="button" onClick={() => onEditJournal(anchor)}>Mở nhật ký</button></div>}</article>}
    </>}

    {albumSettings && monthData && <AlbumSettingsDialog album={monthData.album} from={from} to={to} onClose={() => setAlbumSettings(false)} onSaved={(saved) => { setMonthData(saved); setNotice('Đã cập nhật album tháng.') }} onUnauthorized={onUnauthorized} registerNavigationGuard={registerNavigationGuard} />}
    {phaseDialog && <PhaseDialog phase={phaseDialog === 'new' ? undefined : phaseDialog} onClose={() => setPhaseDialog(undefined)} onSaved={(saved) => { setPhases((current) => [saved, ...current.filter((item) => item.id !== saved.id)]); setPhasesLoaded(true); setNotice('Đã lưu giai đoạn.') }} onUnauthorized={onUnauthorized} registerNavigationGuard={registerNavigationGuard} />}
    {activeImage && <DialogFrame labelledBy="memory-image-title" onClose={() => setActiveImage(undefined)}><h2 id="memory-image-title">{activeImage.caption || 'Ảnh trong nhật ký'}</h2><PrivateImage className="journey-image-full" path={activeImage.fullUrl} alt={activeImage.caption || 'Ảnh trong nhật ký'} onUnauthorized={onUnauthorized} /></DialogFrame>}
  </section>
}
