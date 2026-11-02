"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "../../../components/AppShell";
import { AlertTriangle, ArrowLeft, Download, Printer, Trash2 } from "lucide-react";
import { DAYS, hoursOf, totals, xacNhan, type XacNhanData } from "../../../lib/hoSo/fill";
import { clearXacNhan, emptyXacNhan, saveXacNhan, useXacNhanData } from "../../../lib/hoSo/store";

type Key = keyof XacNhanData;
type Kind = "phone" | "arc" | "biz" | "money" | "date" | "hours";
type F = { key: Key; label: string; hint: string; ko?: boolean; required?: boolean; half?: boolean; kind?: Kind };

// Gõ số liền nhau, hệ thống tự thêm dấu gạch và dấu phẩy
const digits = (v: string) => v.replace(/\D/g, "");
const format: Partial<Record<Kind, (v: string) => string>> = {
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

const groups: { title: string; note?: string; fields: F[] }[] = [
  { title: "Thông tin của bạn (대상자)", fields: [
    { key: "name", label: "Họ tên", hint: "IN HOA như hộ chiếu, ví dụ NGUYEN VAN A", required: true },
    { key: "arc", label: "Số thẻ ARC (외국인등록번호)", hint: "Gõ 13 chữ số liền nhau", required: true, kind: "arc" },
    { key: "major", label: "Khoa / ngành (학과, tiếng Hàn)", hint: "Ví dụ 경영학과", ko: true, required: true },
    { key: "term", label: "Số học kỳ đã hoàn thành (이수학기)", hint: "Chỉ điền số, ví dụ 3", required: true },
    { key: "phone", label: "Điện thoại ở Hàn", hint: "Gõ số liền nhau, ví dụ 01012345678", required: true, kind: "phone" },
    { key: "email", label: "Email", hint: "ten@gmail.com", required: true },
  ] },
  { title: "Nơi làm việc dự kiến (취업예정근무처)", note: "Hỏi chủ quán, lấy theo giấy đăng ký kinh doanh. Tên quán, địa chỉ, ngành nghề, tên chủ nhập tiếng Hàn.", fields: [
    { key: "company", label: "Tên quán / công ty (업체명)", hint: "Ví dụ 홍길동 식당", ko: true, required: true },
    { key: "bizNo", label: "Mã số kinh doanh (사업자등록번호)", hint: "Gõ 10 chữ số liền nhau", required: true, kind: "biz" },
    { key: "industry", label: "Loại hình (업종)", hint: "Ví dụ 음식점업", ko: true, required: true },
    { key: "address", label: "Địa chỉ (주소)", hint: "Ví dụ 강원특별자치도 춘천시 ○○로 12", ko: true, required: true },
    { key: "employer", label: "Tên chủ (고용주)", hint: "Ví dụ 홍길동", ko: true, required: true },
    { key: "employerPhone", label: "Điện thoại chủ quán", hint: "Gõ số liền nhau, ví dụ 0331234567", required: true, kind: "phone" },
    { key: "periodFrom", label: "Làm từ ngày (취업기간)", hint: "", required: true, kind: "date", half: true },
    { key: "periodTo", label: "Đến ngày", hint: "", required: true, kind: "date", half: true },
    { key: "wage", label: "Lương giờ (won/giờ, 급여)", hint: "Chỉ điền số, ví dụ 10320", required: true, kind: "money" },
  ] },
  { title: "Giờ làm trong tuần (근무시간)", note: "Ghi số giờ làm mỗi ngày (ví dụ 4 hoặc 4.5). Ngày nghỉ để trống. Tổng giờ tự tính.", fields: [
    ...([["mon", "Thứ 2 (월)"], ["tue", "Thứ 3 (화)"], ["wed", "Thứ 4 (수)"], ["thu", "Thứ 5 (목)"], ["fri", "Thứ 6 (금)"], ["sat", "Thứ 7 (토)"], ["sun", "Chủ nhật (일)"]] as const).map(([key, label]) => ({ key, label, hint: "Số giờ, ví dụ 4", kind: "hours" as Kind, half: true })),
  ] },
  { title: "Ngày ký và nơi nộp", fields: [
    { key: "year", label: "Năm", hint: "2026", half: true }, { key: "month", label: "Tháng", hint: "11", half: true }, { key: "day", label: "Ngày", hint: "05", half: true },
    { key: "office", label: "Sở xuất nhập cảnh (출입국·외국인사무소)", hint: "Ví dụ 춘천출입국·외국인사무소 (không điền thì để nguyên ○○)", ko: true },
  ] },
];

const arcOk = (v: string) => v.replace(/\D/g, "").length === 13;
const phoneOk = (v: string) => /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v.trim());
const stray = (v: string) => /[^ -~ᄀ-ᇿ㄰-㆏가-힣·~]/.test(v);

export default function XacNhanPage() {
  const saved = useXacNhanData();
  const [form, setForm] = useState<XacNhanData>(emptyXacNhan);
  const [loaded, setLoaded] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => { if (!loaded && saved) { setForm(saved); } if (!loaded) setLoaded(true); }, [saved, loaded]);

  const problems = useMemo(() => {
    const p: Partial<Record<Key, string>> = {};
    if (form.arc && !arcOk(form.arc)) p.arc = "Số ARC phải đủ 13 chữ số";
    if (form.phone && !phoneOk(form.phone)) p.phone = "Số điện thoại chưa đúng dạng 010-0000-0000";
    if (form.employerPhone && !phoneOk(form.employerPhone)) p.employerPhone = "Số điện thoại chưa đúng dạng 033-000-0000";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) p.email = "Email chưa đúng";
    for (const k of DAYS) if (form[k].trim() && hoursOf(form[k]) === null) p[k] = "Nhập số giờ từ 0 đến 24";
    if (form.periodFrom && form.periodTo && form.periodTo < form.periodFrom) p.periodTo = "Ngày kết thúc phải sau ngày bắt đầu";
    for (const g of groups) for (const f of g.fields) if (f.ko && stray(form[f.key])) p[f.key] = "Ô này chỉ nhận chữ Hàn và chữ Latin, không dùng tiếng Việt có dấu";
    return p;
  }, [form]);
  const tot = useMemo(() => totals(form), [form]);
  const missing = groups.flatMap((g) => g.fields).filter((f) => f.required && !form[f.key].trim()).length;

  const set = (k: Key, v: string) => setForm((c) => ({ ...c, [k]: v }));
  useEffect(() => { if (loaded) saveXacNhan(form); }, [form, loaded]);

  // Cập nhật xem trước sau khi ngừng gõ một chút
  useEffect(() => {
    if (!loaded) return;
    let dead = false; let prev = "";
    const t = setTimeout(async () => {
      setBusy(true); setError("");
      try {
        const bytes = await xacNhan(form);
        if (dead) return;
        prev = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
        setUrl((old) => { if (old) URL.revokeObjectURL(old); return prev; });
      } catch (e) { if (!dead) setError(e instanceof Error ? e.message : "Không tạo được PDF"); }
      finally { if (!dead) setBusy(false); }
    }, 500);
    return () => { dead = true; clearTimeout(t); };
  }, [form, loaded]);

  const print = () => { const w = frame.current?.contentWindow; if (w) { w.focus(); w.print(); } else if (url) window.open(url); };

  return <AppShell>
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <a href="/tools" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Công cụ du học</a>
      <header className="card-duo p-5 sm:p-6">
        <h1 className="text-xl font-black text-white sm:text-2xl">시간제취업확인서 <span className="text-base font-bold text-slate-400">Giấy xác nhận làm thêm</span></h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Nhập thông tin bằng tiếng Việt, hệ thống điền vừa ô vào đúng mẫu gốc của 출입국 (mẫu HiKorea). Chủ quán ký, phòng quốc tế của trường ký và đóng dấu rồi mới nộp.</p>
        <div className="mt-4 flex gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3.5 text-xs leading-5 text-amber-900 dark:text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" /><span>Công cụ không phải tư vấn pháp lý và không thay được chữ ký của chủ quán và trường. Mẫu giấy có thể được cập nhật, hãy xác nhận với phòng quốc tế của trường hoặc 1345. Chỉ đi làm sau khi được cấp phép.</span></div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {groups.map((g) => <section key={g.title} className="card-duo p-5">
            <h2 className="text-base font-black text-white">{g.title}</h2>
            {g.note && <p className="mt-1 text-xs leading-5 text-slate-400">{g.note}</p>}
            <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-2">
              {g.fields.map((f) => <label key={f.key} className={`block text-xs font-bold text-slate-300 ${f.half ? "col-span-1" : "col-span-3 sm:col-span-2"}`}>
                {f.label}{f.required && <span className="ml-1 text-amber-300">*</span>}
                <input type={f.kind === "date" ? "date" : "text"} value={form[f.key]} onChange={(e) => set(f.key, (f.kind && format[f.kind]) ? format[f.kind]!(e.target.value) : e.target.value)} placeholder={f.hint} inputMode={f.kind && f.kind !== "date" ? (f.kind === "hours" ? "decimal" : "numeric") : ["term", "year", "month", "day"].includes(f.key) ? "numeric" : undefined}
                  className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm font-normal text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none" />
                {problems[f.key] && <span className="mt-1 block text-[11px] font-semibold text-rose-300">{problems[f.key]}</span>}
              </label>)}

            </div>
          </section>)}
          {(tot.weekday || tot.weekend) && <p className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs leading-5 text-slate-300">Tổng giờ: ngày thường <b className="text-white">{tot.weekday || 0}</b> giờ, cuối tuần <b className="text-white">{tot.weekend || 0}</b> giờ.{Number(tot.weekday) > 15 && " Ngày thường đang trên 15 giờ/tuần: mức tối đa còn tùy cấp TOPIK và bậc học (có thể tới 20 hoặc 30 giờ). Quy định có thể đổi, hãy xác nhận với phòng quốc tế của trường hoặc 1345."}</p>}
          <p className="px-1 text-[11px] leading-5 text-slate-500">Mọi thông tin chỉ nằm trên máy của bạn (bộ nhớ trình duyệt), không gửi lên máy chủ HaechiVN. Bản nháp được lưu để lần sau không phải nhập lại.</p>
          <button type="button" onClick={() => { clearXacNhan(); setForm(emptyXacNhan()); }} className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><Trash2 className="h-3.5 w-3.5" />Xóa dữ liệu đã lưu</button>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="card-duo p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={print} disabled={!url} className="btn-duo btn-duo-primary flex items-center gap-2 px-4 py-2.5 text-xs disabled:opacity-50"><Printer className="h-4 w-4" />In</button>
              <a href={url || undefined} download="시간제취업확인서.pdf" aria-disabled={!url} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:border-cyan-400"><Download className="h-4 w-4" />Tải PDF</a>
              <span className="text-[11px] text-slate-400">{busy ? "Đang cập nhật..." : missing ? `Còn ${missing} ô bắt buộc chưa điền` : "Đã đủ thông tin"}</span>
            </div>
            {error && <p className="mt-2 text-xs font-semibold text-rose-300">{error}</p>}
            <iframe ref={frame} src={url ? `${url}#toolbar=0&navpanes=0&view=FitH` : undefined} title="Xem trước 시간제취업확인서" className="mt-3 h-[70vh] w-full rounded-lg border border-slate-800 bg-white" />
            <p className="mt-2 text-[11px] leading-5 text-slate-500">{url && <a href={url} target="_blank" rel="noreferrer" className="mr-2 font-bold text-cyan-500 underline">Mở PDF ở tab mới</a>}In khổ A4, tỉ lệ 100% (không chọn "vừa trang"). Chữ xanh là phần bạn điền, in đen trắng vẫn rõ.</p>
          </div>
        </aside>
      </div>
    </div>
  </AppShell>;
}
