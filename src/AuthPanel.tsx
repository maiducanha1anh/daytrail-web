import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ApiError, dayTrailApi, type DayTrailUser } from './api'

type AuthMode = 'login' | 'register'
type FieldErrors = Partial<Record<'confirmPassword' | 'displayName' | 'email' | 'password', string>>

type AuthPanelProps = {
  onAuthenticated: (user: DayTrailUser) => void
  sessionMessage?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function passwordError(password: string) {
  if (Array.from(password).length < 12) return 'Mật khẩu phải có ít nhất 12 ký tự.'
  if (new TextEncoder().encode(password).length > 72) return 'Mật khẩu không được vượt quá 72 byte UTF-8.'
  return undefined
}

function requestError(error: unknown, mode: AuthMode) {
  if (!(error instanceof ApiError)) return 'Đã xảy ra lỗi không mong đợi. Vui lòng thử lại.'
  if (error.kind === 'network') return 'Không thể kết nối đến máy chủ. Hãy kiểm tra backend và thử lại.'
  if (error.status === 429) return 'Bạn đã thử quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.'
  if (error.status && error.status >= 500) return 'Máy chủ đang gặp lỗi. Vui lòng thử lại sau.'
  if (mode === 'login' && error.status === 401) return 'Email hoặc mật khẩu không đúng.'
  return error.message
}

function PasswordField({ autoComplete, error, id, label, onChange, value }: {
  autoComplete: 'current-password' | 'new-password'
  error?: string
  id: string
  label: string
  onChange: (value: string) => void
  value: string
}) {
  const [visible, setVisible] = useState(false)
  const errorId = `${id}-error`
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <div className="password-control">
      <input
        id={id}
        name={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        required
      />
      <button
        className="password-toggle"
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={`${visible ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`}
        aria-pressed={visible}
      >
        {visible ? 'Ẩn' : 'Hiện'}
      </button>
    </div>
    {error && <span className="field-error" id={errorId}>{error}</span>}
  </div>
}

export function AuthPanel({ onAuthenticated, sessionMessage }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const controllerRef = useRef<AbortController | undefined>(undefined)
  const submittingRef = useRef(false)

  useEffect(() => () => controllerRef.current?.abort(), [])

  function switchMode(nextMode: AuthMode) {
    if (submittingRef.current || nextMode === mode) return
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setFieldErrors({})
    setFormError(undefined)
    setNotice(undefined)
  }

  function validate() {
    const errors: FieldErrors = {}
    const normalizedEmail = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) errors.email = 'Email không hợp lệ.'
    if (!password) errors.password = 'Vui lòng nhập mật khẩu.'
    if (mode === 'register') {
      const normalizedName = displayName.trim()
      if (!normalizedName || normalizedName.length > 80) errors.displayName = 'Tên hiển thị phải có từ 1 đến 80 ký tự.'
      const ruleError = passwordError(password)
      if (ruleError) errors.password = ruleError
      if (confirmPassword !== password) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    }
    return errors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    const errors = validate()
    setFieldErrors(errors)
    setFormError(undefined)
    setNotice(undefined)
    if (Object.keys(errors).length) return

    submittingRef.current = true
    setSubmitting(true)
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      if (mode === 'register') {
        await dayTrailApi.register(displayName.trim(), email.trim().toLowerCase(), password, controller.signal)
        if (controller.signal.aborted) return
        setMode('login')
        setEmail(email.trim().toLowerCase())
        setDisplayName('')
        setPassword('')
        setConfirmPassword('')
        setFieldErrors({})
        setNotice('Đăng ký thành công. Hãy đăng nhập bằng tài khoản vừa tạo.')
        return
      }

      const response = await dayTrailApi.login(email.trim().toLowerCase(), password, controller.signal)
      if (controller.signal.aborted) return
      setPassword('')
      onAuthenticated(response.user)
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return
      if (mode === 'register' && error instanceof ApiError && error.status === 409) {
        setFieldErrors({ email: 'Email này đã được sử dụng.' })
      } else {
        setFormError(requestError(error, mode))
      }
    } finally {
      if (!controller.signal.aborted) {
        submittingRef.current = false
        setSubmitting(false)
      }
    }
  }

  return <section className="auth-card" aria-labelledby="auth-title">
    <div className="auth-switch" aria-label="Chọn hình thức xác thực">
      <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')} disabled={submitting}>Đăng nhập</button>
      <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')} disabled={submitting}>Đăng ký</button>
    </div>

    <div className="auth-heading">
      <p className="eyebrow">Tài khoản DayTrail</p>
      <h1 id="auth-title">{mode === 'login' ? 'Chào bạn trở lại' : 'Tạo không gian của bạn'}</h1>
      <p>{mode === 'login' ? 'Đăng nhập để tiếp tục hành trình mỗi ngày.' : 'Một tài khoản riêng cho công việc và những điều bạn muốn ghi nhớ.'}</p>
    </div>

    {(notice || sessionMessage) && <div className={`form-message ${notice ? 'success' : 'info'}`} role="status">{notice ?? sessionMessage}</div>}
    {formError && <div className="form-message error" role="alert">{formError}</div>}

    <form onSubmit={handleSubmit} noValidate>
      {mode === 'register' && <div className="field">
        <label htmlFor="displayName">Tên hiển thị</label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          aria-invalid={Boolean(fieldErrors.displayName)}
          aria-describedby={fieldErrors.displayName ? 'displayName-error' : undefined}
          maxLength={80}
          required
        />
        {fieldErrors.displayName && <span className="field-error" id="displayName-error">{fieldErrors.displayName}</span>}
      </div>}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          maxLength={254}
          required
        />
        {fieldErrors.email && <span className="field-error" id="email-error">{fieldErrors.email}</span>}
      </div>

      <PasswordField
        id="password"
        label="Mật khẩu"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        value={password}
        onChange={setPassword}
        error={fieldErrors.password}
      />

      {mode === 'register' && <>
        <p className="password-hint">Ít nhất 12 ký tự và không quá 72 byte UTF-8. Khoảng trắng đầu/cuối được giữ nguyên.</p>
        <PasswordField
          id="confirmPassword"
          label="Xác nhận mật khẩu"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={fieldErrors.confirmPassword}
        />
      </>}

      <button className="primary-button" type="submit" disabled={submitting} aria-busy={submitting}>
        {submitting ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
      </button>
    </form>

    <p className="auth-alternate">
      {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
      <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} disabled={submitting}>
        {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
      </button>
    </p>
  </section>
}
