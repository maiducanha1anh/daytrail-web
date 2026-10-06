# Thiết kế lưu trữ ảnh 4C.0

> Trạng thái: phương án 4C.0 đã được chọn. Backend 4C.1 cùng hai bucket private đã triển khai, kiểm chứng 46/46 test bằng DNS tạm trong tiến trình và được người dùng duyệt về backend. Frontend 4C.2 chưa triển khai nên toàn bộ chặng 4C chưa hoàn tất.

## Quyết định đề xuất

Chọn **Cloudflare R2, bucket riêng tư, Standard storage**. R2 tương thích S3 nên backend Express có thể dùng SDK S3; bucket không public và không gắn custom domain. R2 hiện có 10 GB-tháng, 1 triệu thao tác ghi và 10 triệu thao tác đọc miễn phí mỗi tháng; egress không tính phí. Sau mức miễn phí, Standard storage là 0,015 USD/GB-tháng, Class A là 4,50 USD/triệu và Class B là 0,36 USD/triệu thao tác. Xem [bảng giá R2 chính thức](https://developers.cloudflare.com/r2/pricing/) trước khi tạo subscription.

| Lựa chọn | Ưu điểm | Điểm cần cân nhắc |
| --- | --- | --- |
| **Cloudflare R2 (đề xuất)** | Chi phí minh bạch cho app cá nhân, S3 API, không tính egress; backend giữ toàn quyền đọc/ghi/xóa và không cần biến `VITE_*`. | DayTrail tự tạo thumbnail/chuẩn hóa ảnh bằng backend ở 4C.1. |
| Cloudinary | Có sẵn xử lý ảnh/CDN; gói Free hiện dùng 25 credits/tháng. | Upload mặc định là public; phải dùng `authenticated` delivery và URL ký. Chi phí tính theo credits và cách vận hành phụ thuộc nền tảng hơn. |

Cloudinary vẫn là phương án thay thế hợp lệ nếu sau này cần biến đổi ảnh phong phú. Tài liệu chính thức xác nhận asset `authenticated` chỉ xem qua URL ký, còn xóa bằng API phải ký ở backend: [quyền truy cập](https://cloudinary.com/documentation/control_access_to_media), [xóa asset](https://cloudinary.com/documentation/delete_assets), [gói cước](https://cloudinary.com/documentation/billing_and_plans).

## Riêng tư và luồng truy cập

- MongoDB chỉ lưu metadata và object key; không lưu base64, URL public lâu dài, access key hay secret.
- Khóa R2 chỉ nằm trong biến môi trường backend. Frontend không nhận `R2_SECRET_ACCESS_KEY` và không có biến `VITE_*` cho R2.
- V1 upload qua backend đã có session, không dùng browser upload trực tiếp. Backend kiểm tra `Origin`, session, chủ sở hữu task/journal và bytes thực của file trước khi ghi R2.
- V1 xem ảnh qua `GET /api/images/:imageId/file?variant=thumbnail|full`: backend kiểm tra session + owner rồi stream object với `Content-Disposition: inline`, `X-Content-Type-Options: nosniff` và cache riêng. Bucket vẫn private.
- Có thể tối ưu sau bằng presigned `GET` rất ngắn (ví dụ 60 giây), chỉ sau khi backend xác thực. Presigned URL là bearer token, nên không ghi vào MongoDB/log và không dùng làm URL công khai lâu dài. R2 giới hạn presigned URL từ 1 giây đến 7 ngày và hỗ trợ `GET`, `PUT`, `HEAD`, `DELETE`: [tài liệu chính thức](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

## Phạm vi và giới hạn V1 đề xuất

- Mỗi task hoặc nhật ký: tối đa **12 ảnh**; mỗi file gốc tối đa **8 MiB**; chú thích tối đa **500 ký tự**.
- Chỉ nhận JPEG, PNG, WebP. Không nhận SVG, GIF động, PDF, video hoặc HEIC trong V1 để giới hạn bề mặt xử lý và bảo đảm hiển thị ổn định. Có thể mở rộng HEIC sau khi kiểm chứng decoder.
- Backend xác minh magic bytes và decode thật, không tin extension hay MIME từ client. Ảnh được xoay theo EXIF orientation, giới hạn cạnh dài 2.560 px, chuyển sang WebP, tạo thumbnail 480 px và loại bỏ toàn bộ EXIF (đặc biệt GPS/vị trí).
- Lưu hai object private: `full` đã chuẩn hóa và `thumbnail`; không giữ bản gốc. Metadata không giữ tên file gốc hoặc dữ liệu vị trí.
- Upload từng ảnh một với `clientUploadId` UUID do frontend tạo. Unique key `(userId, owner, clientUploadId)` làm thao tác retry/idempotent, tránh tạo trùng khi request bị hủy hay người dùng bấm lại.

## Dữ liệu và nhất quán

Collection `MediaAsset` gồm `userId`, `ownerType` (`task` hoặc `journal`), `ownerKey`, quota slot, hai object key, metadata kích thước, `caption`, `version`, `clientUploadId`, hash payload, trạng thái cleanup và timestamps. Object key là nội bộ, không trả ra frontend.

- Task giữ ảnh qua `taskId`; chuyển ngày không đổi `taskId`, nên giữ nguyên ảnh/chú thích. Xóa task đánh dấu tất cả asset liên quan để dọn object.
- Journal có thể có `content: ""` **chỉ khi có ít nhất một ảnh sẵn sàng**. Lần upload ảnh đầu tạo journal trong MongoDB; `GET` vẫn không tự tạo journal ở ngày trống.
- `Journal.version` trở thành version của cả nội dung lẫn danh sách ảnh. Thêm/xóa ảnh hoặc sửa chú thích journal yêu cầu version đã đọc, tăng version nguyên tử và trả 409 nếu tab khác đã thay đổi. Điều này giữ nguyên ý nghĩa chống ghi đè của chặng 4A/4B.
- `MediaAsset.version` bảo vệ sửa chú thích/xóa cùng một ảnh. Response ảnh không chứa `userId`, object key hay secret.
- Điều kiện dừng chuỗi lặp bổ sung `không có ảnh`: chỉ xóa lần chưa hoàn thành, không note **và không có asset `ready`/đang dọn**. Lần đã chuyển ngày vẫn xét `originalDate` như hiện tại.

Không giữ MongoDB transaction trong lúc gọi R2. Luồng upload là: kiểm tra/chuẩn hóa file → tạo intent `uploading` → PUT hai object → transaction MongoDB ngắn để gắn asset `ready` với chủ sở hữu và tăng version phù hợp. Nếu transaction MongoDB thất bại sau PUT, backend xóa bù hai object; nếu xóa bù thất bại, asset chuyển `cleanup_failed` và job retry idempotent sẽ dọn. Nếu PUT lỗi, intent bị xóa/đánh dấu thất bại và không hiện trong API.

Xóa task/journal/ảnh cũng chỉ transaction MongoDB ngắn để ẩn/đánh dấu asset `deleting`, rồi worker retry xóa object. Xóa R2 lỗi không được im lặng: lưu số lần thử, lỗi đã che bí mật và `nextRetryAt`; retry theo backoff, có metric/log vận hành. Metadata chỉ bị xóa hoàn toàn sau khi R2 xóa thành công hoặc theo quy trình xử lý mồ côi được kiểm soát.

## API backend 4C.1

Các thao tác ghi giữ session, `Origin` hợp lệ và chỉ áp dụng multipart parser cho endpoint ảnh; không nới lỏng yêu cầu JSON của endpoint hiện có.

| API | Mục đích |
| --- | --- |
| `POST /api/tasks/:taskId/images` | multipart một `file`, `caption?`, `clientUploadId`; tạo ảnh cho đúng task của user. |
| `GET /api/tasks/:taskId/images` | Danh sách metadata/URL API nội bộ, không trả object key. |
| `POST /api/journals/:date/images` | multipart tương tự, bắt buộc `version` (hoặc `null` khi chưa có journal); ảnh đầu có thể tạo journal chỉ-ảnh. |
| `GET /api/journals/:date/images` | Danh sách ảnh của journal ngày đó, ngày trống trả mảng rỗng. |
| `GET /api/images/:imageId/file` | Stream thumbnail hoặc full sau kiểm tra chủ sở hữu. |
| `PATCH /api/images/:imageId` | Sửa caption theo version; với ảnh journal kèm journal version để xử lý 409. |
| `DELETE /api/images/:imageId` | Xóa một ảnh theo version, đánh dấu dọn object bất đồng bộ. |

Response upload thành công chỉ trả metadata công khai tối thiểu: `id`, `caption`, `mimeType`, `width`, `height`, `byteSize`, `version`, `createdAt`, `thumbnailUrl`, `fullUrl`. HTTP 400 cho file/giới hạn sai; 401/403/404 theo session/quyền/chủ sở hữu; 409 cho version; 413 cho file quá lớn; 415 cho định dạng không hỗ trợ; 503 cho MongoDB/R2 gián đoạn. Frontend chỉ báo thành công sau khi API xác nhận và giữ mục upload/bản nháp để retry an toàn.

## Chuẩn bị thủ công sau khi duyệt phương án

1. Mở trình duyệt, đăng nhập Cloudflare Dashboard. Vào **Storage & databases → R2 → Overview** và hoàn tất luồng R2 subscription; việc này có thể yêu cầu thông tin thanh toán dù có mức dùng miễn phí.
2. Tạo bucket private `daytrail-media-dev`. Không bật public access, không gắn custom domain.
3. Tạo bucket private tách riêng `daytrail-media-test` để test không chạm ảnh development. Tạo API token tối thiểu chỉ có Object Read & Write trên đúng bucket cần dùng; không dùng token phạm vi toàn tài khoản nếu không cần.
4. Lấy endpoint S3, Access Key ID và Secret Access Key. Mở `C:\daytrail-api\.env`, điền các placeholder dưới đây; không gửi secret qua chat và không thêm vào frontend.

```dotenv
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<development-access-key-id>
R2_SECRET_ACCESS_KEY=<development-secret-access-key>
R2_BUCKET=daytrail-media-dev
R2_TEST_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_TEST_ACCESS_KEY_ID=<test-access-key-id>
R2_TEST_SECRET_ACCESS_KEY=<test-secret-access-key>
R2_TEST_BUCKET=daytrail-media-test
R2_TIMEOUT_MS=20000
MEDIA_UPLOAD_CONCURRENCY=2
```

Backend dùng prefix cố định `daytrail/dev`; test dùng `daytrail/test/<run-id>`. Nếu thiếu cấu hình development, phần API cũ vẫn khởi động còn endpoint ảnh trả HTTP 503 đã che bí mật; không fallback local disk. Test bắt buộc đủ `R2_TEST_*` và đúng bucket `daytrail-media-test`, không fallback sang development.

## Kế hoạch triển khai và nghiệm thu

### 4C.1 — Backend ảnh (đã triển khai và được duyệt về backend)

- Đã thêm adapter R2, `MediaAsset`, hàng đợi cleanup/retry, validation multipart và endpoint; đã cập nhật task delete, journal version/journal chỉ-ảnh và điều kiện dừng chuỗi.
- Viết integration test trên `daytrail_test` + `daytrail-media-test`: quyền chủ sở hữu, MIME giả/magic bytes, EXIF/GPS, giới hạn, retry idempotent, 409 journal, chuyển task, dừng chuỗi giữ ảnh, cleanup thất bại và 503.
- Tiêu chí kỹ thuật đã đạt: không có object public/secret trong response, cleanup retry được kiểm thử, test chỉ dọn marker/prefix test; `typecheck`/`lint`/`build` và toàn bộ 46 test PASS. DNS công cộng chỉ được nạp trong tiến trình test; development bình thường trên hotspot chưa được xác nhận.
- Chất lượng cảm quan với ảnh chụp điện thoại thật chưa được kiểm chứng; việc này được chuyển sang kiểm thử giao diện 4C.2.

### 4C.2 — Frontend ảnh

- Thêm vùng chọn nhiều ảnh, tiến độ/tái thử/hủy, lưới thumbnail, xem lớn, sửa caption và xác nhận xóa vào chi tiết task, Hôm nay và Lịch → Ngày; không thêm video hay upload giả.
- Tái sử dụng guard bản nháp: upload/caption chưa hoàn tất ngăn điều hướng; 401/409/503 giữ trạng thái phù hợp, không báo thành công giả.
- Đạt khi browser test với `daytrail_test`/`daytrail-media-test` kiểm tra thêm/xem/xóa/caption, journal chỉ-ảnh, task chuyển ngày, recurrence stop giữ ảnh, lỗi upload/retry, desktop/mobile và không tràn ngang.
