"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { MessageCircle, Send, RefreshCw, Trash2 } from "lucide-react";

type Post = {
  id: string;
  category: string;
  title: string;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
};

const categoryNames: Record<string, string> = {
  study: "Chia sẻ cách học",
  question: "Câu hỏi",
  resource: "Tài liệu",
  conversation: "Giao lưu",
};

function formatDate(value: string): string {
  const parsed = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? "Vừa xong" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

export default function CommunityPage() {
  const { currentUser, handleOpenAuth } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("study");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadPosts() {
    setLoading(true);
    try {
      const response = await fetch("/api/community/posts", { credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được bài viết.");
      setPosts(data.posts || []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được bài viết.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPosts(); }, []);

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) { handleOpenAuth(true); return; }
    setSending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể đăng bài.");
      setPosts((previous) => [data.post, ...previous]);
      setTitle("");
      setBody("");
      setNotice("Bài viết đã được đăng.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng bài.");
    } finally {
      setSending(false);
    }
  }

  async function deletePost(post: Post) {
    if (!window.confirm("Xóa bài viết này?")) return;
    setDeletingId(post.id);
    setError("");
    try {
      const response = await fetch(`/api/community/posts?id=${encodeURIComponent(post.id)}`, { method: "DELETE", credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không xóa được bài viết.");
      setPosts((previous) => previous.filter((item) => item.id !== post.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không xóa được bài viết.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 animate-fadeIn">
        <header className="card-duo flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-sky-300">HaechiVN · Cộng đồng</p>
            <h1 className="mt-2 text-2xl font-black text-white">Cùng nhau học tiếng Hàn</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Chia sẻ cách học, hỏi bài và trao đổi tài liệu với người học khác.</p>
          </div>
          <button type="button" onClick={() => void loadPosts()} className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-sky-500">
            <RefreshCw className="h-4 w-4" /> Làm mới
          </button>
        </header>

        <section className="card-duo p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-white"><MessageCircle className="h-4 w-4 text-sky-400" /> Đăng bài mới</h2>
          <form onSubmit={submitPost} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={5} maxLength={120} required placeholder="Tiêu đề bài viết" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none" />
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-sky-500 focus:outline-none">
                {Object.entries(categoryNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={10} maxLength={3000} required rows={4} placeholder="Viết chia sẻ hoặc câu hỏi của bạn (10–3.000 ký tự)" className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Không đăng mật khẩu, email hay thông tin riêng tư.</p>
              {currentUser ? (
                <button disabled={sending} className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs disabled:opacity-50"><Send className="h-4 w-4" />{sending ? "Đang đăng…" : "Đăng bài"}</button>
              ) : (
                <button type="button" onClick={() => handleOpenAuth(true)} className="btn-duo btn-duo-primary px-4 py-2.5 text-xs">Đăng nhập để viết bài</button>
              )}
            </div>
          </form>
          {error && <p role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
          {notice && <p role="status" className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
        </section>

        <section className="space-y-3" aria-live="polite">
          <h2 className="px-1 text-sm font-black text-slate-200">Bài viết gần đây</h2>
          {loading ? <div className="card-duo p-8 text-center text-sm text-slate-400">Đang tải bài viết…</div> : posts.length === 0 ? <div className="card-duo p-8 text-center text-sm text-slate-400">Chưa có bài viết. Hãy mở đầu cuộc trò chuyện nhé.</div> : posts.map((post) => (
            <article key={post.id} className="card-duo space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-bold text-sky-300">{categoryNames[post.category] || "Cộng đồng"}</span>
                <span>{post.author_name}</span><span aria-hidden="true">·</span><time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
                {currentUser?.id === post.author_id && <button type="button" disabled={deletingId === post.id} onClick={() => void deletePost(post)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{deletingId === post.id ? "Đang xóa" : "Xóa"}</button>}
              </div>
              <h3 className="text-lg font-black text-white">{post.title}</h3>
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{post.body}</p>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
