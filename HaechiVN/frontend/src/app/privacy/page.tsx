import { PolicyPage } from "../../components/PolicyPage";

export const metadata = { title: "Chính sách quyền riêng tư" };

export default function PrivacyPage() {
  return <PolicyPage title="Chính sách quyền riêng tư" updated="03/11/2026">
    <section><h2 className="text-lg font-black text-white">1. Dữ liệu được xử lý</h2><p>Khi tạo tài khoản, HaechiVN xử lý email, tên hiển thị, mật khẩu đã băm và ngôn ngữ học. Khi bạn dùng sản phẩm, hệ thống có thể lưu tiến độ học, lịch sử phiên, trạng thái ôn tập, bộ thẻ, nội dung bạn đăng, thông tin lớp học và lựa chọn hồ sơ.</p><p>Máy chủ cũng nhận một số dữ liệu kỹ thuật như địa chỉ IP, loại trình duyệt, thời điểm yêu cầu và nhật ký bảo mật để bảo vệ dịch vụ, giới hạn lạm dụng và xử lý lỗi.</p></section>
    <section><h2 className="text-lg font-black text-white">2. Mục đích sử dụng</h2><p>Dữ liệu được dùng để tạo và bảo vệ tài khoản, gửi email xác minh, đồng bộ việc học, vận hành lớp học/cộng đồng mà bạn tham gia, lưu tùy chọn, chống gian lận, hỗ trợ người dùng và cải thiện độ ổn định của dịch vụ.</p></section>
    <section><h2 className="text-lg font-black text-white">3. Chia sẻ và nhà cung cấp</h2><p>HaechiVN không bán dữ liệu cá nhân. Dữ liệu chỉ được chuyển cho nhà cung cấp hạ tầng cần thiết để lưu trữ, gửi email hoặc vận hành tính năng; hoặc được cung cấp khi pháp luật yêu cầu. Nội dung hồ sơ/cộng đồng được đặt công khai sẽ hiển thị theo lựa chọn và tính năng bạn sử dụng.</p></section>
    <section><h2 className="text-lg font-black text-white">4. Lưu trữ và bảo mật</h2><p>Dữ liệu được lưu trong thời gian tài khoản hoạt động hoặc khi cần để cung cấp dịch vụ, xử lý tranh chấp và tuân thủ nghĩa vụ pháp lý. HaechiVN áp dụng biện pháp kỹ thuật và tổ chức phù hợp, nhưng không có phương thức truyền/lưu trữ nào an toàn tuyệt đối.</p></section>
    <section><h2 className="text-lg font-black text-white">5. Quyền và lựa chọn của bạn</h2><p>Bạn có thể cập nhật một số thông tin hồ sơ trong phần cài đặt, điều chỉnh quyền riêng tư hồ sơ và yêu cầu truy cập, sửa hoặc xóa dữ liệu tài khoản qua kênh hỗ trợ của HaechiVN. Một số bản ghi có thể được giữ lại trong thời hạn cần thiết cho bảo mật, sao lưu hoặc nghĩa vụ pháp lý.</p></section>
    <section><h2 className="text-lg font-black text-white">6. Trẻ vị thành niên và thay đổi</h2><p>Nếu bạn chưa đủ tuổi tự đồng ý theo quy định áp dụng tại nơi cư trú, hãy dùng dịch vụ với sự đồng ý và hướng dẫn của cha mẹ/người giám hộ. Chính sách có thể được cập nhật; ngày cập nhật mới nhất luôn được ghi ở đầu trang.</p></section>
  </PolicyPage>;
}
