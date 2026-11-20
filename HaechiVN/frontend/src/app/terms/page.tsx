import { PolicyPage } from "../../components/PolicyPage";

export const metadata = { title: "Điều khoản sử dụng" };

export default function TermsPage() {
  return <PolicyPage title="Điều khoản sử dụng" updated="03/11/2026">
    <section><h2 className="text-lg font-black text-white">1. Phạm vi dịch vụ</h2><p>HaechiVN cung cấp công cụ học tiếng Hàn như flashcard, ôn tập lặp lại ngắt quãng, từ điển, nghe chép, shadowing và tính năng lớp học. Dịch vụ có thể được cập nhật, tạm dừng hoặc thay đổi để bảo trì và cải thiện.</p></section>
    <section><h2 className="text-lg font-black text-white">2. Tài khoản</h2><p>Bạn cần cung cấp email mà mình có quyền truy cập, xác minh email khi đăng ký bằng mật khẩu, giữ bí mật thông tin đăng nhập và chịu trách nhiệm cho hoạt động trên tài khoản. Không chia sẻ tài khoản hoặc giả danh người khác.</p></section>
    <section><h2 className="text-lg font-black text-white">3. Nội dung và bộ thẻ</h2><p>Bạn giữ quyền với nội dung do mình tạo và chỉ tải lên nội dung mà bạn có quyền sử dụng. Khi đăng hoặc chia sẻ công khai, bạn cấp cho HaechiVN quyền lưu trữ, hiển thị và phân phối nội dung đó trong phạm vi cần thiết để vận hành tính năng. Bạn có thể gỡ nội dung chia sẻ nếu tính năng cho phép.</p><p>Bộ thẻ do cộng đồng chia sẻ có thể chứa lỗi; hãy kiểm tra nội dung trước khi dùng cho mục đích quan trọng. Nội dung học tập không thay thế tư vấn chuyên môn.</p></section>
    <section><h2 className="text-lg font-black text-white">4. Hành vi không được phép</h2><p>Không dùng dịch vụ để vi phạm pháp luật, xâm phạm quyền của người khác, phát tán mã độc hoặc spam; không cố truy cập trái phép, gây quá tải, phá hoại hoặc thu thập dữ liệu người dùng bằng cách vượt qua biện pháp kỹ thuật. Không đăng nội dung lừa đảo, quấy rối, thù ghét hay xâm phạm quyền riêng tư.</p></section>
    <section><h2 className="text-lg font-black text-white">5. Tính năng, tiến độ và tính sẵn sàng</h2><p>Tiến độ học và dữ liệu có thể được đồng bộ giữa thiết bị; bạn nên giữ bản sao riêng đối với nội dung quan trọng. HaechiVN nỗ lực duy trì dịch vụ nhưng không cam kết không gián đoạn hoặc không có lỗi. XP, kim cương, streak và huy hiệu là điểm thưởng trong sản phẩm, không có giá trị tiền mặt.</p></section>
    <section><h2 className="text-lg font-black text-white">6. Tạm ngưng và chấm dứt</h2><p>HaechiVN có thể giới hạn hoặc đình chỉ tài khoản khi có dấu hiệu lạm dụng, vi phạm điều khoản hoặc gây nguy hại cho người dùng/dịch vụ. Bạn có thể ngừng sử dụng và yêu cầu hỗ trợ về tài khoản qua kênh liên hệ được công bố trên website.</p></section>
    <section><h2 className="text-lg font-black text-white">7. Cập nhật điều khoản</h2><p>Khi thay đổi đáng kể, HaechiVN sẽ cập nhật ngày hiệu lực trên trang này và thông báo phù hợp trong sản phẩm. Việc tiếp tục sử dụng sau ngày hiệu lực đồng nghĩa với việc chấp nhận bản cập nhật; với thay đổi cần sự đồng ý mới, hệ thống sẽ yêu cầu bạn xác nhận lại.</p></section>
  </PolicyPage>;
}
