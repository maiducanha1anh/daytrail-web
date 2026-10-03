# Tiến độ DayTrail

Tài liệu này ghi kết quả theo nguồn kiểm chứng. Yêu cầu API chi tiết nằm trong [API_CONTRACT.md](API_CONTRACT.md).

## Chặng 0 — Nền dự án

### Bằng chứng người dùng cung cấp

- Backend typecheck, lint và build: PASS.
- Frontend typecheck và build: PASS.
- Frontend lint từng có 1 warning `react-refresh/only-export-components` trước khi tách `App.tsx`.
- Ảnh kiểm tra xác nhận tab Lịch/Hành trình chuyển nội dung đúng.
- Ảnh mobile 393 × 852 từng cho thấy trang bị thu nhỏ vì thiếu viewport; favicon từng trả HTTP 404.

### Codex đã sửa và kiểm tra

- Tách `App.tsx`; `main.tsx` chỉ khởi tạo và render React.
- Thêm meta viewport không khóa zoom, favicon SVG và CSS responsive; loại file build có thể tái tạo khỏi source.
- Frontend `typecheck`, `lint`, `build`: PASS; lint có 0 error/warning.
- Chrome headless desktop 1440 × 900 và mobile 393 × 852: không tràn ngang, điều hướng hoạt động, favicon HTTP 200, hiển thị “Đã kết nối”, không có lỗi Console/Network liên quan ứng dụng.
- Backend health API và kết nối frontend/backend: PASS.

Kết luận: chặng 0 đã nghiệm thu.

## Chặng 1A — MongoDB Atlas

### Đã triển khai

- Dùng Mongoose 9.10.4; nạp và kiểm tra biến môi trường trước khi kết nối.
- Bắt buộc database `daytrail`; connect và ping thành công trước khi API mở cổng.
- Thêm `GET /api/ready`, timeout connect/ping, graceful shutdown và `npm run db:verify` để ghi/đọc/xóa một document tạm.
- `.env` bị Git bỏ qua; `.env.example` chỉ chứa placeholder.

### Lịch sử chẩn đoán

- Node 22.23.2/c-ares 1.34.6 trên Windows từng làm Node chọn DNS `127.0.0.1`, khiến `mongodb+srv` lỗi `ECONNREFUSED`. Đây không phải lỗi router hoặc source DayTrail.
- DNS công cộng chỉ được dùng trong tiến trình kiểm tra riêng: xác thực Atlas, ping và ghi/đọc/xóa trên `daytrail` đều PASS; document tạm đã được xóa.
- Trong lúc chẩn đoán, cổng 4000 từng bị backend DayTrail cũ tại `D:\daytrail-api` chiếm. Tiến trình được xác định chính xác và chỉ dừng theo yêu cầu người dùng; cổng 4001 chỉ dùng tạm, không phải cơ chế tự đổi cổng.
- Người dùng nâng lên Node 22.23.3/c-ares 1.34.8. Sau đó Node nhận DNS mặc định `192.168.0.1` và không cần workaround DNS trong source.

### Bằng chứng người dùng cung cấp sau khi nâng Node

- `npm run dev`: MongoDB sẵn sàng với database `daytrail`; API lắng nghe tại cổng 4000.
- `/api/health` trả `status=ok`; `/api/ready` trả `status=ready`.
- Frontend tại `http://localhost:5173` mở được trong trình duyệt.

### Codex kiểm tra sau khi nâng Node

- Backend cổng 4000 chạy từ `C:\daytrail-api`, không dùng preload hoặc DNS workaround.
- `/api/health`, `/api/ready`, CORS và frontend hiển thị “Đã kết nối”: PASS.
- Backend và frontend `typecheck`, `lint`, `build`: PASS.
- `.env` bị ignore và không được Git theo dõi.

Kết luận: chặng 1A đã nghiệm thu. Kết quả này không có nghĩa toàn bộ chặng 1 đã hoàn tất.

## Chặng 1B.1 — Backend đăng ký, đăng nhập và phiên

### Đã triển khai

- User gồm tên hiển thị, email chuẩn hóa/unique, bcrypt password hash và timestamps. Mật khẩu không bị trim hoặc cắt ngầm.
- API register, login, me, logout; register không tự đăng nhập; login sai dùng một thông báo chung.
- Session token ngẫu nhiên 256-bit; MongoDB chỉ lưu SHA-256, `userId`, `expiresAt`. Cookie dùng `HttpOnly`, `SameSite=Lax`, `Secure` trong production và mặc định tồn tại 7 ngày.
- Middleware xác thực dùng lại được, kiểm tra `expiresAt` mỗi request; TTL index chỉ hỗ trợ dọn dữ liệu.
- CORS hỗ trợ credentials với đúng frontend origin; POST auth yêu cầu JSON, kiểm tra Origin/Sec-Fetch-Site và có rate limit riêng cho register/login.
- Unique index và lỗi MongoDB 11000 xử lý email trùng, kể cả hai request đồng thời.

### Codex kiểm tra trước nghiệm thu

- Backend `typecheck`, `lint`, `build`: PASS sau khi hoàn tất source và test.
- Smoke test không dùng database: module load, health 200, ready 503 khi database không sẵn sàng, Origin sai 403, content type sai 415, validation 400 và rate limit 429: PASS.
- Server development tự reload và lắng nghe lại trên 4000; Codex không dừng server người dùng.
- Các kiểm tra không ghi dữ liệu trên server development: health/ready 200, `/me` chưa đăng nhập 401, Origin sai 403, content type sai 415, đăng ký sai 400, login sai 401 chung, logout không có phiên 204.

### Bằng chứng người dùng cung cấp

- `npm test` kết nối đúng database `daytrail_test`.
- 8 test PASS; 0 fail/cancelled/skipped/todo.

Bộ test bao phủ đăng ký hợp lệ/không hợp lệ, chuẩn hóa và trùng email, login đúng/sai, `/me`, session hết hạn, logout, token cũ, cookie development/production, CORS/CSRF, rate limit, dữ liệu nhạy cảm và health/ready.

### Codex kiểm tra bổ sung

- Đối chiếu assertion cookie: development có `HttpOnly`, `SameSite=Lax`, `Path`, `Max-Age` và không có `Secure`; production có `Secure`. MongoDB không lưu token thật.
- Hai tiến trình backend kiểm thử riêng xác nhận cookie tạo ở tiến trình đầu vẫn gọi `/api/auth/me` HTTP 200 sau khi tiến trình thứ hai khởi động. Không tác động server người dùng.
- Cleanup chỉ chạy sau khi xác nhận `daytrail_test`, chỉ xóa user có domain ngẫu nhiên của lần chạy và session theo đúng `userId`.
- Sau kiểm tra: còn 0 user mang marker `*.stage1b.test`; phép kiểm chứng restart còn 0 user và 0 session tạm.

Kết luận: chặng 1B.1 đã nghiệm thu.

## Chưa triển khai

- Giao diện đăng ký/đăng nhập.
- API và giao diện công việc, lịch nghiệp vụ, nhật ký, ảnh và hành trình đầy đủ.
- AI, deploy và các phần thuộc chặng sau.
