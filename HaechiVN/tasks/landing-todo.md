# Todo: Landing page
- [x] Task 1: Dùng logo /brand/haechivn-mark.png, xoá file chép
- [x] Task 2: /login?mode=register mở form đăng ký, CTA trỏ vào
- [x] Checkpoint 1: typecheck qua, lint không thêm lỗi, headless Chrome không cookie: `/` ra landing, ?mode=register ra "Đăng ký tài khoản", /login thường không
- [x] Task 3: Section 3 ảnh chụp thật (dashboard, thống kê, bảng xếp hạng đã đổi tên giả), 21–28KB/ảnh
      (bỏ ảnh màn học: hết hạn mức từ mới, bấm "Thêm" sẽ đổi dữ liệu thật; thẻ demo đã thay cho phần này)
- [x] Task 4: Chế độ tối: landing vẫn sáng; sửa chip loại từ bị nhạt do lớp dark:
- [x] Checkpoint 2: mobile 375 / desktop 1280, sáng/tối
- [ ] Task 5: metadata → haechi.vn — CHẶN: 2026-11-26 haechi.vn chưa phản hồi (curl 000), lms.ankivn.com vẫn 200.
      Khi domain chạy: layout.tsx (3 chỗ), sitemap.ts, robots.ts, manifest*.json. KHÔNG đổi SITE_URL trong wrangler.json
      nếu chưa thêm redirect URI haechi.vn/api/auth/callback vào Google OAuth (sẽ hỏng đăng nhập Google).
- [ ] Task 6: Commit + push (chỉ file landing)
- [ ] Checkpoint: Complete
