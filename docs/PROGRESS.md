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

## Chang 1A - MongoDB Atlas

### Da trien khai

- Them Mongoose 9.10.4 (Node >=20.19); runtime Windows da kiem chung la Node 22.23.3, c-ares 1.34.8.
- Tach doc/kiem tra bien moi truong va module ket noi MongoDB.
- Ep dung database `daytrail`, connect + ping truoc khi API lang nghe.
- Them `GET /api/ready`, timeout connect/ping va graceful shutdown.
- Them `npm run db:verify` de ghi/doc/xoa mot document tam co ID rieng.
- `.env` duoc ignore va khong duoc Git theo doi; `.env.example` chi co placeholder.

### Ket qua tu chay

- Backend typecheck, lint, build: PASS.
- Thieu `MONGODB_URI`: PASS, bao `ConfigurationError` va exit code 1.
- Test route doc lap: `/api/health` HTTP 200; `/api/ready` HTTP 503 khi database khong san sang.
- Frontend voi API test tam: PASS, Chrome headless hien thi `Da ket noi`; source frontend khong thay doi.
- Sau khi nguoi dung them `/daytrail` vao URI: metadata da xac nhan pathname database la `daytrail`; khong in URI hoac thong tin xac thuc.
- Kiem tra cong: 4000 tung bi backend DayTrail cu tai `D:\daytrail-api` chiem; tien trinh da duoc xac dinh chinh xac va dung theo yeu cau nguoi dung. Cong 4001 chi tung duoc dat tam de chan doan, khong phai co che tu doi cong.
- Cau hinh hien tai `C:\daytrail-api\.env` dat `PORT=4000`; frontend C: mac dinh goi `http://localhost:4000` va khong dung Vite proxy.
- `.env` moi duoc nap khong bi bien cap tien trinh ghi de; database user moi xac thuc thanh cong va database khai bao la `daytrail`. Khong ghi thong tin xac thuc vao tai lieu.
- Khoi dong backend C: tren cong 4000 qua DNS mac dinh: FAIL `ECONNREFUSED`, exit code 1 truoc khi mo cong.
- DNS cong cong chi dung trong tien trinh kiem chung: xac thuc user moi PASS. Khong thay doi DNS may va khong hardcode DNS vao source.
- Ket noi thuc te xac nhan database `daytrail`; ping PASS.
- Ghi -> doc -> xoa mot document tam co ID rieng: PASS. Script kiem tra `deletedCount === 1` va chi xoa document cua lan kiem chung.
- Backend kiem chung tren cong 4000: `/api/health` HTTP 200, `/api/ready` HTTP 200; CORS cho `http://localhost:5173` PASS.
- Chrome headless tai `http://localhost:5173`: render PASS, hien thi `Da ket noi`, khong hien thi loi ket noi.
- Nguyen nhan DNS da xac dinh la regression c-ares 1.34.6 trong Node 22.23.2 tren Windows, khong phai DNS router hay source DayTrail. Nguoi dung da nang Node len 22.23.3/c-ares 1.34.8; Node nhan DNS mac dinh `192.168.0.1`.

### Bang chung nguoi dung cung cap sau khi nang Node

- `npm run dev` binh thuong: PASS; MongoDB connected/ready voi database `daytrail`, API lang nghe tai cong 4000.
- `/api/health`: `status=ok`; `/api/ready`: `status=ready`.
- Frontend tai `http://localhost:5173`: mo duoc trong trinh duyet.

### Kiem tra Codex sau khi nang Node

- Tien trinh backend tren 4000 la `npm run dev`/`tsx watch` tu `C:\daytrail-api`; khong co preload hoac DNS workaround. Node v22.23.3, c-ares 1.34.8, DNS mac dinh `192.168.0.1`.
- `/api/health` va `/api/ready`: HTTP 200; CORS cho `http://localhost:5173`: PASS.
- Chrome headless: frontend render, hien thi `Da ket noi`; khong co Console error, Network failure hoac response >= 400.
- Backend `typecheck`, `lint`, `build`: PASS.
- Frontend `typecheck`, `lint`, `build`: PASS.
- CRUD tam khong lap lai: bang chung truoc do da PASS tren database `daytrail` khi dung DNS cong cong chi trong tien trinh; document rieng da duoc xoa va `deletedCount === 1`.
- `.env` duoc Git ignore va khong duoc theo doi.
- Chang 1A dat dieu kien nghiem thu; toan bo chang 1 chua hoan tat.

### Pham vi chua lam

- Dang ky/dang nhap, user model, authorization va cac tinh nang nghiep vu chua trien khai.
- Chang 1 chua duoc danh dau hoan tat; day chi la chang 1A.
