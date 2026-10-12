import { type FormEvent, useEffect, useRef, useState } from 'react'
import { PasswordField } from '../../AuthPanel'
import { ApiError, dayTrailApi, type DayTrailUser } from '../../api'
import { passwordError } from './password'

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.kind === 'network') return 'Không thể kết nối máy chủ. Thay đổi chưa được lưu.'
  if (error instanceof ApiError && error.status === 429) return 'Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.'
  if (error instanceof ApiError && error.status === 503) return 'Database hoặc dịch vụ email đang gián đoạn. Vui lòng thử lại sau.'
  return error instanceof Error ? error.message : 'Không thể hoàn tất yêu cầu.'
}

export function AccountPanel({ blocked, onCredentialsChanged, user }: {
  blocked: boolean
  onCredentialsChanged: (message: string) => void
  user: DayTrailUser
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [changing, setChanging] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const controllerRef = useRef<AbortController | undefined>(undefined)

  useEffect(() => () => controllerRef.current?.abort(), [])
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1_000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  async function resend() {
    if (resending || cooldown > 0) return
    const controller = new AbortController()
    controllerRef.current = controller
    setResending(true)
    setError(undefined)
    setNotice(undefined)
    try {
      const result = await dayTrailApi.resendVerification(controller.signal)
      if (!controller.signal.aborted) {
        setNotice(result.message)
        if (result.verificationEmailSent) setCooldown(60)
      }
    } catch (caught: unknown) {
      if (!(caught instanceof Error && caught.name === 'AbortError')) setError(errorMessage(caught))
    } finally {
      if (!controller.signal.aborted) setResending(false)
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (changing || blocked) return
    if (!currentPassword) return setError('Vui lòng nhập mật khẩu hiện tại.')
    const rule = passwordError(newPassword)
    if (rule) return setError(rule)
    if (newPassword !== confirmation) return setError('Mật khẩu xác nhận không khớp.')
    const controller = new AbortController()
    controllerRef.current = controller
    setChanging(true)
    setError(undefined)
    setNotice(undefined)
    try {
      const result = await dayTrailApi.changePassword(currentPassword, newPassword, controller.signal)
      if (!controller.signal.aborted) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmation('')
        onCredentialsChanged(result.message)
      }
    } catch (caught: unknown) {
      if (!(caught instanceof Error && caught.name === 'AbortError')) setError(errorMessage(caught))
    } finally {
      if (!controller.signal.aborted) setChanging(false)
    }
  }

  return <section className="profile-account" aria-labelledby="account-settings-title">
    <div className="profile-account-heading">
      <div><p className="eyebrow">Bảo mật riêng tư</p><h2 id="account-settings-title">Tài khoản</h2></div>
      <span className={'verification-badge ' + (user.emailVerifiedAt ? 'verified' : '')}>{user.emailVerifiedAt ? 'Đã xác minh' : 'Chưa xác minh'}</span>
    </div>
    <p className="profile-account-email">{user.email}</p>
    {!user.emailVerifiedAt && <div className="verification-actions">
      <p>Xác minh email giúp bạn biết địa chỉ nhận liên kết khôi phục là chính xác. Tài khoản vẫn dùng được khi chưa xác minh.</p>
      <button className="secondary-button" type="button" disabled={resending || cooldown > 0} onClick={() => void resend()}>{resending ? 'Đang gửi…' : cooldown > 0 ? 'Gửi lại sau ' + cooldown + 's' : 'Gửi email xác minh'}</button>
    </div>}
    {notice && <div className="form-message success" role="status">{notice}</div>}
    {error && <div className="form-message error" role="alert">{error}</div>}
    <form className="password-change-form" onSubmit={changePassword}>
      <h3>Đổi mật khẩu</h3>
      <PasswordField id="current-password" label="Mật khẩu hiện tại" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} />
      <PasswordField id="new-password" label="Mật khẩu mới" autoComplete="new-password" value={newPassword} onChange={setNewPassword} />
      <p className="password-hint">Ít nhất 12 ký tự và không quá 72 byte UTF-8. Đổi thành công sẽ đăng xuất mọi thiết bị.</p>
      <PasswordField id="new-password-confirmation" label="Xác nhận mật khẩu mới" autoComplete="new-password" value={confirmation} onChange={setConfirmation} />
      {blocked && <p className="profile-account-warning">Hãy lưu hoặc bỏ thay đổi hồ sơ/ảnh trước khi đổi mật khẩu.</p>}
      <button className="primary-button compact" type="submit" disabled={changing || blocked}>{changing ? 'Đang đổi…' : 'Đổi mật khẩu'}</button>
    </form>
  </section>
}
