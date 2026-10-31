"use client";

import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { ApiClient } from "../../lib/apiClient";
import { AlertCircle, BookOpen, Check, Loader2, MessageSquare, RefreshCw, Search, ShieldCheck, Trash2, Users, SlidersHorizontal, Power, Plus, Save, X, Pencil, Globe, LockKeyhole } from "lucide-react";
import { DEFAULT_FEATURE_FLAGS, FEATURE_CATALOG, FeatureFlags, FeatureKey } from "../../lib/featureFlags";
import topikLessonsData from "../../data/topik_lessons.json";
import curatedKoreanPractice from "../../data/curated_korean_practice.json";
import { ExploreDeckManager } from "../../components/admin/ExploreDeckManager";
import { KOREAN_COURSE } from "../../data/koreanCourse";
import { DictionaryEntry, DictionaryLevel, detectDictionarySearchLanguage, searchLearningDictionary } from "../../lib/dictionarySearch";

type Overview = { users: number; students: number; teachers: number; classes: number; posts: number; pendingFeedback: number };
type UserRow = { id: string; email: string; name: string; role: "student" | "teacher" | "admin"; xp: number; gems: number; streak: number; created_at: string; decks: number; studySessions: number; lastStudied: string | null };
type FeedbackRow = { id: string; category: string; message: string; status: string; created_at: string; email: string; name: string };
type PostRow = { id: string; title: string; body: string; category: string; status: string; created_at: string; name: string; email: string };
type LessonRow = { id: string; title: string; lessonType: string; level: string; description: string; koreanText: string; vietnameseText: string; sourceUrl: string; isPublished: number; createdAt: string };
type ClassRow = { id: string; code: string; name: string; description: string; createdAt: string; ownerName: string; ownerEmail: string; members: number; assignments: number };
type ChatRow = { id: string; body: string; createdAt: string; userId: string; name: string; email: string };
type DeckRow = { userId: string; deckId: string; cardCount: number; updatedAt: string; name: string; email: string };
type DeckWord = Pick<DictionaryEntry, "hangul" | "vietnamese" | "english" | "japanese" | "partOfSpeech" | "level" | "topik" | "topic">;
type ContentDeck = { sharedId: string; deckId: string; title: string; description: string; visibility: "public" | "private"; cardCount: number; updatedAt: string };
type ContentDeckWithCards = ContentDeck & { cards: Array<Record<string, unknown>> };
const BUILTIN_LESSONS: { id: string; title: string; level: string; lessonType: string; count: number }[] = [
  ...topikLessonsData.map((lesson: any) => ({ id: lesson.id, title: lesson.title, level: lesson.topikName, lessonType: "Video · Dictation + Shadowing", count: lesson.segments.length })),
  ...curatedKoreanPractice.map((lesson: any) => ({ id: lesson.id, title: lesson.title, level: lesson.topikName, lessonType: "Bài sáng tác · Dictation + Shadowing", count: lesson.segments.length })),
  ...KOREAN_COURSE.map((lesson) => ({ id: lesson.id, title: lesson.title, level: lesson.level, lessonType: "Khóa học tiếng Hàn", count: lesson.dialogue.length })),
];
type Panel = "overview" | "students" | "decks" | "vocabularyDecks" | "lessons" | "classes" | "community" | "chat" | "feedback" | "features";

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
  { id: "vocabularyDecks", label: "Bộ từ Explore", icon: <BookOpen className="h-4 w-4" /> },
  { id: "lessons", label: "Bài học", icon: <BookOpen className="h-4 w-4" /> },
  { id: "classes", label: "Lớp học", icon: <Users className="h-4 w-4" /> },
  { id: "community", label: "Bài cộng đồng", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "chat", label: "Trò chuyện", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "feedback", label: "Góp ý", icon: <Check className="h-4 w-4" /> },
  { id: "features", label: "Tính năng production", icon: <SlidersHorizontal className="h-4 w-4" /> },
];

const fieldCls = "w-full rounded-xl border border-stone-200 dark:border-transparent bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner";
const selectCls = "rounded-xl border border-stone-200 dark:border-transparent bg-white dark:bg-[#132247] px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";
const labelCls = "block text-xs font-bold text-stone-700 dark:text-slate-300";
const ghostBtnCls = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-100 hover:bg-stone-200 dark:bg-[#132247] dark:hover:bg-[#1a2f60] px-3 py-2 text-xs font-bold text-stone-700 dark:text-slate-200 transition-colors";
const dangerBtnCls = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-700/50 bg-rose-50/50 hover:bg-rose-100 dark:bg-transparent dark:hover:bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const actionBtnCls = "inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs rounded-xl font-bold border border-stone-200 dark:border-slate-700 bg-stone-100 hover:bg-stone-200 dark:bg-[#132247] dark:hover:bg-[#1a2f60] text-stone-700 dark:text-slate-200 transition-colors disabled:opacity-50";

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
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
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
  const [contentDecks, setContentDecks] = useState<ContentDeck[]>([]);
  const [contentDecksLoading, setContentDecksLoading] = useState(false);
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [dictionaryResults, setDictionaryResults] = useState<DictionaryEntry[]>([]);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [builderTopik, setBuilderTopik] = useState("all");
  const [builderWords, setBuilderWords] = useState<DeckWord[]>([]);
  const [builderForm, setBuilderForm] = useState({ title: "", description: "", visibility: "public" as "public" | "private" });
  const [editingContentDeck, setEditingContentDeck] = useState("");

  const load = useCallback(async () => {
    if (!currentUser || currentUser.role !== "admin") return;
    setError("");
    const params = new URLSearchParams(); if (search) params.set("q", search);
    try {
      const [summary, userData, deckData, feedbackData, postData, lessonData, classData, chatData, featureData] = await Promise.all([
        adminFetch<Overview>("/api/admin/overview"),
        adminFetch<{ users: UserRow[] }>(`/api/admin/users${params.size ? `?${params}` : ""}`),
        adminFetch<{ decks: DeckRow[] }>("/api/admin/decks"),
        adminFetch<{ feedback: FeedbackRow[] }>("/api/admin/feedback"),
        adminFetch<{ posts: PostRow[] }>("/api/admin/community"),
        adminFetch<{ lessons: LessonRow[]; hiddenLessonIds: string[] }>("/api/admin/lessons"),
        adminFetch<{ classes: ClassRow[] }>("/api/admin/classes"),
        adminFetch<{ messages: ChatRow[] }>("/api/admin/chat"),
        adminFetch<{ features: Partial<FeatureFlags> }>("/api/admin/features"),
      ]);
      setOverview(summary); setUsers(userData.users); setDecks(deckData.decks); setFeedback(feedbackData.feedback); setPosts(postData.posts);
      setLessons(lessonData.lessons); setHiddenLessonIds(lessonData.hiddenLessonIds || []); setClasses(classData.classes); setMessages(chatData.messages);
      setFeatureFlags({ ...DEFAULT_FEATURE_FLAGS, ...featureData.features });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được trang quản trị."); }
  }, [currentUser, search]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (panel !== "vocabularyDecks" || currentUser?.role !== "admin") return;
    let cancelled = false;
    setContentDecksLoading(true);
    adminFetch<{ decks: ContentDeck[] }>("/api/admin/content-decks")
      .then((data) => { if (!cancelled) setContentDecks(data.decks); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Không tải được bộ từ Explore."); })
      .finally(() => { if (!cancelled) setContentDecksLoading(false); });
    return () => { cancelled = true; };
  }, [panel, currentUser]);

  useEffect(() => {
    if (panel !== "vocabularyDecks") return;
    const queryText = dictionaryQuery.trim();
    if (!queryText) { setDictionaryResults([]); setDictionaryLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setDictionaryLoading(true);
      void searchLearningDictionary(queryText, 24, controller.signal, detectDictionarySearchLanguage(queryText), builderTopik as DictionaryLevel)
        .then((results) => { if (!controller.signal.aborted) setDictionaryResults(results); })
        .catch(() => { if (!controller.signal.aborted) setDictionaryResults([]); })
        .finally(() => { if (!controller.signal.aborted) setDictionaryLoading(false); });
    }, 280);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [panel, dictionaryQuery, builderTopik]);

  async function action<T = unknown>(key: string, run: () => Promise<T>): Promise<T | undefined> {
    setBusy(key); setError("");
    try { const result = await run(); await load(); return result; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Thao tác không thành công."); return undefined; }
    finally { setBusy(""); }
  }

  function toggleFeature(key: FeatureKey) {
    const enabled = !featureFlags[key];
    void action(`feature:${key}`, () => adminFetch("/api/admin/features", {
      method: "PATCH",
      body: JSON.stringify({ key, enabled }),
    }));
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

  function addDictionaryWord(entry: DictionaryEntry) {
    setBuilderWords((current) => current.some((word) => word.hangul === entry.hangul) ? current : [...current, {
      hangul: entry.hangul, vietnamese: entry.vietnamese, english: entry.english, japanese: entry.japanese,
      partOfSpeech: entry.partOfSpeech, level: entry.level, topik: entry.topik, topic: entry.topic,
    }]);
  }

  async function editContentDeck(deck: ContentDeck) {
    setBusy(`load:${deck.sharedId}`); setError("");
    try {
      const response = await adminFetch<{ deck: ContentDeckWithCards }>(`/api/admin/content-decks?id=${encodeURIComponent(deck.sharedId)}`);
      const record = response.deck;
      setEditingContentDeck(record.sharedId);
      setBuilderForm({ title: record.title, description: record.description, visibility: record.visibility });
      setBuilderWords(record.cards.map((card) => {
        const fields = Array.isArray(card.fields) ? card.fields as unknown[] : [];
        const str = (value: unknown) => typeof value === "string" ? value : "";
        return {
          hangul: str(card.koreanText) || str(card.frontText) || str(fields[0]),
          vietnamese: str(card.vietnameseMeaning) || str(fields[1]), english: str(fields[2]), japanese: str(fields[3]),
          partOfSpeech: str(fields[4]), level: str(fields[5]), topic: str(fields[6]),
        };
      }).filter((word) => word.hangul));
      setDictionaryQuery(""); setPanel("vocabularyDecks");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được nội dung bộ thẻ."); }
    finally { setBusy(""); }
  }

  async function saveContentDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!builderWords.length) { setError("Hãy chọn ít nhất một từ từ kho dữ liệu trước khi lưu."); return; }
    setBusy("save-content-deck"); setError("");
    try {
      const deckId = editingContentDeck
        ? contentDecks.find((deck) => deck.sharedId === editingContentDeck)?.deckId || editingContentDeck
        : `admin-vocab-${crypto.randomUUID()}`;
      const cards = builderWords.map((word, index) => {
        const meaning = word.vietnamese || word.english || word.japanese || "";
        const fields = [word.hangul, word.vietnamese, word.english, word.japanese, word.partOfSpeech, word.level, word.topic].map((value) => value || "");
        return {
          id: index + 1, noteId: index + 1, frontHtml: word.hangul, backHtml: meaning,
          frontText: word.hangul, backText: meaning, koreanText: word.hangul, vietnameseMeaning: word.vietnamese,
          fields, tags: [word.topik, word.level, word.topic, word.partOfSpeech].filter(Boolean),
        };
      });
      const response = await adminFetch<{ success: boolean; sharedId: string }>("/api/admin/content-decks", {
        method: "POST",
        body: JSON.stringify({
          sharedId: editingContentDeck || undefined, deckId, title: builderForm.title,
          description: builderForm.description, visibility: builderForm.visibility, cards,
        }),
      });
      const list = await adminFetch<{ decks: ContentDeck[] }>("/api/admin/content-decks");
      setContentDecks(list.decks);
      setEditingContentDeck(""); setBuilderWords([]); setBuilderQueryReset();
      setBuilderForm({ title: "", description: "", visibility: "public" });
      setError("");
      if (!response.success) throw new Error("Máy chủ chưa xác nhận lưu bộ từ.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được bộ từ."); }
    finally { setBusy(""); }
  }

  function setBuilderQueryReset() { setDictionaryQuery(""); setDictionaryResults([]); }

  async function deleteContentDeck(deck: ContentDeck) {
    if (!window.confirm(`Gỡ bộ “${deck.title}” khỏi Explore và xóa dữ liệu thẻ trên máy chủ?`)) return;
    setBusy(`delete:${deck.sharedId}`); setError("");
    try {
      await adminFetch(`/api/admin/content-decks?id=${encodeURIComponent(deck.sharedId)}`, { method: "DELETE" });
      setContentDecks((current) => current.filter((item) => item.sharedId !== deck.sharedId));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không xóa được bộ từ."); }
    finally { setBusy(""); }
  }

  return <AppShell>
    <main className="mx-auto max-w-7xl space-y-6 pb-24">
      <header className="card-duo rounded-3xl flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 shrink-0">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900 dark:text-white">
              Quản trị <span className="text-blue-500 dark:text-blue-400">HaechiVN</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-stone-500 dark:text-slate-400">
              Quản lý học viên, nội dung học, lớp và cộng đồng trên toàn hệ thống.
            </p>
          </div>
        </div>
        {currentUser?.role === "admin" && (
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-100 hover:bg-stone-200 dark:bg-[#132247] dark:hover:bg-[#1a2f60] px-3.5 py-2.5 text-xs font-bold text-stone-700 dark:text-slate-200 transition-colors shrink-0"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <span className="hidden sm:inline">Làm mới dữ liệu</span>
          </button>
        )}
      </header>
      {!currentUser ? <div className="card-duo rounded-2xl p-8 text-center"><p className="mb-4 text-stone-600 dark:text-slate-300">Đăng nhập bằng tài khoản quản trị để tiếp tục.</p><button onClick={() => handleOpenAuth(false)} className="btn-duo btn-duo-primary px-5 py-2">Đăng nhập</button></div>
      : currentUser.role !== "admin" ? <div className="card-duo rounded-2xl p-8 text-center text-rose-600 dark:text-rose-300">Tài khoản này không có quyền quản trị.</div>
      : <>
        {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700 dark:text-rose-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
        <nav aria-label="Khu vực quản trị" className="flex items-center gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {panelLabels.map((item) => {
            const count = item.id === "students" ? (overview?.students ?? 0)
              : item.id === "decks" ? decks.length
              : item.id === "lessons" ? lessons.length + BUILTIN_LESSONS.length
              : item.id === "classes" ? classes.length
              : item.id === "community" ? posts.length
              : item.id === "chat" ? messages.length
              : item.id === "feedback" ? feedback.length
              : null;
            const active = panel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPanel(item.id)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                    : "border-stone-200 dark:border-slate-800 bg-stone-100 hover:bg-stone-200 dark:bg-[#132247] dark:hover:bg-[#1a2f60] text-stone-600 dark:text-slate-300"
                }`}
              >
                <span className={active ? "text-white" : "text-stone-500 dark:text-slate-400"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {count !== null && (
                  <span
                    className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                      active
                        ? "bg-blue-500/40 text-white"
                        : "bg-stone-200 dark:bg-slate-800 text-stone-500 dark:text-slate-400"
                    }`}
                  >
                    {count.toLocaleString("vi-VN")}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        {!overview ? <div className="card-duo rounded-2xl p-8 text-center text-stone-500 dark:text-slate-400">Đang tải dữ liệu quản trị…</div> : <>
          {panel === "overview" && (
            <div className="space-y-6">
              <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {[
                  ["Tài khoản", overview.users],
                  ["Học viên", overview.students],
                  ["Giáo viên", overview.teachers],
                  ["Lớp học", overview.classes],
                  ["Bài cộng đồng", overview.posts],
                  ["Góp ý mới", overview.pendingFeedback],
                ].map(([label, count]) => (
                  <button
                    key={label}
                    onClick={() =>
                      setPanel(
                        label === "Lớp học"
                          ? "classes"
                          : label === "Bài cộng đồng"
                          ? "community"
                          : label === "Góp ý mới"
                          ? "feedback"
                          : "students"
                      )
                    }
                    className="card-duo rounded-2xl p-5 text-left transition hover:border-blue-500/50 cursor-pointer"
                  >
                    <div className="text-[11px] font-extrabold uppercase tracking-widest text-stone-500 dark:text-slate-400">
                      {label}
                    </div>
                    <div className="mt-2 text-3xl font-black text-stone-900 dark:text-white">
                      {count}
                    </div>
                  </button>
                ))}
              </section>
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="card-duo rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
                  <div>
                    <h2 className="text-base font-bold text-stone-900 dark:text-white">Hoạt động học tập</h2>
                    <p className="mt-2 text-xs sm:text-sm leading-6 text-stone-500 dark:text-slate-400">
                      Mở Tài khoản để tìm học viên, xem XP, chuỗi ngày học và gán vai trò giáo viên.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanel("students")}
                    className="mt-4 inline-flex items-center text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    Quản lý học viên →
                  </button>
                </div>
                <div className="card-duo rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
                  <div>
                    <h2 className="text-base font-bold text-stone-900 dark:text-white">Nội dung đào tạo</h2>
                    <p className="mt-2 text-xs sm:text-sm leading-6 text-stone-500 dark:text-slate-400">
                      Tạo bài Dictation/Shadowing dùng chung cho học viên. Câu tiếng Hàn và bản dịch đặt cùng thứ tự dòng.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanel("lessons")}
                    className="mt-4 inline-flex items-center text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    Quản lý bài học →
                  </button>
                </div>
              </section>
            </div>
          )}

          {panel === "features" && <section className="space-y-4"><div className="card-duo border-sky-500/20 p-5"><h2 className="font-bold text-white">Ẩn hoặc hiện tính năng trên production</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Tắt tính năng sẽ gỡ mục khỏi menu trên máy tính và điện thoại, đồng thời chặn trang đó khi người học mở trực tiếp. Dữ liệu được giữ nguyên và có thể bật lại bất cứ lúc nào.</p><p className="mt-3 text-xs font-bold text-sky-300">{Object.values(featureFlags).filter(Boolean).length} / {FEATURE_CATALOG.length} tính năng đang hiện</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{FEATURE_CATALOG.map((feature) => { const enabled = featureFlags[feature.key]; const busyKey = `feature:${feature.key}`; return <article key={feature.key} className={`card-duo flex items-center justify-between gap-4 p-4 transition ${enabled ? "border-emerald-500/20" : "border-amber-500/20 opacity-80"}`}><div className="min-w-0"><h3 className="text-sm font-bold text-white">{feature.label}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{feature.description}</p><span className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-black ${enabled ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{enabled ? "Đang hiện" : "Đang ẩn"}</span></div><button type="button" role="switch" aria-checked={enabled} aria-label={`${enabled ? "Ẩn" : "Hiện lại"} ${feature.label}`} disabled={busy === busyKey} onClick={() => toggleFeature(feature.key)} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition disabled:cursor-wait disabled:opacity-50 ${enabled ? "border-emerald-400 bg-emerald-500/30" : "border-slate-600 bg-slate-800"}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full transition ${enabled ? "translate-x-6 bg-emerald-400 text-emerald-950" : "translate-x-1 bg-slate-400 text-slate-900"}`}><Power className="h-3 w-3" /></span></button></article>; })}</div></section>}

          {panel === "students" && <section className="card-duo overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 p-4"><div><h2 className="font-bold text-white">Tài khoản và học viên</h2><p className="mt-1 text-xs text-slate-500">{users.length} tài khoản trong kết quả · tối đa 500 dòng</p></div><form onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); }} className="flex gap-2"><label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3"><Search className="h-4 w-4 text-slate-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên hoặc email" className="w-44 bg-transparent py-2 text-xs text-white outline-none" /></label><button className="rounded-lg bg-sky-600 px-3 text-xs font-bold text-white">Tìm</button></form></div><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="text-xs text-slate-400"><tr><th className="p-3">Học viên</th><th className="p-3">XP</th><th className="p-3">Chuỗi</th><th className="p-3">Bộ Anki</th><th className="p-3">Phiên học</th><th className="p-3">Hoạt động gần nhất</th><th className="p-3">Ngày tạo</th><th className="p-3">Vai trò</th><th className="p-3">Thao tác</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-slate-800"><td className="p-3 text-white">{user.name}<span className="block text-xs text-slate-400">{user.email}</span></td><td className="p-3 text-amber-300">{user.xp}</td><td className="p-3 text-sky-300">{user.streak || 0} ngày</td><td className="p-3 text-slate-300">{user.decks || 0}</td><td className="p-3 text-slate-300">{user.studySessions || 0}</td><td className="p-3 text-slate-400">{user.lastStudied ? String(user.lastStudied).slice(0, 16) : "Chưa học"}</td><td className="p-3 text-slate-400">{String(user.created_at).slice(0, 10)}</td><td className="p-3"><select disabled={busy === user.id || user.id === currentUser.id} value={user.role} onChange={(event) => void action(user.id, () => adminFetch("/api/admin/users", { method: "PATCH", body: JSON.stringify({ userId: user.id, role: event.target.value }) }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"><option value="student">Học viên</option><option value="teacher">Giáo viên</option><option value="admin">Admin</option></select></td><td className="p-3">{user.role === "admin" ? <span className="text-xs text-slate-500">Không thể xóa admin</span> : <button disabled={busy === user.id || user.id === currentUser.id} onClick={() => deleteUser(user)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-700/50 px-2.5 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-50" title="Xóa tài khoản vĩnh viễn"><Trash2 className="h-3.5 w-3.5"/>Xóa</button>}</td></tr>)}</tbody></table>{users.length === 0 && <p className="p-5 text-sm text-slate-400">Không tìm thấy tài khoản.</p>}</div></section>}

          {panel === "decks" && <section className="card-duo overflow-hidden"><div className="border-b border-slate-700 p-4"><h2 className="font-bold text-white">Bộ thẻ Anki có tiến độ đồng bộ ({decks.length})</h2><p className="mt-1 text-xs text-slate-500">Xem số thẻ có trạng thái SRS trên máy chủ; xóa chỉ xóa trạng thái ôn tập đồng bộ, không xóa tệp Anki trong thiết bị.</p></div><div className="divide-y divide-slate-800">{decks.map((deck) => { const key = `${deck.userId}:${deck.deckId}`; return <article key={key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="break-all font-mono text-sm font-bold text-white">{deck.deckId}</h3><p className="mt-1 text-xs text-slate-400">{deck.name} · {deck.email}</p><p className="mt-1 text-xs text-slate-500">{deck.cardCount} trạng thái thẻ · cập nhật {String(deck.updatedAt).slice(0, 16)}</p></div><button disabled={busy === key} onClick={() => deleteDeck(deck)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-700/50 px-3 py-2 text-xs text-rose-300 disabled:opacity-50"><Trash2 className="h-4 w-4"/>Xóa tiến độ SRS</button></article>; })}{decks.length === 0 && <p className="p-5 text-sm text-slate-400">Chưa có bộ thẻ nào có tiến độ SRS đồng bộ.</p>}</div></section>}

          {panel === "vocabularyDecks" && <div className="space-y-5"><ExploreDeckManager request={adminFetch} onError={setError} /><div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="card-duo space-y-4 p-5">
              <div><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-white">{editingContentDeck ? "Cập nhật bộ từ Explore" : "Tạo bộ thẻ từ kho từ vựng"}</h2>{editingContentDeck && <button type="button" onClick={() => { setEditingContentDeck(""); setBuilderWords([]); setBuilderForm({ title: "", description: "", visibility: "public" }); }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300">Tạo bộ mới</button>}</div><p className="mt-1 text-xs leading-5 text-slate-400">Tìm từ trong kho từ điển của web, chọn kết quả, sửa nghĩa nếu cần rồi lưu thành bộ thẻ trên máy chủ. Bộ công khai sẽ hiện trong Khám phá.</p></div>
              <label className="block text-xs font-bold text-slate-300">Tìm bằng Hangul hoặc nghĩa tiếng Việt / Anh / Nhật<div className="mt-1.5 flex gap-2"><span className="flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3"><Search className="h-4 w-4 text-slate-500"/><input value={dictionaryQuery} onChange={(event) => setDictionaryQuery(event.target.value)} placeholder="사랑, tình yêu, love" className="w-full bg-transparent py-3 text-sm text-white outline-none" /></span><select value={builderTopik} onChange={(event) => setBuilderTopik(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"><option value="all">Mọi cấp</option>{[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={`TOPIK ${level}`}>TOPIK {level}</option>)}</select></div></label>
              <div className="max-h-72 divide-y divide-slate-800 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60">{dictionaryLoading && <p className="p-4 text-xs text-slate-400">Đang tìm…</p>}{!dictionaryLoading && dictionaryQuery.trim() && dictionaryResults.length === 0 && <p className="p-4 text-xs text-slate-500">Không thấy kết quả phù hợp.</p>}{dictionaryResults.map((entry) => { const added = builderWords.some((word) => word.hangul === entry.hangul); return <article key={`${entry.hangul}:${entry.vietnamese}`} className="flex items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="truncate font-noto text-sm font-bold text-white">{entry.hangul}<span className="ml-2 font-sans text-[10px] font-medium text-sky-300">{entry.topik || entry.level || "Chưa gán cấp"}</span></p><p className="mt-1 truncate text-xs text-slate-300">{entry.vietnamese || entry.english || entry.japanese || "Chưa có nghĩa"}</p>{entry.topic && <p className="mt-1 truncate text-[10px] text-slate-500">{entry.topic}</p>}</div><button type="button" disabled={added || builderWords.length >= 2000} onClick={() => addDictionaryWord(entry)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-700/50 px-3 py-2 text-xs font-bold text-sky-300 disabled:opacity-50">{added ? <><Check className="h-3.5 w-3.5"/>Đã chọn</> : <><Plus className="h-3.5 w-3.5"/>Thêm</>}</button></article>; })}{!dictionaryQuery.trim() && <p className="p-4 text-xs text-slate-500">Nhập từ khóa để tìm và chọn từ.</p>}</div>
              <form onSubmit={saveContentDeck} className="space-y-3 border-t border-slate-800 pt-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-300">Tên bộ thẻ<input required minLength={2} maxLength={120} value={builderForm.title} onChange={(event) => setBuilderForm({ ...builderForm, title: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label><label className="text-xs font-bold text-slate-300">Quyền<select value={builderForm.visibility} onChange={(event) => setBuilderForm({ ...builderForm, visibility: event.target.value as "public" | "private" })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="public">Công khai trên Explore</option><option value="private">Riêng tư</option></select></label></div><label className="block text-xs font-bold text-slate-300">Mô tả<textarea maxLength={1000} rows={2} value={builderForm.description} onChange={(event) => setBuilderForm({ ...builderForm, description: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-400">{builderWords.length} từ đã chọn · tối đa 2.000</span><button disabled={busy === "save-content-deck" || !builderWords.length} className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-5 py-3 text-xs disabled:opacity-50">{busy === "save-content-deck" ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}{editingContentDeck ? "Lưu cập nhật" : "Tạo bộ thẻ"}</button></div></form>
            </section>
            <section className="card-duo overflow-hidden"><div className="border-b border-slate-700 p-4"><h2 className="font-bold text-white">Từ trong bộ đang soạn ({builderWords.length})</h2><p className="mt-1 text-xs text-slate-500">Có thể chỉnh nghĩa hoặc bỏ từ trước khi lưu.</p></div><div className="max-h-[34rem] divide-y divide-slate-800 overflow-y-auto">{builderWords.map((word, index) => <article key={`${word.hangul}:${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-3"><div className="min-w-0"><p className="font-noto text-sm font-bold text-white">{word.hangul}<span className="ml-2 font-sans text-[10px] text-slate-500">{word.topik || word.level || ""}</span></p><input aria-label={`Nghĩa tiếng Việt cho ${word.hangul}`} value={word.vietnamese} onChange={(event) => setBuilderWords((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, vietnamese: event.target.value } : item))} placeholder={word.english || "Nhập nghĩa tiếng Việt"} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500" />{word.topic && <p className="mt-1 truncate text-[10px] text-slate-500">{word.topic}</p>}</div><button type="button" aria-label={`Bỏ ${word.hangul}`} onClick={() => setBuilderWords((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="self-start rounded-lg border border-rose-900/40 p-2 text-rose-300"><X className="h-4 w-4"/></button></article>)}{!builderWords.length && <p className="p-5 text-sm text-slate-500">Chưa chọn từ nào.</p>}</div></section>
            <section className="card-duo overflow-hidden xl:col-span-2"><div className="border-b border-slate-700 p-4"><h2 className="font-bold text-white">Bộ thẻ do admin quản lý ({contentDecks.length})</h2><p className="mt-1 text-xs text-slate-500">Sửa nội dung hoặc quyền truy cập; gỡ bộ sẽ xóa dữ liệu trên máy chủ.</p></div><div className="divide-y divide-slate-800">{contentDecksLoading && <p className="p-4 text-sm text-slate-400">Đang tải…</p>}{contentDecks.map((deck) => <article key={deck.sharedId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h3 className="truncate font-bold text-white">{deck.title}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-400">{deck.description || "Chưa có mô tả"}</p><p className="mt-1 text-[10px] text-slate-500">{deck.cardCount} thẻ · {deck.visibility === "public" ? <span className="text-emerald-300">Công khai</span> : <span className="text-amber-300">Riêng tư</span>} · {String(deck.updatedAt).slice(0, 10)}</p></div><div className="flex shrink-0 gap-2"><button disabled={busy === `load:${deck.sharedId}`} onClick={() => void editContentDeck(deck)} className="inline-flex items-center gap-1 rounded-lg border border-sky-700/50 px-3 py-2 text-xs font-bold text-sky-300"><Pencil className="h-3.5 w-3.5"/>Sửa</button><button disabled={busy === `delete:${deck.sharedId}`} onClick={() => void deleteContentDeck(deck)} className="inline-flex items-center gap-1 rounded-lg border border-rose-700/50 px-3 py-2 text-xs text-rose-300"><Trash2 className="h-3.5 w-3.5"/>Gỡ</button></div></article>)}{!contentDecksLoading && !contentDecks.length && <p className="p-5 text-sm text-slate-500">Chưa có bộ thẻ Explore do admin tạo.</p>}</div></section>
          </div></div>}
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





