# DayTrail — Đặc tả sản phẩm

DayTrail là ứng dụng quản lý công việc cá nhân kết hợp nhật ký, dùng trên máy tính và điện thoại. Frontend và backend tách riêng; dữ liệu MongoDB được phân tách theo tài khoản. Ảnh sẽ nằm trong object storage (dịch vụ lưu file, dự kiến Cloudflare R2); MongoDB chỉ lưu metadata và khóa file.

## Hôm nay

Màn hình gồm danh sách công việc, nhật ký ngày và tổng quan ngày. Mỗi công việc hiển thị trạng thái, có thao tác sửa, xóa, chuyển ngày và bảng chi tiết gồm thông tin, note, ảnh và ô hoàn thành.

Note công việc là nội dung riêng với mô tả kế hoạch và được chỉnh từ chi tiết công việc, kể cả trước khi hoàn thành. Note và ảnh của công việc cũ được xem lại từ chính chi tiết công việc ở ngày đó. Không tạo công việc trực tiếp tại màn hình Hôm nay.

Nhật ký ngày độc lập với công việc. Ngày không có công việc vẫn viết được nhật ký và thêm nhiều ảnh; mỗi ảnh nhật ký có thể có chú thích. Nhật ký và ảnh chưa được triển khai trong chặng 2B.

## Lịch

Lịch là nơi tạo công việc cho ngày đang chọn. Form gồm tên, giờ bắt đầu, giờ kết thúc, mức ưu tiên, nhóm, mô tả và quy tắc lặp; ngày được lấy từ lịch. Có chế độ năm, tháng, tuần, ngày và giao diện riêng phù hợp desktop/mobile.

- Năm: hiển thị 12 tháng và đánh dấu ngày có dữ liệu.
- Tháng: hiển thị phần trăm hoàn thành cho ngày đã qua; hiển thị công việc hoặc số việc cho ngày tương lai.
- Tuần: hiển thị công việc cùng trạng thái.
- Ngày: hiển thị chi tiết công việc, ghi chú, ảnh và nhật ký.

Ngày không có công việc không được tính là 0% hoàn thành.

Lặp lại gồm: không lặp, hằng ngày, chọn ngày trong tuần và hằng tuần. Mỗi lần xuất hiện có trạng thái, ghi chú và ảnh riêng. Sửa/xóa có phạm vi “lần này” hoặc “lần này và các lần sau”; không sửa lịch sử, không tạo vô hạn bản ghi tương lai và không tự chuyển việc chưa xong sang hôm sau. Chuyển ngày phải giữ ghi chú và ảnh.

## Hành trình

Timeline (dòng thời gian) theo năm/tháng/tuần/ngày giúp đọc lại công việc, ghi chú, ảnh và nhật ký; có thể đánh dấu khoảnh khắc nổi bật.

Một giai đoạn cá nhân gồm tên, khoảng ngày, ảnh bìa, lời giới thiệu và tổng kết. Giai đoạn liên kết đến dữ liệu gốc, không sao chép nhật ký.

Hồ sơ và lời mở đầu cá nhân, video hồi tưởng và chia sẻ hành trình nằm sau V1.

## Tài khoản và dữ liệu

Sản phẩm hỗ trợ đăng ký, đăng nhập, đăng xuất và khôi phục phiên. Mật khẩu phải được hash bằng thuật toán chuyên dụng; phiên phải an toàn; backend kiểm tra quyền sở hữu trên mỗi tài nguyên. Không lưu token đăng nhập trong `localStorage`.

Nhật ký và ảnh mặc định là riêng tư. Ngày cá nhân dùng múi giờ `Asia/Ho_Chi_Minh`, phân biệt ngày lịch, giờ địa phương và timestamp. Tự lưu, xử lý lỗi, thùng rác và sao lưu nằm trong lộ trình V1.

## Trạng thái triển khai

- Chặng 0 và kết nối MongoDB của chặng 1A đã nghiệm thu.
- Backend đăng ký, đăng nhập và quản lý phiên của chặng 1B.1 đã nghiệm thu.
- Giao diện đăng ký, đăng nhập, khôi phục phiên và đăng xuất của chặng 1B.2 đã nghiệm thu.
- Backend công việc một lần theo ngày của chặng 2A đã được triển khai, kiểm chứng và nghiệm thu.
- Giao diện công việc trong Hôm nay và lập kế hoạch cơ bản trong Lịch của chặng 2B đã được triển khai, kiểm chứng và nghiệm thu.
- Bốn chế độ Lịch Năm/Tháng/Tuần/Ngày của chặng 3A đã được triển khai, kiểm chứng và người dùng duyệt.
- Lịch lặp, ảnh, nhật ký ngày, Hành trình đầy đủ, quên mật khẩu, xác minh email, đăng nhập Google, chỉnh hồ sơ và AI chưa được triển khai.

Chi tiết bằng chứng nằm trong [PROGRESS.md](PROGRESS.md); thứ tự triển khai nằm trong [ROADMAP.md](ROADMAP.md).
