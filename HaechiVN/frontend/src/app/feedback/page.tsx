"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { MessageSquareHeart, Send } from "lucide-react";

export default function FeedbackPage() {
  const { currentUser, handleOpenAuth } = useApp();
  const [category, setCategory] = useState("idea");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) { handleOpenAuth(false); return; }
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không gửi được phản hồi.");
      setMessage("");
      setSuccess(data.message || "Đã gửi phản hồi. Cảm ơn bạn!");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được phản hồi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-5 animate-fadeIn">
        <header className="card-duo p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-300"><MessageSquareHeart className="h-6 w-6" /></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-pink-300">Góp ý & đánh giá</p>
          <h1 className="mt-2 text-2xl font-black text-white">Giúp HaechiVN tốt hơn</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Báo lỗi, góp ý về nội dung học hoặc đề xuất tính năng. Phản hồi chỉ hiển thị với đội ngũ quản trị.</p>
        </header>

        <section className="card-duo p-5 sm:p-6">
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-xs font-bold text-slate-300">Loại phản hồi
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-pink-500 focus:outline-none">
                <option value="idea">Ý tưởng tính năng</option><option value="bug">Báo lỗi</option><option value="content">Nội dung học tập</option><option value="other">Khác</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-300">Nội dung
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={3000} rows={7} required placeholder="Mô tả cụ thể điều bạn gặp hoặc muốn cải thiện…" className="mt-2 block w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-500 focus:border-pink-500 focus:outline-none" />
              <span className="mt-1 block text-right font-normal text-slate-500">{message.length}/3.000</span>
            </label>
            {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
            {success && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</p>}
            {currentUser ? <button disabled={sending || message.trim().length < 10} className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-5 py-3 text-xs disabled:opacity-50"><Send className="h-4 w-4" />{sending ? "Đang gửi…" : "Gửi phản hồi"}</button> : <button type="button" onClick={() => handleOpenAuth(false)} className="btn-duo btn-duo-primary px-5 py-3 text-xs">Đăng nhập để gửi phản hồi</button>}
          </form>
        </section>
      </div>
    </AppShell>
  );
}
