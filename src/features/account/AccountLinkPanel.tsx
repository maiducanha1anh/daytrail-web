import { type FormEvent, useEffect, useRef, useState } from 'react'
import { PasswordField } from '../../AuthPanel'
import { ApiError, dayTrailApi } from '../../api'
import { passwordError } from './password'

export type AccountLink = { kind: 'reset' | 'verify'; token?: string }

function actionError(error: unknown, kind: AccountLink['kind']) {
  if (error instanceof ApiError && error.kind === 'network') return 'Không thể kết nối máy chủ. Thay đổi chưa được xác nhận.'
  if (error instanceof ApiError && error.status === 429) return 'Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.'
  if (error instanceof ApiError && error.status === 503) return 'Dịch vụ đang gián đoạn. Vui lòng thử lại sau.'
  if (error instanceof ApiError && error.code === 'TOKEN_INVALID_OR_EXPIRED') {
    return kind === 'reset' ? 'Liên kết đặt lại mật khẩu không hợp lệ, đã dùng hoặc đã hết hạn.' : 'Liên kết xác minh không hợp lệ, đã dùng hoặc đã hết hạn.'
  }
  return error instanceof Error ? error.message : 'Không thể hoàn tất yêu cầu.'
}

export function AccountLinkPanel({ link, onBack, onRequestNewReset, onResetComplete }: {
  link: AccountLink
  onBack: () => void
  onRequestNewReset: () => void
  onResetComplete: (message: string) => void
}) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const controllerRef = useRef<AbortController | undefined>(undefined)

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!link.token || submitting) return
    if (link.kind === 'reset') {
      const rule = passwordError(password)
      if (rule) return setError(rule)
      if (password !== confirmation) return setError('Mật khẩu xác nhận không khớp.')
    }
    const controller = new AbortController()
    controllerRef.current = controller
    setSubmitting(true)
    setError(undefined)
    setNotice(undefined)
    try {
      if (link.kind === 'verify') {
        const result = await dayTrailApi.verifyEmail(link.token, controller.signal)
        if (!controller.signal.aborted) setNotice(result.message + ' Liên kết này không thay đổi tài khoản đang đăng nhập trên thiết bị.')
      } else {
        const result = await dayTrailApi.resetPassword(link.token, password, controller.signal)
        if (!controller.signal.aborted) {
          setPassword('')
          setConfirmation('')
          onResetComplete(result.message)
        }
      }
    } catch (caught: unknown) {
      if (!(caught instanceof Error && caught.name === 'AbortError')) setError(actionError(caught, link.kind))
    } finally {
      if (!controller.signal.aborted) setSubmitting(false)
    }
  }

  const title = link.kind === 'reset' ? 'Đặt lại mật khẩu' : 'Xác minh email'
  return <section className="auth-card account-access-card" aria-labelledby="account-link-title">
    <div className="auth-heading">
      <p className="eyebrow">Tài khoản DayTrail</p>
      <h1 id="account-link-title">{title}</h1>
      <p>{link.kind === 'reset' ? 'Chọn mật khẩu mới. Sau khi đặt lại, mọi phiên cũ sẽ bị thu hồi.' : 'Nhấn nút bên dưới để xác minh. Việc chỉ mở liên kết chưa tiêu thụ mã xác minh.'}</p>
    </div>
    {!link.token && <div className="form-message error" role="alert">Liên kết thiếu mã xác nhận hoặc không hợp lệ.</div>}
    {notice && <div className="form-message success" role="status">{notice}</div>}
    {error && <div className="form-message error" role="alert">{error}</div>}
    {!notice && <form onSubmit={submit}>
      {link.kind === 'reset' && <>
        <PasswordField id="reset-password" label="Mật khẩu mới" autoComplete="new-password" value={password} onChange={setPassword} />
        <p className="password-hint">Ít nhất 12 ký tự và không quá 72 byte UTF-8. Khoảng trắng đầu/cuối được giữ nguyên.</p>
        <PasswordField id="reset-password-confirmation" label="Xác nhận mật khẩu mới" autoComplete="new-password" value={confirmation} onChange={setConfirmation} />
      </>}
      <button className="primary-button" type="submit" disabled={!link.token || submitting}>{submitting ? 'Đang xác nhận…' : title}</button>
    </form>}
    <div className="account-access-actions">
      {link.kind === 'reset' && (error || !link.token) && <button className="secondary-button" type="button" onClick={onRequestNewReset}>Yêu cầu liên kết mới</button>}
      <button className="text-button" type="button" onClick={onBack}>Quay lại DayTrail</button>
    </div>
  </section>
}
