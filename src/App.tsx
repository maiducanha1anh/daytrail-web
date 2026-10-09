import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AuthPanel } from './AuthPanel'
import { ApiError, dayTrailApi, type DayTrailUser } from './api'
import { CalendarPage } from './features/calendar/CalendarPage'
import { JourneyPage } from './features/journey/JourneyPage'
import type { GuardRegistrar, NavigationGuard } from './navigation'
import { TodayPage } from './features/today/TodayPage'

type HealthState = 'checking' | 'ready' | 'degraded' | 'offline'
type Section = 'Hôm nay' | 'Lịch' | 'Hành trình'
type SessionState =
  | { status: 'checking' }
  | { status: 'error'; message: string }
  | { status: 'guest'; message?: string }
  | { status: 'authenticated'; user: DayTrailUser }

const sections: Section[] = ['Hôm nay', 'Lịch', 'Hành trình']

function initialSection(): Section {
  if (window.location.hash.startsWith('#journey')) return 'Hành trình'
  if (window.location.hash.startsWith('#calendar')) return 'Lịch'
  return 'Hôm nay'
}

function HealthBadge() {
  const [health, setHealth] = useState<HealthState>('checking')

  useEffect(() => {
    let controller: AbortController | undefined
    let disposed = false
    async function checkServices() {
      controller?.abort()
      controller = new AbortController()
      try {
        await dayTrailApi.health(controller.signal)
        try {
          await dayTrailApi.ready(controller.signal)
          if (!disposed) setHealth('ready')
        } catch (error: unknown) {
          if (!disposed && !(error instanceof Error && error.name === 'AbortError')) setHealth('degraded')
        }
      } catch (error: unknown) {
        if (!disposed && !(error instanceof Error && error.name === 'AbortError')) setHealth('offline')
      }
    }
    void checkServices()
    const timer = window.setInterval(() => void checkServices(), 60_000)
    return () => {
      disposed = true
      window.clearInterval(timer)
      controller?.abort()
    }
  }, [])

  const label = health === 'ready' ? 'Dữ liệu sẵn sàng' : health === 'degraded' ? 'Dữ liệu gián đoạn' : health === 'offline' ? 'Không kết nối API' : 'Đang kiểm tra dịch vụ'
  const title = health === 'degraded' ? 'API đang chạy nhưng database chưa sẵn sàng.' : undefined
  return <span className={`status ${health === 'ready' ? 'ok' : health === 'degraded' ? 'degraded' : health === 'offline' ? 'error' : ''}`} title={title}>
    <span aria-hidden="true">●</span> {label}
  </span>
}

function BrandHeader({ actions }: { actions?: ReactNode }) {
  return <header className="site-header">
    <div className="brand"><span className="mark" aria-hidden="true">D</span><span>DayTrail</span></div>
    <div className="header-actions"><HealthBadge />{actions}</div>
  </header>
}

function SessionChecking() {
  return <main className="app auth-layout">
    <BrandHeader />
    <section className="session-state" aria-live="polite" aria-busy="true">
      <span className="spinner" aria-hidden="true" />
      <h1>Đang kiểm tra phiên đăng nhập</h1>
      <p>DayTrail đang xác nhận tài khoản của bạn.</p>
    </section>
  </main>
}

function SessionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <main className="app auth-layout">
    <BrandHeader />
    <section className="session-state error-state" role="alert">
      <span className="state-icon" aria-hidden="true">!</span>
      <h1>Chưa thể kiểm tra phiên</h1>
      <p>{message}</p>
      <button className="primary-button compact" type="button" onClick={onRetry}>Thử lại</button>
    </section>
  </main>
}

function GuestView({ message, onAuthenticated }: { message?: string; onAuthenticated: (user: DayTrailUser) => void }) {
  return <main className="app auth-layout">
    <BrandHeader />
    <div className="auth-page">
      <section className="auth-intro" aria-labelledby="welcome-title">
        <p className="eyebrow">Không gian cá nhân</p>
        <h2 id="welcome-title">Mỗi ngày một bước tiến.</h2>
        <p>Nơi công việc, nhật ký và hành trình của bạn được giữ cùng nhau — riêng tư theo từng tài khoản.</p>
        <div className="foundation-note"><span aria-hidden="true">✦</span><span>Đăng nhập để xem công việc và kế hoạch theo ngày của riêng bạn.</span></div>
      </section>
      <AuthPanel onAuthenticated={onAuthenticated} sessionMessage={message} />
    </div>
    <Footer />
  </main>
}

function AuthenticatedView({ user, onLogout, onSessionExpired, logoutError, loggingOut }: {
  user: DayTrailUser
  onLogout: () => void
  onSessionExpired: () => void
  logoutError?: string
  loggingOut: boolean
}) {
  const [section, setSection] = useState<Section>(() => initialSection())
  const [calendarJournalTarget, setCalendarJournalTarget] = useState<{ date: string; key: number }>()
  const navigationGuardsRef = useRef(new Set<NavigationGuard>())

  const registerNavigationGuard: GuardRegistrar = useCallback((guard) => {
    navigationGuardsRef.current.add(guard)
    return () => {
      navigationGuardsRef.current.delete(guard)
    }
  }, [])

  const requestNavigation = useCallback((next: () => void) => {
    const guards = [...navigationGuardsRef.current]
    const run = (index: number) => {
      const guard = guards[index]
      if (guard) guard(() => run(index + 1))
      else next()
    }
    run(0)
  }, [])

  function selectSection(nextSection: Section) {
    if (nextSection === section) return
    requestNavigation(() => {
      if (nextSection === 'Lịch') setCalendarJournalTarget(undefined)
      setSection(nextSection)
    })
  }

  function openJournalFromJourney(date: string) {
    requestNavigation(() => {
      setCalendarJournalTarget({ date, key: Date.now() })
      setSection('Lịch')
    })
  }

  return <main className="app product-app">
    <BrandHeader actions={<div className="account-actions">
      <span className="user-name" title={user.email}>Xin chào, <strong>{user.displayName}</strong></span>
      <button className="logout-button" type="button" onClick={() => requestNavigation(onLogout)} disabled={loggingOut}>{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>
    </div>} />
    {logoutError && <div className="form-message error logout-error" role="alert">{logoutError}</div>}
    <nav className="tabs" aria-label="Điều hướng chính">{sections.map((item) => <button key={item} type="button" className={section === item ? 'active' : ''} onClick={() => selectSection(item)} aria-current={section === item ? 'page' : undefined}>{item}</button>)}</nav>
    {section === 'Hôm nay' && <TodayPage onOpenCalendar={() => selectSection('Lịch')} onUnauthorized={onSessionExpired} registerNavigationGuard={registerNavigationGuard} />}
    {section === 'Lịch' && <CalendarPage key={calendarJournalTarget?.key ?? 'calendar'} initialJournalDate={calendarJournalTarget?.date} onUnauthorized={onSessionExpired} registerNavigationGuard={registerNavigationGuard} requestNavigation={requestNavigation} />}
    {section === 'Hành trình' && <JourneyPage onEditJournal={openJournalFromJourney} onUnauthorized={onSessionExpired} registerNavigationGuard={registerNavigationGuard} />}
    <Footer />
  </main>
}

function Footer() {
  return <footer>DayTrail · Dữ liệu cá nhân, riêng tư theo từng tài khoản</footer>
}

export function App() {
  const [session, setSession] = useState<SessionState>({ status: 'checking' })
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string>()
  const requestIdRef = useRef(0)
  const controllerRef = useRef<AbortController | undefined>(undefined)

  const checkSession = useCallback((controller: AbortController, requestId: number) => {
    dayTrailApi.me(controller.signal)
      .then(({ user }) => {
        if (!controller.signal.aborted && requestId === requestIdRef.current) setSession({ status: 'authenticated', user })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return
        if (error instanceof ApiError && error.status === 401) {
          setSession({ status: 'guest', message: 'Bạn chưa đăng nhập hoặc phiên trước đã hết hạn.' })
          return
        }
        const message = error instanceof ApiError && error.kind === 'network'
          ? 'Không thể kết nối đến backend. Hãy kiểm tra máy chủ rồi thử lại.'
          : error instanceof ApiError && error.status === 503
            ? 'API đang chạy nhưng database tạm thời chưa sẵn sàng. Phiên của bạn chưa bị coi là hết hạn; hãy khôi phục kết nối database rồi thử lại.'
            : 'Máy chủ chưa thể kiểm tra phiên. Vui lòng thử lại.'
        setSession({ status: 'error', message })
      })
  }, [])

  const restoreSession = useCallback(() => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const requestId = ++requestIdRef.current
    setSession({ status: 'checking' })
    checkSession(controller, requestId)
  }, [checkSession])

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    const requestId = ++requestIdRef.current
    checkSession(controller, requestId)
    return () => {
      requestIdRef.current += 1
      controllerRef.current?.abort()
    }
  }, [checkSession])

  function handleAuthenticated(user: DayTrailUser) {
    controllerRef.current?.abort()
    requestIdRef.current += 1
    setLogoutError(undefined)
    setSession({ status: 'authenticated', user })
  }

  const handleSessionExpired = useCallback(() => {
    requestIdRef.current += 1
    controllerRef.current?.abort()
    setLogoutError(undefined)
    setSession({ status: 'guest', message: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.' })
  }, [])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutError(undefined)
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const requestId = ++requestIdRef.current
    try {
      await dayTrailApi.logout(controller.signal)
      if (!controller.signal.aborted && requestId === requestIdRef.current) setSession({ status: 'guest', message: 'Bạn đã đăng xuất an toàn.' })
    } catch (error: unknown) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return
      setLogoutError(error instanceof ApiError && error.kind === 'network' ? 'Không thể kết nối đến máy chủ nên chưa xác nhận đăng xuất. Vui lòng thử lại.' : 'Đăng xuất chưa thành công. Vui lòng thử lại.')
    } finally {
      if (!controller.signal.aborted && requestId === requestIdRef.current) setLoggingOut(false)
    }
  }

  if (session.status === 'checking') return <SessionChecking />
  if (session.status === 'error') return <SessionError message={session.message} onRetry={restoreSession} />
  if (session.status === 'guest') return <GuestView message={session.message} onAuthenticated={handleAuthenticated} />
  return <AuthenticatedView user={session.user} onLogout={handleLogout} onSessionExpired={handleSessionExpired} logoutError={logoutError} loggingOut={loggingOut} />
}
