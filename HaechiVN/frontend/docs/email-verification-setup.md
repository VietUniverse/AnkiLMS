# Email xác minh HaechiVN

## Dịch vụ đề xuất

HaechiVN gửi email giao dịch qua Resend API từ Cloudflare Pages Function. Dùng địa chỉ gửi `HaechiVN <noreply@ankivn.com>` (đã khai báo trong `wrangler.json`). Resend cần xác minh quyền gửi của domain trước khi gửi tới người dùng thật.

GitHub Student Developer Pack không cung cấp dịch vụ gửi email giao dịch cho ứng dụng. Một số ưu đãi trong Pack hỗ trợ hộp thư thử nghiệm, phù hợp kiểm thử hơn là gửi email xác minh tới học viên. Cloudflare Email Routing chỉ nhận/chuyển tiếp thư; không phải dịch vụ gửi mail outbound miễn phí. Resend có gói miễn phí, nhưng hạn mức và điều kiện có thể thay đổi.

## Cấu hình cần làm một lần

1. Tạo tài khoản Resend và thêm domain `ankivn.com`.
2. Thêm chính xác các bản ghi DNS SPF/DKIM (và các bản ghi khác nếu Resend yêu cầu) vào Cloudflare DNS. Không thay thế SPF hiện có nếu domain đã có bản ghi; gộp theo hướng dẫn của nhà cung cấp.
3. Chờ Resend xác nhận domain đã verified.
4. Tạo Resend API key có quyền gửi mail tối thiểu cần thiết.
5. Lưu `RESEND_API_KEY` thành secret trong Cloudflare Pages project `haechivn-korean` (Settings → Variables and Secrets → Production). Không commit key vào Git, `wrangler.json`, hay client bundle.
6. Áp dụng migration `0018_email_verification_and_policy_consent.sql` vào D1 production trước khi bật đăng ký mới.
7. Deploy Pages Functions/frontend. Tạo tài khoản bằng email thật; hộp thư sẽ nhận link xác minh có hiệu lực 24 giờ. Link mở trang xác nhận rồi người dùng bấm nút để kích hoạt, tránh email scanner tự kích hoạt hộ tài khoản.

Nếu secret hoặc domain chưa cấu hình, đăng ký email sẽ báo dịch vụ xác minh chưa sẵn sàng và không tạo phiên đăng nhập.
