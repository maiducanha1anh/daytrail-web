import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AuthPanel, type AuthMode } from './AuthPanel'
import loginHero from './assets/auth/login-hero.webp'
import loginHeroMobile from './assets/auth/login-hero-mobile.webp'
import registerHero from './assets/auth/register-hero.webp'
import registerHeroMobile from './assets/auth/register-hero-mobile.webp'
import { ApiError, dayTrailApi, type DayTrailUser } from './api'
import { AccountLinkPanel, type AccountLink } from './features/account/AccountLinkPanel'
import { ForgotPasswordPanel } from './features/account/ForgotPasswordPanel'
import { CalendarPage } from './features/calendar/CalendarPage'
import { JourneyPage } from './features/journey/JourneyPage'
import { PrivateImage } from './features/media/PrivateImage'
import { profileApi } from './features/profile/api'
import { ProfilePage } from './features/profile/ProfilePage'
import type { Profile } from './features/profile/types'
import type { GuardRegistrar, NavigationGuard } from './navigation'
import { TodayPage } from './features/today/TodayPage'

type HealthState = 'checking' | 'ready' | 'degraded' | 'offline'
type Section = 'Hôm nay' | 'Lịch' | 'Hành trình' | 'Hồ sơ'
type SessionState =
  | { status: 'checking' }
  | { status: 'error'; message: string }
  | { status: 'guest'; message?: string }
  | { status: 'authenticated'; user: DayTrailUser }

const sections: Section[] = ['Hôm nay', 'Lịch', 'Hành trình']

function initialAccountLink(): AccountLink | undefined {
  const [route, query = ''] = window.location.hash.slice(1).split('?')
  if (route !== 'reset-password' && route !== 'verify-email') return undefined
  const token = new URLSearchParams(query).get('token') ?? undefined
  return { kind: route === 'reset-password' ? 'reset' : 'verify', token }
}

function initialSection(): Section {
  if (window.location.hash.startsWith('#profile')) return 'Hồ sơ'
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

function BrandHeader({ actions, navigation }: { actions?: ReactNode; navigation?: ReactNode }) {
  return <header className="site-header">
    <div className="brand"><span className="mark" aria-hidden="true">D</span><span>DayTrail</span></div>
    {navigation}
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

function GuestView({ initialForgot = false, message, onAuthenticated }: { initialForgot?: boolean; message?: string; onAuthenticated: (user: DayTrailUser) => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [forgot, setForgot] = useState(initialForgot)
  const content = mode === 'login'
    ? {
        description: 'Một nơi để sắp xếp hôm nay và giữ lại những điều đáng nhớ.',
        eyebrow: 'Những ngày của bạn',
        image: loginHero,
        mobileDescription: 'Giữ lại những điều đáng nhớ.',
        mobileImage: loginHeroMobile,
        title: 'Mở lại những ngày của bạn.',
      }
    : {
        description: 'Ghi lại suy nghĩ, lưu những bức ảnh và kể câu chuyện của mình.',
        eyebrow: 'Một khởi đầu nho nhỏ',
        image: registerHero,
        mobileDescription: 'Câu chuyện của bạn bắt đầu từ hôm nay.',
        mobileImage: registerHeroMobile,
        title: 'Trang đầu tiên của riêng bạn.',
      }

  return <main className="app auth-layout">
    <BrandHeader />
    <div className="auth-page">
      <section className="auth-intro" aria-labelledby="welcome-title">
        <div className="auth-intro-copy">
          <p className="eyebrow">{content.eyebrow}</p>
          <h2 id="welcome-title">{content.title}</h2>
          <p className="auth-description auth-description-desktop">{content.description}</p>
          <p className="auth-description auth-description-mobile">{content.mobileDescription}</p>
        </div>
        <picture className="auth-illustration" aria-hidden="true" key={mode}>
          <source media="(max-width: 900px)" srcSet={content.mobileImage} />
          <img src={content.image} alt="" width="1440" height="960" decoding="async" fetchPriority="high" />
        </picture>
      </section>
      {forgot
        ? <ForgotPasswordPanel onBack={() => setForgot(false)} />
        : <AuthPanel onAuthenticated={onAuthenticated} onForgotPassword={() => setForgot(true)} onModeChange={setMode} sessionMessage={message} />}
    </div>
    <Footer />
  </main>
}

function AccountLinkView({ link, onBack, onRequestNewReset, onResetComplete }: {
  link: AccountLink
  onBack: () => void
  onRequestNewReset: () => void
  onResetComplete: (message: string) => void
}) {
  return <main className="app auth-layout">
    <BrandHeader />
    <div className="auth-page account-link-page">
      <section className="auth-intro" aria-labelledby="account-link-intro-title">
        <div className="auth-intro-copy">
          <p className="eyebrow">Tài khoản riêng tư</p>
          <h2 id="account-link-intro-title">Trở lại hành trình của bạn.</h2>
          <p className="auth-description">Liên kết bảo mật chỉ được gửi qua email và chỉ dùng được một lần.</p>
        </div>
        <picture className="auth-illustration" aria-hidden="true">
          <source media="(max-width: 900px)" srcSet={loginHeroMobile} />
          <img src={loginHero} alt="" width="1440" height="960" decoding="async" />
        </picture>
      </section>
      <AccountLinkPanel link={link} onBack={onBack} onRequestNewReset={onRequestNewReset} onResetComplete={onResetComplete} />
    </div>
    <Footer />
  </main>
}

function AuthenticatedView({ user, onCredentialsChanged, onLogout, onSessionExpired, onUserChanged, logoutError, loggingOut }: {
  user: DayTrailUser
  onCredentialsChanged: (message: string) => void
  onLogout: () => void
  onSessionExpired: () => void
  onUserChanged: (user: DayTrailUser) => void
  logoutError?: string
  loggingOut: boolean
}) {
  const [section, setSection] = useState<Section>(() => initialSection())
  const [profile, setProfile] = useState<Profile>()
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

  useEffect(() => {
    const controller = new AbortController()
    void profileApi.get(controller.signal).then((result) => setProfile(result.profile)).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 401) onSessionExpired()
    })
    return () => controller.abort()
  }, [onSessionExpired])

  function selectSection(nextSection: Section) {
    if (nextSection === section) return
    requestNavigation(() => {
      if (nextSection === 'Lịch') setCalendarJournalTarget(undefined)
      setSection(nextSection)
      if (nextSection === 'Hồ sơ') window.history.replaceState(null, '', '#profile')
      else if (window.location.hash === '#profile') window.history.replaceState(null, '', '#')
    })
  }

  function openJournalFromJourney(date: string) {
    requestNavigation(() => {
      setCalendarJournalTarget({ date, key: Date.now() })
      setSection('Lịch')
    })
  }

  const handleProfileSaved = useCallback((nextProfile: Profile) => {
    setProfile(nextProfile)
    if (nextProfile.displayName !== user.displayName) {
      onUserChanged({ ...user, displayName: nextProfile.displayName, updatedAt: nextProfile.updatedAt })
    }
  }, [onUserChanged, user])

  const profileButton = <button className="header-avatar-button" type="button" onClick={() => selectSection('Hồ sơ')} aria-label="Mở Góc của mình" aria-current={section === 'Hồ sơ' ? 'page' : undefined}>
    {profile?.avatar ? <PrivateImage className="header-avatar" path={profile.avatar.thumbnailUrl} alt="Ảnh đại diện" onUnauthorized={onSessionExpired} showRetry={false} /> : <span className="header-avatar header-avatar-fallback" aria-hidden="true">{user.displayName.trim().charAt(0).toUpperCase()}</span>}
  </button>

  const navigation = <nav className="tabs" aria-label="Điều hướng chính">{sections.map((item) => <button key={item} type="button" className={section === item ? 'active' : ''} onClick={() => selectSection(item)} aria-current={section === item ? 'page' : undefined}>{item}</button>)}</nav>

  return <main className="app product-app">
    <BrandHeader navigation={navigation} actions={profileButton} />
    {section === 'Hôm nay' && <TodayPage onOpenCalendar={() => selectSection('Lịch')} onUnauthorized={onSessionExpired} registerNavigationGuard={registerNavigationGuard} />}
    {section === 'Lịch' && <CalendarPage key={calendarJournalTarget?.key ?? 'calendar'} initialJournalDate={calendarJournalTarget?.date} onUnauthorized={onSessionExpired} registerNavigationGuard={registerNavigationGuard} requestNavigation={requestNavigation} />}
    {section === 'Hành trình' && <JourneyPage onEditJournal={openJournalFromJourney} onUnauthorized={onSessionExpired} registerNavigationGuard={registerNavigationGuard} />}
    {section === 'Hồ sơ' && <ProfilePage user={user} loggingOut={loggingOut} logoutError={logoutError} onCredentialsChanged={onCredentialsChanged} onLogout={() => requestNavigation(onLogout)} onProfileSaved={handleProfileSaved} onUnauthorized={onSessionExpired} registerNavigationGuard={registerNavigationGuard} />}
    <Footer />
  </main>
}

function Footer() {
  return <footer>DayTrail · Dữ liệu cá nhân, riêng tư theo từng tài khoản</footer>
}

export function App() {
  const [accountLink, setAccountLink] = useState<AccountLink | undefined>(() => initialAccountLink())
  const [openRecovery, setOpenRecovery] = useState(false)
  const [session, setSession] = useState<SessionState>({ status: 'checking' })
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string>()
  const requestIdRef = useRef(0)
  const controllerRef = useRef<AbortController | undefined>(undefined)

  useEffect(() => {
    if (!accountLink) return
    window.history.replaceState(null, '', '#account-action')
  }, [accountLink])

  useEffect(() => {
    const readLink = () => {
      const nextLink = initialAccountLink()
      if (nextLink) setAccountLink(nextLink)
    }
    window.addEventListener('hashchange', readLink)
    return () => window.removeEventListener('hashchange', readLink)
  }, [])

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
    setOpenRecovery(false)
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

  const handleUserChanged = useCallback((user: DayTrailUser) => {
    setSession({ status: 'authenticated', user })
  }, [])

  const handleCredentialsChanged = useCallback((message: string) => {
    requestIdRef.current += 1
    controllerRef.current?.abort()
    setLogoutError(undefined)
    setSession({ status: 'guest', message })
  }, [])

  function leaveAccountLink() {
    setAccountLink(undefined)
    setOpenRecovery(false)
    window.history.replaceState(null, '', '#')
    restoreSession()
  }

  function requestNewResetLink() {
    setAccountLink(undefined)
    setOpenRecovery(true)
    window.history.replaceState(null, '', '#')
    setSession({ status: 'guest' })
  }

  function finishPasswordReset(message: string) {
    requestIdRef.current += 1
    controllerRef.current?.abort()
    setAccountLink(undefined)
    setOpenRecovery(false)
    window.history.replaceState(null, '', '#')
    setSession({ status: 'guest', message })
  }

  if (accountLink) return <AccountLinkView link={accountLink} onBack={leaveAccountLink} onRequestNewReset={requestNewResetLink} onResetComplete={finishPasswordReset} />

  if (session.status === 'checking') return <SessionChecking />
  if (session.status === 'error') return <SessionError message={session.message} onRetry={restoreSession} />
  if (session.status === 'guest') return <GuestView initialForgot={openRecovery} message={session.message} onAuthenticated={handleAuthenticated} />
  return <AuthenticatedView user={session.user} onCredentialsChanged={handleCredentialsChanged} onLogout={handleLogout} onSessionExpired={handleSessionExpired} onUserChanged={handleUserChanged} logoutError={logoutError} loggingOut={loggingOut} />
}
