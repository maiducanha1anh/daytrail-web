# Lộ trình DayTrail

Mỗi chặng chỉ chuyển trạng thái khi có bằng chứng kiểm tra trong [PROGRESS.md](PROGRESS.md).

## Chặng 0 — Nền dự án (đã nghiệm thu)

Frontend/backend chạy được, health API, giao diện responsive, điều hướng khung và tài liệu nền. Điều kiện nghiệm thu: typecheck, lint, build, health, kết nối frontend/backend và kiểm tra desktop/mobile đều đạt hoặc được ghi rõ chưa kiểm chứng.

## Chặng 1 — MongoDB và tài khoản (đã nghiệm thu)

- 1A — Kết nối MongoDB và readiness: đã nghiệm thu.
- 1B.1 — Backend đăng ký, đăng nhập và phiên bền vững: đã nghiệm thu.
- 1B.2 — Giao diện đăng ký, đăng nhập, khôi phục phiên và đăng xuất: đã nghiệm thu.

Điều kiện hoàn tất toàn chặng: backend và frontend auth hoạt động cùng nhau, quyền truy cập được kiểm tra và kiểm thử bảo mật/phiên đều đạt. Chưa tự đánh dấu toàn bộ chặng 1 hoàn tất khi chưa có yêu cầu chốt riêng.

## Chặng 2 — Công việc và Hôm nay (đang thực hiện)

Triển khai dữ liệu công việc, quyền sở hữu, màn hình Hôm nay và chi tiết công việc. Điều kiện nghiệm thu: API, UI responsive và kiểm thử dữ liệu theo tài khoản đều đạt.

- 2A — Backend công việc một lần theo ngày: đã triển khai, kiểm chứng và nghiệm thu.
- 2B — Frontend công việc trong Hôm nay và lập kế hoạch cơ bản trong Lịch: đã triển khai, kiểm chứng và được người dùng duyệt.

## Chặng 3 — Lịch và công việc lặp

Mở rộng từ lịch tháng nhỏ của chặng 2B sang chế độ năm/tháng/tuần/ngày đầy đủ và quy tắc lặp. Điều kiện nghiệm thu: các phạm vi sửa/xóa và lịch sử dữ liệu được kiểm thử.

- 3A — Các chế độ xem Năm/Tháng/Tuần/Ngày, responsive và tổng quan theo khoảng: đã triển khai, kiểm chứng và được người dùng duyệt.
- 3B.1 — Backend chuỗi lặp hữu hạn, thao tác một lần và dừng chuỗi: đã triển khai, Codex kiểm chứng và được người dùng duyệt.
- 3B.2 — Giao diện tạo/dừng chuỗi và hiển thị nguồn lặp: đã triển khai, Codex kiểm chứng và được người dùng duyệt sau khi thử thủ công.

Chặng 3B hoàn tất trong phạm vi V1 đã thống nhất. Chưa hỗ trợ sửa hàng loạt quy tắc hoặc toàn bộ chuỗi; ảnh, nhật ký ngày và Hành trình thuộc các chặng sau.

## Chặng 4 — Nhật ký và ảnh

Triển khai nhật ký riêng tư độc lập với công việc: ngày không có công việc vẫn có nhật ký, hỗ trợ nhiều ảnh và chú thích từng ảnh. Bổ sung ảnh công việc để xem lại từ chi tiết công việc ở ngày cũ; file nằm trong object storage và MongoDB lưu metadata. Điều kiện nghiệm thu: quyền riêng tư, lỗi upload và dọn file được kiểm thử.

- 4A — Backend nhật ký văn bản theo ngày, version chống ghi đè và danh sách đoạn trích: đã triển khai, Codex kiểm chứng và được người dùng duyệt về backend.
- 4B — Giao diện viết, xem lại, xóa, bảo vệ bản nháp và xử lý xung đột version: đã triển khai, kiểm chứng và được người dùng duyệt.
- 4C.0 — Thiết kế private object storage, vòng đời ảnh và kế hoạch kiểm thử: đã duyệt; hai bucket private development/test đã được người dùng tạo.
- 4C.1 — Backend ảnh: adapter lưu trữ, metadata, quyền, cleanup/retry và suite tích hợp đã triển khai; 46/46 test PASS bằng DNS tạm trong tiến trình và đã được người dùng duyệt về backend. Development bình thường trên hotspot chưa xác nhận.
- 4C.2 — Frontend ảnh: chọn/xem/xóa/chú thích và xử lý lỗi responsive: chưa bắt đầu.

Toàn bộ chặng 4C chưa hoàn tất cho đến khi 4C.2 được triển khai và nghiệm thu.

## Chặng 5 — Hành trình

Triển khai timeline, khoảnh khắc nổi bật và giai đoạn cá nhân liên kết dữ liệu gốc. Điều kiện nghiệm thu: điều hướng thời gian và liên kết dữ liệu đúng trên desktop/mobile.

## Chặng 6 — Hoàn thiện V1

Kiểm thử tổng thể, sao lưu, khôi phục, thùng rác và triển khai V1. Điều kiện nghiệm thu: checklist vận hành, bảo mật, backup/restore và smoke test production đều đạt.

Hồ sơ/lời mở đầu cá nhân, video hồi tưởng, chia sẻ hành trình và AI nằm sau phạm vi V1, chưa được triển khai.
