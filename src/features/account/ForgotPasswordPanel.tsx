import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ApiError, dayTrailApi } from '../../api'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function messageFor(error: unknown) {
  if (error instanceof ApiError && error.kind === 'network') return 'Không thể kết nối máy chủ. Email chưa được gửi; hãy thử lại.'
  if (error instanceof ApiError && error.status === 429) return 'Bạn vừa gửi yêu cầu. Vui lòng chờ một phút rồi thử lại.'
  if (error instanceof ApiError && error.status === 503) return 'Dịch vụ email hoặc database đang gián đoạn. Vui lòng thử lại sau.'
  return 'Chưa thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.'
}

export function ForgotPasswordPanel({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const controllerRef = useRef<AbortController | undefined>(undefined)

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const normalized = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalized) || normalized.length > 254) {
      setError('Email không hợp lệ.')
      return
    }
    const controller = new AbortController()
    controllerRef.current = controller
    setSubmitting(true)
    setError(undefined)
    setNotice(undefined)
    try {
      const result = await dayTrailApi.requestPasswordReset(normalized, controller.signal)
      if (!controller.signal.aborted) setNotice(result.message)
    } catch (caught: unknown) {
      if (!(caught instanceof Error && caught.name === 'AbortError')) setError(messageFor(caught))
    } finally {
      if (!controller.signal.aborted) setSubmitting(false)
    }
  }

  return <section className="auth-card account-access-card" aria-labelledby="forgot-title">
    <div className="auth-heading">
      <p className="eyebrow">Khôi phục tài khoản</p>
      <h1 id="forgot-title">Quên mật khẩu</h1>
      <p>Nhập email tài khoản. Nếu tài khoản tồn tại, DayTrail sẽ gửi liên kết dùng một lần, có hiệu lực 30 phút.</p>
    </div>
    {notice && <div className="form-message success" role="status">{notice}</div>}
    {error && <div className="form-message error" role="alert">{error}</div>}
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="recovery-email">Email</label>
        <input id="recovery-email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required />
      </div>
      <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}</button>
    </form>
    <p className="auth-alternate"><button type="button" onClick={onBack} disabled={submitting}>Quay lại đăng nhập</button></p>
  </section>
}
