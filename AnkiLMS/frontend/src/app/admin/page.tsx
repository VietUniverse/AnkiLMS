"use client";

import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { ApiClient } from "../../lib/apiClient";
import { AlertCircle, BookOpen, Check, Loader2, MessageSquare, RefreshCw, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import topikLessonsData from "../../data/topik_lessons.json";
import curatedKoreanPractice from "../../data/curated_korean_practice.json";
import { KOREAN_COURSE } from "../../data/koreanCourse";

type Overview = { users: number; students: number; teachers: number; classes: number; posts: number; pendingFeedback: number };
type UserRow = { id: string; email: string; name: string; role: "student" | "teacher" | "admin"; xp: number; gems: number; streak: number; created_at: string; decks: number; studySessions: number; lastStudied: string | null };
type FeedbackRow = { id: string; category: string; message: string; status: string; created_at: string; email: string; name: string };
type PostRow = { id: string; title: string; body: string; category: string; status: string; created_at: string; name: string; email: string };
type LessonRow = { id: string; title: string; lessonType: string; level: string; description: string; koreanText: string; vietnameseText: string; sourceUrl: string; isPublished: number; createdAt: string };
type ClassRow = { id: string; code: string; name: string; description: string; createdAt: string; ownerName: string; ownerEmail: string; members: number; assignments: number };
type ChatRow = { id: string; body: string; createdAt: string; userId: string; name: string; email: string };
type DeckRow = { userId: string; deckId: string; cardCount: number; updatedAt: string; name: string; email: string };
const BUILTIN_LESSONS: { id: string; title: string; level: string; lessonType: string; count: number }[] = [
  ...topikLessonsData.map((lesson: any) => ({ id: lesson.id, title: lesson.title, level: lesson.topikName, lessonType: "Video · Dictation + Shadowing", count: lesson.segments.length })),
  ...curatedKoreanPractice.map((lesson: any) => ({ id: lesson.id, title: lesson.title, level: lesson.topikName, lessonType: "Bài sáng tác · Dictation + Shadowing", count: lesson.segments.length })),
  ...KOREAN_COURSE.map((lesson) => ({ id: lesson.id, title: lesson.title, level: lesson.level, lessonType: "Khóa học tiếng Hàn", count: lesson.dialogue.length })),
];
type Panel = "overview" | "students" | "decks" | "lessons" | "classes" | "community" | "chat" | "feedback";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = ApiClient.getToken();
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Không thể hoàn tất thao tác quản trị.");
  return data as T;
}

const panelLabels: { id: Panel; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Tổng quan", icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "students", label: "Tài khoản", icon: <Users className="h-4 w-4" /> },
  { id: "decks", label: "Bộ Anki", icon: <BookOpen className="h-4 w-4" /> },
  { id: "lessons", label: "Bài học", icon: <BookOpen className="h-4 w-4" /> },
  { id: "classes", label: "Lớp học", icon: <Users className="h-4 w-4" /> },
  { id: "community", label: "Bài cộng đồng", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "chat", label: "Trò chuyện", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "feedback", label: "Góp ý", icon: <Check className="h-4 w-4" /> },
];

export default function AdminPage() {
  const { currentUser, handleOpenAuth } = useApp();
  const [panel, setPanel] = useState<Panel>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [hiddenLessonIds, setHiddenLessonIds] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [editingLessonId, setEditingLessonId] = useState("");
  const [builtInQuery, setBuiltInQuery] = useState("");
  const [builtInLevel, setBuiltInLevel] = useState("all");
  const [builtInVisibility, setBuiltInVisibility] = useState("all");
  const [showAllBuiltIns, setShowAllBuiltIns] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: "", lessonType: "both", level: "TOPIK 1", description: "", koreanText: "", vietnameseText: "", sourceUrl: "" });

  const load = useCallback(async () => {
    if (!currentUser || currentUser.role !== "admin") return;
    setError("");
    const params = new URLSearchParams(); if (search) params.set("q", search);
    try {
      const [summary, userData, deckData, feedbackData, postData, lessonData, classData, chatData] = await Promise.all([
        adminFetch<Overview>("/api/admin/overview"),
        adminFetch<{ users: UserRow[] }>(`/api/admin/users${params.size ? `?${params}` : ""}`),
        adminFetch<{ decks: DeckRow[] }>("/api/admin/decks"),
        adminFetch<{ feedback: FeedbackRow[] }>("/api/admin/feedback"),
        adminFetch<{ posts: PostRow[] }>("/api/admin/community"),
        adminFetch<{ lessons: LessonRow[]; hiddenLessonIds: string[] }>("/api/admin/lessons"),
        adminFetch<{ classes: ClassRow[] }>("/api/admin/classes"),
        adminFetch<{ messages: ChatRow[] }>("/api/admin/chat"),
      ]);
      setOverview(summary); setUsers(userData.users); setDecks(deckData.decks); setFeedback(feedbackData.feedback); setPosts(postData.posts);
      setLessons(lessonData.lessons); setHiddenLessonIds(lessonData.hiddenLessonIds || []); setClasses(classData.classes); setMessages(chatData.messages);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được trang quản trị."); }
  }, [currentUser, search]);

  useEffect(() => { void load(); }, [load]);

  async function action<T = unknown>(key: string, run: () => Promise<T>): Promise<T | undefined> {
    setBusy(key); setError("");
    try { const result = await run(); await load(); return result; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Thao tác không thành công."); return undefined; }
    finally { setBusy(""); }
  }

  async function createLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action("new-lesson", async () => {
      await adminFetch("/api/admin/lessons", { method: editingLessonId ? "PATCH" : "POST", body: JSON.stringify({ ...lessonForm, ...(editingLessonId ? { id: editingLessonId } : {}) }) });
      setLessonForm({ title: "", lessonType: "both", level: "TOPIK 1", description: "", koreanText: "", vietnameseText: "", sourceUrl: "" });
      setEditingLessonId("");
      setPanel("lessons");
    });
  }

  function deleteLesson(lesson: LessonRow) {
    if (!window.confirm(`Xóa bài “${lesson.title}”? Bài sẽ bị gỡ khỏi thư viện học viên.`)) return;
    void action(lesson.id, () => adminFetch(`/api/admin/lessons?id=${encodeURIComponent(lesson.id)}`, { method: "DELETE" }));
  }

  function deleteClass(item: ClassRow) {
    if (!window.confirm(`Xóa lớp “${item.name}”, toàn bộ bài tập lớp và tiến độ liên quan? Thao tác này không thể hoàn tác.`)) return;
    void action(item.id, () => adminFetch(`/api/admin/classes?id=${encodeURIComponent(item.id)}`, { method: "DELETE" }));
  }

  function deleteDeck(deck: DeckRow) {
    if (!window.confirm(`Xóa toàn bộ trạng thái SRS của bộ thẻ ${deck.deckId} thuộc ${deck.name}? Thao tác này không thể hoàn tác.`)) return;
    const key = `${deck.userId}:${deck.deckId}`;
    void action(key, () => adminFetch(`/api/admin/decks?userId=${encodeURIComponent(deck.userId)}&deckId=${encodeURIComponent(deck.deckId)}`, { method: "DELETE" }));
  }

  function deleteUser(user: UserRow) {
    if (user.id === currentUser?.id || user.role === "admin") return;
    const confirmed = window.confirm(
      `Xóa tài khoản ${user.name} (${user.email}) vĩnh viễn? Tiến độ Anki, điểm, lớp do tài khoản này sở hữu, bài tập do tài khoản tạo và bài học do tài khoản soạn sẽ bị xóa. Thao tác này không thể hoàn tác.`,
    );
    if (!confirmed) return;
    void action(user.id, () => adminFetch<{ failedMediaCleanup?: number }>(`/api/admin/users?userId=${encodeURIComponent(user.id)}`, { method: "DELETE" }))
      .then((result) => {
        if (result?.failedMediaCleanup) setError(`Đã xóa tài khoản nhưng còn ${result.failedMediaCleanup} tệp media không thể dọn khỏi kho lưu trữ.`);
      });
  }

  function renameClass(item: ClassRow) {
    const name = window.prompt("Tên lớp", item.name)?.trim(); if (!name || name === item.name) return;
    const description = window.prompt("Mô tả lớp", item.description)?.trim() ?? item.description;
    void action(item.id, () => adminFetch("/api/admin/classes", { method: "PATCH", body: JSON.stringify({ id: item.id, name, description }) }));
  }

  return <AppShell>
    <main className="mx-auto max-w-7xl space-y-6 pb-24">
      <header className="card-duo flex flex-wrap items-center justify-between gap-4 border-sky-500/30 bg-gradient-to-r from-[#13244e] to-[#10203c] p-6">
        <div className="flex items-center gap-4"><div className="rounded-2xl bg-sky-500/15 p-3 text-sky-300"><ShieldCheck className="h-7 w-7" /></div><div><h1 className="text-2xl font-black text-white">Quản trị HaechiVN</h1><p className="mt-1 text-sm text-slate-400">Quản lý học viên, nội dung học, lớp và cộng đồng trên toàn hệ thống.</p></div></div>
        {currentUser?.role === "admin" && <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-sky-400"><RefreshCw className="h-4 w-4" />Làm mới dữ liệu</button>}
      </header>
      {!currentUser ? <div className="card-duo p-8 text-center"><p className="mb-4 text-slate-300">Đăng nhập bằng tài khoản quản trị để tiếp tục.</p><button onClick={() => handleOpenAuth(false)} className="btn-duo btn-duo-primary px-5 py-2">Đăng nhập</button></div>
      : currentUser.role !== "admin" ? <div className="card-duo p-8 text-center text-rose-300">Tài khoản này không có quyền quản trị.</div>
      : <>
        {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
        <nav aria-label="Khu vực quản trị" className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">{panelLabels.map((item) => {
          const count = item.id === "students" ? (overview?.students ?? 0) : item.id === "decks" ? decks.length : item.id === "lessons" ? lessons.length + BUILTIN_LESSONS.length : item.id === "classes" ? classes.length : item.id === "community" ? posts.length : item.id === "chat" ? messages.length : item.id === "feedback" ? feedback.length : null;
          return <button key={item.id} onClick={() => setPanel(item.id)} aria-current={panel === item.id ? "page" : undefined} className={`flex min-h-[72px] items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${panel === item.id ? "border-sky-400/70 bg-sky-500/15 text-white shadow-lg shadow-sky-950/20" : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-600 hover:text-white"}`}><span className={`rounded-xl p-2 ${panel === item.id ? "bg-sky-400/15 text-sky-200" : "bg-slate-800/70 text-slate-400"}`}>{item.icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{item.label}</span>{count !== null && <span className="mt-1 block text-[10px] text-slate-500">{count.toLocaleString("vi-VN")} mục</span>}</span></button>;
        })}</nav>
        {!overview ? <div className="card-duo p-8 text-center text-slate-400">Đang tải dữ liệu quản trị…</div> : <>
          {panel === "overview" && <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{[["Tài khoản", overview.users], ["Học viên", overview.students], ["Giáo viên", overview.teachers], ["Lớp học", overview.classes], ["Bài cộng đồng", overview.posts], ["Góp ý mới", overview.pendingFeedback]].map(([label, count]) => <button key={label} onClick={() => setPanel(label === "Lớp học" ? "classes" : label === "Bài cộng đồng" ? "community" : label === "Góp ý mới" ? "feedback" : "students")} className="card-duo p-4 text-left hover:border-sky-500/50"><div className="text-2xl font-black text-white">{count}</div><div className="mt-1 text-xs text-slate-400">{label}</div></button>)}</section>
            <section className="grid gap-4 lg:grid-cols-2"><div className="card-duo p-5"><h2 className="font-bold text-white">Hoạt động học tập</h2><p className="mt-2 text-sm text-slate-400">Mở Tài khoản để tìm học viên, xem XP, chuỗi ngày học và gán vai trò giáo viên.</p><button onClick={() => setPanel("students")} className="mt-4 text-xs font-bold text-sky-300">Quản lý học viên →</button></div><div className="card-duo p-5"><h2 className="font-bold text-white">Nội dung đào tạo</h2><p className="mt-2 text-sm text-slate-400">Tạo bài Dictation/Shadowing dùng chung cho học viên. Câu tiếng Hàn và bản dịch đặt cùng thứ tự dòng.</p><button onClick={() => setPanel("lessons")} className="mt-4 text-xs font-bold text-sky-300">Quản lý bài học →</button></div></section>
          </>}

          {panel === "students" && <section className="card-duo overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 p-4"><div><h2 className="font-bold text-white">Tài khoản và học viên</h2><p className="mt-1 text-xs text-slate-500">{users.length} tài khoản trong kết quả · tối đa 500 dòng</p></div><form onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); }} className="flex gap-2"><label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3"><Search className="h-4 w-4 text-slate-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên hoặc email" className="w-44 bg-transparent py-2 text-xs text-white outline-none" /></label><button className="rounded-lg bg-sky-600 px-3 text-xs font-bold text-white">Tìm</button></form></div><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="text-xs text-slate-400"><tr><th className="p-3">Học viên</th><th className="p-3">XP</th><th className="p-3">Chuỗi</th><th className="p-3">Bộ Anki</th><th className="p-3">Phiên học</th><th className="p-3">Hoạt động gần nhất</th><th className="p-3">Ngày tạo</th><th className="p-3">Vai trò</th><th className="p-3">Thao tác</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-slate-800"><td className="p-3 text-white">{user.name}<span className="block text-xs text-slate-400">{user.email}</span></td><td className="p-3 text-amber-300">{user.xp}</td><td className="p-3 text-sky-300">{user.streak || 0} ngày</td><td className="p-3 text-slate-300">{user.decks || 0}</td><td className="p-3 text-slate-300">{user.studySessions || 0}</td><td className="p-3 text-slate-400">{user.lastStudied ? String(user.lastStudied).slice(0, 16) : "Chưa học"}</td><td className="p-3 text-slate-400">{String(user.created_at).slice(0, 10)}</td><td className="p-3"><select disabled={busy === user.id || user.id === currentUser.id} value={user.role} onChange={(event) => void action(user.id, () => adminFetch("/api/admin/users", { method: "PATCH", body: JSON.stringify({ userId: user.id, role: event.target.value }) }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"><option value="student">Học viên</option><option value="teacher">Giáo viên</option><option value="admin">Admin</option></select></td><td className="p-3">{user.role === "admin" ? <span className="text-xs text-slate-500">Không thể xóa admin</span> : <button disabled={busy === user.id || user.id === currentUser.id} onClick={() => deleteUser(user)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-700/50 px-2.5 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-50" title="Xóa tài khoản vĩnh viễn"><Trash2 className="h-3.5 w-3.5"/>Xóa</button>}</td></tr>)}</tbody></table>{users.length === 0 && <p className="p-5 text-sm text-slate-400">Không tìm thấy tài khoản.</p>}</div></section>}

          {panel === "decks" && <section className="card-duo overflow-hidden"><div className="border-b border-slate-700 p-4"><h2 className="font-bold text-white">Bộ thẻ Anki có tiến độ đồng bộ ({decks.length})</h2><p className="mt-1 text-xs text-slate-500">Xem số thẻ có trạng thái SRS trên máy chủ; xóa chỉ xóa trạng thái ôn tập đồng bộ, không xóa tệp Anki trong thiết bị.</p></div><div className="divide-y divide-slate-800">{decks.map((deck) => { const key = `${deck.userId}:${deck.deckId}`; return <article key={key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="break-all font-mono text-sm font-bold text-white">{deck.deckId}</h3><p className="mt-1 text-xs text-slate-400">{deck.name} · {deck.email}</p><p className="mt-1 text-xs text-slate-500">{deck.cardCount} trạng thái thẻ · cập nhật {String(deck.updatedAt).slice(0, 16)}</p></div><button disabled={busy === key} onClick={() => deleteDeck(deck)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-700/50 px-3 py-2 text-xs text-rose-300 disabled:opacity-50"><Trash2 className="h-4 w-4"/>Xóa tiến độ SRS</button></article>; })}{decks.length === 0 && <p className="p-5 text-sm text-slate-400">Chưa có bộ thẻ nào có tiến độ SRS đồng bộ.</p>}</div></section>}

          {panel === "lessons" && <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><form onSubmit={createLesson} className="card-duo space-y-4 p-5"><div><h2 className="font-bold text-white">{editingLessonId ? "Sửa bài học" : "Thêm bài học dùng chung"}</h2><p className="mt-1 text-xs leading-5 text-slate-400">Mỗi dòng là một câu tiếng Hàn. Bản dịch cùng thứ tự; có thể để trống. Nội dung xuất hiện trong thư viện học của học viên.</p></div><label className="block text-xs font-bold text-slate-300">Tên bài<input required maxLength={160} value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-300">Loại<select value={lessonForm.lessonType} onChange={(event) => setLessonForm({ ...lessonForm, lessonType: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white"><option value="both">Dictation + Shadowing</option><option value="dictation">Dictation</option><option value="shadowing">Shadowing</option></select></label><label className="text-xs font-bold text-slate-300">Cấp độ<input value={lessonForm.level} onChange={(event) => setLessonForm({ ...lessonForm, level: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white" /></label></div><label className="block text-xs font-bold text-slate-300">Mô tả<textarea rows={2} value={lessonForm.description} onChange={(event) => setLessonForm({ ...lessonForm, description: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label><label className="block text-xs font-bold text-slate-300">Câu tiếng Hàn · mỗi câu một dòng<textarea required rows={7} value={lessonForm.koreanText} onChange={(event) => setLessonForm({ ...lessonForm, koreanText: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-noto text-sm text-white" /></label><label className="block text-xs font-bold text-slate-300">Dịch tiếng Việt · cùng thứ tự<textarea rows={5} value={lessonForm.vietnameseText} onChange={(event) => setLessonForm({ ...lessonForm, vietnameseText: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label><label className="block text-xs font-bold text-slate-300">Link nguồn (không bắt buộc)<input type="url" value={lessonForm.sourceUrl} onChange={(event) => setLessonForm({ ...lessonForm, sourceUrl: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label><button disabled={busy === "new-lesson"} className="btn-duo btn-duo-primary w-full px-4 py-3 text-xs disabled:opacity-50">{busy === "new-lesson" ? "Đang lưu…" : editingLessonId ? "Lưu thay đổi" : "Tạo và phát hành bài học"}</button></form>
            <section className="card-duo overflow-hidden"><div className="border-b border-slate-700 p-4"><h2 className="font-bold text-white">Thư viện bài do quản trị viên thêm ({lessons.length})</h2><p className="mt-1 text-xs text-slate-500">Bài xóa sẽ biến mất khỏi thư viện học viên.</p></div><div className="divide-y divide-slate-800">{lessons.map((lesson) => <article key={lesson.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-300">{lesson.lessonType}</span><span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-300">{lesson.level}</span></div><h3 className="mt-2 font-bold text-white">{lesson.title}</h3>{lesson.description && <p className="mt-1 text-xs text-slate-400">{lesson.description}</p>}<p className="mt-2 line-clamp-2 whitespace-pre-line font-noto text-xs text-slate-400">{lesson.koreanText}</p><p className="mt-1 text-[10px] text-slate-600">{lesson.koreanText.split(/\r?\n/).filter(Boolean).length} câu · {String(lesson.createdAt).slice(0, 10)}</p></div><button onClick={() => { setEditingLessonId(lesson.id); setLessonForm({ title: lesson.title, lessonType: lesson.lessonType, level: lesson.level, description: lesson.description, koreanText: lesson.koreanText, vietnameseText: lesson.vietnameseText, sourceUrl: lesson.sourceUrl }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">Sửa</button><button disabled={busy === lesson.id} onClick={() => deleteLesson(lesson)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-700/50 px-3 py-2 text-xs text-rose-300 hover:bg-rose-950/40 disabled:opacity-50"><Trash2 className="h-4 w-4"/>Xóa bài</button></article>)}{lessons.length === 0 && <p className="p-5 text-sm text-slate-400">Chưa có bài do quản trị viên tạo.</p>}</div></section><details className="card-duo overflow-hidden group"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-white">Kho bài học có sẵn</h2><span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300">{BUILTIN_LESSONS.length} bài</span><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">{BUILTIN_LESSONS.length - hiddenLessonIds.length} đang hiện</span></div><p className="mt-1 text-xs text-slate-500">Tìm bài, lọc theo cấp độ, rồi ẩn hoặc khôi phục khỏi thư viện học viên.</p></div><span className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-sky-300 group-open:hidden">Mở kho bài</span><span className="hidden rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 group-open:inline">Thu gọn</span></summary><div className="border-t border-slate-800"><div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-slate-800 bg-slate-950/95 p-3 backdrop-blur"><label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3"><Search className="h-4 w-4 text-slate-500"/><input value={builtInQuery} onChange={(event) => { setBuiltInQuery(event.target.value); setShowAllBuiltIns(false); }} placeholder="Tìm tên bài học…" className="w-full bg-transparent py-2 text-xs text-white outline-none" /></label><select value={builtInLevel} onChange={(event) => { setBuiltInLevel(event.target.value); setShowAllBuiltIns(false); }} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"><option value="all">Mọi cấp độ</option>{Array.from(new Set(BUILTIN_LESSONS.map((lesson) => lesson.level))).map((level) => <option key={level} value={level}>{level}</option>)}</select><select value={builtInVisibility} onChange={(event) => setBuiltInVisibility(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"><option value="all">Hiện cả bài ẩn</option><option value="visible">Chỉ bài đang hiện</option><option value="hidden">Chỉ bài đang ẩn</option></select></div><div className="divide-y divide-slate-800">{(() => { const normalizedQuery = builtInQuery.trim().toLocaleLowerCase("vi"); const filtered = BUILTIN_LESSONS.filter((lesson) => { const hidden = hiddenLessonIds.includes(lesson.id); const searchMatches = !normalizedQuery || lesson.title.toLocaleLowerCase("vi").includes(normalizedQuery); const levelMatches = builtInLevel === "all" || lesson.level === builtInLevel; const visibilityMatches = builtInVisibility === "hidden" ? hidden : builtInVisibility === "visible" ? !hidden : true; return searchMatches && levelMatches && visibilityMatches; }); const shown = showAllBuiltIns ? filtered : filtered.slice(0, 12); return <>{shown.map((lesson) => { const hidden = hiddenLessonIds.includes(lesson.id); return <article key={lesson.id} className="flex flex-col gap-3 p-4 transition hover:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h3 className={`truncate text-sm font-bold ${hidden ? "text-slate-500" : "text-white"}`}>{lesson.title}</h3><div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><span className="rounded bg-slate-800 px-2 py-1">{lesson.level}</span><span>{lesson.lessonType}</span><span>{lesson.count} câu</span><span className={`rounded px-2 py-1 font-bold ${hidden ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}>{hidden ? "Đang ẩn" : "Đang hiển thị"}</span></div></div><button disabled={busy === lesson.id} onClick={() => void action(lesson.id, () => adminFetch("/api/admin/lessons", { method: "PATCH", body: JSON.stringify({ id: lesson.id, visibilityOnly: true, isPublished: hidden }) }))} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold ${hidden ? "border-emerald-700/50 text-emerald-300 hover:bg-emerald-950/30" : "border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-200"}`}>{hidden ? "Khôi phục bài" : "Ẩn khỏi học viên"}</button></article>; })}{filtered.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Không tìm thấy bài học phù hợp.</p>}{filtered.length > 12 && <div className="p-3 text-center"><button onClick={() => setShowAllBuiltIns((value) => !value)} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-sky-300">{showAllBuiltIns ? "Thu gọn danh sách" : `Xem thêm ${filtered.length - shown.length} bài`}</button></div>}</>; })()}</div></div></details></div>}

          {panel === "classes" && <section className="card-duo overflow-hidden"><div className="border-b border-slate-700 p-4"><h2 className="font-bold text-white">Lớp học trên hệ thống ({classes.length})</h2><p className="mt-1 text-xs text-slate-500">Xem giáo viên chủ lớp, số học viên và bài tập; sửa tên/mô tả hoặc xóa lớp.</p></div><div className="divide-y divide-slate-800">{classes.map((item) => <article key={item.id} className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between"><div><h3 className="font-bold text-white">{item.name} <span className="ml-2 font-mono text-xs text-sky-300">{item.code}</span></h3><p className="mt-1 text-xs text-slate-400">Chủ lớp: {item.ownerName} · {item.ownerEmail}</p><p className="mt-1 text-xs text-slate-500">{item.members} học viên · {item.assignments} bài tập · {item.description || "Chưa có mô tả"}</p></div><div className="flex gap-2"><button onClick={() => renameClass(item)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">Sửa thông tin</button><button disabled={busy === item.id} onClick={() => deleteClass(item)} className="inline-flex items-center gap-1 rounded-lg border border-rose-700/50 px-3 py-2 text-xs text-rose-300"><Trash2 className="h-4 w-4"/>Xóa lớp</button></div></article>)}{classes.length === 0 && <p className="p-5 text-sm text-slate-400">Chưa có lớp học.</p>}</div></section>}

          {panel === "community" && <section className="card-duo overflow-hidden"><div className="border-b border-slate-700 p-4 font-bold text-white">Kiểm duyệt bài cộng đồng ({posts.length})</div><div className="divide-y divide-slate-800">{posts.map((post) => <article key={post.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-bold text-white">{post.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{post.body}</p><p className="mt-2 text-xs text-slate-500">{post.name} · {post.email} · {post.category} · {post.status}</p></div><div className="flex shrink-0 gap-2"><button disabled={busy === post.id} onClick={() => void action(post.id, () => adminFetch("/api/admin/community", { method: "PATCH", body: JSON.stringify({ id: post.id, status: post.status === "published" ? "hidden" : "published" }) }))} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">{post.status === "published" ? "Ẩn bài" : "Hiện bài"}</button><button disabled={busy === post.id} onClick={() => { if (window.confirm("Xóa bài viết này vĩnh viễn?")) void action(post.id, () => adminFetch(`/api/admin/community?id=${encodeURIComponent(post.id)}`, { method: "DELETE" })); }} className="inline-flex items-center gap-1 rounded-lg border border-rose-700/50 px-3 py-2 text-xs text-rose-300"><Trash2 className="h-4 w-4"/>Xóa</button></div></article>)}{posts.length === 0 && <p className="p-5 text-sm text-slate-400">Chưa có bài viết.</p>}</div></section>}

          {panel === "chat" && <section className="card-duo overflow-hidden"><div className="border-b border-slate-700 p-4 font-bold text-white">Tin nhắn cộng đồng ({messages.length} gần đây)</div><div className="divide-y divide-slate-800">{messages.map((item) => <article key={item.id} className="flex items-start justify-between gap-4 p-4"><div><p className="whitespace-pre-wrap text-sm text-slate-200">{item.body}</p><p className="mt-2 text-xs text-slate-500">{item.name} · {item.email} · {String(item.createdAt).slice(0, 16)}</p></div><button disabled={busy === item.id} onClick={() => { if (window.confirm("Xóa tin nhắn này?")) void action(item.id, () => adminFetch(`/api/admin/chat?id=${encodeURIComponent(item.id)}`, { method: "DELETE" })); }} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-700/50 px-3 py-2 text-xs text-rose-300"><Trash2 className="h-4 w-4"/>Xóa</button></article>)}{messages.length === 0 && <p className="p-5 text-sm text-slate-400">Chưa có tin nhắn.</p>}</div></section>}

          {panel === "feedback" && <section className="card-duo overflow-hidden"><div className="border-b border-slate-700 p-4 font-bold text-white">Góp ý và yêu cầu hỗ trợ ({feedback.length})</div><div className="divide-y divide-slate-800">{feedback.map((item) => <article key={item.id} className="space-y-3 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-white">{item.category}</strong><span className="ml-2 text-xs text-slate-400">{item.name} · {item.email} · {String(item.created_at).slice(0, 16)}</span></div><select disabled={busy === item.id} value={item.status} onChange={(event) => void action(item.id, () => adminFetch("/api/admin/feedback", { method: "PATCH", body: JSON.stringify({ id: item.id, status: event.target.value }) }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"><option value="new">Mới</option><option value="in_progress">Đang xử lý</option><option value="resolved">Đã xử lý</option></select></div><p className="whitespace-pre-wrap text-sm text-slate-300">{item.message}</p></article>)}{feedback.length === 0 && <p className="p-5 text-sm text-slate-400">Chưa có góp ý.</p>}</div></section>}
        </>}</>}
    </main>
  </AppShell>;
}





