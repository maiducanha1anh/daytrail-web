# Checklist nghiệm thu DayTrail V1

Tài liệu này dùng cho Chặng 6. Kết quả mô phỏng mobile trên máy tính không thay thế kiểm thử trên điện thoại thật. Không dùng dữ liệu cá nhân quan trọng trong lần thử.

## 1. Ghi thông tin lần kiểm tra

Trước khi bắt đầu, ghi lại:

- Ngày kiểm tra, model điện thoại, hệ điều hành và phiên bản trình duyệt.
- Mạng đang dùng: Wi-Fi, hotspot hoặc mạng di động.
- Commit frontend và backend được kiểm tra.
- URL frontend/backend; không ghi token, cookie hoặc biến môi trường bí mật.

Nếu kiểm tra trong mạng LAN, `localhost` trên điện thoại là chính điện thoại. Frontend phải được mở bằng địa chỉ IP LAN của máy tính; `VITE_API_BASE_URL` và `FRONTEND_ORIGIN` phải dùng đúng origin đó. Không mở firewall rộng hoặc sửa DNS chỉ để vượt qua lỗi chưa chẩn đoán.

### Mở bản development trên điện thoại cùng Wi-Fi

Chỉ thực hiện khi cổng `4000` và `5173` đang trống hoặc sau khi bạn chủ động dừng đúng server DayTrail của mình. Dùng `ipconfig` để tìm IPv4 của adapter Wi-Fi đang hoạt động, rồi thay `<IP-LAN-CỦA-MÁY-TÍNH>` bên dưới.

Terminal PowerShell 1:

```powershell
cd C:\daytrail-api
$env:FRONTEND_ORIGIN='http://<IP-LAN-CỦA-MÁY-TÍNH>:5173'
npm run dev
```

Terminal PowerShell 2:

```powershell
cd C:\daytrail-web
$env:VITE_API_BASE_URL='http://<IP-LAN-CỦA-MÁY-TÍNH>:4000'
npm run dev -- --host 0.0.0.0
```

Trên điện thoại mở `http://<IP-LAN-CỦA-MÁY-TÍNH>:5173`. Kết quả mong đợi là đăng nhập được và header báo dữ liệu sẵn sàng. Nếu không mở được, kiểm tra hai thiết bị cùng mạng, đúng IPv4, hai terminal còn chạy và quy tắc Windows Firewall chỉ cho mạng private cần thiết; không đổi Atlas/DNS hoặc mở firewall toàn bộ khi chưa xác định lớp lỗi.

Sau khi thử, nhấn `Ctrl+C` ở đúng hai terminal trên rồi chạy `Remove-Item Env:FRONTEND_ORIGIN -ErrorAction SilentlyContinue` và `Remove-Item Env:VITE_API_BASE_URL -ErrorAction SilentlyContinue` trong terminal tương ứng. Các lệnh này chỉ gỡ biến tạm của cửa sổ PowerShell, không sửa `.env`.

## 2. Điều kiện trước khi thử

Trong PowerShell backend, chạy:

```powershell
cd C:\daytrail-api
npm run typecheck
npm run lint
npm run build
npm test
```

Kết quả mong đợi: ba kiểm tra tĩnh PASS và toàn bộ test PASS trên đúng `daytrail_test`/`daytrail-media-test`. Không chạy test nếu chưa xác nhận database/bucket test.

Trong PowerShell frontend, chạy:

```powershell
cd C:\daytrail-web
npm run typecheck
npm run lint
npm run build
```

Kết quả mong đợi: cả ba lệnh có exit code 0. Sau khi mở dịch vụ, `/api/health` và `/api/ready` đều phải trả HTTP 200.

## 3. Điện thoại thật

Kiểm tra ở chiều dọc và ngang, đồng thời mở bàn phím ảo tại các form:

- Đăng ký, đăng nhập, tải lại trang, đăng xuất và khôi phục phiên.
- Hôm nay: mở chi tiết task, sửa note, hoàn thành, ảnh và tổng quan.
- Lịch: Năm/Tháng/Tuần/Ngày, tạo/sửa/chuyển/xóa task một lần và task lặp.
- Nhật ký: tạo/sửa/xóa, bản nháp chưa lưu, xung đột hai tab nếu thiết bị hỗ trợ.
- Ảnh: chọn nhiều ảnh, upload, retry, chú thích, xem lớn và xóa.
- Album ký ức: Năm → Tháng → Ngày → Back, highlight, đổi tiêu đề/bìa và giai đoạn.
- Góc của mình: mở từ avatar, chỉnh/hủy/lưu hồ sơ, thay avatar, đủ bốn ảnh trang trí, caption, reload và guard bản nháp.
- Xác nhận không tràn ngang; nút không bị bàn phím che; dialog cuộn được; vùng chạm dễ dùng; focus và nút Back không làm mất bản nháp.

Mỗi lỗi cần ghi màn hình, thao tác tái hiện, thời điểm, request/status an toàn và ảnh chụp màn hình. Không gửi HAR chứa cookie hoặc nội dung riêng tư chưa làm sạch.

## 4. Chất lượng ảnh điện thoại

Dùng ảnh thử không nhạy cảm, gồm ít nhất:

- Một ảnh dọc và một ảnh ngang từ camera.
- Một ảnh có chữ nhỏ và một ảnh có chi tiết xa.
- Nếu có thể, một ảnh chứa orientation EXIF khác mặc định.

Kiểm tra thumbnail, ảnh lớn, xoay đúng chiều, tỷ lệ không méo, chú thích sau reload và chất lượng WebP tối đa 2.560 px. Xóa ảnh thử rồi xác nhận ảnh biến mất khỏi task/journal/Album phù hợp. Không dùng ảnh cá nhân thật nếu không muốn ảnh được gửi lên bucket development.

## 5. Lỗi mạng và dịch vụ

- Mất mạng khi đang lưu/upload phải giữ bản nháp và không báo thành công giả.
- `/api/health` 200 nhưng `/api/ready` 503 phải hiển thị dữ liệu gián đoạn, không coi là hết phiên.
- HTTP 401 thật phải đưa về đăng nhập và không lộ dữ liệu tài khoản trước.
- Khi mạng phục hồi, nút thử lại phải hoạt động và không tạo request lặp dày hoặc dữ liệu trùng.

## 6. Bảo mật và quyền riêng tư

- Tài khoản thứ hai không đọc/sửa/xóa task, journal, ảnh, album hoặc giai đoạn của tài khoản thứ nhất.
- Tài khoản thứ hai không đọc ảnh hoặc hồ sơ của tài khoản thứ nhất; ảnh hồ sơ không xuất hiện trong Album ký ức.
- Không có token trong Local Storage/Session Storage; cookie phiên là `HttpOnly`, `SameSite=Lax` và có `Secure` ở production HTTPS.
- R2 bucket vẫn private; frontend không chứa khóa R2 hoặc URL public dài hạn.
- CORS chỉ cho đúng frontend origin; Origin sai bị từ chối ở request ghi.
- Console, response và tài liệu không lộ URI, mật khẩu, token, cookie hoặc object key.

## 7. Backup, khôi phục và production

Chưa đánh dấu PASS cho phần này cho đến khi có quyết định và diễn tập thực tế:

- Chọn cơ chế backup MongoDB và R2, tần suất, thời gian lưu, RPO/RTO và người được phép khôi phục.
- Diễn tập khôi phục vào môi trường tách biệt; đối chiếu liên kết MongoDB–R2 và không ghi đè production.
- Chọn hạ tầng/domain production; cấu hình HTTPS, CORS, cookie, proxy, secret và IP/network access.
- Chạy smoke test production bằng tài khoản thử, sau đó dọn đúng dữ liệu thử.

Thùng rác đã được hoãn sau V1, không phải điều kiện phát hành của phiên bản này. DayTrail giữ cơ chế lưu thủ công và xác nhận rõ trước thao tác xóa.

## 8. Điều kiện phát hành

Chỉ phát hành khi mọi mục bắt buộc có bằng chứng PASS, không còn lỗi nghiêm trọng mở, backup/restore đã diễn tập và có phương án rollback. Deployment không được suy ra là thành công chỉ từ build local.

## 9. Bằng chứng tích hợp gần nhất

Ngày 11/10/2026, Codex đã chạy frontend/backend riêng trên `5183`/`4101`, hai browser context tách cookie, MongoDB `daytrail_test` và R2 `daytrail-media-test`. Đăng ký/đăng nhập/session, task/Lịch, journal/ảnh private, Album, hồ sơ, cách ly hai tài khoản, logout và viewport 1.440/390/360 px đều được kiểm tra với backend thật. Frontend/backend `typecheck`, `lint`, `build` PASS; backend test **59/59 PASS**. Cleanup còn 0 bản ghi và 0 object của marker test.

Kết quả này không đóng các mục bắt buộc còn mở: điện thoại thật và bàn phím ảo, chất lượng ảnh camera thật, backup/restore, cấu hình production/HTTPS và smoke test sau deploy.
