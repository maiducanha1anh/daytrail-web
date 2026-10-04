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

## Công việc theo ngày — chặng 2A

Mọi endpoint dưới `/api/tasks` yêu cầu cookie phiên hợp lệ. Thiếu hoặc hết phiên trả HTTP 401. ID sai định dạng trả HTTP 400; công việc không tồn tại hoặc thuộc user khác trả HTTP 404.

Các thao tác `POST`, `PATCH`, `DELETE` yêu cầu `Content-Type: application/json` và tuân theo kiểm tra Origin như API auth. `userId` luôn lấy từ session, không nhận từ body.

### Quy tắc dữ liệu

- `date`: ngày lịch địa phương đúng định dạng `YYYY-MM-DD`; phải là ngày thực sự tồn tại và không bị đổi sang UTC.
- `startTime`, `endTime`: định dạng `HH:mm`; cùng một ngày và `endTime` phải sau `startTime`.
- `name`: bắt buộc, sau khi trim dài 1–120 ký tự.
- `priority`: `low`, `normal` hoặc `high`; mặc định `normal`.
- `group`: chuỗi tùy chọn tối đa 80 ký tự.
- `description`: chuỗi tùy chọn tối đa 2.000 ký tự.
- `note`: chuỗi tùy chọn tối đa 5.000 ký tự, tách biệt với mô tả kế hoạch.
- `repeat`: chặng này chỉ nhận `none`; giá trị khác trả HTTP 400.
- `completed`: mặc định `false`. `completedAt` là timestamp UTC khi hoàn thành và là `null` khi chưa hoàn thành.
- Trường tùy chọn `group`, `description`, `note` nhận chuỗi hoặc `null`; chuỗi rỗng sau khi trim được lưu thành `null`.
- Client không được gửi hoặc sửa `userId`, `completedAt`, `createdAt`, `updatedAt`. Ngày và trạng thái có endpoint riêng.

Task trả về có dạng:

```json
{
  "id": "<object-id>",
  "date": "2026-10-04",
  "name": "Lập kế hoạch ngày",
  "startTime": "09:00",
  "endTime": "10:00",
  "priority": "normal",
  "group": "Cá nhân",
  "description": "Mô tả kế hoạch",
  "note": null,
  "repeat": "none",
  "completed": false,
  "completedAt": null,
  "createdAt": "<timestamp-UTC>",
  "updatedAt": "<timestamp-UTC>"
}
```

Response không chứa `userId`.

### `POST /api/tasks`

```json
{
  "date": "2026-10-04",
  "name": "Lập kế hoạch ngày",
  "startTime": "09:00",
  "endTime": "10:00",
  "priority": "normal",
  "group": "Cá nhân",
  "description": "Mô tả kế hoạch",
  "note": null,
  "repeat": "none"
}
```

- HTTP 201: `{ "task": { ... } }`.
- HTTP 400: body, ngày, giờ, enum hoặc giới hạn văn bản không hợp lệ; có trường không được hỗ trợ.

### `GET /api/tasks`

Chọn đúng một kiểu truy vấn:

- Một ngày: `?date=2026-10-04&page=1&limit=50`
- Khoảng ngày: `?from=2026-10-01&to=2026-10-31&page=1&limit=50`

Khoảng ngày tối đa 366 ngày. `page` mặc định 1; `limit` mặc định 50 và tối đa 100. Danh sách sắp theo `startTime`, sau đó `_id` để ổn định.

```json
{
  "tasks": [],
  "pagination": { "page": 1, "limit": 50, "total": 0, "pages": 0 }
}
```

### `GET /api/tasks/:id`

HTTP 200: `{ "task": { ... } }`.

### `PATCH /api/tasks/:id`

Sửa một hoặc nhiều trường: `name`, `startTime`, `endTime`, `priority`, `group`, `description`, `note`. Body rỗng hoặc trường ngoài danh sách trả HTTP 400. Nếu sửa một đầu thời gian, cặp giờ sau cập nhật vẫn phải hợp lệ.

HTTP 200: `{ "task": { ... } }`.

### `PATCH /api/tasks/:id/date`

```json
{ "date": "2026-10-05" }
```

Chuyển ngày nhưng giữ nguyên note, mô tả và trạng thái hoàn thành. HTTP 200: `{ "task": { ... } }`.

### `PATCH /api/tasks/:id/completion`

```json
{ "completed": true }
```

Phải gửi boolean rõ ràng, không dùng toggle. Chuyển sang `true` đặt `completedAt`; chuyển sang `false` đặt `completedAt=null`. Gửi lại cùng giá trị không thay đổi `completedAt`. HTTP 200: `{ "task": { ... } }`.

### `DELETE /api/tasks/:id`

Gửi JSON `{}` cùng Origin hợp lệ. Thành công trả HTTP 204 và không có body.

### `GET /api/tasks/summary?date=2026-10-04`

```json
{
  "date": "2026-10-04",
  "total": 0,
  "completed": 0,
  "incomplete": 0,
  "completionPercentage": 0
}
```

Phần trăm là số nguyên làm tròn gần nhất. Ngày không có công việc trả toàn bộ số đếm và phần trăm bằng 0.

Frontend chặng 2B đã dùng các endpoint này cho Hôm nay và lịch tháng chọn ngày. Lịch lặp và ảnh vẫn chưa được triển khai; `repeat` chỉ là `none`.

## Database tạm thời không sẵn sàng

Endpoint cần MongoDB trả HTTP 503 khi kết nối database bị gián đoạn:

```json
{
  "code": "DATABASE_UNAVAILABLE",
  "error": "Dữ liệu tạm thời không sẵn sàng. Vui lòng thử lại sau."
}
```

Response có `Retry-After: 5`, không chứa URI hoặc chi tiết Atlas. Với `/api/auth/me`, HTTP 503 không có nghĩa phiên hết hạn: client phải giữ trạng thái chưa xác định và cho thử lại, không chuyển sang đăng nhập như khi nhận HTTP 401.

`GET /api/health` chỉ xác nhận Express đang chạy. `GET /api/ready` mới xác nhận MongoDB ping thành công.
