"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./AppShell";
import { AlertTriangle, ArrowLeft, Download, Printer, Trash2 } from "lucide-react";
import { DAYS, hoursOf, totals, type XacNhanData } from "../lib/hoSo/fill";
import { clearXacNhan, emptyXacNhan, saveXacNhan, useXacNhanData } from "../lib/hoSo/store";
import { format, groups, type Key } from "../lib/hoSo/fields";

const arcOk = (v: string) => v.replace(/\D/g, "").length === 13;
const phoneOk = (v: string) => /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v.trim());
const stray = (v: string) => /[^ -~ᄀ-ᇿ㄰-㆏가-힣·~]/.test(v);

export function HoSoWorkbench({ title, subtitle, intro, filename, paperSize, show, required, generate, extraNote }: { title: string; subtitle: string; intro: string; filename: string; paperSize: "A4" | "Letter"; show: Key[]; required: Key[]; generate: (d: XacNhanData) => Promise<Uint8Array>; extraNote?: string }) {
  const saved = useXacNhanData();
  const [form, setForm] = useState<XacNhanData>(emptyXacNhan);
  const [loaded, setLoaded] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => { if (!loaded && saved) { setForm(saved); } if (!loaded) setLoaded(true); }, [saved, loaded]);

  const shown = useMemo(() => groups.map((g) => ({ ...g, fields: g.fields.filter((f) => show.includes(f.key)) })).filter((g) => g.fields.length), [show]);
  const problems = useMemo(() => {
    const p: Partial<Record<Key, string>> = {};
    if (form.arc && !arcOk(form.arc)) p.arc = "Số ARC phải đủ 13 chữ số";
    if (form.phone && !phoneOk(form.phone)) p.phone = "Số điện thoại chưa đúng dạng 010-0000-0000";
    if (form.employerPhone && !phoneOk(form.employerPhone)) p.employerPhone = "Số điện thoại chưa đúng dạng 033-000-0000";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) p.email = "Email chưa đúng";
    for (const k of DAYS) if (form[k].trim() && hoursOf(form[k]) === null) p[k] = "Nhập số giờ từ 0 đến 24";
    if (form.periodFrom && form.periodTo && form.periodTo < form.periodFrom) p.periodTo = "Ngày kết thúc phải sau ngày bắt đầu";
    if (form.startTime && form.endTime && form.endTime <= form.startTime) p.endTime = "Giờ tan ca phải sau giờ vào ca";
    if (form.breakMin && (Number(form.breakMin) < 0 || Number(form.breakMin) > 180)) p.breakMin = "Thời gian nghỉ phải từ 0 đến 180 phút";
    for (const g of shown) for (const f of g.fields) if (f.ko && stray(form[f.key])) p[f.key] = "Ô này chỉ nhận chữ Hàn và chữ Latin, không dùng tiếng Việt có dấu";
    return p;
  }, [form, shown]);
  const tot = useMemo(() => totals(form), [form]);
  const missing = required.filter((k) => !form[k].trim()).length;

  const set = (k: Key, v: string) => { setBusy(true); setForm((c) => ({ ...c, [k]: v })); };
  useEffect(() => { if (loaded) saveXacNhan(form); }, [form, loaded]);

  // Cập nhật xem trước sau khi ngừng gõ một chút
  useEffect(() => {
    if (!loaded) return;
    let dead = false; let prev = "";
    const t = setTimeout(async () => {
      setBusy(true); setError("");
      try {
        const bytes = await generate(form);
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
      <a href="/tools" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-mute hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" />Công cụ du học</a>
      <header className="card-duo p-5 sm:p-6">
        <h1 className="text-xl font-black text-ink sm:text-2xl">{title} <span className="text-base font-bold text-ink-mute">{subtitle}</span></h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{intro}</p>
        <div className="mt-4 flex gap-2 rounded-xl border border-warn/30 bg-warn/10 p-3.5 text-xs leading-5 text-warn-ink"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-icon" /><span>Công cụ không phải tư vấn pháp lý và không thay được chữ ký của chủ quán và trường. Mẫu giấy có thể được cập nhật, hãy xác nhận với phòng quốc tế của trường hoặc 1345. Chỉ đi làm sau khi được cấp phép.</span></div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {shown.map((g) => <section key={g.title} className="card-duo p-5">
            <h2 className="text-base font-black text-ink">{g.title}</h2>
            {g.note && <p className="mt-1 text-xs leading-5 text-ink-mute">{g.note}</p>}
            <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-2">
              {g.fields.map((f) => <label key={f.key} className={`block text-xs font-bold text-ink-soft ${f.half ? "col-span-1" : "col-span-3 sm:col-span-2"}`}>
                {f.label}{required.includes(f.key) && <span className="ml-1 text-warn-icon">*</span>}
                <input type={f.kind === "date" ? "date" : f.kind === "time" ? "time" : "text"} value={form[f.key]} onChange={(e) => set(f.key, (f.kind && format[f.kind]) ? format[f.kind]!(e.target.value) : e.target.value)} placeholder={f.hint} inputMode={f.kind && f.kind !== "date" && f.kind !== "time" ? (f.kind === "hours" ? "decimal" : "numeric") : ["term", "year", "month", "day"].includes(f.key) ? "numeric" : undefined}
                  className="mt-2 block w-full rounded-xl border border-line bg-field px-3.5 py-3 text-sm font-normal text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none" />
                {problems[f.key] && <span className="mt-1 block text-[11px] font-semibold text-danger">{problems[f.key]}</span>}
              </label>)}

            </div>
          </section>)}
          {show.includes("mon") && (tot.weekday || tot.weekend) && <p className="rounded-xl border border-line bg-panel p-3 text-xs leading-5 text-ink-soft">Tổng giờ: ngày thường <b className="text-ink">{tot.weekday || 0}</b> giờ, cuối tuần <b className="text-ink">{tot.weekend || 0}</b> giờ.{Number(tot.weekday) > 15 && " Ngày thường đang trên 15 giờ/tuần: mức tối đa còn tùy cấp TOPIK và bậc học (có thể tới 20 hoặc 30 giờ). Quy định có thể đổi, hãy xác nhận với phòng quốc tế của trường hoặc 1345."}</p>}
          {extraNote && <p className="px-1 text-[11px] leading-5 text-ink-faint">{extraNote}</p>}
          <p className="px-1 text-[11px] leading-5 text-ink-faint">Mọi thông tin chỉ nằm trên máy của bạn (bộ nhớ trình duyệt), không gửi lên máy chủ HaechiVN. Bản nháp được lưu để lần sau không phải nhập lại.</p>
          <button type="button" onClick={() => { clearXacNhan(); setBusy(true); setForm(emptyXacNhan()); }} className="flex items-center gap-2 text-xs font-semibold text-ink-mute hover:text-ink"><Trash2 className="h-3.5 w-3.5" />Xóa dữ liệu đã lưu</button>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="card-duo p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={print} disabled={!url || busy} className="btn-duo btn-duo-primary flex items-center gap-2 px-4 py-2.5 text-xs disabled:opacity-50"><Printer className="h-4 w-4" />In</button>
              <a href={!busy ? url || undefined : undefined} download={filename} aria-disabled={!url || busy} className="flex items-center gap-2 rounded-xl border border-line bg-field px-4 py-2.5 text-xs font-bold text-ink-soft hover:border-accent aria-disabled:opacity-50"><Download className="h-4 w-4" />Tải PDF</a>
              <span className="text-[11px] text-ink-mute">{busy ? "Đang cập nhật..." : missing ? `Còn ${missing} ô bắt buộc chưa điền` : "Đã đủ thông tin"}</span>
            </div>
            {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
            <iframe ref={frame} src={url ? `${url}#toolbar=0&navpanes=0&view=FitH` : undefined} title={`Xem trước ${title}`} className="mt-3 h-[70vh] w-full rounded-lg border border-line bg-white" />
            <p className="mt-2 text-[11px] leading-5 text-ink-faint">{url && !busy && <a href={url} target="_blank" rel="noreferrer" className="mr-2 font-bold text-accent underline">Mở PDF ở tab mới</a>}In khổ {paperSize}, tỉ lệ 100% (không chọn "vừa trang"). Chữ xanh là phần bạn điền, in đen trắng vẫn rõ.</p>
          </div>
        </aside>
      </div>
    </div>
  </AppShell>;
}
