"use client";

import { AppShell } from "../../components/AppShell";
import { AlertTriangle, BriefcaseBusiness, FileText } from "lucide-react";

const forms = [
  { href: "/tools/tong-hop", ko: "통합신청서", vi: "Đơn tổng hợp gửi 출입국 (별지 제34호서식)", ready: false },
  { href: "/tools/hop-dong", ko: "표준근로계약서", vi: "Hợp đồng lao động (mẫu của Bộ Lao động)", ready: true },
  { href: "/tools/xac-nhan", ko: "시간제취업확인서", vi: "Giấy xác nhận làm thêm (chủ quán và trường ký)", ready: true },
];

export default function ToolsPage() {
  return <AppShell>
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <header className="card-duo p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent"><BriefcaseBusiness className="h-6 w-6" /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Công cụ du học · Hàn Quốc</p>
            <h1 className="mt-1 text-2xl font-black text-ink">Hồ sơ xin phép làm thêm (D-2)</h1>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Hai mẫu đang dùng được, mỗi giấy một trang. Bạn nhập thông tin, hệ thống điền vào PDF để in hoặc tải về.</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2 rounded-xl border border-warn/30 bg-warn/10 p-3.5 text-xs leading-5 text-warn-ink"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-icon" /><span>Công cụ không phải tư vấn pháp lý. Mẫu giấy có thể được cập nhật, hãy xác nhận với phòng quốc tế của trường hoặc 1345. Thông tin chỉ nằm trên máy của bạn, không gửi lên máy chủ.</span></div>
      </header>
      <div className="space-y-3">
        {forms.map((f) => f.ready
          ? <a key={f.href} href={f.href} className="card-duo flex items-center justify-between gap-3 p-5 hover:border-accent"><span><span className="block text-base font-black text-ink">{f.ko}</span><span className="mt-1 block text-xs text-ink-mute">{f.vi}</span></span><FileText className="h-6 w-6 shrink-0 text-accent" /></a>
          : <div key={f.href} className="card-duo flex items-center justify-between gap-3 p-5 opacity-60"><span><span className="block text-base font-black text-ink">{f.ko}</span><span className="mt-1 block text-xs text-ink-mute">{f.vi}</span></span><span className="rounded-lg bg-line px-2.5 py-1 text-[11px] font-bold text-ink-soft">Sắp có</span></div>)}
      </div>
    </div>
  </AppShell>;
}
