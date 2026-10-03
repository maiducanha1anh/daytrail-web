# Tien do chang 0

## Bang chung nguoi dung cung cap

- Backend typecheck, lint, build: PASS.
- Frontend typecheck, build: PASS.
- Frontend lint: 0 errors, 1 warning truoc khi tach App.tsx.
- Tab Lich/Hanh trinh chuyen noi dung dung qua anh kiem tra.
- Mobile 393 x 852 bi thu nho vi thieu viewport; favicon.ico tra 404.

## Thay doi trong luot nay

- Them meta viewport `width=device-width, initial-scale=1.0`; khong khoa zoom.
- Them `public/favicon.svg` va khai bao trong `index.html`.
- Them width responsive cho `html`, `body`, `#root`, `.app` va dieu chinh breakpoint mobile.
- Bo cac file sinh tu build: `vite.config.js`, `vite.config.d.ts`, `tsconfig.node.tsbuildinfo`.
- Them cac file sinh vao `.gitignore`; giu `vite.config.ts`.

## Kiem tra tu chay tren C:

- Frontend `npm run typecheck`: PASS.
- Frontend `npm run lint`: PASS, 0 errors/warnings.
- Frontend `npm run build`: PASS.
- Frontend `http://localhost:5173`: PASS, HTTP 200.
- Frontend `http://localhost:5173/favicon.svg`: PASS, HTTP 200, `image/svg+xml`.
- Chrome headless mobile 393 x 852: PASS. `innerWidth`, document, body, `#root` va `.app` deu 393px; khong tran ngang.
- Chrome headless desktop 1440 x 900: PASS. `.app` rong 960px trong viewport va khong tran ngang.
- Dieu huong trong browser: PASS. Tab Hanh trinh va Lich doi active state va noi dung dung.
- Trang thai ket noi trong browser: PASS, hien thi `Da ket noi`.
- Favicon trong browser: PASS, HTTP 200 va `image/svg+xml`.
- Console/network trong lan reload kiem tra: PASS, khong co exception, console error hoac response >= 400.

## Con thieu

- Khong con blocker trong pham vi chang 0.
- MongoDB, tai khoan, cong viec, lich nghiep vu, nhat ky, anh, hanh trinh day du va AI thuoc cac chang sau, chua trien khai.
