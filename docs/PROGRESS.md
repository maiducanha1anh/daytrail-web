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

- Backend `npm run typecheck`, `npm run lint`, `npm run build`: PASS sau sửa race journal chỉ-ảnh.
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

## Chặng 2B — Giao diện công việc và lịch cơ bản

### Đã triển khai

- Tách frontend thành `features/tasks`, `features/today` và `features/calendar`; `App.tsx` chỉ giữ phiên, điều hướng cấp cao và ghép màn hình.
- Hôm nay có đúng ba phần: danh sách công việc thật, nhật ký ở trạng thái chưa triển khai và tổng quan ngày từ backend. Không có nút tạo công việc trong Hôm nay.
- Lịch có lịch tháng nhỏ, chọn được ngày quá khứ/hôm nay/tương lai, nút về hôm nay và form tạo/sửa đúng contract. Mobile có thể mở/thu lịch tháng.
- Danh sách tải đủ mọi trang với `limit=100`, không dừng ở 50 việc. Request cũ bị hủy và kiểm tra ID để không ghi đè ngày hoặc tài khoản đang xem.
- Chi tiết hỗ trợ note và đặt hoàn thành rõ ràng. Note chưa lưu được lưu thành công trước khi cập nhật hoàn thành; lỗi bước sau không làm mất dữ liệu bước trước.
- Note chưa lưu được bảo vệ khi đóng chi tiết, đổi ngày, đổi tab hoặc đăng xuất: lưu và tiếp tục, bỏ thay đổi hoặc tiếp tục chỉnh.
- Có loading, lỗi, thử lại, trạng thái trống và khóa gửi trùng. Logout làm unmount vùng tài khoản và xóa dữ liệu công việc trong bộ nhớ.
- Chưa triển khai editor nhật ký, ảnh, lịch lặp hoặc các chế độ lịch đầy đủ.

### Codex kiểm tra

- Frontend `npm run typecheck`: PASS.
- Frontend `npm run lint`: PASS, 0 error/warning.
- Frontend `npm run build`: PASS với Vite 8.3.2.
- Chrome headless dùng backend test cổng 4013, frontend test cổng 5174 và database thực tế `daytrail_test`; không dừng server người dùng.
- Luồng đăng ký/đăng nhập → Lịch → tạo → note → hoàn thành → reload → bỏ hoàn thành → sửa → chuyển ngày → xóa: PASS.
- Note và trạng thái còn nguyên sau reload; tổng quan cập nhật sau chuyển ngày/xóa: PASS.
- Đổi ngày nhanh không hiện dữ liệu của ngày cũ; lỗi mạng giữ bản nháp, có thử lại; bảo vệ note chưa lưu có đủ ba lựa chọn: PASS.
- Tài khoản thứ hai không thấy công việc của tài khoản thứ nhất; Local Storage, Session Storage và `document.cookie` không chứa token đọc được: PASS.
- Responsive Chrome 390 × 852: viewport/root/dialog cùng rộng 390 px, không tràn ngang và dialog cuộn được. Desktop 1440 × 900: không tràn ngang; lịch và nội dung ngày hiển thị hai cột.
- Đóng form bằng phím Escape: PASS. Source đặt focus ban đầu vào nút đóng và giữ vòng Tab trong dialog; chưa kiểm chứng riêng toàn bộ thứ tự focus bằng công cụ hỗ trợ. Console có 0 lỗi; một request lỗi mạng được chủ động tạo để kiểm tra nhánh thử lại.
- Cleanup sau kiểm thử xóa đúng 2 user, 1 session và 1 task còn lại của run; các task khác đã được xóa qua UI. Không drop database/collection.

### Yêu cầu V1 đã chốt, chưa triển khai

- Nhật ký ngày độc lập với công việc; ngày không có công việc vẫn viết nhật ký và thêm nhiều ảnh.
- Ảnh nhật ký có chú thích. Note/ảnh công việc xem lại từ chi tiết công việc ở ngày cũ.
- Hồ sơ/lời mở đầu cá nhân, video hồi tưởng và chia sẻ hành trình để sau V1.

### Lỗi phát hiện trên môi trường thật trước nghiệm thu

- Người dùng kiểm tra và phát hiện chuyển ngày cho cả công việc chưa làm/đã hoàn thành cùng thao tác **Lưu và tiếp tục** đều báo lỗi máy chủ; reload không kiểm tra được phiên.
- Console người dùng cho thấy `/api/auth/me` ban đầu trả HTTP 500, sau đó `/api/health` và `/api/auth/me` đều `ERR_CONNECTION_REFUSED`. Backend ghi `Request failed (MongoServerSelectionError)`.
- Codex xác nhận lúc backend cũ còn nghe cổng 4000: `/api/health` trả 200 nhưng `/api/ready` trả 503 ba lần liên tiếp. Điều này chứng minh Express còn sống nhưng MongoDB đã mất readiness; lỗi không nằm ở payload chuyển ngày/note.
- Tiến trình lúc chẩn đoán: backend Node 22.23.3 từ `C:\daytrail-api`, frontend Node 22.23.3 từ `C:\daytrail-web`. Sau khi `tsx watch` reload source backend, tiến trình con cũ đã thoát và không còn listener 4000; tiến trình watch cha vẫn còn. Vì startup bắt buộc connect/ping trước khi mở cổng, lần reload thất bại dẫn tới connection refused.
- DNS Node dùng `192.168.0.1`; SRV trả đủ 3 node và TXT hợp lệ. TCP 27017 tới cả 3 node PASS nhưng TLS cả 3 cùng lỗi `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`.
- Ping riêng bằng cả URI `daytrail` và `daytrail_test` đều thất bại cùng lỗi TLS trên cùng cluster. Trang trạng thái MongoDB Cloud báo Operational; Atlas CLI không có trên máy nên Codex không đọc được IP Access List hoặc trạng thái riêng của cluster.
- Trong hai lần chẩn đoán, IP công cộng dạng che đã đổi từ `42.118.x.x` sang `1.55.x.x`. Người dùng sau đó thêm IP hiện tại vào Atlas IP Access List, xác nhận trạng thái Active và backend kết nối lại database `daytrail` thành công. Đây là thao tác khôi phục Network Access, không phải thay đổi source.

### Sửa lỗi và kiểm tra độc lập

- Backend phân loại lỗi lựa chọn server/network MongoDB thành HTTP 503 `DATABASE_UNAVAILABLE`, thêm `Retry-After: 5`, log mã lỗi đã che và không đổi thành 401 hoặc xóa cookie.
- Thêm `socketTimeoutMS` hữu hạn bằng timeout kết nối hiện có.
- Frontend kiểm tra cả `/api/health` và `/api/ready` mỗi 60 giây: phân biệt **Dữ liệu sẵn sàng**, **Dữ liệu gián đoạn** và **Không kết nối API**.
- `/me` 503 giữ trạng thái phiên chưa xác định và có nút thử lại. Lỗi ghi 503 giữ nguyên note/bản nháp; không tự gửi lại thao tác ghi.
### Kiểm chứng sau khi Atlas phục hồi

#### Bằng chứng người dùng cung cấp

- Backend chạy bình thường tại cổng 4000, kết nối database `daytrail`; frontend chạy tại 5173.
- Người dùng thử lại các tính năng hiện có và thấy hoạt động ổn định.

#### Codex tự kiểm tra

- Backend thật: `/api/health` và `/api/ready` đều HTTP 200 sau khi Network Access được khôi phục.
- Backend `typecheck`, `lint`, `build`: PASS. Toàn bộ `npm test` chạy trên database đã xác nhận là `daytrail_test`: 18 PASS, 0 fail/cancelled/skipped/todo.
- Test database outage xác nhận `/health` vẫn 200, `/ready` 503, `/me` có cookie trả 503 `DATABASE_UNAVAILABLE`, có `Retry-After` và không có `Set-Cookie`.
- Frontend `typecheck`, `lint`, `build`: PASS.
- Chrome headless dùng backend test cổng 4013, frontend test cổng 5174 và `daytrail_test`: chuyển ngày công việc chưa làm/đã hoàn thành, giữ note/nội dung/trạng thái, lưu note rồi tiếp tục, bỏ thay đổi, tiếp tục chỉnh, reload phiên, tạo/sửa/xóa và tổng quan đều PASS.
- Khi giả lập HTTP 503 trong browser, note đang soạn được giữ lại, không có thông báo thành công giả; thử lại sau phục hồi lưu thành công. Header hiện **Dữ liệu gián đoạn**, `/me` không bị coi là hết phiên và nút **Thử lại** khôi phục giao diện. Trong cửa sổ kiểm tra ngắn không có vòng lặp `ready` hoặc `me`.
- Desktop 1440 px và mobile 390 px không tràn ngang; dialog mobile rộng 390 px và cuộn được. Console có 0 lỗi, runtime exception có 0; các request `ERR_ABORTED` là request cũ được `AbortController` hủy khi reload hoặc đổi ngày.
- Cleanup cuối trên `daytrail_test`: còn 0 user, session và task của run; không drop database hoặc collection. Server 4000/5173 của người dùng không bị dừng.

Kết luận: chặng 2B đã được người dùng duyệt sau khi thử lại giao diện và xác nhận các chức năng hiện có hoạt động ổn định. Codex đã kiểm chứng lại các luồng từng gặp lỗi, giao diện desktop/mobile và cách ứng dụng phản hồi khi database trả 503 rồi phục hồi. Các thay đổi được phép commit và push trong nhiệm vụ chốt chặng này; chưa deploy, chưa triển khai lịch lặp, ảnh, nhật ký hay tính năng chặng sau.

## Chặng 3A — Các chế độ xem Lịch

### Đã triển khai

- Thanh Lịch có Năm/Tháng/Tuần/Ngày, nút trước/sau theo đúng khoảng, **Hôm nay**, tiêu đề khoảng và **Tạo công việc** cho ngày đang chọn.
- Desktop giữ mini-calendar bên trái và lịch chính bên phải. Mobile dùng thanh điều khiển gọn, mini-calendar mở/thu và Tuần chuyển thành danh sách dọc.
- Năm hiển thị 12 tháng cùng tổng số và tỷ lệ hoàn thành; chỉ gọi API tổng hợp, không tải toàn bộ note/nội dung cả năm.
- Tháng dùng lưới 7 cột bắt đầu thứ Hai. Ngày quá khứ hiện số hoàn thành/tổng số và tỷ lệ; hôm nay/tương lai hiện số việc đã lên lịch; ngày trống không bị coi là 100%.
- Tuần hiển thị đủ 7 ngày; công việc trùng giờ xếp thành thẻ riêng không che nhau. Desktop dùng 7 cột, mobile dùng danh sách ngày.
- Ngày tái sử dụng danh sách, tổng quan, chi tiết, note, hoàn thành, sửa, chuyển ngày và xóa của chặng 2B.
- Mọi chuyển ngày/chế độ/khoảng đều đi qua bảo vệ note chưa lưu. Request cũ bị hủy và kiểm tra request ID trước khi cập nhật state.
- Backend thêm `GET /api/tasks/summaries?from&to`: MongoDB aggregation theo `userId` và ngày, tối đa 366 ngày, không phụ thuộc phân trang và không trả note/nội dung.

### Bằng chứng người dùng cung cấp

- Người dùng đã thử các tính năng chặng 3A và xác nhận hoạt động ổn định.
- Người dùng đã kiểm tra giao diện trên máy tính và điện thoại, xác nhận hiển thị tạm ổn và duyệt chặng 3A.

### Codex tự kiểm tra

- Backend `npm run typecheck`, `npm run lint`, `npm run build`: PASS.
- Backend `npm test` trên database được xác nhận là `daytrail_test`: 19 PASS, 0 fail/cancelled/skipped/todo. Test mới xác nhận tổng hợp đủ 105 công việc vượt một trang, ngày trống, giới hạn khoảng và cách ly hai tài khoản.
- Frontend `npm run typecheck`, `npm run lint`, `npm run build`: PASS; Vite 8.3.2 build thành công.
- Chrome headless dùng backend riêng cổng 4014, frontend riêng cổng 5175 và `daytrail_test`: Năm/Tháng/Tuần/Ngày, trước/sau, Hôm nay, form tạo theo ngày chọn, mở chi tiết, công việc trùng giờ, ngày 29/02/2028 và tuần giao 2026–2027 đều PASS.
- Bảo vệ note chưa lưu khi đổi chế độ, cập nhật hoàn thành/tổng quan, lỗi 503 và nút thử lại, reload khôi phục phiên và Hôm nay không bị hồi quy: PASS.
- Responsive 1440, 390 và 360 px: không tràn ngang; Tuần desktop có 7 cột, mobile có 1 cột; nút thanh điều khiển đủ chiều cao thao tác. Console/runtime có 0 lỗi.
- Harness xóa task/session/user theo đúng user test rồi dừng tiến trình; cổng 4014/5175/9224 còn 0 listener. Kiểm tra sau cleanup xác nhận còn 0 user có marker `@stage3a.test`; không drop database/collection và không tác động server 4000/5173 của người dùng.

### Giới hạn

- Chưa triển khai công việc lặp, ảnh, nhật ký ngày, Hành trình hoặc AI.
- Chặng 3A đã được người dùng duyệt sau khi đối chiếu kiểm chứng kỹ thuật của Codex. Các thay đổi được phép commit và push trong nhiệm vụ chốt chặng này; chưa deploy và chưa bắt đầu chặng 3B.

## Chặng 3B.1 — Backend công việc lặp

### Đã triển khai

- Backend lưu cấu hình chuỗi lặp hữu hạn trong `TaskSeries` và sinh trước từng công việc cụ thể trong khoảng tối đa 366 ngày. Công việc một lần hiện có vẫn tương thích.
- Hỗ trợ `daily`, `weekly` với một hoặc nhiều thứ, và `monthly` theo đúng ngày của ngày bắt đầu. Ngày kết thúc được tính; tháng không có ngày tương ứng thì bỏ qua, không đẩy sang tháng kế tiếp.
- Mỗi lần thực hiện có ID, note, trạng thái hoàn thành và `completedAt` riêng; có `seriesId` và `originalDate` để giữ nguồn lịch kể cả khi chuyển ngày.
- `POST /api/tasks/series` tạo chuỗi và các lần thực hiện trong một transaction MongoDB. Unique index theo chủ sở hữu, chuỗi và ngày gốc ngăn tạo trùng.
- `POST /api/tasks/series/:seriesId/stop` dừng từ ngày gốc được chỉ định: xóa lần chưa hoàn thành và chưa có note, giữ lịch sử có note hoặc đã hoàn thành. Gọi lại không tái sinh dữ liệu đã loại bỏ.
- Danh sách và tổng quan tiếp tục tính trên các công việc thực tế còn tồn tại, không đếm thêm bản ghi cấu hình chuỗi.
- Frontend mới cập nhật tài liệu; giao diện tạo và dừng công việc lặp chưa được triển khai.

### Codex tự kiểm tra

- Backend `npm run typecheck`, `npm run lint`, `npm run build`: PASS.
- Toàn bộ `npm test` chạy trên database được xác nhận là `daytrail_test`: 29 PASS, 0 fail/cancelled/skipped/todo; gồm 8 test auth, 10 test công việc lặp, 10 test công việc hiện có và 1 test database gián đoạn.
- Kiểm thử bao phủ lặp ngày/tuần/tháng, ngày 29/30/31, năm nhuận, giao tháng/năm, ngày kết thúc, giới hạn 366 ngày, cách ly hai tài khoản và tính độc lập của từng lần thực hiện.
- Dừng chuỗi giữ lần có note/đã hoàn thành và xử lý theo `originalDate` với lần đã chuyển ngày: PASS. Danh sách/tổng quan không đếm đôi và truy vấn lại không sinh trùng: PASS.
- Kiểm thử chủ động làm bước chèn công việc thất bại xác nhận transaction rollback cả `TaskSeries` lẫn các lần thực hiện; không để lại dữ liệu dở.
- Cleanup chỉ xóa dữ liệu có marker của lần chạy sau khi xác nhận database là `daytrail_test`; không drop database hoặc collection.

### Giới hạn và trạng thái

- Chưa hỗ trợ sửa hàng loạt quy tắc chuỗi; chỉ sửa/xóa/chuyển ngày/note/hoàn thành từng lần và dừng chuỗi từ một ngày gốc.
- Chưa làm giao diện lặp, ảnh, nhật ký ngày, Hành trình hoặc AI.
- Chặng 3B.1 đã được người dùng duyệt về backend dựa trên kết quả kiểm chứng của Codex: `typecheck`, `lint`, `build` PASS và 29/29 test PASS.
- Người dùng chưa thử giao diện công việc lặp vì giao diện này chưa được triển khai. Chặng 3B.2 chưa bắt đầu nên toàn bộ chặng 3B chưa hoàn tất.
- Các thay đổi 3B.1 được phép commit và push trong nhiệm vụ chốt chặng; chưa deploy.

## Chặng 3B.2 — Giao diện công việc lặp

### Đã triển khai

- Form Lịch tạo được công việc không lặp, hằng ngày, hằng tuần nhiều thứ và hằng tháng. Ngày bắt đầu lấy từ ngày đang chọn; ngày kết thúc bắt buộc và tối đa 366 ngày tính cả ngày đầu.
- Hằng tuần mặc định chọn thứ của ngày bắt đầu nhưng cho phép đổi; hằng tháng hiển thị đúng ngày trong tháng và giải thích tháng thiếu ngày sẽ bị bỏ qua.
- Công việc lặp có dấu nhận biết gọn trong danh sách/tuần. Chi tiết tải metadata thật bằng `GET /api/tasks/series/:seriesId`, gồm quy tắc, khoảng, ngày dự kiến và trạng thái đã dừng.
- Sửa, chuyển ngày và xóa ghi rõ phạm vi **lần này**. Note và hoàn thành tiếp tục chỉ tác động lần đang mở.
- **Dừng lặp** mở xác nhận có ngày cắt mặc định là hôm nay theo lịch địa phương. Backend loại bỏ lần chưa hoàn thành/chưa có note và trả số lần loại bỏ/giữ lại; frontend làm mới danh sách và tổng quan theo response thật.
- Note chưa lưu được bảo vệ trước khi dừng. Nếu chọn lưu mà request thất bại, bản nháp và bước xác nhận chưa được tiếp tục; người dùng có thể thử lại.
- Backend bổ sung endpoint đọc chuỗi theo chủ sở hữu; không thay đổi dữ liệu tạo/dừng của chặng 3B.1.

### Codex tự kiểm tra

- Frontend `npm run typecheck`, `npm run lint`, `npm run build`: PASS.
- Backend `npm run typecheck`, `npm run lint`, `npm run build`: PASS. Toàn bộ `npm test` trên `daytrail_test`: 29 PASS, 0 fail/cancelled/skipped/todo.
- Chrome headless dùng backend 4015, frontend 5176, DevTools 9225 và database đã xác nhận là `daytrail_test`; không dùng hoặc dừng server người dùng 4000/5173.
- Tạo một lần, lặp ngày, tuần nhiều thứ, tháng ngày 31; ngày kết thúc, giới hạn 366 ngày và bắt buộc chọn thứ: PASS. Chuỗi tháng ngày 31 bỏ đúng tháng thiếu ngày.
- Note/hoàn thành độc lập, sửa/chuyển/xóa một lần, dừng từ lần không phải đầu và đã chuyển ngày, giữ lịch sử có note/hoàn thành, reload không sinh trùng và tổng quan cập nhật: PASS.
- Khi chủ động tạo lỗi mạng và HTTP 503, form/bản nháp được giữ, không báo thành công giả và thử lại thành công. Lưu note lỗi trước khi dừng không mở bước xác nhận dừng.
- Responsive 360/390/1440 px: không tràn ngang; dialog dài cuộn được. Runtime exception và Console error ngoài lỗi API chủ động tạo: 0.
- Cleanup trên `daytrail_test` đã xóa đúng 3 user, 3 session, 36 task và 9 series mang marker `@stage3b2.test`; còn 0 user marker. Toàn bộ tiến trình, profile, log và script test tạm đã được dọn.

### Giới hạn và trạng thái

- Chưa hỗ trợ sửa hàng loạt quy tắc hoặc toàn bộ chuỗi. Dừng chuỗi là thao tác cấp chuỗi duy nhất trong V1 hiện tại.
- Chưa làm ảnh, nhật ký ngày, Hành trình hoặc AI.
- Người dùng đã thử giao diện công việc lặp, xác nhận hoạt động ổn và duyệt chặng 3B.2. Đây là kết quả kiểm tra thủ công của người dùng, tách biệt với các kiểm tra kỹ thuật của Codex ở trên.
- Chặng 3B hoàn tất trong phạm vi V1 đã thống nhất: chuỗi lặp hữu hạn, thao tác trên từng lần và dừng chuỗi. Backend đã commit/push tại `47e8c24`; frontend đã commit/push tại `b33788e`; chưa deploy.

## Chặng 4A — Backend nhật ký ngày

### Đã triển khai

- Model `Journal` gồm `userId`, ngày lịch `YYYY-MM-DD`, nội dung nguyên văn, `version` và timestamps. Unique index `(userId, date)` giới hạn một nhật ký cho mỗi tài khoản/ngày.
- `GET /api/journals/:date` trả đầy đủ nội dung hoặc `journal: null`; `PUT` tạo/cập nhật và `DELETE` xóa theo version đã đọc.
- `GET /api/journals?from&to&page&limit` giới hạn khoảng 366 ngày, mặc định 20 và tối đa 100 bản ghi/trang; response chỉ có metadata và đoạn trích tối đa 160 ký tự.
- Nội dung tối đa 20.000 ký tự, giữ nguyên tiếng Việt, xuống dòng và khoảng trắng. Nội dung chỉ có khoảng trắng bị từ chối; xóa phải dùng endpoint riêng.
- Tạo mới gửi `version: null`. Cập nhật/xóa dùng điều kiện nguyên tử theo chủ sở hữu, ngày và version; dữ liệu đã đổi trả HTTP 409 thay vì ghi đè.
- Mọi truy vấn lấy `userId` từ session. Thao tác ghi giữ kiểm tra Origin/JSON; database gián đoạn giữ HTTP 503 `DATABASE_UNAVAILABLE` và không xóa cookie.

### Codex tự kiểm tra

- Backend `npm run typecheck`, `npm run lint`, `npm run build`: PASS.
- Suite nhật ký chạy riêng trên database được xác nhận là `daytrail_test`: 9 PASS, 0 fail/cancelled/skipped/todo.
- Toàn bộ `npm test`: 38 PASS, 0 fail/cancelled/skipped/todo; auth, task, recurrence, health/readiness và xử lý database unavailable không hồi quy.
- Test xác nhận nhật ký độc lập với task; nội dung tiếng Việt/xuống dòng/khoảng trắng; ngày nhuận; validation kiểu/độ dài/ngày/khoảng; phân trang, thứ tự và đoạn trích; cách ly hai tài khoản.
- Hai request tạo đồng thời cho cùng user/ngày cho một HTTP 201 và một HTTP 409, chỉ còn một document. Hai cập nhật cùng version cho một HTTP 200 và một HTTP 409; xóa bằng version cũ không làm mất dữ liệu mới.
- Cleanup chỉ xóa journal, task, series, session và user thuộc domain ngẫu nhiên của lần test sau khi xác nhận database là `daytrail_test`; các assert cleanup đều PASS, không drop database hoặc collection.

### Bằng chứng người dùng cung cấp

- Người dùng duyệt chặng 4A về backend theo báo cáo kiểm chứng của Codex.
- Người dùng chưa thử giao diện nhật ký vì chặng 4B chưa được triển khai.

### Giới hạn và trạng thái

- Chặng 4A chỉ có backend nhật ký văn bản và đã được người dùng duyệt. Frontend chưa gọi các endpoint mới.
- Giao diện nhật ký thuộc chặng 4B; ảnh nhật ký/công việc và chú thích thuộc chặng 4C. Hành trình và AI chưa triển khai.
- Các thay đổi 4A được phép commit và push trong nhiệm vụ chốt chặng này; chưa deploy.

## Chặng 4B — Giao diện nhật ký văn bản theo ngày

### Đã triển khai

- Module `features/journals` dùng chung ở Hôm nay và chế độ Ngày của Lịch; ngày trống không tự tạo dữ liệu và vẫn cho viết khi không có công việc.
- Tạo, đọc, sửa và xóa nhật ký dùng đúng API/version của chặng 4A. Nội dung tối đa 20.000 ký tự theo `string.length`, giữ nguyên tiếng Việt, xuống dòng và khoảng trắng; văn bản React hiển thị không thực thi HTML.
- Không tự lưu và không dùng Local Storage/Session Storage. Bản nháp chưa lưu được bảo vệ khi đổi ngày, chế độ/khoảng lịch, tab chính hoặc đăng xuất, với ba lựa chọn lưu, bỏ hoặc tiếp tục chỉnh; `beforeunload` dùng cảnh báo chung do trình duyệt kiểm soát.
- Cơ chế đăng ký nhiều navigation guard bảo vệ đồng thời note công việc và nhật ký, không để guard sau ghi đè guard trước.
- HTTP 409/404 do dữ liệu đổi ở tab khác giữ bản nháp. Người dùng đọc bản mới nhất để đối chiếu rồi chọn dùng bản server hoặc giữ/chỉnh bản nháp và chủ động lưu bằng version mới nhất.

### Codex tự kiểm tra

- Frontend `npm run typecheck`, `npm run lint`, `npm run build`: PASS. `git diff --check`: PASS, không có lỗi whitespace.
- Backend `npm run typecheck`, `npm run lint`, `npm run build`: PASS. Toàn bộ `npm test` chạy trên database đã xác nhận là `daytrail_test`: 38 PASS, 0 fail/cancelled/skipped/todo.
- Backend người dùng tại cổng `4000`: Codex gọi `/api/health` và `/api/ready`, đều HTTP 200. Ping riêng xác nhận kết nối kiểm thử dùng database thực tế `daytrail_test`.
- Chrome headless kiểm thử tích hợp dùng backend riêng cổng `4017`, frontend riêng cổng `5177`, DevTools cổng `9227` và `daytrail_test`; không dùng API in-memory để thay thế backend thật và không dừng server người dùng.
- PASS: tạo/đọc/sửa/reload/xóa nhật ký; đồng bộ Hôm nay và Lịch; cả ba lựa chọn **Lưu và tiếp tục**, **Bỏ thay đổi**, **Tiếp tục chỉnh**; note công việc và nhật ký cùng chưa lưu; xung đột HTTP 409 hai tab; xóa bằng version cũ hoặc bản ghi đã bị tab khác xóa; 401, cách ly hai tài khoản, HTTP 503/lỗi mạng và thử lại; hồi quy công việc, công việc lặp, bốn chế độ Lịch, responsive 360/390/1440 px. Runtime exception: 0.
- Lỗi 503 được tạo bằng cách ngắt kết nối Mongoose chỉ trong server kiểm thử riêng. Lỗi mạng được tạo bằng Chrome chỉ chặn request kiểm thử. Cả hai đều giữ bản nháp, không báo thành công giả và không coi database gián đoạn là hết phiên.
- Cleanup sau mỗi lượt và cuối cùng chỉ nhắm email marker ngẫu nhiên của nhiệm vụ trên `daytrail_test`; kiểm tra cuối còn 0 journal, task, series, session và user marker. Các cổng `4017`, `5177`, `9227` đã trống; không drop database/collection.

### Trạng thái

- **Bằng chứng người dùng cung cấp:** người dùng đã thử giao diện nhật ký và xác nhận hoạt động ổn, từ đó duyệt chặng 4B.
- **Codex tự kiểm tra:** các kiểm chứng tích hợp với backend/database thật, 38/38 test backend và các kiểm tra frontend nêu ở trên đều PASS.
- Chặng 4B đã nghiệm thu; các thay đổi được phép commit/push trong nhiệm vụ chốt chặng này. Chưa deploy.
- Chặng 4C chưa bắt đầu: ảnh công việc, ảnh nhật ký và chú thích từng ảnh vẫn phải triển khai. Hành trình, AI, video, hồ sơ và chia sẻ chưa triển khai.

### Blocker kết nối lịch sử trước khi Atlas phục hồi — Codex

- Cổng development `4000` và `5173` không có tiến trình lắng nghe lúc 09:31 (UTC+7); `/api/health` và `/api/ready` đều bị từ chối kết nối. Codex không dừng hoặc khởi động lại server người dùng.
- `.env` có cả hai cấu hình, cùng cluster, lần lượt khai báo đúng database `daytrail` và `daytrail_test`; không có biến môi trường tiến trình ghi đè hai URI. Nội dung URI và thông tin đăng nhập không được in.
- Tiến trình ping riêng cho cả `daytrail` và `daytrail_test` đều nhận `MongooseServerSelectionError`. Topology có ba server `Unknown`; lỗi con quan sát được là `MongoNetworkError` / `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR` trước bước xác thực.
- DNS mặc định của Node phân giải SRV thành ba node cổng 27017 và phân giải TXT thành công. Kết nối TCP và bắt tay TLS tới cả ba node đều timeout trong 5 giây/node.
- Bằng chứng hiện tại khoanh vùng ở đường mạng/Atlas Network Access hoặc trạng thái cluster trước xác thực; chưa đủ quyền đọc Atlas để xác nhận IP Access List hay trạng thái cluster. Vì vậy chưa kết luận riêng nguyên nhân là IP và chưa sửa DNS/TLS/allowlist.
- Không chạy kiểm thử trình duyệt/database thật, không tạo dữ liệu test và không sửa source trong lượt chẩn đoán này. Cần khôi phục kết nối Atlas cho cả database development/test trước khi tiếp tục nghiệm thu 4B.
- Ghi nhận này là bằng chứng chẩn đoán trước thời điểm kết nối phục hồi, không còn là blocker hiện tại: sau đó người dùng khởi động backend bình thường tại `4000`, và kiểm chứng tích hợp thật ở phần trên đã kết nối được `daytrail_test`.

## Chặng 4C.0 — Thiết kế lưu trữ ảnh và chuẩn bị triển khai

- Codex đã hoàn tất thiết kế; người dùng sau đó tạo hai bucket private `daytrail-media-dev` và `daytrail-media-test`, đồng thời đặt hai bộ cấu hình riêng trong backend.
- Đề xuất Cloudflare R2 private bucket, MongoDB lưu metadata, backend xác thực và stream ảnh; không dùng base64, local disk làm nơi lưu deploy, public bucket hay secret `VITE_*`.
- Thiết kế đã bao phủ ảnh nhiều cho task/journal, journal chỉ-ảnh, chú thích, version journal, chuyển ngày, dừng chuỗi giữ lần có ảnh, kiểm tra bytes thật, thumbnail/orientation/xóa EXIF GPS, idempotency, orphan/retry và bucket test riêng.
- Kế hoạch 4C.1 backend, 4C.2 frontend, biến môi trường placeholder và thao tác Cloudflare nằm trong [IMAGE_STORAGE_DESIGN.md](IMAGE_STORAGE_DESIGN.md).
- 4C.0 đã được dùng làm phương án triển khai 4C.1. Giao diện 4C.2 chưa bắt đầu.

## Chặng 4C.1 — Backend ảnh riêng tư

### Đã triển khai

- Thêm adapter Cloudflare R2 qua S3 API; khóa chỉ nằm ở backend. Thiếu cấu hình development không làm hỏng auth/task/journal, còn endpoint ảnh trả 503 an toàn.
- Thêm `MediaAsset`, unique index cho quota slot và idempotency, trạng thái `uploading`/`ready`/`deleting`/`cleanup_failed`, worker cleanup có backoff và retry qua restart.
- Upload task/journal dùng multipart riêng, session, Origin và owner từ session. Backend kiểm tra bytes/giải mã, giới hạn 8 MiB và 20 triệu pixel, nhận JPEG/PNG/WebP tĩnh, xoay orientation, bỏ metadata, tạo WebP full 2.560 px cùng thumbnail 480 px.
- Mỗi task/journal tối đa 12 ảnh. `clientUploadId` giúp retry cùng payload không tạo trùng; payload khác trả 409. Chú thích tối đa 500 ký tự và giữ tiếng Việt/xuống dòng.
- Bucket private chỉ được đọc qua API có xác thực. Response không trả object key, secret hoặc URL public dài hạn.
- Journal chỉ-ảnh được hỗ trợ. Thêm/xóa ảnh hoặc sửa caption tăng `Journal.version`; xóa ảnh cuối của journal không chữ sẽ xóa journal rỗng.
- Chuyển ngày task giữ ảnh. Xóa task/journal ẩn metadata trước rồi dọn R2; lỗi xóa trả trạng thái pending và worker retry. Dừng chuỗi lặp giữ lần có ảnh đang hoạt động.
- Thêm 8 integration test media và nối vào `npm test`. Test bắt buộc đúng `daytrail_test` và `daytrail-media-test`, dùng prefix ngẫu nhiên và không fallback sang development.

### Kiểm chứng của Codex

- Backend `npm run typecheck`, `npm run lint`, `npm run build`: PASS.
- DNS mặc định của hotspot vẫn làm Node nhận `EBADRESP`. Codex chỉ nạp `dns.setServers` với `1.1.1.1` và `8.8.8.8` qua `NODE_OPTIONS` của từng tiến trình test; không tạo preload trong repo, không đổi DNS Windows/source/URI/TLS. Biến này được tiến trình test runner và tiến trình Node con kế thừa.
- Suite media dùng database đã xác nhận `daytrail_test`, bucket `daytrail-media-test` và khóa `R2_TEST_*`: 8/8 PASS, 0 fail/cancelled/skipped/todo.
- Toàn bộ backend: 46/46 PASS, gồm 8 auth, 10 task, 10 recurrence, 9 journal, 1 database-unavailable và 8 media. Con số 47/9 ở báo cáo trước là lỗi đếm; source thực tế có 46/8.
- Luồng thật MongoDB + R2 đã kiểm tra upload/list/read full-thumbnail/sửa caption/xóa, session/owner, idempotency, journal version, quota 12 khi có request đồng thời, partial upload, durable cleanup retry, xóa owner trong lúc upload và dừng chuỗi giữ lần có ảnh.
- Cleanup cuối: 0 user marker 4C.1, 0 media marker và 0 object dưới prefix `daytrail/test/`; không drop database/collection/bucket.
- Kiểm tra chất lượng trong bộ nhớ: mẫu ảnh 12 MP dạng ảnh chụp được chuyển từ JPEG 4.032×3.024 xuống WebP 2.560×1.920, thumbnail 480×360, PSNR 40,03 dB, dung lượng full bằng 20,4% input. Mẫu raster có chữ 1.800×1.200 không bị thu nhỏ ở bản full, thumbnail 480×320, PSNR 42,30 dB, dung lượng bằng 40% input. Hai output đều là WebP và không còn EXIF. Trần 2.560 px giảm chi tiết khi zoom sâu ảnh chụp 12 MP; bản full ảnh chữ vẫn rõ hơn thumbnail, thumbnail không dành để đọc chữ nhỏ.

### Bằng chứng người dùng cung cấp

- DNS mặc định hotspot: truy vấn SRV/TXT đều `EBADRESP`; resolver `1.1.1.1` và `8.8.8.8` truy vấn thành công.
- Người dùng chạy `verifyDatabase.ts` với `dns.setServers` chỉ trong tiến trình và xác nhận connect/ping cùng ghi–đọc–xóa trên database `daytrail` thành công.
- Đây không phải kết quả Codex và không được dùng thay cho suite media; suite media/test đầy đủ của Codex dùng riêng `daytrail_test`.

### Trạng thái

- **Đạt về kỹ thuật; người dùng đã duyệt chặng 4C.1 về backend dựa trên báo cáo kiểm chứng.**
- `npm run dev` bình thường trên hotspot, không có DNS preload, **chưa được xác nhận hoạt động**. Workaround DNS chỉ dùng cho kiểm thử; chưa hardcode hoặc đưa vào cấu hình ứng dụng.
- Chất lượng cảm quan với ảnh chụp từ điện thoại thật chưa được kiểm chứng; sẽ kiểm tra ở 4C.2. Các số liệu WebP hiện tại chỉ đến từ mẫu kiểm tra trong bộ nhớ.
- 4C.2 frontend ảnh chưa bắt đầu; toàn bộ chặng 4C chưa hoàn tất.

## Chặng 4C.2 — Giao diện ảnh riêng tư

### Đã triển khai

- Thêm module dùng chung `features/media` cho chi tiết công việc và nhật ký: chọn nhiều ảnh, preview, hàng đợi giới hạn đồng thời, trạng thái từng ảnh, retry giữ nguyên `clientUploadId`, lưới thumbnail và xem ảnh đầy đủ qua API có cookie phiên.
- Frontend kiểm tra sớm JPEG/PNG/WebP và 8 MiB; HEIC/HEIF được giải thích bằng tiếng Việt nhưng backend vẫn là nguồn kiểm tra cuối cùng. Không có khóa R2 hoặc URL public trong frontend.
- Hỗ trợ sửa chú thích, xác nhận xóa, cleanup pending và thu hồi object URL. Không lưu ảnh, token hoặc bản nháp vào Local Storage/Session Storage.
- Guard ảnh được nối sau guard note/journal: upload đang chạy, ảnh lỗi hoặc caption chưa lưu đều ngăn đóng bảng, đổi ngày/tab hoặc đăng xuất cho tới khi người dùng hoàn tất, bỏ thay đổi hoặc tiếp tục chỉnh.
- Ảnh task gắn với đúng lần thực hiện. Journal cho phép chỉ có ảnh; mọi upload/caption/xóa đồng bộ `Journal.version`. Khi HTTP 409, caption và văn bản đang soạn được giữ; thao tác đọc dữ liệu mới không tự thay nội dung người dùng.
- Giao diện có CSS responsive cho hàng đợi, thumbnail và trình xem lớn; dialog tiếp tục dùng focus/Escape của `DialogFrame`.

### Kiểm chứng của Codex

- Frontend `npm run typecheck`, `npm run lint`, `npm run build`: PASS sau thay đổi cuối.
- Backend test riêng từng chạy tại `4018`, frontend test tại `5178`; server xác nhận database `daytrail_test`, bucket `daytrail-media-test` và prefix riêng dưới `daytrail/test/`. Không dừng server người dùng và không đổi `.env`.
- Chrome thật đã PASS các bước trước khi Atlas gián đoạn: đăng ký/đăng nhập và reload khôi phục phiên; upload đồng thời 3 ảnh task; thumbnail/full/chú thích; offline chủ động rồi retry không sinh trùng; reload giữ ảnh; hoàn thành và chuyển ngày giữ ảnh; tài khoản thứ hai nhận 404 khi đọc ảnh; tạo journal chỉ-ảnh; lưu văn bản sau khi caption làm tăng version; hai tab tạo 409 và giữ nguyên caption draft; đọc version mới rồi lưu caption thành công.
- Kiểm thử dùng ảnh canvas tổng hợp phong cảnh/chữ, không lấy ảnh cá nhân trên máy. Chất lượng cảm quan với ảnh điện thoại thật chưa kiểm chứng.

### Lượt gián đoạn trước khi kiểm chứng hoàn tất

- Trong các lượt Chrome, backend test nhiều lần ghi `MongoServerSelectionError`; có lúc `/ready` tự phục hồi 200, sau đó hai lần khởi động mới đều kết thúc bằng `DatabaseConnectionError`. SRV/TXT trước đó PASS; thử DNS preload tạm 1.1.1.1/8.8.8.8 chỉ trong tiến trình vẫn không mở được server. Chưa có bằng chứng đủ để kết luận nguyên nhân Atlas/network cụ thể.
- Không tính PASS cho các bước sau điểm gián đoạn: lưu journal rỗng khi còn ảnh rồi xóa ảnh cuối, dừng chuỗi giữ lần có ảnh, responsive 360/390/1440 px, hồi quy đầy đủ và kiểm tra Console cuối lượt.
- Dữ liệu marker `codex-4c2-*` và object dưới prefix test có thể còn từ các lượt bị ngắt. Cần kết nối lại `daytrail_test`/`daytrail-media-test` để dọn đúng marker; chưa dọn vì không được phép đoán kết quả khi database không kết nối.
- Các blocker trên mô tả đúng trạng thái của lượt bị ngắt và không được tính PASS. Các lượt sau đã cleanup marker cũ rồi kiểm chứng lại như phần dưới.

### Kiểm chứng hoàn tất của Codex

- Node dùng DNS mặc định của tiến trình là `8.8.8.8` và `8.8.4.4`; SRV/TXT PASS, TCP 27017 và TLS 1.3 có xác minh chứng chỉ PASS trên cả ba node Atlas. Không dùng DNS preload trong lượt hoàn tất này. Một kết nối mới từng gặp server selection và một cleanup từng gặp `ETIMEOUT`, trong khi server test `/ready` vẫn 200; lần kế tiếp kết nối thành công. Chưa có bằng chứng để quy lỗi này riêng cho DNS.
- Toàn bộ backend `npm test` chạy thật trên `daytrail_test`/`daytrail-media-test`: **46/46 PASS**, gồm 8 test media; không dùng API in-memory.
- Chrome thật dùng backend `4018`, frontend `5178`, DevTools `9333`, marker riêng và prefix `daytrail/test/4c2-20261007180604`. PASS: xóa ảnh cuối của journal không chữ làm journal rỗng biến mất; lưu caption/reload; guard caption chưa lưu; guard upload đang chạy và **Hoàn tất và tiếp tục**; dừng chuỗi giữ đúng lần có ảnh; đăng nhập/khôi phục phiên; hồi quy task, journal và bốn chế độ Lịch.
- Responsive PASS ở 1440, 390 và 360 px: `scrollWidth` bằng đúng viewport, dialog nằm trong màn hình và cuộn được. Focus khởi đầu, Tab và Escape trong trình xem ảnh PASS. Console error, runtime exception và network failure ngoài kiểm thử: 0.
- Phát hiện và sửa hai lỗi thật: guard media dùng `void ?? next()` nên vẫn điều hướng khi có caption/upload chưa hoàn tất; thumbnail lỗi có nút retry lồng trong nút thumbnail gây HTML không hợp lệ và lỗi React Console.
- Sau bản sửa cuối, frontend `npm run typecheck`, `npm run lint`, `npm run build`: PASS. Ảnh kiểm thử là canvas tổng hợp 1.200×800; Codex không lấy ảnh cá nhân trên máy.
- Cleanup lượt cũ: 8 user, 6 session, 5 task, 2 journal, 10 media và 20 object được xác định chính xác rồi dọn về 0. Mỗi lượt browser sau đó cũng được dọn theo đúng email marker/prefix; kiểm tra cuối còn 0 user/session/task/series/journal/media và 0 object. Các cổng `4018`, `5178`, `9333` đã trống và file tạm đã xóa.

### Trạng thái

- **Chặng 4C.2 đã được người dùng duyệt sau khi thử giao diện hiện tại trên máy tính.** Kết quả này cùng bằng chứng kỹ thuật của Codex chốt phạm vi 4C.2 và lượt tinh gọn UI.
- Kiểm thử trên điện thoại thật và chất lượng cảm quan bằng ảnh chụp điện thoại vẫn **chưa kiểm chứng**; kết quả không được suy ra từ ảnh canvas tổng hợp hoặc viewport mô phỏng. Hai mục này được chuyển vào checklist bắt buộc trước phát hành.

### Tinh chỉnh UI/UX sau kiểm chứng 4C.2 — Codex

- Rút gọn màn hình sau đăng nhập để công việc, nhật ký và ảnh xuất hiện sớm hơn. Đã bỏ khối giới thiệu lặp, các mô tả kỹ thuật thường trực trong Hôm nay/Lịch/Nhật ký/Ảnh và thông tin version khỏi giao diện người dùng.
- Nhật ký chỉ hiện bộ đếm từ 18.000/20.000 ký tự, vẫn giữ trạng thái `Chưa lưu`, bảo vệ bản nháp và xử lý xung đột version. Khu vực ảnh chỉ còn tiêu đề `Ảnh`, nút `Thêm ảnh`, số lượng và lưới; ảnh upload thành công rời hàng đợi ngay, thông báo cho trình đọc màn hình vẫn được giữ.
- Tăng vùng chạm thao tác công việc lên 44 px trên mobile, cho tên dài và nút tự xuống dòng, làm rõ nút xóa. Dialog bắt Escape ở cấp document khi đang mở và khôi phục focus khi đóng; sửa lỗi Escape không hoạt động sau khi nút lưu chú thích bị disable làm focus rơi về `body`.
- Sửa breakpoint Lịch cho tablet: trước sửa, thanh điều khiển làm trang rộng 1.008 px ở viewport 768 px; sau sửa, cả Năm/Tháng/Tuần/Ngày không còn tràn ngang ở 360, 390, 768 và 1.440 px.
- Frontend `npm run typecheck`, `npm run lint`, `npm run build`: PASS sau thay đổi cuối.
- Chrome thật dùng backend/frontend kiểm thử riêng tại `4019`/`5179`, database `daytrail_test` và bucket `daytrail-media-test`. PASS: 6 công việc gồm tên dài; 18 nút thao tác đều cao 44 px ở 390 px; upload hỗn hợp giữ file hợp lệ và báo lỗi file sai; upload thành công không để hàng/thông báo thành công nhìn thấy; retry thành công; caption còn sau reload; guard upload/caption hoạt động; bộ đếm nhật ký ẩn ở 17.999 và hiện ở 18.000 ký tự; bốn chế độ Lịch không tràn ở bốn kích thước. Runtime exception: 0; các request `ERR_ABORTED` do chủ động đổi nhanh chế độ/reload và một lỗi upload do chủ động chặn để kiểm tra retry không được tính là lỗi ngoài dự kiến.
- Cleanup đã xác nhận đúng `daytrail_test` và `daytrail-media-test`: xóa 2 user, 2 session, 6 task, 1 journal, 3 media cùng object trong prefix riêng; còn 0 user/session/task/series/journal/media/object. Các cổng kiểm thử `4019`, `5179`, `9334` đã trống và file tạm đã xóa; server người dùng `4000`/`5173` không bị dừng.
- Người dùng đã thử giao diện hiện tại trên máy tính và duyệt chặng 4C.2 cùng lượt tinh gọn UI. Chất lượng cảm quan với ảnh điện thoại thật và thao tác trên thiết bị thật vẫn **chưa kiểm chứng**; đây là mục bắt buộc trước phát hành. Tại thời điểm cập nhật dòng này, thay đổi chưa commit/push/deploy và Hành trình chưa bắt đầu.

### Checklist bắt buộc trước phát hành

- Thử trên ít nhất một điện thoại thật: đăng nhập, Hôm nay, bốn chế độ Lịch, task, journal, ảnh, các hộp thoại, bàn phím và cuộn; xác nhận không tràn ngang và vùng chạm sử dụng được.
- Dùng ảnh chụp thật từ điện thoại để kiểm tra xoay ảnh, thumbnail, xem lớn, chú thích và chất lượng cảm quan sau WebP tối đa 2.560 px.
- Ghi rõ thiết bị, trình duyệt và kết quả. Hiện cả hai mục trên là **CHƯA KIỂM TRA**, không phải PASS.

## Chặng 5 — Hành trình

### Mốc 4C.2 đã lưu

- Người dùng đã duyệt 4C.2 và lượt tinh gọn UI sau khi thử trên máy tính. Frontend đã commit `91a6ca2` với message `feat: add private image UI and streamline mobile layouts` và push thành công lên `origin/main`.
- Backend không có thay đổi 4C.2 nên không tạo commit rỗng. Kiểm thử điện thoại thật và chất lượng ảnh chụp điện thoại vẫn thuộc checklist bắt buộc trước phát hành.

### Đã triển khai và được duyệt — chưa commit

- Thiết kế cũ đã được thay bằng Album ký ức chỉ dùng journal và ảnh/chú thích journal. API, bộ chọn bìa và giao diện không trả/hiển thị task, trạng thái, note hoặc ảnh task; highlight task cũ được giữ tương thích nhưng không xuất hiện và không bị xóa hàng loạt.
- Backend thêm tổng quan Năm/Tháng gọn, danh sách ngày phân trang, chi tiết ngày, metadata album unique theo user/năm/tháng và bìa thủ công/tự động. Sáu ngày xem trước ưu tiên highlight, phân bố ổn định theo thời gian, không lặp và sắp tăng dần.
- Giai đoạn cá nhân chỉ dùng journal/ảnh journal trong khoảng, tải nội dung theo trang và mở được khoảng dài hơn 366 ngày. Xóa ảnh/journal nguồn dọn tham chiếu album/giai đoạn, nhưng không xóa nguồn khác.
- Frontend có Album Năm/Tháng/Tuần/Ngày với bố cục riêng, mặc định tháng hiện tại, lịch sử Back/khôi phục vị trí, editor album tháng, highlight journal, ảnh private và CRUD giai đoạn ở khu vực phụ. Link sửa journal dùng lại editor của Lịch; request cũ bị hủy/bỏ qua.
- Hồ sơ, video hồi tưởng, chia sẻ và AI không được thêm.

### Kiểm chứng của Codex

- Frontend `npm run typecheck`, `npm run lint`, `npm run build`: PASS trên source Album cuối; Vite build 41 modules thành công.
- Backend `npm run typecheck`, `npm run lint`, `npm run build`: PASS. Toàn bộ `npm test`: **54/54 PASS**, 0 fail/cancelled/skipped/todo trên source cuối; trong đó suite Album ký ức **8/8 PASS** và suite media/R2 thật **8/8 PASS**. Lượt thành công dùng DNS mặc định, `daytrail_test` và `daytrail-media-test`.
- Chrome headless dùng backend/frontend riêng `4022`/`5182`, DevTools `9336`, database `daytrail_test` và prefix R2 riêng. PASS: Năm → Tháng → Ngày → quay lại; 12 tháng; 6 ngày xem trước ổn định; đủ 8/8 ngày khi phân trang; highlight; tiêu đề/bìa thủ công → reload → tự động; xem ảnh lớn; giai đoạn dài và guard form.
- Dữ liệu tổng hợp có task/ảnh task mang marker để kiểm tra rò rỉ; kết quả `taskLeaked=false`. Network trang Năm không tải ảnh full. Sau đăng nhập không có Console/runtime/Network lỗi; một HTTP 401 ban đầu là request `/api/auth/me` dự kiến khi chưa có phiên.
- Responsive mô phỏng PASS ở 1.440, 768, 390 và 360 px: không tràn ngang trong Năm/Tháng/Ngày. Ảnh chụp desktop/mobile mô phỏng đã được kiểm tra trực quan; đây không phải kiểm thử điện thoại thật.
- Đây là kiểm thử trình duyệt mô phỏng, không phải điện thoại thật. Checklist điện thoại thật trước phát hành vẫn mở.

### Cleanup và trạng thái

- Các lượt harness đầu lỗi do thứ tự tạo journal chỉ-ảnh và race selector; đây là lỗi harness, không phải lỗi sản phẩm. Dữ liệu mỗi lượt được dọn trước khi chạy lại. Có một lần kết nối cleanup mới gặp `MongoServerSelectionError` do TLS `secureConnect` timeout khoảng 13 giây; `/ready` của backend test phục hồi 200 trong kiểm tra hữu hạn nên không kết luận nguyên nhân DNS/mạng.
- Cleanup cuối theo đúng user marker và prefix: đã xóa 8 object (gồm full/thumbnail), còn 0 object và 0 user test. Cổng `4022`, `5182`, `9336` đã đóng; script, log, Chrome profile tạm đã xóa. Server người dùng `4000`/`5173` không bị dừng. Sáu ảnh chụp nghiệm thu mô phỏng Năm/Tháng/Ngày ở desktop/mobile được giữ ngoài repo trong thư mục tạm để báo cáo.
- **Chặng 5 đạt về kỹ thuật và đã được người dùng thử/duyệt Album ký ức trên máy tính.** Việc duyệt này không thay thế kiểm thử điện thoại thật và chất lượng ảnh điện thoại; hai mục đó vẫn CHƯA KIỂM TRA trong checklist trước phát hành. Tại thời điểm cập nhật dòng này, thay đổi Hành trình chưa commit/push/deploy.
