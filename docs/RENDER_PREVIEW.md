# Chuẩn bị bản thử DayTrail trên một Render Web Service

Tài liệu này mô tả cấu hình dự kiến. Chưa có dịch vụ, database, bucket hoặc URL online nào được tạo trong lượt chuẩn bị này.

## 1. Kiến trúc một origin

Chỉ tạo một Render Web Service từ repo backend. Trong build, backend tải đúng commit frontend đã khóa, chạy Vite rồi giữ duy nhất thư mục `dist` đã tạo. Express phục vụ giao diện và API trên cùng hostname Render cấp:

- Website: `https://<ten-dich-vu>.onrender.com/` — URL thật chờ Render cấp.
- API: `https://<ten-dich-vu>.onrender.com/api/*`.
- Link xác minh/reset: cùng hostname, dùng hash route hiện có.

Phương án này không cần custom domain và không tạo cookie cross-site. DayTrail tiếp tục dùng cookie host-only `HttpOnly`, `Secure`, `SameSite=Lax`, `credentials: include`, CSRF theo Origin và toàn bộ kiểm tra chủ sở hữu của ảnh private. CORS vẫn chỉ cho phép đúng `FRONTEND_ORIGIN`; không dùng wildcard.

Frontend đã build dùng API base rỗng, vì vậy request `/api/...` đi thẳng tới cùng origin. Không đặt `VITE_API_BASE_URL` trên Render. Các API client hiện đều truyền path bắt đầu bằng `/api`, nên không thiếu hoặc lặp prefix.

## 2. Đóng gói hai repo mà không gộp lịch sử

Render chỉ liên kết repo backend. File `render.frontend-lock.mjs` trong backend khóa:

- Repo: `https://github.com/maiducanha1anh/daytrail-web.git`.
- Commit: `14fc1b0c044c69f835998557c7aee4dfa131e9bd`.

`npm run build:render` thực hiện:

1. Build TypeScript backend.
2. Khởi tạo thư mục Git tạm và fetch đúng full SHA frontend qua HTTPS.
3. Xác nhận checkout trùng SHA trong lock file; không dùng `main` trôi nổi.
4. Chạy `npm ci` bằng lockfile frontend và build với API base cùng origin.
5. Từ chối output có dotfile, symlink hoặc URL API development.
6. Chép duy nhất frontend `dist` vào `render-frontend-dist`.
7. Xóa source frontend và repository Git tạm, kể cả khi build lỗi.

Repo frontend hiện truy cập công khai qua HTTPS mà không cần GitHub token. URL trong lock file bị từ chối nếu chứa username/password. Không đưa token vào URL, source, log hoặc artifact. Nếu repo frontend được chuyển thành private, build sẽ fail đóng; cần thiết kế quyền bằng GitHub App/deploy credential của nền tảng trước khi deploy, không thêm token vào lock file.

Không commit `dist`, `render-frontend-dist` hoặc `.render-build`. Khi muốn đưa frontend mới lên bản thử, cập nhật full SHA trong lock file qua một thay đổi được rà soát.

## 3. Phạm vi Express phục vụ

- Express chỉ phục vụ đường dẫn `FRONTEND_DIST_DIR`, mặc định `render-frontend-dist` ở production.
- `/api/*` được xử lý trước static. API không tồn tại trả JSON 404 với code `API_NOT_FOUND`, không trả `index.html`.
- Dotfile, source path và đường dẫn ngoài artifact không được phục vụ.
- DayTrail dùng hash route; fragment không được gửi lên server, nên reload `/#calendar`, `/#journey`, `/#verify-email` hoặc `/#reset-password` vẫn là request `/` và không cần SPA catch-all.
- Route path tùy ý như `/calendar` không phải route hợp lệ và trả 404; route đúng là `/#calendar`.

## 4. Trường tạo Render Web Service

| Trường Render | Giá trị |
|---|---|
| Service type | Web Service |
| Repo | `https://github.com/maiducanha1anh/daytrail-api.git` |
| Branch | `main` |
| Root Directory | để trống |
| Runtime | Node |
| Node | `22.23.3`, lấy từ `.node-version` |
| Build Command | `npm ci --include=dev --no-audit --no-fund && npm run build:render && npm prune --omit=dev --no-audit --no-fund` |
| Start Command | `npm start` |
| Plan | Free cho bản thử |
| Health Check Path | `/api/ready` |
| Auto-Deploy | Off trong giai đoạn cấu hình/nghiệm thu |

Backend đọc `PORT` do Render cấp và bind `0.0.0.0`. Không tự đặt biến `PORT` trên dashboard.

## 5. Biến backend runtime

Không có biến build-time frontend bắt buộc. Không đặt secret trong `VITE_*`.

| Biến | Bắt buộc | Giá trị công khai hoặc placeholder | Mục đích |
|---|---:|---|---|
| `NODE_ENV` | Có | `production` | Bật cookie Secure, trust proxy và static frontend production. |
| `FRONTEND_ORIGIN` | Có | `https://<ten-dich-vu>.onrender.com` | Origin chính xác do Render cấp, không có dấu `/` cuối. |
| `FRONTEND_BASE_URL` | Có | `https://<ten-dich-vu>.onrender.com` | Tạo link xác minh/reset cùng origin. |
| `FRONTEND_DIST_DIR` | Tùy chọn | `render-frontend-dist` | Mặc định đã là giá trị này; chỉ đổi khi đổi quy trình build. |
| `MONGODB_DATABASE` | Có | `daytrail_preview` | Tên database ứng dụng online; cấu hình ứng dụng không cho phép dùng `daytrail_test`. |
| `MONGODB_URI` | Có, secret | `mongodb+srv://<user>:<password>@<cluster-host>/daytrail_preview?...` | Pathname phải ghi rõ `/daytrail_preview` và khớp chính xác `MONGODB_DATABASE`. |
| `EMAIL_PROVIDER` | Có | `gmail_api` | Không fallback sang SMTP. |
| `GMAIL_SENDER_EMAIL` | Có | `<gmail-gui-thu>` | From cố định ở backend. |
| `GMAIL_API_TIMEOUT_MS` | Khuyến nghị | `10000` | Timeout Gmail API. |
| `R2_ENDPOINT` | Có | `https://<account-id>.r2.cloudflarestorage.com` | Endpoint HTTPS của R2. |
| `R2_ACCESS_KEY_ID` | Có, secret | `<preview-access-key-id>` | Khóa giới hạn cho bucket preview. |
| `R2_SECRET_ACCESS_KEY` | Có, secret | `<preview-secret-access-key>` | Secret của khóa preview. |
| `R2_BUCKET` | Có | `daytrail-media-preview` | Bucket private riêng đề xuất, chưa được tạo. |
| `R2_TIMEOUT_MS` | Khuyến nghị | `20000` | Timeout R2. |
| `MEDIA_UPLOAD_CONCURRENCY` | Khuyến nghị | `2` | Giới hạn upload song song. |
| `HTTP_REQUEST_TIMEOUT_MS` | Khuyến nghị | `120000` | Cho upload tối đa 8 MiB trên mạng chậm. |
| `MONGODB_CONNECT_TIMEOUT_MS` | Tùy chọn | `10000` | Timeout kết nối Atlas. |
| `MONGODB_PING_TIMEOUT_MS` | Tùy chọn | `3000` | Timeout readiness. |
| `SESSION_TTL_DAYS` | Tùy chọn | `7` | Tuổi phiên. |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Tùy chọn | `900000` | Cửa sổ rate limit auth. |
| `AUTH_RATE_LIMIT_MAX` | Tùy chọn | `10` | Số request auth trong cửa sổ. |
| `EMAIL_COOLDOWN_SECONDS` | Tùy chọn | `60` | Cooldown gửi thư tài khoản. |

Không cấu hình `MONGODB_TEST_URI`, `R2_TEST_*`, `SMTP_*` hoặc `VITE_API_BASE_URL` trên Web Service.

### Gmail OAuth

Chọn đúng một cách:

- Secret File: tạo `gmail-authorized-user.json`, đặt `GMAIL_AUTHORIZED_USER_FILE=/etc/secrets/gmail-authorized-user.json`.
- Environment Secrets: đặt `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, `GMAIL_OAUTH_REFRESH_TOKEN` và không đặt `GMAIL_AUTHORIZED_USER_FILE`.

OAuth vẫn External / Testing; refresh token có thể hết hạn sau khoảng 7 ngày. Việc hoàn thiện Branding/publishing và vận hành token dài hạn vẫn chưa hoàn tất.

## 6. Dữ liệu preview và quyền mạng

- Dùng database `daytrail_preview` trong cluster Atlas hiện có. Tạo database user riêng và chỉ cấp `readWrite` trên `daytrail_preview`; không cấp quyền trên `daytrail` hoặc `daytrail_test`.
- Dùng bucket private `daytrail-media-preview` và token chỉ có quyền cần thiết trên bucket đó.
- Không dùng `daytrail_test`, `daytrail-media-test` hoặc script cleanup test cho bản online.
- Sau khi tạo Web Service, lấy toàn bộ CIDR tại **Connect → Outbound** rồi thêm đúng các CIDR đó vào Atlas IP Access List. Không mở `0.0.0.0/0`.

## 7. Cold start của Render Free

Vì HTML/CSS/JS và API đều do một Free Web Service phục vụ, khi service ngủ thì **toàn bộ website** có cold start, không chỉ API. Request mở trang đầu tiên có thể phải chờ khoảng một phút; health check, đăng nhập và ảnh private chỉ hoạt động sau khi instance thức và MongoDB sẵn sàng.

Đây là đánh đổi của phương án miễn phí một origin. Session vẫn nằm trong MongoDB nên restart/sleep không làm mất phiên. Filesystem runtime là tạm thời; frontend artifact được tạo lại khi deploy, còn dữ liệu và ảnh vẫn nằm ở Atlas/R2.

## 8. Backup, restore và rollback

MongoDB và R2 phải được sao lưu độc lập nhưng cùng mốc thời gian:

1. Dùng `mongodump --archive --gzip` với credential ngoài repo.
2. Dùng `rclone copy` sao chép bucket preview sang kho backup riêng.
3. Ghi manifest gồm thời gian, checksum database archive và danh sách/checksum object.
4. Restore thử vào cluster/database và bucket tách biệt; không dùng `--drop` trên preview.
5. Chỉ đánh dấu PASS sau khi backend cô lập đọc được dữ liệu và ảnh private từ bản restore.

Rollback deploy chỉ hoàn tác code/artifact, không hoàn tác MongoDB, R2 hoặc biến môi trường. Thay đổi schema sau này phải tương thích ngược hoặc có kế hoạch migration riêng.

## 9. Thứ tự triển khai sau khi được phép

1. Chọn tên Web Service và tạo Atlas/R2 preview riêng.
2. Tạo một Web Service từ repo backend với Auto-Deploy Off và các trường ở mục 4.
3. Sau khi Render cấp URL thật, sao chép nguyên origin HTTPS vào `FRONTEND_ORIGIN` và `FRONTEND_BASE_URL`; không tự đoán URL.
4. Lấy outbound CIDR của service và cập nhật Atlas.
5. Nhập runtime secrets, chọn một cách nạp Gmail OAuth rồi manual deploy.
6. Kiểm tra `/`, `/api/health`, `/api/ready`, API 404, đăng ký/login/reload, link email, upload 8 MiB và ảnh private.
7. Kiểm tra Chrome/Safari trên điện thoại thật, cold start và backup/restore trước khi mời người dùng thật.

## 10. Phần còn chờ

- Chưa tạo Web Service hoặc nhận URL `onrender.com` thật.
- Chưa tạo Atlas/R2 preview và chưa có outbound CIDR Render để allowlist.
- OAuth Gmail vẫn External / Testing, chưa có phương án token dài hạn.
- Chưa diễn tập backup/restore.
- Chưa kiểm thử online, cold start thật, điện thoại thật hoặc ảnh camera thật.
- Render Free không phù hợp production cần SLA; bản thử chấp nhận cold start của toàn bộ website.

## 11. Tài liệu chính thức

- [Render Web Services](https://render.com/docs/web-services): trường tạo dịch vụ, `PORT`, bind `0.0.0.0` và hostname `onrender.com`.
- [Render Deploys](https://render.com/docs/deploys): build/start command, auto-deploy và rollback artifact.
- [Render Free](https://render.com/docs/free): giới hạn và cold start của Free Web Service.
- [Render Environment Variables](https://render.com/docs/configure-environment-variables): runtime secret và Secret File.
- [Render Outbound IPs](https://render.com/docs/outbound-ip-addresses): CIDR cần allowlist trên Atlas.
- [MongoDB Atlas Backup/Restore](https://www.mongodb.com/docs/atlas/backup-restore-cluster/) và [Cloudflare R2 với rclone](https://developers.cloudflare.com/r2/examples/rclone/): backup dữ liệu và object độc lập.
