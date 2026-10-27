"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "../contexts/AppProvider";
import { MessageCircle, MessagesSquare, Minimize2, RefreshCw, Send, Trash2, X } from "lucide-react";

type ChatMessage = { id: string; body: string; author_id: string; author_name: string; created_at: string };

function formatTime(value: string) {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function FloatingCommunityChat() {
  const pathname = usePathname();
  const { currentUser, handleOpenAuth } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/chat/messages", { credentials: "same-origin", cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không tải được tin nhắn.");
        if (active) { setMessages(data.messages || []); setError(""); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Không tải được tin nhắn."); }
      finally { if (active) setLoading(false); }
    };
    setLoading(messages.length === 0);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => { active = false; window.clearInterval(timer); };
  // Fetch only while the popover is open; existing messages are retained when it closes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length, open]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (!currentUser) { handleOpenAuth(false); return; }
    setSending(true); setError("");
    try {
      const response = await fetch("/api/chat/messages", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không gửi được tin nhắn.");
      setMessages((previous) => [...previous.filter((item) => item.id !== data.message.id), data.message].slice(-80));
      setText("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không gửi được tin nhắn."); }
    finally { setSending(false); }
  }

  async function deleteMessage(message: ChatMessage) {
    if (!window.confirm("Xóa tin nhắn này?")) return;
    setDeletingId(message.id); setError("");
    try {
      const response = await fetch(`/api/chat/messages?id=${encodeURIComponent(message.id)}`, { method: "DELETE", credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không xóa được tin nhắn.");
      setMessages((previous) => previous.filter((item) => item.id !== message.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không xóa được tin nhắn."); }
    finally { setDeletingId(""); }
  }

  if (pathname === "/chat") return null;

  return <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-2 z-[80] flex flex-col items-end gap-3 sm:right-4 md:bottom-6 md:right-6">
    {open && <section aria-label="Chat cộng đồng" className="flex h-[min(72dvh,560px)] max-h-[calc(100dvh-9rem)] w-[min(380px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-indigo-500/40 bg-[#11182e] shadow-2xl shadow-black/50 animate-fadeIn">
      <header className="flex items-center gap-3 border-b border-indigo-500/20 bg-[#171c3b] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300"><MessagesSquare className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1"><h2 className="text-sm font-black text-white">Chat cộng đồng</h2><p className="mt-0.5 text-[10px] text-slate-400">Trò chuyện cùng học viên HaechiVN</p></div>
        <button type="button" onClick={() => { setLoading(true); void fetch("/api/chat/messages", { credentials: "same-origin", cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Không tải được tin nhắn."); setMessages(data.messages || []); setError(""); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Không tải được tin nhắn.")).finally(() => setLoading(false)); }} aria-label="Làm mới tin nhắn" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><RefreshCw className="h-4 w-4" /></button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Thu gọn chat" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><Minimize2 className="h-4 w-4" /></button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Đóng chat" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
        {loading && messages.length === 0 && <p className="py-10 text-center text-xs text-slate-400">Đang tải cuộc trò chuyện…</p>}
        {!loading && messages.length === 0 && <p className="py-10 text-center text-xs text-slate-400">Chưa có tin nhắn. Hãy chào mọi người nhé.</p>}
        {messages.map((message) => { const ownMessage = message.author_id === currentUser?.id; return <article key={message.id} className={`max-w-[92%] rounded-2xl border px-3 py-2.5 ${ownMessage ? "ml-auto border-sky-500/40 bg-sky-500/10" : "border-slate-700 bg-slate-950/60"}`}><div className="mb-1 flex items-center gap-2 text-[10px] text-slate-500"><span className="font-bold text-slate-300">{ownMessage ? "Bạn" : message.author_name}</span><time dateTime={message.created_at}>{formatTime(message.created_at)}</time>{ownMessage && <button type="button" disabled={deletingId === message.id} onClick={() => void deleteMessage(message)} aria-label="Xóa tin nhắn" className="ml-auto rounded p-1 text-rose-300"><Trash2 className="h-3 w-3" /></button>}</div><p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-100">{message.body}</p></article>; })}
        <div ref={bottomRef} />
      </div>
      {error && <p role="alert" className="mx-3 mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-300">{error}</p>}
      <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-slate-800 p-3"><textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} maxLength={500} rows={1} placeholder={currentUser ? "Nhập tin nhắn…" : "Đăng nhập để trò chuyện"} className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none" /><button aria-label="Gửi tin nhắn" disabled={sending || !text.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40"><Send className="h-4 w-4" /></button></form>
    </section>}
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Đóng chat cộng đồng" : "Mở chat cộng đồng"} aria-expanded={open} className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-sky-300/40 bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-xl shadow-sky-950/40 transition hover:scale-105 hover:shadow-sky-900/60 focus:outline-none focus:ring-4 focus:ring-sky-400/30">{open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}<span className="absolute right-16 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-lg transition group-hover:opacity-100">Chat cộng đồng</span><span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0b1329] bg-emerald-400" /></button>
  </div>;
}
