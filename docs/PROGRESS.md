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
