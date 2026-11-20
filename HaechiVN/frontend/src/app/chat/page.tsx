"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { MessagesSquare, Send, RefreshCw, Trash2 } from "lucide-react";

type ChatMessage = {
  id: string;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
};

function formatTime(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function ChatPage() {
  const { currentUser, handleOpenAuth } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/chat/messages", { credentials: "same-origin", cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không tải được tin nhắn.");
        if (active) { setMessages(data.messages || []); setError(""); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được tin nhắn.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (!currentUser) { handleOpenAuth(false); return; }
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không gửi được tin nhắn.");
      setMessages((previous) => [...previous.filter((item) => item.id !== data.message.id), data.message].slice(-80));
      setText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được tin nhắn.");
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(message: ChatMessage) {
    if (!window.confirm("Xóa tin nhắn này?")) return;
    setDeletingId(message.id);
    setError("");
    try {
      const response = await fetch(`/api/chat/messages?id=${encodeURIComponent(message.id)}`, { method: "DELETE", credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không xóa được tin nhắn.");
      setMessages((previous) => previous.filter((item) => item.id !== message.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không xóa được tin nhắn.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-5 animate-fadeIn">
        <header className="card-duo flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300"><MessagesSquare className="h-6 w-6" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-300">Phòng chung HaechiVN</p>
            <h1 className="mt-1 text-xl font-black text-white">Trò chuyện và học cùng nhau</h1>
            <p className="mt-1 text-xs text-slate-400">Tin nhắn công khai với các thành viên. Không chia sẻ thông tin cá nhân.</p>
          </div>
          <button type="button" onClick={() => window.location.reload()} aria-label="Làm mới phòng trò chuyện" className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:border-sky-500"><RefreshCw className="h-4 w-4" /></button>
        </header>

        <section className="card-duo flex min-h-[55vh] flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
            {loading && <p className="py-10 text-center text-sm text-slate-400">Đang tải cuộc trò chuyện…</p>}
            {!loading && messages.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Chưa có tin nhắn. Hãy chào mọi người nhé.</p>}
            {messages.map((message) => {
              const ownMessage = message.author_id === currentUser?.id;
              return <article key={message.id} className={`max-w-[90%] rounded-2xl border px-4 py-3 ${ownMessage ? "ml-auto border-sky-500/40 bg-sky-500/10" : "border-slate-700 bg-slate-950/70"}`}>
                <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-400"><span className="font-bold text-slate-200">{ownMessage ? "Bạn" : message.author_name}</span><time dateTime={message.created_at}>{formatTime(message.created_at)}</time>{ownMessage && <button type="button" disabled={deletingId === message.id} onClick={() => void deleteMessage(message)} aria-label="Xóa tin nhắn" className="ml-auto rounded p-1 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>}</div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">{message.body}</p>
              </article>;
            })}
            <div ref={bottomRef} />
          </div>

          {error && <p role="alert" className="mx-4 mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
          <form onSubmit={sendMessage} className="flex items-end gap-3 border-t border-slate-800 p-4 sm:p-5">
            <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={500} rows={2} placeholder={currentUser ? "Viết tin nhắn…" : "Đăng nhập để tham gia trò chuyện"} disabled={!currentUser} className="min-h-12 flex-1 resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none disabled:opacity-60" />
            {currentUser ? <button disabled={sending || !text.trim()} className="btn-duo btn-duo-primary inline-flex h-12 items-center gap-2 px-4 text-xs disabled:opacity-50"><Send className="h-4 w-4" /><span className="hidden sm:inline">{sending ? "Đang gửi" : "Gửi"}</span></button> : <button type="button" onClick={() => handleOpenAuth(false)} className="btn-duo btn-duo-primary h-12 px-4 text-xs">Đăng nhập</button>}
          </form>
        </section>
      </div>
    </AppShell>
  );
}
