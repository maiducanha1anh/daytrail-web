# DayTrail Web

Frontend React + TypeScript + Vite của DayTrail. Giao diện hiện có khung điều hướng **Hôm nay**, **Lịch**, **Hành trình** và trạng thái kết nối backend. Backend xác thực đã hoàn thành ở chặng 1B.1, nhưng giao diện đăng ký/đăng nhập và các nghiệp vụ công việc, lịch, nhật ký, ảnh chưa được triển khai.

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

Mở `http://localhost:5173`. `VITE_API_BASE_URL` mặc định là `http://localhost:4000`. Kết quả mong đợi: trang hiển thị “Đã kết nối” và ba mục điều hướng chuyển được nội dung khung.

Nếu frontend báo mất kết nối, mở `http://localhost:4000/api/health` và `http://localhost:4000/api/ready`. Nếu một endpoint không trả HTTP 200, xử lý backend theo `C:\daytrail-api\docs\OPERATIONS.md` trước.

## Kiểm tra source

Trong PowerShell tại `C:\daytrail-web`, chạy:

```powershell
npm run typecheck
npm run lint
npm run build
```

Kết quả mong đợi: cả ba lệnh kết thúc với exit code 0 và Vite tạo thư mục `dist`. Không commit `dist`.

## Tài liệu

- [Đặc tả sản phẩm](docs/PRODUCT_SPEC.md)
- [Lộ trình](docs/ROADMAP.md)
- [Hợp đồng API](docs/API_CONTRACT.md)
- [Tiến độ và bằng chứng kiểm tra](docs/PROGRESS.md)
