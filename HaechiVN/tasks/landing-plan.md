# Implementation Plan: Landing page cho khách chưa đăng nhập

## Overview
Bản đầu đã xong nhưng chưa commit:
- [LandingPage.tsx](../frontend/src/components/LandingPage.tsx) có thẻ học thử vuốt được, 6 ô tính năng, bảng xếp hạng mẫu và khối kêu gọi đăng ký.
- `/` hiện landing cho khách thay vì chuyển sang /login.

Plan này làm nốt phần còn thiếu:
- dùng ảnh thật của app;
- nút đăng ký mở thẳng form đăng ký;
- SEO và domain haechi.vn;
- kiểm tra ở trạng thái đăng xuất thật.

## Architecture Decisions
- Landing là một component client riêng, không dùng AppShell, và luôn ở giao diện sáng (`colorScheme: light`).
  - Màu navy để inline vì `globals.css` (khoảng dòng 242) ép lại `bg-[#0f1b38]` khi giao diện sáng.
- Không thêm thư viện. Ảnh chụp app để dạng `.webp` trong `public/landing/`.
- Đăng ký đọc `?mode=register` trên /login, theo cách trang này đang đọc `?email_verified` và `?auth_error`.

## Task List

### Phase 1: Dọn bản đầu
- [ ] **Task 1: Dùng logo có sẵn** (XS)
  - Đổi `src` sang `/brand/haechivn-mark.png` và xoá `public/haechivn-mark.png` vừa chép.
  - Accept: logo vẫn hiện, `git status` không còn file ảnh thừa.
  - Files: `LandingPage.tsx`.
- [ ] **Task 2: `/login?mode=register` mở thẳng form đăng ký** (S)
  - Login page đọc param, gọi `setIsRegister(true)`. Nút "Học miễn phí" và "Tạo tài khoản" trên landing trỏ vào đó. Nút "Đăng nhập" vẫn trỏ /login.
  - Accept: bấm CTA thì thấy tiêu đề "Đăng ký tài khoản"; /login thường vẫn mở form đăng nhập.
  - Files: `app/login/page.tsx`, `LandingPage.tsx`.

### Checkpoint 1
- [ ] Typecheck qua; lint không thêm lỗi (page.tsx đang có sẵn 4 lỗi).
- [ ] Dùng tab ẩn danh: vào `/` thấy landing, bấm CTA ra form đăng ký.

### Phase 2: Cho thấy app thật
- [ ] **Task 3: Section "Giao diện thật" với 3 ảnh chụp** (M)
  - Ảnh: dashboard, màn học thẻ, thống kê. Mỗi ảnh có khung điện thoại bo góc.
  - Trên mobile các ảnh cuộn ngang (snap), trên desktop xếp 3 cột.
  - Accept:
    - ảnh mỗi cái dưới 150KB, có `alt`, `loading="lazy"`;
    - không tràn ngang ở 375px;
    - ảnh không lộ tên hay email thật của học viên.
  - Files: `LandingPage.tsx`, `public/landing/*.webp`.
  - Deps: ảnh (xem Open Questions).
- [ ] **Task 4: Kiểm tra khi máy để chế độ tối** (XS)
  - Landing vẫn sáng và dễ đọc khi `data-theme="dark"` hoặc hệ điều hành để dark. Chú ý quy tắc `header` trong `globals.css` (khoảng dòng 285).
  - Accept: chụp màn hình ở cả hai chế độ, chữ đọc rõ, nền navy vẫn đúng màu.

### Checkpoint 2
- [ ] Xem mobile 375px và desktop 1280px, sáng và tối.

### Phase 3: SEO + phát hành
- [ ] **Task 5: Đổi domain trong metadata sang haechi.vn** (XS)
  - Áp cho `metadataBase` và `openGraph.url` trong `layout.tsx`. Nếu có thì kiểm cả `sitemap.ts` và `robots.ts`.
  - Accept: `grep -rn lms.ankivn.com frontend/src` không còn chỗ nào cần đổi, hoặc chỗ còn lại có lý do ghi rõ.
- [ ] **Task 6: Commit + push** (XS)
  - Chỉ `git add` các file của landing.
  - Accept: CI/deploy xanh; vào haechi.vn bằng tab ẩn danh thấy landing.

### Checkpoint: Complete
- [ ] Khách vào `/` thấy landing, đăng ký được.
- [ ] Người đã đăng nhập vẫn vào dashboard như cũ.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Trang là client component: trước khi kiểm xong đăng nhập thì `/` trống, bot SEO có thể không thấy chữ | Med | Giai đoạn này chấp nhận. Muốn SEO tốt thì làm riêng một trang tĩnh (ví dụ `/gioi-thieu`) |
| Ảnh chụp lộ dữ liệu người dùng | High | Chụp bằng tài khoản demo hoặc che tên trước khi đưa vào repo |
| Đổi domain metadata làm hỏng link/OG cũ | Low | Chỉ đổi URL gốc; nếu domain cũ còn chạy thì vẫn để chuyển hướng |
| `globals.css` ghi đè màu ở giao diện sáng | Low | Màu chủ đạo để inline, xem lại ở Task 4 |

## Open Questions
- Ảnh chụp: bạn tự gửi, hay mình chụp trên localhost bằng tài khoản của bạn (mình sẽ che tên/email)?
- Domain cũ `lms.ankivn.com` còn chạy không? Có cần chuyển hướng sang haechi.vn không?
- Số liệu mẫu trên bảng xếp hạng (Bảo Ngọc 87 ngày…) để nguyên, hay thay bằng số thật như tổng số từ hoặc số học viên (cần thêm API)?
