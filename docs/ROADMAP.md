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
- Frontend công việc và màn hình Hôm nay: chưa bắt đầu.

## Chặng 3 — Lịch và công việc lặp

Triển khai chế độ năm/tháng/tuần/ngày, tạo công việc theo ngày và quy tắc lặp. Điều kiện nghiệm thu: các phạm vi sửa/xóa và lịch sử dữ liệu được kiểm thử.

## Chặng 4 — Nhật ký và ảnh

Triển khai nhật ký riêng tư, upload ảnh và metadata object storage. Điều kiện nghiệm thu: quyền riêng tư, lỗi upload và dọn file được kiểm thử.

## Chặng 5 — Hành trình

Triển khai timeline, khoảnh khắc nổi bật và giai đoạn cá nhân liên kết dữ liệu gốc. Điều kiện nghiệm thu: điều hướng thời gian và liên kết dữ liệu đúng trên desktop/mobile.

## Chặng 6 — Hoàn thiện V1

Kiểm thử tổng thể, sao lưu, khôi phục, thùng rác và triển khai V1. Điều kiện nghiệm thu: checklist vận hành, bảo mật, backup/restore và smoke test production đều đạt.

AI nằm sau phạm vi V1 và chưa được triển khai.
