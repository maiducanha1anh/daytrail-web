# Hợp đồng DayTrail API

Base URL local mặc định: `http://localhost:4000`.

## Quy ước chung

- Frontend gửi cookie bằng `credentials: "include"`.
- CORS (quy tắc cho phép frontend khác origin gọi API) chỉ cho phép đúng `FRONTEND_ORIGIN` và bật `Access-Control-Allow-Credentials`; không dùng wildcard.
- Mỗi `POST /api/auth/*` bắt buộc có `Content-Type: application/json`.
- CSRF là kiểu tấn công lợi dụng cookie của người dùng để gửi request ngoài ý muốn. Backend giảm rủi ro bằng cách yêu cầu header `Origin` khớp chính xác `FRONTEND_ORIGIN`. Origin sai trả HTTP 403.
- Client CLI hoặc test không có `Origin` được phép nếu gửi JSON. Request có `Sec-Fetch-Site: cross-site` nhưng không có `Origin` vẫn bị từ chối.
- Response lỗi có dạng `{ "error": "..." }` và không chứa mật khẩu, `passwordHash`, session token hoặc cookie.

## Trạng thái dịch vụ

### `GET /api/health`

HTTP 200 khi tiến trình API hoạt động. Endpoint không phụ thuộc MongoDB.

```json
{ "status": "ok", "service": "daytrail-api" }
```

### `GET /api/ready`

Backend ping MongoDB với timeout hữu hạn.

- HTTP 200: `{ "status": "ready" }`
- HTTP 503: `{ "status": "not_ready" }`

Response không chứa URI, hostname, username, mật khẩu hoặc thông tin nội bộ của Atlas.

## Quy tắc dữ liệu tài khoản

- Email được `trim` và chuyển thành chữ thường.
- Tên hiển thị được `trim`, dài từ 1 đến 80 ký tự.
- Mật khẩu không được `trim` hoặc cắt ngầm: tối thiểu 12 ký tự, tối đa 72 byte UTF-8. Vi phạm trả HTTP 400.
- User công khai gồm `id`, `displayName`, `email`, `createdAt`, `updatedAt`.
- Register và login có rate limit (giới hạn số request). Vượt giới hạn trả HTTP 429.

## `POST /api/auth/register`

Tạo tài khoản và không tự đăng nhập.

```json
{
  "displayName": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "<mat-khau-hop-le>"
}
```

- HTTP 201: `{ "user": { ... } }`; không có `Set-Cookie`.
- HTTP 400: dữ liệu không hợp lệ.
- HTTP 409: email đã được sử dụng, kể cả khi hai request đồng thời.
- HTTP 403/415/429: Origin sai, body không phải JSON hoặc vượt giới hạn request.

## `POST /api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "<mat-khau>"
}
```

- HTTP 200: `{ "user": { ... } }` và đặt cookie phiên.
- Email không tồn tại và mật khẩu sai cùng trả HTTP 401 với thông báo `Email hoặc mật khẩu không đúng.`
- HTTP 403/415/429 có ý nghĩa như endpoint register.

Cookie phiên có tên `daytrail_session`, dùng `HttpOnly`, `SameSite=Lax`, `Path=/` và mặc định hết hạn sau 7 ngày. Cookie có `Secure` khi `NODE_ENV=production`; development qua localhost HTTP không đặt `Secure`. Token thật chỉ nằm trong cookie; MongoDB chỉ lưu SHA-256 của token, `userId` và `expiresAt`.

## `GET /api/auth/me`

- HTTP 200: `{ "user": { ... } }` khi cookie trỏ đến session còn hạn.
- HTTP 401: thiếu/sai cookie, session hết hạn hoặc bị thu hồi, hay user không còn tồn tại.
- API kiểm tra `expiresAt` ở mỗi request; TTL index chỉ hỗ trợ dọn document hết hạn.

## `POST /api/auth/logout`

Gửi JSON, có thể là `{}`. API xóa session hiện tại nếu có, xóa cookie và trả HTTP 204. Gọi lại với cookie cũ vẫn trả HTTP 204; cookie/token cũ không thể dùng lại cho `/api/auth/me`.

Hướng dẫn chạy thử bằng PowerShell nằm trong `C:\daytrail-api\README.md`.
