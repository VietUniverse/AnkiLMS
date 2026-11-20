import React from "react";

export function PolicyPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto my-6 max-w-4xl rounded-3xl border border-slate-700 bg-slate-900/95 p-6 text-slate-200 shadow-xl sm:p-10">
      <a href="/login" className="text-sm font-bold text-blue-400 hover:underline">← Quay lại đăng ký</a>
      <p className="mt-8 text-xs font-bold uppercase tracking-widest text-cyan-400">HaechiVN · Quy định sử dụng</p>
      <h1 className="mt-2 text-3xl font-black text-white">{title}</h1>
      <p className="mt-2 text-xs text-slate-400">Cập nhật: {updated}</p>
      <div className="policy-copy mt-8 space-y-6 text-sm leading-7">{children}</div>
      <div className="mt-10 flex flex-wrap gap-4 border-t border-slate-700 pt-5 text-xs font-bold">
        <a href="/terms" className="text-blue-400 hover:underline">Điều khoản sử dụng</a>
        <a href="/privacy" className="text-blue-400 hover:underline">Quyền riêng tư</a>
        <a href="/community-rules" className="text-blue-400 hover:underline">Quy tắc cộng đồng</a>
      </div>
    </article>
  );
}
