import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthPanel } from './AuthPanel'
import { ApiError, dayTrailApi, type DayTrailUser } from './api'

type HealthState = 'Đang kiểm tra' | 'Đã kết nối' | 'Chưa kết nối'
type Section = 'Hôm nay' | 'Lịch' | 'Hành trình'
type SessionState =
  | { status: 'checking' }
  | { status: 'error'; message: string }
  | { status: 'guest'; message?: string }
  | { status: 'authenticated'; user: DayTrailUser }

const sections: Record<Section, { title: string; description: string }> = {
  'Hôm nay': { title: 'Khung nền đã sẵn sàng', description: 'Danh sách công việc, nhật ký ngày và tổng quan ngày sẽ được triển khai ở các chặng tiếp theo.' },
  'Lịch': { title: 'Lịch đang được chuẩn bị', description: 'Tạo công việc theo ngày, các chế độ xem lịch và lặp lại chưa được triển khai trong chặng này.' },
  'Hành trình': { title: 'Hành trình đang được chuẩn bị', description: 'Timeline, khoảnh khắc nổi bật và các giai đoạn cá nhân sẽ được triển khai sau Hôm nay và Lịch.' },
}

function HealthBadge() {
  const [health, setHealth] = useState<HealthState>('Đang kiểm tra')

  useEffect(() => {
    const controller = new AbortController()
    dayTrailApi.health(controller.signal)
      .then(() => setHealth('Đã kết nối'))
      .catch((error: unknown) => {
        if (!(error instanceof Error && error.name === 'AbortError')) setHealth('Chưa kết nối')
      })
    return () => controller.abort()
  }, [])

  return <span className={`status ${health === 'Đã kết nối' ? 'ok' : health === 'Chưa kết nối' ? 'error' : ''}`}>
    <span aria-hidden="true">●</span> {health}
  </span>
}

function BrandHeader({ actions }: { actions?: React.ReactNode }) {
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
        <div className="foundation-note"><span aria-hidden="true">✦</span><span>Khung sản phẩm đã sẵn sàng. Nội dung nghiệp vụ sẽ được bổ sung ở các chặng tiếp theo.</span></div>
      </section>
      <AuthPanel onAuthenticated={onAuthenticated} sessionMessage={message} />
    </div>
    <Footer />
  </main>
}

function AuthenticatedView({ user, onLogout, logoutError, loggingOut }: {
  user: DayTrailUser
  onLogout: () => void
  logoutError?: string
  loggingOut: boolean
}) {
  const [section, setSection] = useState<Section>('Hôm nay')
  const current = sections[section]
  return <main className="app">
    <BrandHeader actions={<div className="account-actions">
      <span className="user-name" title={user.email}>Xin chào, <strong>{user.displayName}</strong></span>
      <button className="logout-button" type="button" onClick={onLogout} disabled={loggingOut}>{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>
    </div>} />
    {logoutError && <div className="form-message error logout-error" role="alert">{logoutError}</div>}
    <section className="hero"><p className="eyebrow">Không gian cá nhân</p><h1>Mỗi ngày một bước tiến.</h1><p className="muted">Nơi công việc, nhật ký và hành trình của bạn được giữ cùng nhau.</p></section>
    <nav className="tabs" aria-label="Điều hướng chính">{(Object.keys(sections) as Section[]).map((item) => <button key={item} className={section === item ? 'active' : ''} onClick={() => setSection(item)} aria-current={section === item ? 'page' : undefined}>{item}</button>)}</nav>
    <section className="card"><div className="card-icon" aria-hidden="true">✦</div><h2>{current.title}</h2><p>{current.description}</p><span className="badge">Nội dung nền · Chưa có nghiệp vụ</span></section>
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
        setSession({ status: 'error', message: error instanceof ApiError && error.kind === 'network' ? 'Không thể kết nối đến backend. Hãy kiểm tra máy chủ rồi thử lại.' : 'Máy chủ chưa thể kiểm tra phiên. Vui lòng thử lại.' })
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
  return <AuthenticatedView user={session.user} onLogout={handleLogout} logoutError={logoutError} loggingOut={loggingOut} />
}
