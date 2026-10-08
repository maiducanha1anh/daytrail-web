# DayTrail Web

Frontend React + TypeScript + Vite của DayTrail. **Hôm nay** có công việc, nhật ký văn bản và tổng quan ngày. **Lịch** có bốn chế độ Năm/Tháng/Tuần/Ngày, giao diện công việc lặp và nhật ký ở chế độ Ngày. Ảnh và **Hành trình** chưa được triển khai.

## Chạy trên Windows

Mở PowerShell thứ nhất cho backend:

```powershell
cd C:\daytrail-api
npm run dev
```

Kết quả mong đợi: MongoDB báo sẵn sàng với database `daytrail` và API lắng nghe tại `http://localhost:4000`.

Mở PowerShell thứ hai cho frontend:

```powershell
cd C:\daytrail-web
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Mở `http://localhost:5173`. `VITE_API_BASE_URL` mặc định là `http://localhost:4000`. Kết quả mong đợi:

- Khi chưa có phiên: hiển thị form đăng nhập/đăng ký.
- Khi đăng nhập thành công: hiển thị tên người dùng, công việc hôm nay và ba mục điều hướng.
- Khi tải lại trang: `/api/auth/me` khôi phục phiên mà không hiện thoáng nội dung sai trạng thái.
- Khi đăng xuất: quay về form đăng nhập.
- Trong **Lịch**: chuyển giữa Năm/Tháng/Tuần/Ngày; tạo công việc một lần hoặc lặp ngày/tuần/tháng; sửa, chuyển ngày và xóa đúng một lần thực hiện.
- Trong **Hôm nay**: mở chi tiết để lưu note và đánh dấu hoàn thành; tổng quan cập nhật theo dữ liệu backend.
- Trong **Hôm nay** hoặc chế độ **Ngày** của Lịch: viết, sửa và xóa nhật ký theo ngày. DayTrail không tự lưu; khi đổi màn hình với bản nháp chưa lưu, ứng dụng hỏi lưu, bỏ thay đổi hoặc tiếp tục chỉnh.

Nếu frontend báo mất kết nối, mở `http://localhost:4000/api/health` và `http://localhost:4000/api/ready`. Header chỉ hiện **Dữ liệu sẵn sàng** khi cả API và MongoDB đều hoạt động; **Dữ liệu gián đoạn** nghĩa API còn chạy nhưng `/ready` đang 503. Nếu một endpoint không trả HTTP 200, xử lý backend theo `C:\daytrail-api\docs\OPERATIONS.md` trước.

## Kiểm tra source

Trong PowerShell tại `C:\daytrail-web`, chạy:

```powershell
npm run typecheck
npm run lint
npm run build
```

Kết quả mong đợi: cả ba lệnh kết thúc với exit code 0 và Vite tạo thư mục `dist`. Không commit `dist`.

Kết quả nghiệm thu chặng 2B: Codex đã chạy lại cả ba lệnh và kiểm tra Chrome headless với backend riêng cổng 4013, frontend riêng cổng 5174 và database `daytrail_test`. Luồng công việc, khôi phục phiên, xử lý HTTP 503 và responsive 390/1440 px đều PASS; dữ liệu test đã được dọn theo marker riêng.

Kết quả kiểm chứng chặng 3A: Codex chạy `typecheck`, `lint`, `build` đều PASS. Chrome headless dùng backend/frontend riêng tại cổng 4014/5175 và `daytrail_test`: bốn chế độ Lịch, ngày nhuận, tuần giao năm, bảo vệ note chưa lưu, lỗi 503/thử lại, reload phiên và responsive 360/390/1440 px đều PASS; Console/runtime có 0 lỗi. Chặng đã được người dùng duyệt.

Kết quả kiểm chứng chặng 3B.2: frontend `typecheck`, `lint`, `build` PASS. Chrome headless dùng backend/frontend riêng tại 4015/5176 và `daytrail_test`: tạo một lần, lặp ngày/tuần/tháng, ngày 31, thao tác một lần, dừng từ lần đã chuyển ngày, bảo vệ note khi HTTP 503, reload không sinh trùng và responsive 360/390/1440 px đều PASS; runtime exception có 0. Dữ liệu và tiến trình test đã được dọn.

Kết quả nghiệm thu chặng 4B: frontend `typecheck`, `lint`, `build` PASS. Codex đã kiểm tra Chrome headless với backend riêng cổng `4017`, frontend riêng cổng `5177` và database thật `daytrail_test`: tạo/đọc/sửa/reload/xóa, đồng bộ Hôm nay–Lịch, bảo vệ ba lựa chọn bản nháp, xung đột hai tab, 401, cách ly tài khoản, HTTP 503/lỗi mạng, hồi quy công việc/công việc lặp và responsive 360/390/1440 px đều PASS; runtime exception có 0. Người dùng đã thử giao diện và duyệt; thay đổi đã push. Backend ảnh riêng tư 4C.1 đã được duyệt. Giao diện ảnh 4C.2 đã đạt kiểm chứng kỹ thuật với MongoDB/R2 thật trên môi trường test, frontend `typecheck`/`lint`/`build` PASS và backend 46/46 test PASS. Người dùng đã thử trên máy tính và duyệt giao diện 4C.2 cùng lượt tinh gọn UI. Kiểm thử trên điện thoại thật và chất lượng cảm quan của ảnh chụp điện thoại vẫn chưa được thực hiện, là mục bắt buộc trước phát hành.

## Kiểm tra thủ công luồng tài khoản và công việc

Trong trình duyệt tại `http://localhost:5173`:

1. Đăng ký bằng tên, email và mật khẩu hợp lệ; kết quả mong đợi là chuyển về đăng nhập, điền sẵn email và xóa mật khẩu.
2. Đăng nhập; tải lại trang để kiểm tra phiên vẫn còn.
3. Mở **Lịch**, chọn hôm nay và tạo một công việc. Kết quả mong đợi: công việc xuất hiện đúng ngày; form không có note hoặc trạng thái hoàn thành.
4. Mở chi tiết công việc, nhập note rồi tích hoàn thành. Tải lại trang; note và trạng thái phải còn nguyên.
5. Thử bỏ hoàn thành, sửa, chuyển ngày và xóa. Danh sách cùng tổng quan phải cập nhật sau khi backend xác nhận.
6. Nhập note nhưng chưa lưu rồi đóng chi tiết hoặc đổi ngày. DayTrail phải cho chọn lưu, bỏ thay đổi hoặc tiếp tục chỉnh.
7. Thu trình duyệt về khoảng 390 px và mở chi tiết. Trang không được tràn ngang; nội dung dialog cuộn được và các nút vẫn thao tác được.
8. Đăng xuất rồi đăng nhập tài khoản khác. Công việc của tài khoản trước không được xuất hiện.
9. Mở DevTools → Application: không được có token hoặc mật khẩu trong Local Storage/Session Storage. Cookie phiên là `HttpOnly` nên JavaScript không đọc được.
10. Trong **Lịch**, thử Năm/Tháng/Tuần/Ngày; dùng nút trước/sau và **Hôm nay**. Trên điện thoại, lịch chọn ngày phải mở/thu được và Tuần phải chuyển thành danh sách dọc.
11. Chọn tháng 2 của năm nhuận và một tuần giao năm; ngày phải đúng, trang không tràn ngang. Ngày không có việc không được hiển thị 100% hoàn thành.
12. Tạo chuỗi ngày, tuần nhiều thứ và tháng. Kiểm tra ngày kết thúc bắt buộc; chuỗi tháng ngày 31 phải bỏ qua tháng không có ngày 31.
13. Mở một lần lặp để sửa/chuyển/xóa riêng lần đó. Mở chi tiết, kiểm tra thông tin chuỗi rồi chọn **Dừng lặp**; kết quả phải báo số lần loại bỏ và giữ lại.
14. Viết nhật ký trong **Hôm nay**, lưu rồi mở đúng ngày đó ở **Lịch → Ngày**. Sửa và tải lại trang; nội dung, xuống dòng và khoảng trắng phải còn nguyên.
15. Sửa nhật ký nhưng chưa lưu rồi đổi ngày/tab hoặc đăng xuất. Kiểm tra đủ ba lựa chọn: **Lưu và tiếp tục**, **Bỏ thay đổi**, **Tiếp tục chỉnh**.
16. Mở cùng ngày ở hai tab, lưu thay đổi ở tab thứ nhất rồi lưu bản cũ ở tab thứ hai. Tab thứ hai phải giữ bản nháp, báo xung đột và cho đối chiếu bản mới nhất; không tự ghi đè.

Nếu gặp lỗi, mở DevTools → Network, kiểm tra request `/api/auth/*` hoặc `/api/tasks*` và đối chiếu mã HTTP với [hợp đồng API](docs/API_CONTRACT.md). Không sao chép cookie hoặc thông tin đăng nhập khi gửi log hỗ trợ.

## Tài liệu

- [Đặc tả sản phẩm](docs/PRODUCT_SPEC.md)
- [Lộ trình](docs/ROADMAP.md)
- [Hợp đồng API](docs/API_CONTRACT.md)
- [Tiến độ và bằng chứng kiểm tra](docs/PROGRESS.md)
