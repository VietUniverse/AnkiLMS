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
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300"><BriefcaseBusiness className="h-6 w-6" /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Công cụ du học · Hàn Quốc</p>
            <h1 className="mt-1 text-2xl font-black text-white">Hồ sơ xin phép làm thêm (D-2)</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">Ba giấy cần điền, mỗi giấy một trang. Bạn nhập thông tin, hệ thống điền vào đúng mẫu gốc để in hoặc tải PDF.</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3.5 text-xs leading-5 text-amber-900 dark:text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" /><span>Công cụ không phải tư vấn pháp lý. Mẫu giấy có thể được cập nhật, hãy xác nhận với phòng quốc tế của trường hoặc 1345. Thông tin chỉ nằm trên máy của bạn, không gửi lên máy chủ.</span></div>
      </header>
      <div className="space-y-3">
        {forms.map((f) => f.ready
          ? <a key={f.href} href={f.href} className="card-duo flex items-center justify-between gap-3 p-5 hover:border-cyan-400"><span><span className="block text-base font-black text-white">{f.ko}</span><span className="mt-1 block text-xs text-slate-400">{f.vi}</span></span><FileText className="h-6 w-6 shrink-0 text-cyan-300" /></a>
          : <div key={f.href} className="card-duo flex items-center justify-between gap-3 p-5 opacity-60"><span><span className="block text-base font-black text-white">{f.ko}</span><span className="mt-1 block text-xs text-slate-400">{f.vi}</span></span><span className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300">Sắp có</span></div>)}
      </div>
    </div>
  </AppShell>;
}
