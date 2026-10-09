# DayTrail — Đặc tả sản phẩm

DayTrail là ứng dụng quản lý công việc cá nhân kết hợp nhật ký, dùng trên máy tính và điện thoại. Frontend và backend tách riêng; dữ liệu MongoDB được phân tách theo tài khoản. Ảnh dùng Cloudflare R2 private bucket; MongoDB chỉ lưu metadata và khóa file. Backend 4C.1 và frontend ảnh 4C.2 đã được duyệt; người dùng đã thử giao diện 4C.2 trên máy tính. Kiểm thử điện thoại thật và chất lượng ảnh chụp điện thoại là mục bắt buộc trước phát hành, hiện chưa được xác nhận.

## Hôm nay

Màn hình gồm danh sách công việc, nhật ký ngày và tổng quan ngày. Mỗi công việc hiển thị trạng thái, có thao tác sửa, xóa, chuyển ngày và bảng chi tiết gồm thông tin, note, ảnh và ô hoàn thành.

Note công việc là nội dung riêng với mô tả kế hoạch và được chỉnh từ chi tiết công việc, kể cả trước khi hoàn thành. Note và ảnh của công việc cũ được xem lại từ chính chi tiết công việc ở ngày đó. Không tạo công việc trực tiếp tại màn hình Hôm nay.

Nhật ký ngày độc lập với công việc. Ngày không có công việc vẫn viết được nhật ký. Giao diện văn bản dùng chung giữa Hôm nay và chế độ Ngày của Lịch, bảo vệ bản nháp chưa lưu và không tự ghi đè khi hai tab xung đột. Giao diện nhiều ảnh và chú thích từng ảnh của 4C.2 đã được kiểm chứng kỹ thuật và người dùng duyệt trên máy tính.

## Lịch

Lịch là nơi tạo công việc cho ngày đang chọn. Form gồm tên, giờ bắt đầu, giờ kết thúc, mức ưu tiên, nhóm, mô tả và quy tắc lặp; ngày được lấy từ lịch. Có chế độ năm, tháng, tuần, ngày và giao diện riêng phù hợp desktop/mobile.

- Năm: hiển thị 12 tháng và đánh dấu ngày có dữ liệu.
- Tháng: hiển thị phần trăm hoàn thành cho ngày đã qua; hiển thị công việc hoặc số việc cho ngày tương lai.
- Tuần: hiển thị công việc cùng trạng thái.
- Ngày: hiển thị chi tiết công việc, ghi chú, ảnh và nhật ký.

Ngày không có công việc không được tính là 0% hoàn thành.

Lặp lại V1 gồm: không lặp, hằng ngày, hằng tuần chọn nhiều thứ và hằng tháng cùng ngày trong tháng. Chuỗi bắt buộc ngày kết thúc, tối đa 366 ngày; tháng thiếu ngày tương ứng thì bỏ qua. Mỗi lần xuất hiện có trạng thái, ghi chú và ảnh riêng. Chuyển ngày giữ dữ liệu và liên kết ngày dự kiến ban đầu. Dừng chuỗi từ một ngày sẽ giữ lịch sử đã hoàn thành/có note/có ảnh và xóa phần tương lai chưa có dữ liệu. Chưa hỗ trợ sửa hàng loạt quy tắc chuỗi.

## Hành trình

Hành trình là Album ký ức chỉ đọc nhật ký ngày cùng ảnh/chú thích của nhật ký từ dữ liệu gốc. Task, trạng thái, note và ảnh task không xuất hiện trong Album hoặc bộ chọn bìa. Highlight task cũ được giữ tương thích trong database nhưng không hiển thị và không bị xóa hàng loạt.

- Năm có tối đa 12 thẻ tháng gọn. Tháng có bìa/đoạn trích và tối đa 6 ngày xem trước; danh sách đầy đủ được phân trang. Tuần hiển thị các ngày có nội dung; Ngày đọc đầy đủ nhật ký, ảnh, chú thích và dẫn về editor hiện có.
- Sáu ngày xem trước ưu tiên nhật ký nổi bật, sau đó phân bố ổn định theo thời gian và cuối cùng sắp tăng dần. Không chọn ngẫu nhiên hoặc lặp ngày.
- Bìa tháng chỉ tham chiếu ảnh nhật ký hợp lệ trong tháng. Nếu không chọn thủ công, hệ thống ưu tiên ảnh của ngày nổi bật rồi ảnh đầu tiên theo thứ tự ổn định; không có ảnh thì dùng đoạn trích nguyên văn. Tiêu đề tùy chọn tối đa 100 ký tự, mặc định là tên tháng.
- Một giai đoạn cá nhân gồm tên, khoảng ngày, ảnh bìa nhật ký tùy chọn, lời giới thiệu và tổng kết. Nội dung được phân trang và giai đoạn dài hơn 366 ngày vẫn mở được. Xóa thiết lập album/giai đoạn không xóa nhật ký hoặc ảnh nguồn.

Hồ sơ và lời mở đầu cá nhân, video hồi tưởng và chia sẻ hành trình nằm sau V1.

## Tài khoản và dữ liệu

Sản phẩm hỗ trợ đăng ký, đăng nhập, đăng xuất và khôi phục phiên. Mật khẩu phải được hash bằng thuật toán chuyên dụng; phiên phải an toàn; backend kiểm tra quyền sở hữu trên mỗi tài nguyên. Không lưu token đăng nhập trong `localStorage`.

Nhật ký và ảnh mặc định là riêng tư. Ảnh không dùng URL public dài hạn; backend kiểm tra session/chủ sở hữu trước khi xem và chỉ khóa backend được truy cập object storage. Ngày cá nhân dùng múi giờ `Asia/Ho_Chi_Minh`, phân biệt ngày lịch, giờ địa phương và timestamp. Tự lưu, xử lý lỗi, thùng rác và sao lưu nằm trong lộ trình V1.

## Trạng thái triển khai

- Chặng 0 và kết nối MongoDB của chặng 1A đã nghiệm thu.
- Backend đăng ký, đăng nhập và quản lý phiên của chặng 1B.1 đã nghiệm thu.
- Giao diện đăng ký, đăng nhập, khôi phục phiên và đăng xuất của chặng 1B.2 đã nghiệm thu.
- Backend công việc một lần theo ngày của chặng 2A đã được triển khai, kiểm chứng và nghiệm thu.
- Giao diện công việc trong Hôm nay và lập kế hoạch cơ bản trong Lịch của chặng 2B đã được triển khai, kiểm chứng và nghiệm thu.
- Bốn chế độ Lịch Năm/Tháng/Tuần/Ngày của chặng 3A đã được triển khai, kiểm chứng và người dùng duyệt.
- Backend công việc lặp hữu hạn của chặng 3B.1 và giao diện tạo, nhận biết, thao tác một lần, dừng chuỗi của chặng 3B.2 đã được kiểm chứng và người dùng duyệt. Chặng 3B hoàn tất trong phạm vi V1 đã thống nhất; chưa hỗ trợ sửa hàng loạt quy tắc chuỗi.
- Backend nhật ký văn bản theo ngày của chặng 4A đã được Codex kiểm chứng và người dùng duyệt về backend.
- Giao diện nhật ký văn bản chặng 4B đã được kiểm chứng và người dùng duyệt. Backend ảnh 4C.1 có 46/46 test PASS và được người dùng duyệt. Giao diện ảnh 4C.2 đã đạt kiểm chứng kỹ thuật với backend/R2 test thật; người dùng đã thử trên máy tính và duyệt 4C.2 cùng lượt tinh gọn UI. Chặng 4C hoàn tất trong phạm vi nghiệm thu hiện tại. Kiểm thử điện thoại thật và chất lượng ảnh chụp điện thoại chưa PASS, phải hoàn thành trước phát hành.
- Chặng 5 đã được thiết kế lại thành Album ký ức, đạt kiểm chứng kỹ thuật và được người dùng thử/duyệt trên máy tính: bốn chế độ, highlight nhật ký, thiết lập album tháng và CRUD giai đoạn. Không bao gồm task, hồ sơ, video, chia sẻ hoặc AI; điện thoại thật vẫn chưa kiểm tra.

Chi tiết bằng chứng nằm trong [PROGRESS.md](PROGRESS.md); thứ tự triển khai nằm trong [ROADMAP.md](ROADMAP.md).
