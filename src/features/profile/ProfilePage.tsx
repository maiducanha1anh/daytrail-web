import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../api'
import type { GuardRegistrar } from '../../navigation'
import { PrivateImage } from '../media/PrivateImage'
import { DialogFrame } from '../tasks/DialogFrame'
import { profileApi } from './api'
import type { Profile, ProfileDraft, ProfileImage } from './types'

const limits = { displayName: 80, tagline: 160, about: 3_000, aspiration: 2_000, caption: 200 }

function toDraft(profile: Profile): ProfileDraft {
  return { about: profile.about, aspiration: profile.aspiration, avatar: profile.avatar, decorations: profile.decorations, displayName: profile.displayName, tagline: profile.tagline, version: profile.version }
}

function comparable(value: ProfileDraft) {
  return JSON.stringify({
    about: value.about,
    aspiration: value.aspiration,
    avatar: value.avatar?.id ?? null,
    captions: [...(value.avatar ? [value.avatar] : []), ...value.decorations].map((image) => [image.id, image.caption]),
    decorations: value.decorations.map((image) => image.id),
    displayName: value.displayName,
    tagline: value.tagline,
  })
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 503) return 'Dữ liệu hoặc kho ảnh đang gián đoạn. Bản nháp vẫn được giữ để bạn thử lại.'
  if (error instanceof ApiError && error.kind === 'network') return 'Không thể kết nối máy chủ. Bản nháp vẫn được giữ để bạn thử lại.'
  return error instanceof Error ? error.message : 'Không thể hoàn tất thao tác.'
}

export function ProfilePage({ loggingOut, logoutError, onLogout, onProfileSaved, onUnauthorized, registerNavigationGuard }: {
  loggingOut: boolean
  logoutError?: string
  onLogout: () => void
  onProfileSaved: (profile: Profile) => void
  onUnauthorized: () => void
  registerNavigationGuard: GuardRegistrar
}) {
  const [profile, setProfile] = useState<Profile>()
  const [draft, setDraft] = useState<ProfileDraft>()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [latest, setLatest] = useState<Profile>()
  const [pendingNavigation, setPendingNavigation] = useState<(() => void)>()
  const temporaryIdsRef = useRef(new Set<string>())
  const controllersRef = useRef(new Set<AbortController>())

  const dirty = Boolean(editing && profile && draft && comparable(toDraft(profile)) !== comparable(draft))
  const blocked = dirty || uploading > 0

  const load = useCallback(async () => {
    const controller = new AbortController()
    controllersRef.current.add(controller)
    setLoading(true)
    setError(undefined)
    try {
      const result = await profileApi.get(controller.signal)
      if (controller.signal.aborted) return
      setProfile(result.profile)
      setDraft(toDraft(result.profile))
      onProfileSaved(result.profile)
    } catch (caught: unknown) {
      if (controller.signal.aborted) return
      if (caught instanceof ApiError && caught.status === 401) return onUnauthorized()
      setError(errorMessage(caught))
    } finally {
      controllersRef.current.delete(controller)
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [onProfileSaved, onUnauthorized])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    const controllers = controllersRef.current
    return () => {
      window.clearTimeout(timer)
      controllers.forEach((controller) => controller.abort())
    }
  }, [load])

  const requestLeave = useCallback((next: () => void) => {
    if (blocked) setPendingNavigation(() => next)
    else next()
  }, [blocked])

  useEffect(() => registerNavigationGuard(requestLeave), [registerNavigationGuard, requestLeave])
  useEffect(() => {
    if (!blocked) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [blocked])

  async function discardTemporary(ids = [...temporaryIdsRef.current]) {
    if (ids.length === 0) return
    try {
      await profileApi.discard(ids)
      ids.forEach((id) => temporaryIdsRef.current.delete(id))
    } catch (caught: unknown) {
      if (caught instanceof ApiError && caught.status === 401) onUnauthorized()
      setError(`${errorMessage(caught)} Ảnh nháp sẽ được máy chủ dọn tự động nếu chưa thể dọn ngay.`)
    }
  }

  async function upload(file: File | undefined, role: 'avatar' | 'decoration') {
    if (!file || !draft || uploading > 0) return
    if (role === 'decoration' && draft.decorations.length >= 4) return setError('Hồ sơ chỉ nhận tối đa 4 ảnh trang trí.')
    const controller = new AbortController()
    controllersRef.current.add(controller)
    setUploading((value) => value + 1)
    setError(undefined)
    try {
      const result = await profileApi.upload(file, role, '', crypto.randomUUID(), controller.signal)
      if (controller.signal.aborted) return
      temporaryIdsRef.current.add(result.image.id)
      setDraft((current) => current ? role === 'avatar' ? { ...current, avatar: result.image } : { ...current, decorations: [...current.decorations, result.image] } : current)
    } catch (caught: unknown) {
      if (controller.signal.aborted) return
      if (caught instanceof ApiError && caught.status === 401) return onUnauthorized()
      setError(errorMessage(caught))
    } finally {
      controllersRef.current.delete(controller)
      if (!controller.signal.aborted) setUploading((value) => Math.max(0, value - 1))
    }
  }

  function changeCaption(imageId: string, caption: string) {
    setDraft((current) => current ? {
      ...current,
      avatar: current.avatar?.id === imageId ? { ...current.avatar, caption } : current.avatar,
      decorations: current.decorations.map((image) => image.id === imageId ? { ...image, caption } : image),
    } : current)
  }

  async function save() {
    if (!draft || saving || uploading > 0) return false
    if (!draft.displayName.trim()) {
      setError('Tên hiển thị không được để trống.')
      return false
    }
    const controller = new AbortController()
    controllersRef.current.add(controller)
    setSaving(true)
    setError(undefined)
    setLatest(undefined)
    try {
      const result = await profileApi.update({ ...draft, displayName: draft.displayName.trim() }, controller.signal)
      if (controller.signal.aborted) return false
      const selectedIds = new Set([...(result.profile.avatar ? [result.profile.avatar.id] : []), ...result.profile.decorations.map((image) => image.id)])
      const abandoned = [...temporaryIdsRef.current].filter((id) => !selectedIds.has(id))
      temporaryIdsRef.current.clear()
      if (abandoned.length > 0) await discardTemporary(abandoned)
      setProfile(result.profile)
      setDraft(toDraft(result.profile))
      setEditing(false)
      setNotice('Đã lưu hồ sơ.')
      onProfileSaved(result.profile)
      return true
    } catch (caught: unknown) {
      if (controller.signal.aborted) return false
      if (caught instanceof ApiError && caught.status === 401) {
        onUnauthorized()
        return false
      }
      setError(caught instanceof ApiError && caught.status === 409 ? 'Hồ sơ đã thay đổi ở tab khác. Bản nháp của bạn vẫn được giữ.' : errorMessage(caught))
      return false
    } finally {
      controllersRef.current.delete(controller)
      if (!controller.signal.aborted) setSaving(false)
    }
  }

  async function readLatest() {
    try {
      const result = await profileApi.get()
      setLatest(result.profile)
      setNotice('Đã đọc bản mới nhất. Bản nháp hiện tại chưa bị thay thế.')
    } catch (caught: unknown) {
      setError(errorMessage(caught))
    }
  }

  async function cancelEditing() {
    await discardTemporary()
    if (profile) setDraft(toDraft(profile))
    setLatest(undefined)
    setEditing(false)
    setError(undefined)
  }

  async function saveAndContinue() {
    if (await save()) {
      const next = pendingNavigation
      setPendingNavigation(undefined)
      next?.()
    }
  }

  async function discardAndContinue() {
    await cancelEditing()
    const next = pendingNavigation
    setPendingNavigation(undefined)
    next?.()
  }

  const initials = useMemo(() => (profile?.displayName ?? 'D').trim().split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase()).join(''), [profile?.displayName])

  if (loading) return <section className="profile-page loading-panel" aria-busy="true"><span className="spinner" /><p>Đang mở Góc của mình…</p></section>
  if (!profile || !draft) return <section className="profile-page content-card load-error" role="alert"><p>{error ?? 'Chưa thể tải hồ sơ.'}</p><button className="secondary-button" type="button" onClick={() => void load()}>Thử lại</button></section>

  const shown = editing ? draft : toDraft(profile)
  return <section className="profile-page" aria-labelledby="profile-title">
    <header className="profile-title-row"><div><p className="eyebrow">Không gian riêng tư</p><h1 id="profile-title">Góc của mình</h1></div>{!editing && <button className="primary-button compact" type="button" onClick={() => { setEditing(true); setNotice(undefined) }}>✎ Chỉnh sửa hồ sơ</button>}</header>
    {notice && <div className="form-message success" role="status">{notice}</div>}
    {error && <div className="form-message error" role="alert">{error}{error.includes('tab khác') && <button className="text-button" type="button" onClick={() => void readLatest()}>Đọc bản mới nhất</button>}</div>}
    {latest && <div className="profile-conflict"><strong>Bản mới nhất: {latest.displayName}</strong><p>{latest.tagline || 'Chưa có câu giới thiệu.'}</p><div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => { setProfile(latest); setDraft(toDraft(latest)); setLatest(undefined) }}>Dùng bản mới nhất</button><button className="primary-button compact" type="button" onClick={() => { setDraft((current) => current ? { ...current, version: latest.version } : current); setLatest(undefined); setNotice('Đã cập nhật version; hãy kiểm tra và chủ động lưu lại bản nháp.') }}>Giữ bản nháp để ghép</button></div></div>}

    <div className="profile-scrapbook">
      <div className="profile-photo-column profile-photo-left">{shown.decorations.slice(0, 2).map((image, index) => <ProfilePhoto key={image.id} image={image} index={index} editing={editing} onCaption={changeCaption} onRemove={() => setDraft((current) => current ? { ...current, decorations: current.decorations.filter((item) => item.id !== image.id) } : current)} onUnauthorized={onUnauthorized} />)}</div>
      <article className="profile-paper">
        <div className="profile-avatar-wrap">
          {shown.avatar ? <PrivateImage className="profile-avatar" path={shown.avatar.thumbnailUrl} alt={`Ảnh đại diện của ${shown.displayName}`} onUnauthorized={onUnauthorized} /> : <span className="profile-avatar profile-avatar-fallback" aria-hidden="true">{initials}</span>}
          {editing && <label className="profile-upload-chip">Đổi avatar<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading > 0} onChange={(event) => { void upload(event.target.files?.[0], 'avatar'); event.currentTarget.value = '' }} /></label>}
        </div>
        {editing ? <div className="profile-form">
          <ProfileTextField label="Tên hiển thị" maximum={limits.displayName} value={draft.displayName} onChange={(value) => setDraft({ ...draft, displayName: value })} />
          <ProfileTextField handwriting label="Câu giới thiệu ngắn" maximum={limits.tagline} value={draft.tagline} onChange={(value) => setDraft({ ...draft, tagline: value })} />
          <ProfileTextField area handwriting label="Một chút về mình" maximum={limits.about} value={draft.about} onChange={(value) => setDraft({ ...draft, about: value })} />
          <span className="profile-divider" aria-hidden="true">♥</span>
          <ProfileTextField area handwriting label="Điều mình đang hướng tới" maximum={limits.aspiration} value={draft.aspiration} onChange={(value) => setDraft({ ...draft, aspiration: value })} />
          <div className="profile-edit-actions"><button className="secondary-button" type="button" disabled={saving || uploading > 0} onClick={() => void cancelEditing()}>Hủy</button><button className="primary-button compact" type="button" disabled={saving || uploading > 0 || !dirty} onClick={() => void save()}>{saving ? 'Đang lưu…' : 'Lưu hồ sơ'}</button></div>
        </div> : <>
          <h2>{shown.displayName}</h2><p className="profile-tagline">{shown.tagline || 'Một góc nhỏ để lưu điều thuộc về bạn.'}</p>
          <div className="profile-copy"><h3>Một chút về mình</h3><p>{shown.about || 'Bạn chưa viết lời giới thiệu.'}</p><span className="profile-divider" aria-hidden="true">♥</span><h3>Điều mình đang hướng tới</h3><p>{shown.aspiration || 'Bạn chưa ghi điều mình đang hướng tới.'}</p></div>
        </>}
      </article>
      <div className="profile-photo-column profile-photo-right">{shown.decorations.slice(2, 4).map((image, index) => <ProfilePhoto key={image.id} image={image} index={index + 2} editing={editing} onCaption={changeCaption} onRemove={() => setDraft((current) => current ? { ...current, decorations: current.decorations.filter((item) => item.id !== image.id) } : current)} onUnauthorized={onUnauthorized} />)}</div>
    </div>

    {editing && draft.decorations.length < 4 && <label className="profile-add-photo">＋ Thêm ảnh trang trí ({draft.decorations.length}/4)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading > 0} onChange={(event) => { void upload(event.target.files?.[0], 'decoration'); event.currentTarget.value = '' }} /></label>}
    {uploading > 0 && <p className="profile-upload-status" role="status">Đang xử lý ảnh riêng tư…</p>}
    {!editing && <div className="profile-logout"><button className="logout-button" type="button" onClick={onLogout} disabled={loggingOut}>{loggingOut ? 'Đang đăng xuất…' : '↪ Đăng xuất'}</button>{logoutError && <p className="form-message error" role="alert">{logoutError}</p>}</div>}

    {pendingNavigation && <DialogFrame labelledBy="profile-unsaved-title" onClose={() => setPendingNavigation(undefined)}><h2 id="profile-unsaved-title">Hồ sơ còn thay đổi chưa lưu</h2><p>Hãy chọn cách xử lý trước khi rời Góc của mình.</p>{uploading > 0 && <p role="status">Đang tải {uploading} ảnh; vui lòng chờ hoàn tất.</p>}<div className="dialog-actions stacked-mobile"><button className="primary-button" type="button" disabled={saving || uploading > 0} onClick={() => void saveAndContinue()}>{saving ? 'Đang lưu…' : 'Lưu và tiếp tục'}</button><button className="secondary-button" type="button" disabled={saving || uploading > 0} onClick={() => void discardAndContinue()}>Bỏ thay đổi</button><button className="text-button" type="button" disabled={saving} onClick={() => setPendingNavigation(undefined)}>Tiếp tục chỉnh</button></div></DialogFrame>}
  </section>
}

function ProfileTextField({ area = false, handwriting = false, label, maximum, onChange, value }: { area?: boolean; handwriting?: boolean; label: string; maximum: number; onChange: (value: string) => void; value: string }) {
  return <label className={`field${handwriting ? ' handwriting-field' : ''}`}><span>{label}</span>{area ? <textarea rows={5} maxLength={maximum} value={value} onChange={(event) => onChange(event.target.value)} /> : <input maxLength={maximum} value={value} onChange={(event) => onChange(event.target.value)} />}<small>{value.length}/{maximum}</small></label>
}

function ProfilePhoto({ editing, image, index, onCaption, onRemove, onUnauthorized }: { editing: boolean; image: ProfileImage; index: number; onCaption: (id: string, caption: string) => void; onRemove: () => void; onUnauthorized: () => void }) {
  return <figure className={`profile-polaroid profile-polaroid-${index + 1}`}><span className="profile-tape" aria-hidden="true" /><PrivateImage path={image.thumbnailUrl} alt={image.caption || `Ảnh trang trí ${index + 1}`} onUnauthorized={onUnauthorized} />{editing ? <><textarea aria-label={`Chú thích ảnh ${index + 1}`} rows={2} maxLength={limits.caption} value={image.caption} onChange={(event) => onCaption(image.id, event.target.value)} /><button className="danger-link" type="button" onClick={onRemove}>Bỏ ảnh</button></> : image.caption && <figcaption>{image.caption}</figcaption>}</figure>
}
