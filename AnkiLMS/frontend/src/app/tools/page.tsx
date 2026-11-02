"use client";

import { useMemo, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { AlertTriangle, BriefcaseBusiness, Check, ClipboardList, ExternalLink, FileText, Printer, RotateCcw } from "lucide-react";

type Field = "fullName" | "nationality" | "birthDate" | "passport" | "arc" | "phone" | "email" | "school" | "visa" | "employer" | "workplace" | "businessNo" | "job" | "periodStart" | "periodEnd" | "daysHours" | "hourlyPay" | "supervisor";

const initialForm: Record<Field, string> = {
  fullName: "", nationality: "", birthDate: "", passport: "", arc: "", phone: "", email: "", school: "", visa: "D-2",
  employer: "", workplace: "", businessNo: "", job: "", periodStart: "", periodEnd: "", daysHours: "", hourlyPay: "", supervisor: "",
};

const fieldGroups: { title: string; fields: { key: Field; label: string; type?: string; required?: boolean; placeholder?: string }[] }[] = [
  { title: "Thông tin du học sinh", fields: [
    { key: "fullName", label: "Họ tên theo hộ chiếu", required: true }, { key: "nationality", label: "Quốc tịch", required: true },
    { key: "birthDate", label: "Ngày sinh", type: "date" }, { key: "passport", label: "Số hộ chiếu" }, { key: "arc", label: "Số thẻ cư trú (외국인등록번호)" },
    { key: "phone", label: "Số điện thoại tại Hàn Quốc" }, { key: "email", label: "Email liên hệ", type: "email" },
    { key: "school", label: "Trường / cơ sở đào tạo", required: true }, { key: "visa", label: "Loại tư cách lưu trú", required: true, placeholder: "Ví dụ: D-2-2, D-4-1" },
  ] },
  { title: "Thông tin nơi làm việc", fields: [
    { key: "employer", label: "Tên đơn vị tuyển dụng", required: true }, { key: "workplace", label: "Địa chỉ nơi làm việc" },
    { key: "businessNo", label: "Mã số đăng ký kinh doanh (사업자등록번호)" }, { key: "job", label: "Công việc / nhiệm vụ", required: true },
    { key: "periodStart", label: "Ngày bắt đầu dự kiến", type: "date" }, { key: "periodEnd", label: "Ngày kết thúc dự kiến", type: "date" },
    { key: "daysHours", label: "Ngày và khung giờ làm việc", placeholder: "Ví dụ: Thứ 3, 5 · 18:00–21:00" },
    { key: "hourlyPay", label: "Lương / cách trả lương", placeholder: "Ghi theo hợp đồng" }, { key: "supervisor", label: "Người phụ trách tại trường (nếu có)" },
  ] },
];

const documents = [
  "Hộ chiếu và thẻ đăng ký người nước ngoài (ARC)",
  "Giấy xác nhận đang theo học / giấy chứng nhận sinh viên",
  "Bảng điểm hoặc giấy tờ học tập theo yêu cầu của trường",
  "Hợp đồng lao động hoặc bản xác nhận tuyển dụng có công việc, thời hạn và giờ làm",
  "Thông tin đăng ký kinh doanh của nơi tuyển dụng (nếu được yêu cầu)",
  "Đơn xin phép làm thêm và xác nhận của trường theo mẫu hiện hành",
];

function TextField({ field, value, onChange }: { field: (typeof fieldGroups)[number]["fields"][number]; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-bold text-slate-300">{field.label}{field.required && <span className="ml-1 text-amber-300">*</span>}
    <input type={field.type || "text"} value={value} required={field.required} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder || ""} className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm font-normal text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none" />
  </label>;
}

export default function StudentPermitToolsPage() {
  const [form, setForm] = useState(initialForm);
  const [checked, setChecked] = useState<boolean[]>(documents.map(() => false));
  const [showPreview, setShowPreview] = useState(false);
  const completed = useMemo(() => Object.values(form).filter((value) => value.trim()).length, [form]);
  const percent = Math.round((completed / Object.keys(form).length) * 100);
  const update = (key: Field, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return <AppShell>
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <header className="card-duo p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300"><BriefcaseBusiness className="h-6 w-6" /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Công cụ du học · Hàn Quốc</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Chuẩn bị hồ sơ xin phép làm thêm</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Điền thông tin một lần để rà soát hồ sơ và tạo bản tóm tắt mang đến trường hoặc đối chiếu khi nộp trên HiKorea.</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3.5 text-xs leading-5 text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4 align-[-3px] text-amber-300" />Đây là công cụ chuẩn bị thông tin, không phải đơn chính thức và không gửi hồ sơ thay bạn. Điều kiện, biểu mẫu và giấy tờ có thể thay đổi theo tư cách lưu trú và trường; hãy xác nhận với phòng quốc tế của trường và HiKorea trước khi bắt đầu làm việc.</div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <div className="space-y-5">
          {fieldGroups.map((group) => <section key={group.title} className="card-duo p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-black text-white"><FileText className="h-4 w-4 text-cyan-300" />{group.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2">{group.fields.map((field) => <TextField key={field.key} field={field} value={form[field.key]} onChange={(value) => update(field.key, value)} />)}</div>
          </section>)}

          <section className="card-duo p-5 sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 text-base font-black text-white"><ClipboardList className="h-4 w-4 text-cyan-300" />Danh sách giấy tờ cần rà soát</h2>
            <p className="mb-4 text-xs leading-5 text-slate-400">Danh sách tham khảo để bạn trao đổi với trường; không phải checklist áp dụng cho mọi hồ sơ.</p>
            <div className="space-y-2">{documents.map((item, index) => <label key={item} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-200">
              <input type="checkbox" checked={checked[index]} onChange={(event) => setChecked((items) => items.map((value, i) => i === index ? event.target.checked : value))} className="mt-0.5 h-4 w-4 accent-cyan-400" />{item}
            </label>)}</div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card-duo h-fit p-5 sm:sticky sm:top-4">
            <h2 className="text-base font-black text-white">Tiến độ hồ sơ</h2>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-300"><span>Thông tin đã điền</span><b className="text-cyan-300">{percent}%</b></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${percent}%` }} /></div>
            <p className="mt-4 text-xs leading-5 text-slate-400">Các trường có dấu * nên được chuẩn bị trước. Kiểm tra nội dung hợp đồng và giờ làm với trường trước khi nhận việc.</p>
            <button type="button" onClick={() => setShowPreview((value) => !value)} className="btn-duo btn-duo-primary mt-5 flex w-full items-center justify-center gap-2 px-4 py-3 text-xs"><FileText className="h-4 w-4" />{showPreview ? "Ẩn bản xem trước" : "Xem bản tóm tắt hồ sơ"}</button>
            <button type="button" onClick={() => window.print()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-bold text-slate-200 hover:border-cyan-400"><Printer className="h-4 w-4" />In / Lưu thành PDF</button>
            <button type="button" onClick={() => { setForm(initialForm); setChecked(documents.map(() => false)); setShowPreview(false); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"><RotateCcw className="h-3.5 w-3.5" />Xóa nội dung đã nhập</button>
            <a href="https://www.hikorea.go.kr/" target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200">Mở cổng HiKorea <ExternalLink className="h-3.5 w-3.5" /></a>
            <p className="mt-3 border-t border-slate-800 pt-3 text-[11px] leading-5 text-slate-500">Thông tin chỉ nằm trong bộ nhớ trang hiện tại, không được gửi tới máy chủ HaechiVN. Đóng hoặc tải lại trang sẽ xóa dữ liệu đã điền.</p>
          </section>
        </aside>
      </section>

      {showPreview && <section className="card-duo p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Bản xem trước · 개인 준비용</p><h2 className="mt-1 text-xl font-black text-white">Thông tin chuẩn bị hồ sơ làm thêm</h2></div><span className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-200">Bản nháp cá nhân · Không phải đơn chính thức</span></div>
        <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">{fieldGroups.flatMap((group) => group.fields).map((field) => <div key={field.key} className="border-b border-slate-800 pb-2"><p className="text-[11px] text-slate-400">{field.label}</p><p className="mt-1 min-h-5 break-words text-sm font-semibold text-white">{form[field.key] || "—"}</p></div>)}</div>
        <div className="mt-5"><h3 className="text-sm font-bold text-white">Giấy tờ đã chuẩn bị</h3><ul className="mt-2 space-y-1.5 text-xs text-slate-300">{documents.map((item, index) => <li key={item} className="flex gap-2"><Check className={`h-4 w-4 shrink-0 ${checked[index] ? "text-emerald-400" : "text-slate-600"}`} />{item}</li>)}</ul></div>
      </section>}
      <style jsx global>{`@media print { body * { visibility: hidden !important; } #permit-print, #permit-print * { visibility: visible !important; } #permit-print { display: block !important; position: absolute !important; inset: 0 !important; width: 100% !important; margin: 0 !important; padding: 24px !important; color: #111 !important; background: #fff !important; } #permit-print h2, #permit-print h3, #permit-print p, #permit-print li { color: #111 !important; } #permit-print .permit-muted { color: #444 !important; } }`}</style>
      <div id="permit-print" className="hidden bg-white p-6 text-slate-950">
        <h1 className="text-2xl font-bold">Thông tin chuẩn bị hồ sơ xin phép làm thêm</h1><p className="permit-muted mt-1 text-sm">시간제취업 허가 신청 준비 자료 · Bản nháp để đối chiếu, không phải biểu mẫu chính thức.</p>
        {fieldGroups.map((group) => <section key={group.title} className="mt-6"><h2 className="border-b border-slate-400 pb-2 text-lg font-bold">{group.title}</h2><div className="mt-3 grid grid-cols-2 gap-3">{group.fields.map((field) => <div key={field.key}><p className="permit-muted text-xs">{field.label}</p><p className="min-h-5 text-sm">{form[field.key] || "—"}</p></div>)}</div></section>)}
        <section className="mt-6"><h2 className="border-b border-slate-400 pb-2 text-lg font-bold">Giấy tờ cần rà soát</h2><ul className="mt-3 space-y-1">{documents.map((item, index) => <li key={item}>{checked[index] ? "☑" : "☐"} {item}</li>)}</ul></section>
        <p className="permit-muted mt-6 border-t border-slate-300 pt-3 text-xs">Vui lòng xác nhận mẫu, điều kiện và giấy tờ hiện hành với trường và HiKorea. HaechiVN không thu thập hay lưu thông tin trên bản này.</p>
      </div>
    </div>
  </AppShell>;
}
