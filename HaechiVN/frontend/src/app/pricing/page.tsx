"use client";

import Link from "next/link";
import { AppShell } from "../../components/AppShell";
import { Check, Crown, Sparkles } from "lucide-react";

const included = ["Luyện từ vựng theo lịch lặp lại ngắt quãng", "Bảng chữ Hangeul và tra từ", "Nghe chính tả và Shadowing", "Luyện đề TOPIK", "Nhập bộ thẻ Anki trên thiết bị của bạn", "Lưu tiến độ học khi đăng nhập"];

export default function PricingPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 animate-fadeIn">
        <header className="card-duo p-6 text-center sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300"><Crown className="h-7 w-7" /></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-amber-300">Gói dịch vụ</p>
          <h1 className="mt-2 text-3xl font-black text-white">Học tiếng Hàn cùng HaechiVN</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">Các tính năng học tập hiện có đang mở miễn phí. HaechiVN chưa thu phí và không yêu cầu thông tin thanh toán.</p>
        </header>
        <section className="card-duo mx-auto max-w-2xl p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black text-white">Gói học tập</h2><p className="mt-1 text-xs text-slate-400">Dùng ngay, không cần thẻ thanh toán</p></div><div className="text-right"><span className="text-3xl font-black text-emerald-300">0₫</span><span className="block text-xs text-slate-500">hiện tại</span></div></div>
          <ul className="mt-6 space-y-3">{included.map((item) => <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{item}</li>)}</ul>
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-xs leading-5 text-slate-400"><Sparkles className="mr-1 inline h-4 w-4 text-amber-300" />Nếu có thay đổi về gói dịch vụ, HaechiVN sẽ thông báo rõ ràng trước khi áp dụng.</div>
          <Link href="/" className="btn-duo btn-duo-primary mt-6 w-full px-5 py-3 text-center text-xs">Bắt đầu học miễn phí</Link>
        </section>
      </div>
    </AppShell>
  );
}
