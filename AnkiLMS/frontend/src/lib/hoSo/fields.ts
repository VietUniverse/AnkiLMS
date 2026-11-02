import type { XacNhanData } from "./fill";

export type Key = keyof XacNhanData;
export type Kind = "phone" | "arc" | "biz" | "money" | "date" | "time" | "hours";
export type F = { key: Key; label: string; hint: string; ko?: boolean; required?: boolean; half?: boolean; kind?: Kind };

// Gõ số liền nhau, hệ thống tự thêm dấu gạch và dấu phẩy
const digits = (v: string) => v.replace(/\D/g, "");
export const format: Partial<Record<Kind, (v: string) => string>> = {
  phone: (v) => {
    const d = digits(v).slice(0, 11), a = d.startsWith("02") ? 2 : 3;
    if (d.length <= a) return d;
    const rest = d.slice(a), mid = a === 3 ? (d.length === 10 ? 3 : 4) : (d.length === 10 ? 4 : 3);
    return rest.length <= mid ? `${d.slice(0, a)}-${rest}` : `${d.slice(0, a)}-${rest.slice(0, mid)}-${rest.slice(mid)}`;
  },
  arc: (v) => { const d = digits(v).slice(0, 13); return d.length > 6 ? `${d.slice(0, 6)}-${d.slice(6)}` : d; },
  biz: (v) => { const d = digits(v).slice(0, 10); return d.length > 5 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d; },
  money: (v) => { const d = digits(v).slice(0, 7); return d ? Number(d).toLocaleString("en-US") : ""; },
  hours: (v) => v.replace(/[^\d.,]/g, "").slice(0, 4),
};

export const groups: { title: string; note?: string; fields: F[] }[] = [
  { title: "Thông tin của bạn (대상자)", fields: [
    { key: "name", label: "Họ tên", hint: "IN HOA như hộ chiếu, ví dụ NGUYEN VAN A", required: true },
    { key: "arc", label: "Số thẻ ARC (외국인등록번호)", hint: "Gõ 13 chữ số liền nhau", required: true, kind: "arc" },
    { key: "major", label: "Khoa / ngành (학과, tiếng Hàn)", hint: "Ví dụ 경영학과", ko: true, required: true },
    { key: "term", label: "Số học kỳ đã hoàn thành (이수학기)", hint: "Chỉ điền số, ví dụ 3", required: true },
    { key: "phone", label: "Điện thoại ở Hàn", hint: "Gõ số liền nhau, ví dụ 01012345678", required: true, kind: "phone" },
    { key: "email", label: "Email", hint: "ten@gmail.com", required: true },
    { key: "addrKr", label: "Địa chỉ ở Hàn (주소, tiếng Hàn)", hint: "Ví dụ 강원특별자치도 춘천시 ○○로 12, 101호", ko: true },
  ] },
  { title: "Nơi làm việc dự kiến (취업예정근무처)", note: "Hỏi chủ quán, lấy theo giấy đăng ký kinh doanh. Tên quán, địa chỉ, ngành nghề, tên chủ nhập tiếng Hàn.", fields: [
    { key: "company", label: "Tên quán / công ty (업체명)", hint: "Ví dụ 홍길동 식당", ko: true, required: true },
    { key: "bizNo", label: "Mã số kinh doanh (사업자등록번호)", hint: "Gõ 10 chữ số liền nhau", required: true, kind: "biz" },
    { key: "industry", label: "Loại hình (업종)", hint: "Ví dụ 음식점업", ko: true, required: true },
    { key: "address", label: "Địa chỉ (주소)", hint: "Ví dụ 강원특별자치도 춘천시 ○○로 12", ko: true, required: true },
    { key: "employer", label: "Tên chủ (고용주)", hint: "Ví dụ 홍길동", ko: true, required: true },
    { key: "job", label: "Công việc (업무의 내용, tiếng Hàn)", hint: "Ví dụ 음식점 홀 서빙, 주방 보조", ko: true },
    { key: "employerPhone", label: "Điện thoại chủ quán", hint: "Gõ số liền nhau, ví dụ 0331234567", required: true, kind: "phone" },
    { key: "periodFrom", label: "Làm từ ngày (취업기간)", hint: "", required: true, kind: "date", half: true },
    { key: "periodTo", label: "Đến ngày", hint: "", required: true, kind: "date", half: true },
    { key: "wage", label: "Lương giờ (won/giờ, 급여)", hint: "Chỉ điền số, ví dụ 10320", required: true, kind: "money" },
  ] },
  { title: "Giờ vào ca (cho hợp đồng)", note: "Không bắt buộc. Nếu điền, hợp đồng ghi giờ vào ca và giờ tan ca cụ thể.", fields: [
    { key: "startTime", label: "Giờ vào ca", hint: "", kind: "time", half: true },
    { key: "endTime", label: "Giờ tan ca", hint: "", kind: "time", half: true },
    { key: "breakMin", label: "Nghỉ giữa ca (phút)", hint: "Ví dụ 30", kind: "hours" as Kind, half: true },
  ] },
  { title: "Giờ làm trong tuần (근무시간)", note: "Ghi số giờ làm mỗi ngày (ví dụ 4 hoặc 4.5). Ngày nghỉ để trống. Tổng giờ tự tính.", fields: [
    ...([["mon", "Thứ 2 (월)"], ["tue", "Thứ 3 (화)"], ["wed", "Thứ 4 (수)"], ["thu", "Thứ 5 (목)"], ["fri", "Thứ 6 (금)"], ["sat", "Thứ 7 (토)"], ["sun", "Chủ nhật (일)"]] as const).map(([key, label]) => ({ key, label, hint: "Số giờ, ví dụ 4", kind: "hours" as Kind, half: true })),
  ] },
  { title: "Ngày ký và nơi nộp", fields: [
    { key: "year", label: "Năm", hint: "2026", half: true }, { key: "month", label: "Tháng", hint: "11", half: true }, { key: "day", label: "Ngày", hint: "05", half: true },
    { key: "office", label: "Sở xuất nhập cảnh (출입국·외국인사무소)", hint: "Ví dụ 춘천출입국·외국인사무소 (không điền thì để nguyên ○○)", ko: true },
  ] },
];

