# Đề bài: tối ưu giao diện /admin cho cả light và dark mode (chỉ làm đúng đề bài này)

Người làm: agy (Gemini 3.8 flash medium). Chỉ sửa **giao diện**: không đổi logic, API, kiểu dữ liệu, tên hàm xử lý, thông điệp `window.confirm`.
Tra graphify trước khi đọc file (`graphify explain "AdminPage()"`); chỉ đọc đoạn cần.
Next.js bản mới, khác bản bạn biết: đụng API Next thì đọc `frontend/node_modules/next/dist/docs/`.

## File được sửa
- `frontend/src/app/admin/page.tsx` (329 dòng, mỗi panel là **một dòng JSX rất dài**)
- `frontend/src/components/admin/ExploreDeckManager.tsx` (142 dòng, 0 chỗ có `dark:`)
- Không sửa `globals.css` (trừ khi bắt buộc; ghi lý do vào `unsure`), không sửa file khác.

## Hiện trạng (Claude đã đọc code + chụp ảnh)
1. **Màu cứng cho nền tối**: gần như mọi chỗ dùng `text-white`, `bg-slate-950`, `border-slate-700`, `text-slate-400`… không có một `dark:` nào. Light mode chỉ "sống" nhờ `globals.css` có các luật `html[data-theme="light"] [class*="bg-slate-950"]`… ép màu lại. Mong manh: ví dụ `text-white` trên nền sáng, tiêu đề header gradient `from-[#13244e] to-[#10203c]` phải ép bằng !important.
2. **Header to và nặng**: thẻ gradient + icon + mô tả + nút "Làm mới dữ liệu".
3. **Thanh điều hướng 10 ô**: lưới `grid-cols-2 sm:4 xl:8` các ô cao 72px (icon + nhãn + "N mục"). Chiếm nhiều chỗ, không thấy mình đang ở đâu một cách gọn.
4. **Lỗi hiển thị**: dòng 310 và 311 của `page.tsx` bắt đầu bằng ký tự `+` thừa (`+          </div></div>}` và `+          {panel === "lessons" && …`), React in ra dấu "+" trong trang. Xoá hai dấu `+` đó.
5. Các panel là một dòng dài, rất khó đọc và sửa.
6. Form (`input/select/textarea`) lặp class dài `border-slate-700 bg-slate-950 … text-white`, khác kiểu với trang chủ và trang login.

## Hướng thiết kế: theo đúng phong cách trang chủ (`/`) và trang đăng nhập (`/login`)
Mở `/` và `/login` xem trước (Claude đã chụp). Đặc trưng cần kế thừa, **không tự chế hệ thiết kế mới**:
- **Khối lớn bo tròn mềm, ít viền**: `rounded-2xl`/`rounded-3xl`, bóng mềm (`shadow-lg`/`shadow-2xl` dịu), dark dùng nền navy (`#0b1329`, `#090f1e`, `#111d38`, `#132247`), light dùng nền trắng + viền rất nhạt. Dùng lớp có sẵn `card-duo` cho thẻ/khối (đã có style cho cả hai theme trong `globals.css`), đừng tự đặt lại màu nền navy rải rác.
- **Tiêu đề đậm có từ nhấn xanh**: như "Chào mừng đến với **HaechiVN**" (`font-black tracking-tight`, từ nhấn `text-blue-500 dark:text-blue-400`). Tiêu đề trang admin: "Quản trị **HaechiVN**".
- **Nhãn nhỏ chữ hoa giãn chữ**: như "CHUỖI STREAK" (`text-xs font-extrabold uppercase tracking-widest`) cho nhãn số liệu và tiêu đề cột bảng.
- **Số liệu lớn, đậm**: như các thẻ metric trang chủ (số `text-3xl font-black`, nhãn nhỏ phía trên, nền bo `rounded-2xl`).
- **Nút chính**: `btn-duo btn-duo-primary` (xanh `#2563eb` có viền đáy) như nút "Vào học"; nút phụ: nền `#132247` (dark) / nền xám nhạt (light), chữ đậm `text-xs font-bold`, bo `rounded-xl`, `py-3`.
- **Ô nhập như trang login**: `rounded-xl px-4 py-3.5 text-xs`, nền `#132247` ở dark (`bg-white border border-stone-200` ở light), `focus:ring-2 focus:ring-blue-500`, không viền cứng ở dark.
- Giữ chiều sâu nhẹ, khoảng cách rộng rãi (`space-y-6`, padding `p-5 sm:p-6`), chữ phụ xám xanh (`text-slate-400` dark / `text-stone-500` light).

### Cặp màu theo theme (không dựa vào luật ép trong globals.css)
- chữ chính `text-stone-900 dark:text-white`; phụ `text-stone-500 dark:text-slate-400`; mờ `text-stone-400 dark:text-slate-500`
- viền/đường chia `border-stone-200 dark:border-slate-800`; hover hàng `hover:bg-stone-50 dark:hover:bg-slate-900/40`
- nhấn `text-sky-600 dark:text-sky-300`; nguy hiểm `text-rose-600 dark:text-rose-300` + `border-rose-300 dark:border-rose-700/50`; thành công/cảnh báo emerald/amber `-600` / `dark:-300`
- Gom class lặp thành hằng ở đầu file (`fieldCls`, `ghostBtn`, `dangerBtn`, `labelCls`…).

### Các mục
**A. Màu theo theme + hằng class** (như trên), thay dần cả file.
**B. Header**: bỏ gradient xanh đậm cố định. Một khối `card-duo rounded-3xl` gọn: icon khiên trong ô bo mờ, h1 "Quản trị **HaechiVN**" (từ nhấn xanh), một dòng mô tả, nút "Làm mới dữ liệu" kiểu nút phụ bên phải (ẩn chữ ở mobile).
**C. Điều hướng**: thay lưới 10 ô cao 72px bằng dải **pill** cuộn ngang một hàng (`overflow-x-auto`, không thanh cuộn): pill bo `rounded-xl`, đang chọn nền `bg-blue-600 text-white shadow-lg shadow-blue-900/30` (giống nút chính), còn lại nền nhạt; số lượng là chấm số nhỏ trong pill. Giữ `aria-current="page"`, thứ tự, `setPanel`.
**D. Tổng quan**: 6 thẻ số liệu theo kiểu metric card trang chủ (nhãn nhỏ chữ hoa giãn chữ, số lớn đậm, `rounded-2xl`); hai khối mô tả bên dưới nhẹ, có tiêu đề đậm và link nhấn xanh.
**E. Bảng và danh sách**: khối `card-duo`, tiêu đề cột chữ hoa nhỏ `tracking-widest` xám, hàng có hover nhẹ, nút hành động cùng cỡ (`h-8 px-3 text-xs rounded-xl font-bold`), nút xoá rose theo cặp theme. Bảng "Tài khoản" cuộn ngang trong khung ở mobile, không làm cả trang cuộn ngang.
**F. Form** (Bài học, Bộ từ Explore, `ExploreDeckManager`): ô nhập kiểu login, nhãn `text-xs font-bold`, nút chính `btn-duo btn-duo-primary`.
**G. `ExploreDeckManager.tsx`**: áp A và F; file chưa có `dark:`, kiểm kỹ ở light mode.

Làm theo thứ tự: **lỗi dấu `+` (mục 4) → A → B → C → D → E → F → G**. Mỗi mục xong **một commit** (`refactor(admin): …`). Có thể tách dòng dài của panel thành nhiều dòng dễ đọc khi bạn sửa đúng panel đó (cho phép), nhưng **không đổi logic hay thứ tự thuộc tính xử lý sự kiện**.

## Luật cấm
- Không viết lại cả file bằng heredoc; sửa từng đoạn bằng công cụ sửa file.
- Không đổi logic, API, state, kiểu, text `confirm/prompt`, tên hàm. Không thêm thư viện, không `localStorage`.
- Không xoá/nới lint, typecheck. Không commit "debug". Chỉ `git add` file mình sửa. **Không push**. Không `git stash/reset/rebase`.
- Không gọi API thật, không bấm nút xoá/lưu thật (dữ liệu giả thôi, nhưng cũng đừng bấm).
- Không đụng `docs/`, `out/` ngoài file báo cáo.

## Cách xem giao diện (API local không có)
Server dev đã chạy ở http://localhost:3111 (đừng chạy thêm). Trang cần đăng nhập giả + dữ liệu giả:
1. Mở trình duyệt, vào `/login`, Console: `localStorage.setItem("haechivn_user_profile", JSON.stringify({id:"dev-admin",email:"admin@local.test",name:"admin",streak:3,xp:120,gems:10,level:2,role:"admin"})); location.href="/admin"`
2. Dán toàn bộ nội dung `docs/plans/admin-mock-fetch.js` vào Console rồi bấm nút "Làm mới" (dữ liệu giả hiện ra, không cần reload; reload thì phải dán lại).
3. Đổi theme bằng nút công tắc trên header (hoặc `document.documentElement.dataset.theme = "light" | "dark"`).

Chụp mỗi tab **Tổng quan, Tài khoản, Bộ Anki, Bộ từ Explore, Bài học, Lớp học, Góp ý, Tính năng** ở 375px và 1280px × light/dark, lưu `out/admin/` (không commit), và **nhìn ảnh thật**. Kiểm: không còn chữ trắng trên nền sáng, không còn dấu "+" thừa, tab đang chọn rõ, không cuộn ngang cả trang ở 375px.

## Kiểm tự động (chỉ phần mình sửa; Claude tự chạy suite đầy đủ)
```
cd frontend
./node_modules/.bin/eslint src/app/admin src/components/admin
./node_modules/.bin/tsc --noEmit   # lỗi ở src/lib/romanization.ts có sẵn, bỏ qua
```

## Báo cáo
Ghi `docs/plans/2026-10-31-admin-ui-bao-cao.json`:
`{"status":"done|blocked","commits":[],"files_changed":[],"tests":{"command":"","exit":0,"log":""},"screenshots":[],"unsure":[]}`
