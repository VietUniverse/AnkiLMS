"use client";

import { HoSoWorkbench } from "../../../components/HoSoWorkbench";
import { xacNhan } from "../../../lib/hoSo/fill";
import type { Key } from "../../../lib/hoSo/fields";

const show: Key[] = ["name", "arc", "major", "term", "phone", "email", "company", "bizNo", "industry", "address", "employer", "employerPhone", "periodFrom", "periodTo", "wage", "mon", "tue", "wed", "thu", "fri", "sat", "sun", "year", "month", "day", "office"];
const required: Key[] = ["name", "arc", "major", "term", "phone", "email", "company", "bizNo", "industry", "address", "employer", "employerPhone", "periodFrom", "periodTo", "wage"];

export default function XacNhanPage() {
  return <HoSoWorkbench title="시간제취업확인서" subtitle="Giấy xác nhận làm thêm" filename="시간제취업확인서.pdf" paperSize="A4" show={show} required={required} generate={xacNhan}
    intro="Nhập thông tin bằng tiếng Việt, hệ thống điền vừa ô vào đúng mẫu gốc của 출입국 (mẫu HiKorea). Chủ quán ký, phòng quốc tế của trường ký và đóng dấu rồi mới nộp." />;
}
