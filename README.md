# DayTrail Web

Frontend React + TypeScript + Vite của DayTrail. Chặng 1B.2 đã bổ sung giao diện đăng ký, đăng nhập, khôi phục phiên và đăng xuất bằng cookie `HttpOnly`. Khung **Hôm nay**, **Lịch**, **Hành trình** vẫn là nội dung nền; các nghiệp vụ công việc, lịch, nhật ký và ảnh chưa được triển khai.

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
- Khi đăng nhập thành công: hiển thị tên người dùng và khung ba mục điều hướng.
- Khi tải lại trang: `/api/auth/me` khôi phục phiên mà không hiện thoáng nội dung sai trạng thái.
- Khi đăng xuất: quay về form đăng nhập.

Nếu frontend báo mất kết nối, mở `http://localhost:4000/api/health` và `http://localhost:4000/api/ready`. Nếu một endpoint không trả HTTP 200, xử lý backend theo `C:\daytrail-api\docs\OPERATIONS.md` trước.

## Kiểm tra source

Trong PowerShell tại `C:\daytrail-web`, chạy:

```powershell
npm run typecheck
npm run lint
npm run build
```

Kết quả mong đợi: cả ba lệnh kết thúc với exit code 0 và Vite tạo thư mục `dist`. Không commit `dist`.

## Kiểm tra thủ công luồng tài khoản

Trong trình duyệt tại `http://localhost:5173`:

1. Đăng ký bằng tên, email và mật khẩu hợp lệ; kết quả mong đợi là chuyển về đăng nhập, điền sẵn email và xóa mật khẩu.
2. Đăng nhập; tải lại trang để kiểm tra phiên vẫn còn.
3. Chuyển giữa Hôm nay/Lịch/Hành trình, sau đó đăng xuất.
4. Mở DevTools → Application: không được có token hoặc mật khẩu trong Local Storage/Session Storage. Cookie phiên là `HttpOnly` nên JavaScript không đọc được.

Nếu gặp lỗi, mở DevTools → Network, kiểm tra request `/api/auth/*` và đối chiếu mã HTTP với [hợp đồng API](docs/API_CONTRACT.md). Không sao chép cookie hoặc thông tin đăng nhập khi gửi log hỗ trợ.

## Tài liệu

- [Đặc tả sản phẩm](docs/PRODUCT_SPEC.md)
- [Lộ trình](docs/ROADMAP.md)
- [Hợp đồng API](docs/API_CONTRACT.md)
- [Tiến độ và bằng chứng kiểm tra](docs/PROGRESS.md)
