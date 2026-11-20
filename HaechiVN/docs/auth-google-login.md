# Đăng nhập Google & phiên đăng nhập (hướng dẫn cho backend)

Backend là Cloudflare Pages Functions (`frontend/functions/api/auth/*`), dữ liệu ở D1 (`env.DB`), phiên và trạng thái tạm ở KV (`env.SESSIONS`).
Không dùng NextAuth/Firebase/Clerk: luồng Google OAuth 2.0 (Authorization Code) tự viết.

## Biến môi trường

| Biến | Ý nghĩa |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Từ Google Cloud Console. Chỉ đặt trong Cloudflare, không commit. |
| `SITE_URL` | Origin công khai (HTTPS, hoặc localhost). Redirect URI = `${SITE_URL}/api/auth/callback`, phải khớp Google Console. |
| `SESSIONS` (KV), `DB` (D1) | Binding. |

## Luồng

1. `GET /api/auth/google?translationLanguage=vi|en|ja`
   Tạo `state` ngẫu nhiên 32 byte, lưu KV `oauth_state:<state>` (TTL 10 phút, kèm ngôn ngữ), redirect sang Google (scope `openid email profile`).
2. `GET /api/auth/callback?code&state`
   - Đọc và xoá `oauth_state:<state>` (dùng một lần). Thiếu/hết hạn: `auth_error=oauth_state_expired`.
   - Đổi `code` lấy access token, gọi `userinfo`, bắt buộc `verified_email`.
   - Tìm user theo email trong `users`, chưa có thì tạo (`password_hash = ''`).
   - Tạo **mã dùng một lần** `oc_<uuid>` lưu KV `oauth_code:<mã>` -> `userId` (TTL 60s), redirect `/?auth_code=<mã>`.
   - **Không** đặt cookie ở bước này: Brave và Samsung Internet bỏ cookie đặt trong chuỗi redirect từ Google.
3. `POST /api/auth/exchange` body `{ "code": "oc_..." }` (gọi bằng `fetch` cùng origin từ `AppProvider.tsx`)
   Kiểm tra Origin, đọc và xoá mã (một lần), tạo phiên, trả `Set-Cookie`.
4. `GET /api/auth/me` trả user hiện tại (401 nếu chưa đăng nhập). Frontend luôn gọi endpoint này khi tải trang.

## Phiên

- Token `hcv_<64 hex>` lưu KV, TTL 30 ngày (`createSession` trong `_utils.ts`).
- Cookie `haechivn_session`: `HttpOnly; SameSite=Lax; Secure` (khi HTTPS).
- `getSessionToken` đọc cookie trước, fallback `Authorization: Bearer` (đường cũ, nên bỏ dần).

## Mã lỗi `auth_error`

`oauth_invalid_request`, `oauth_state_expired`, `oauth_not_configured`, `oauth_token_failed`, `oauth_profile_failed`, `oauth_email_unverified`, `oauth_account_failed`, `oauth_failed`. Frontend ánh xạ sang thông báo ở `AppProvider.tsx`.

## Rủi ro đã biết / việc nên làm

- Tài khoản ghép theo email: nếu đăng ký mật khẩu không xác minh email thì có thể bị chiếm trước (pre-hijacking). Cần xác minh email khi đăng ký, hoặc không tự gộp.
- `state` không gắn với trình duyệt (login CSRF): cân nhắc PKCE hoặc nonce lưu `sessionStorage` gửi kèm `exchange`.
- Chưa có thu hồi phiên hàng loạt và chưa kiểm rate limit cho đăng nhập mật khẩu.
- Test thủ công cần trên Brave và Samsung Internet (chưa chạy).
