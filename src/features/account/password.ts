export function passwordError(password: string) {
  if (Array.from(password).length < 12) return 'Mật khẩu phải có ít nhất 12 ký tự.'
  if (new TextEncoder().encode(password).length > 72) return 'Mật khẩu không được vượt quá 72 byte UTF-8.'
  return undefined
}
