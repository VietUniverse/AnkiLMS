import { PolicyPage } from "../../components/PolicyPage";

export const metadata = { title: "Quy tắc cộng đồng" };

export default function CommunityRulesPage() {
  return <PolicyPage title="Quy tắc cộng đồng" updated="03/11/2026">
    <p>Quy tắc này áp dụng cho bài viết, bình luận, trò chuyện, bộ thẻ công khai và các nội dung do người dùng chia sẻ trên HaechiVN.</p>
    <section><h2 className="text-lg font-black text-white">Tôn trọng người khác</h2><p>Không quấy rối, đe dọa, phân biệt đối xử, tiết lộ thông tin riêng tư hoặc nhắm vào một cá nhân để làm tổn hại họ.</p></section>
    <section><h2 className="text-lg font-black text-white">Chia sẻ nội dung có trách nhiệm</h2><p>Không đăng nội dung bất hợp pháp, lừa đảo, quảng cáo rác, mã độc, tài liệu xâm phạm quyền tác giả hoặc nội dung mà bạn không có quyền chia sẻ. Ghi rõ nguồn khi giấy phép yêu cầu và tôn trọng yêu cầu gỡ nội dung hợp lệ.</p></section>
    <section><h2 className="text-lg font-black text-white">Giữ an toàn cho dịch vụ</h2><p>Không spam, gian lận bảng xếp hạng, khai thác lỗi, dò mật khẩu, vượt quyền hoặc tự động thu thập dữ liệu trái với giới hạn kỹ thuật. Hãy báo lỗi bảo mật qua kênh liên hệ thay vì khai thác hoặc công bố dữ liệu riêng tư.</p></section>
    <section><h2 className="text-lg font-black text-white">Xử lý vi phạm</h2><p>HaechiVN có thể ẩn nội dung, giới hạn tính năng hoặc đình chỉ tài khoản theo mức độ và tần suất vi phạm. Người dùng có thể gửi yêu cầu xem xét lại qua kênh hỗ trợ.</p></section>
  </PolicyPage>;
}
