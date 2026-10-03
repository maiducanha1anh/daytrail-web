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

## Chặng 1B.2 — Giao diện tài khoản

### Đã triển khai

- Form đăng ký gồm tên hiển thị, email, mật khẩu và xác nhận mật khẩu; form đăng nhập gồm email và mật khẩu.
- Có chuyển chế độ, hiện/ẩn mật khẩu, label và `autocomplete` phù hợp; quy tắc mật khẩu khớp backend và không trim mật khẩu.
- Đăng ký thành công chuyển về đăng nhập, điền sẵn email và xóa mật khẩu. Lỗi validation, email trùng, sai thông tin đăng nhập, HTTP 429, lỗi server và lỗi mạng có thông báo riêng.
- Lớp API dùng `credentials: "include"`; không lưu token hoặc mật khẩu trong Local Storage/Session Storage.
- State phiên gồm đang kiểm tra, chưa đăng nhập, đã đăng nhập và lỗi chưa xác định được phiên. `/api/auth/me` khôi phục phiên khi mở/tải lại trang; lỗi mạng có nút thử lại và không bị coi là đã đăng xuất.
- Login thành công mở khung Hôm nay/Lịch/Hành trình, hiển thị tên người dùng và nút Đăng xuất. Logout lỗi giữ nguyên trạng thái đăng nhập; logout thành công trở về form.
- Dùng `AbortController`, request ID và khóa submit đồng bộ để request cũ hoặc thao tác nhấn nhiều lần không cập nhật sai trạng thái.

### Codex kiểm tra

- Frontend `npm run typecheck`, `npm run lint`, `npm run build`: PASS.
- Trong quá trình kiểm tra trình duyệt, phát hiện và sửa lỗi validation tạo key `password` có giá trị `undefined`, làm form hợp lệ dừng trước khi gọi API.
- Chrome headless dùng frontend test cổng 5174 và backend test cổng 4012; backend test xác nhận database thực tế là `daytrail_test`. Server người dùng không bị dừng hoặc đổi cấu hình.
- Luồng đăng ký → đăng nhập → `/me` → tải lại → đăng xuất: PASS. Phiên được khôi phục qua reload và form đăng nhập không nhấp nháy trước nội dung riêng tư.
- Sai mật khẩu, email trùng, xác nhận mật khẩu khác nhau, phiên hết hạn, lỗi mạng, thử lại và logout thất bại: PASS.
- Nhấn submit hai lần liên tiếp chỉ tạo một request `POST`: PASS.
- Cookie hoạt động qua reload; `document.cookie` không đọc được token; Local Storage và Session Storage đều không chứa dữ liệu auth: PASS.
- Điều hướng nền, thao tác bàn phím, desktop 1440 px và mobile 390 px: PASS; `#root` khớp viewport và không tràn ngang.
- Không có lỗi Console/runtime ngoài các response/lỗi mạng được chủ động tạo để kiểm tra: PASS.
- Cleanup trên `daytrail_test`: còn 0 user và 0 session của tài khoản tạm; không drop database/collection.
- Nhánh hiển thị lỗi HTTP 429 đã được đối chiếu trong source; chưa chủ động kích hoạt HTTP 429 bằng trình duyệt ở chặng 1B.2. Rate limit backend đã được kiểm thử ở chặng 1B.1.

### Bằng chứng người dùng cung cấp

- Người dùng đã thử giao diện tài khoản và xác nhận hoạt động thành công.

### Phạm vi chưa làm

- Quên mật khẩu, xác minh email, đăng nhập Google và chỉnh hồ sơ.
- Nghiệp vụ công việc, lịch, nhật ký, ảnh, hành trình và AI.

Kết luận: chặng 1B.2 đã được người dùng duyệt. Thay đổi được phép commit và push trong nhiệm vụ chốt chặng; chưa deploy.

## Chặng 2A — Backend công việc theo ngày

### Đã triển khai

- Model `Task` thuộc đúng `userId` lấy từ session; response không trả chủ sở hữu.
- Ngày lưu nguyên chuỗi lịch địa phương `YYYY-MM-DD`; giờ dùng `HH:mm`, cùng ngày và giờ kết thúc phải sau giờ bắt đầu.
- Công việc gồm tên, giờ, ưu tiên, nhóm, mô tả, note riêng, `repeat`, trạng thái và timestamps. Chặng này chỉ chấp nhận `repeat="none"`.
- API tạo, danh sách ngày/khoảng ngày có phân trang, chi tiết, sửa nội dung, chuyển ngày, đặt hoàn thành rõ ràng, xóa và tổng quan ngày.
- Danh sách sắp theo giờ bắt đầu rồi `_id`; khoảng ngày tối đa 366 ngày, `limit` mặc định 50 và tối đa 100.
- Hoàn thành đặt `completedAt` UTC; bỏ hoàn thành đặt `null`. Gửi lại cùng trạng thái giữ nguyên `completedAt`.
- Mọi truy vấn/sửa/xóa giới hạn theo `userId`; ID sai trả 400, không tồn tại hoặc thuộc user khác trả 404.
- Thao tác ghi dùng bảo vệ Origin/JSON hiện có. Có index ghép theo chủ sở hữu, ngày, giờ và ID.

### Codex kiểm tra

- Backend `npm run typecheck`: PASS.
- Backend `npm run lint`: PASS.
- Backend `npm run build`: PASS.
- Toàn bộ `npm test` chạy trên database thực tế `daytrail_test`: 17 PASS, 0 fail/cancelled/skipped/todo; gồm 8 test auth và 9 test công việc.
- Test công việc bao phủ tạo/đọc/sửa/chuyển ngày/note/hoàn thành/bỏ hoàn thành/xóa, validation ngày nhuận/ngày/giờ/enum/kiểu/độ dài, lọc/sắp xếp/phân trang, tổng quan và cách ly hai tài khoản.
- Kiểm tra chống sửa `userId`, `completedAt`, timestamps và các trường có endpoint riêng: PASS.
- Gửi `completed=true` hai lần giữ nguyên `completedAt`: PASS. Note sau khi hoàn thành và chuyển ngày giữ nguyên nội dung/trạng thái: PASS.
- Auth hiện có: 8/8 PASS.
- Cleanup chỉ xóa task, session và user có domain riêng của run sau khi xác nhận `daytrail_test`; không drop database/collection.

### Chưa triển khai

- Frontend công việc và màn hình Hôm nay.
- Công việc lặp, ảnh, nhật ký ngày và Hành trình.

Kết luận hiện tại: chặng 2A đã được người dùng duyệt. Các thay đổi được phép commit và push trong nhiệm vụ chốt chặng; chưa deploy.
