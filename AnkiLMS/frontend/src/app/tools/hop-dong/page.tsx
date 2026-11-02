"use client";

import { HoSoWorkbench } from "../../../components/HoSoWorkbench";
import { hopDong } from "../../../lib/hoSo/fill";
import type { Key } from "../../../lib/hoSo/fields";

const show: Key[] = ["name", "arc", "addrKr", "phone", "company", "address", "employer", "job", "periodFrom", "periodTo", "wage", "startTime", "endTime", "breakMin", "mon", "tue", "wed", "thu", "fri", "sat", "sun", "year", "month", "day"];
const required: Key[] = ["name", "arc", "addrKr", "phone", "company", "address", "employer", "job", "periodFrom", "periodTo", "wage"];

export default function HopDongPage() {
  return <HoSoWorkbench title="표준근로계약서" subtitle="Hợp đồng lao động (시간제근로자용)" filename="표준근로계약서.pdf" show={show} required={required} generate={hopDong}
    intro="Hợp đồng lao động mẫu của Bộ Lao động cho người làm giờ. Phần thông tin dùng chung với giấy xác nhận làm thêm nên bạn đã nhập ở đó thì không phải nhập lại. Chủ quán và bạn cùng ký và đóng dấu."
    extraNote="Ô số đăng ký cư trú của chủ quán trong mẫu được để trống cho chủ quán tự điền." />;
}
