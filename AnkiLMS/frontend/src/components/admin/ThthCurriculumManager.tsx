"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  FolderPlus,
   GraduationCap,
  Image as ImageIcon,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { clearAdminThthCurriculumCache, loadAdminThthCurriculum } from "../../lib/privateLearningContent";
import { speakKorean } from "../../lib/koreanSpeech";

export type ThthCardItem = {
  id: number | string;
  code?: string;
  word: string;
  meaning: string;
  pos?: string;
  transliteration?: string;
  explain?: string;
  image?: string;
  example?: string;
  example_translated?: string;
  collocation?: string;
  synonym?: string;
  antonym?: string;
  audio_word?: string;
  audio_meaning?: string;
  audio_example?: string;
  tag_1?: string;
  tag_2?: string;
  tag_3?: string;
  tag_4?: string;
  deckName?: string;
};

export type ThthDeckItem = {
  id: string;
  name: string;
  book: number;
  topic: string;
  difficulty: string;
  cards: ThthCardItem[];
};

export type ThthAccessGrant = {
  id: string;
  targetType: "user" | "class";
  targetId: string;
  bookNumber: number;
  lessonPrefix: string;
  createdAt: string;
  userName?: string | null;
  userEmail?: string | null;
  className?: string | null;
  classCode?: string | null;
};

type AdminClassSummary = {
  id: string;
  code: string;
  name: string;
  description: string;
  ownerName: string;
  members: number;
  assignments: number;
};

type AdminUserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
};

interface ThthCurriculumManagerProps {
  classes: AdminClassSummary[];
  users: AdminUserSummary[];
  onRefreshClasses: () => Promise<void>;
  onNotify: (type: "success" | "error", message: string) => void;
}

const cleanText = (str?: string): string =>
  (str || "").replace(/<[^>]*>/g, "").replace(/\[sound:.*?\]/gi, "").trim();

const resolveMediaUrl = (raw?: string): string | null => {
  if (!raw) return null;
  const soundMatch = raw.match(/\[sound:([^\]]+)\]/i);
  if (soundMatch?.[1]) {
    const fn = soundMatch[1].trim();
    return fn.startsWith("http") || fn.startsWith("/api/") ? fn : `/api/thth-media?file=${encodeURIComponent(fn)}`;
  }
  const srcMatch = raw.match(/src=["']([^"']+)["']/i);
  if (srcMatch?.[1]) {
    const src = srcMatch[1].trim();
    if (src.startsWith("http") || src.startsWith("/api/")) return src;
    const clean = src.replace(/^\/+/, "");
    return `/api/thth-media?file=${encodeURIComponent(clean)}`;
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http") || trimmed.startsWith("/api/")) return trimmed;
  if (/\.(mp3|ogg|wav|m4a|webp|png|jpg|jpeg|gif)$/i.test(trimmed)) {
    return `/api/thth-media?file=${encodeURIComponent(trimmed.replace(/^\/+/, ""))}`;
  }
  return null;
};

export const ThthCurriculumManager: React.FC<ThthCurriculumManagerProps> = ({
  classes,
  users,
  onRefreshClasses,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<"classAccess" | "cards" | "assign">("classAccess");
  const [decks, setDecks] = useState<ThthDeckItem[]>([]);
  const [grants, setGrants] = useState<ThthAccessGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Filters for Cards Browser
  const [selectedBook, setSelectedBook] = useState<number>(1);
  const [selectedLesson, setSelectedLesson] = useState<string>("all");
  const [selectedDeckId, setSelectedDeckId] = useState<string>("all");
  const [cardSearch, setCardSearch] = useState<string>("");
  const [cardPage, setCardPage] = useState<number>(0);

  // Card Editor Modal
  const [editingCard, setEditingCard] = useState<{
    deckId: string;
    isNew: boolean;
    card: ThthCardItem;
  } | null>(null);
  const [uploadingMediaField, setUploadingMediaField] = useState<string | null>(null);

  // Quick Create THTH Class Form
  const [newClassBook, setNewClassBook] = useState<number>(1);
  const [newClassName, setNewClassName] = useState<string>("");
  const [newClassDesc, setNewClassDesc] = useState<string>("");
  const [autoAssignAllLessons, setAutoAssignAllLessons] = useState<boolean>(true);

  // Grant Access Form
  const [grantTargetType, setGrantTargetType] = useState<"class" | "user">("class");
  const [grantTargetId, setGrantTargetId] = useState<string>("");
  const [grantBookNumber, setGrantBookNumber] = useState<number>(1);
  const [grantLessonPrefix, setGrantLessonPrefix] = useState<string>("");

  // Assign to Existing Class Form
  const [assignClassId, setAssignClassId] = useState<string>("");
  const [assignBook, setAssignBook] = useState<number>(1);
  const [assignLesson, setAssignLesson] = useState<string>("");
  const [assignDeckId, setAssignDeckId] = useState<string>("");
  const [assignCustomTitle, setAssignCustomTitle] = useState<string>("");
  const [assignDueDate, setAssignDueDate] = useState<string>(() => {
    const d = new Date(Date.now() + 14 * 86_400_000);
    return d.toISOString().slice(0, 10);
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadAll = async (force = false) => {
    setLoading(true);
    try {
      const [curriculumData, grantRes] = await Promise.all([
        loadAdminThthCurriculum(force),
        fetch("/api/admin/thth", { credentials: "same-origin", cache: "no-store" }).then((r) => r.json()),
      ]);
      setDecks((curriculumData || []) as ThthDeckItem[]);
      if (grantRes?.grants) setGrants(grantRes.grants);
    } catch {
      onNotify("error", "Không tải được dữ liệu Tiếng Hàn Tổng Hợp.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!assignClassId && classes[0]?.id) {
      setAssignClassId(classes[0].id);
    }
    if (grantTargetType === "class" && !grantTargetId && classes[0]?.id) {
      setGrantTargetId(classes[0].id);
    }
  }, [classes, assignClassId, grantTargetType, grantTargetId]);

  const playCardAudio = (audioField?: string, fallbackText?: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const url = resolveMediaUrl(audioField);
    const clean = cleanText(fallbackText);
    if (url) {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {
        if (clean) speakKorean(clean);
      });
      return;
    }
    if (clean) speakKorean(clean);
  };

  // Book summary stats
  const bookStats = useMemo(() => {
    const map = new Map<number, { decks: number; lessons: Set<string>; cards: number }>();
    for (const b of [1, 2, 3, 4]) {
      map.set(b, { decks: 0, lessons: new Set(), cards: 0 });
    }
    for (const d of decks) {
      const b = Number(d.book || 1);
      if (!map.has(b)) map.set(b, { decks: 0, lessons: new Set(), cards: 0 });
      const entry = map.get(b)!;
      entry.decks += 1;
      const lessonPart = (d.name.split("::")[2] || "").trim();
      if (lessonPart) entry.lessons.add(lessonPart);
      entry.cards += d.cards?.length || 0;
    }
    return map;
  }, [decks]);

  const lessonsForSelectedBook = useMemo(() => {
    const set = new Set<string>();
    for (const d of decks) {
      if (Number(d.book) === selectedBook) {
        const l = (d.name.split("::")[2] || "").trim();
        if (l) set.add(l);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  }, [decks, selectedBook]);

  const lessonsForAssignBook = useMemo(() => {
    const set = new Set<string>();
    for (const d of decks) {
      if (Number(d.book) === assignBook) {
        const l = (d.name.split("::")[2] || "").trim();
        if (l) set.add(l);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  }, [decks, assignBook]);

  const subdecksForSelectedLesson = useMemo(() => {
    return decks.filter((d) => {
      if (Number(d.book) !== selectedBook) return false;
      if (selectedLesson === "all") return true;
      return (d.name.split("::")[2] || "").trim() === selectedLesson;
    });
  }, [decks, selectedBook, selectedLesson]);

  const subdecksForAssign = useMemo(() => {
    return decks.filter((d) => {
      if (Number(d.book) !== assignBook) return false;
      if (!assignLesson) return true;
      return (d.name.split("::")[2] || "").trim() === assignLesson;
    });
  }, [decks, assignBook, assignLesson]);

  const filteredCardsWithDeck = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    const list: Array<{ deck: ThthDeckItem; card: ThthCardItem }> = [];
    for (const d of subdecksForSelectedLesson) {
      if (selectedDeckId !== "all" && d.id !== selectedDeckId) continue;
      for (const c of d.cards || []) {
        if (q) {
          const matchWord = (c.word || "").toLowerCase().includes(q);
          const matchMeaning = (c.meaning || "").toLowerCase().includes(q);
          const matchCode = (c.code || "").toLowerCase().includes(q);
          const matchEx = (c.example || "").toLowerCase().includes(q);
          if (!matchWord && !matchMeaning && !matchCode && !matchEx) continue;
        }
        list.push({ deck: d, card: c });
      }
    }
    return list;
  }, [subdecksForSelectedLesson, selectedDeckId, cardSearch]);

  const PAGE_SIZE = 25;
  const pagedCards = useMemo(
    () => filteredCardsWithDeck.slice(cardPage * PAGE_SIZE, (cardPage + 1) * PAGE_SIZE),
    [filteredCardsWithDeck, cardPage],
  );

  // Handlers
  const handleCreateThthClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create_thth_class");
    try {
      const res = await fetch("/api/admin/thth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_thth_class",
          bookNumber: newClassBook,
          name: newClassName.trim() || `Lớp Tiếng Hàn Tổng Hợp - Quyển ${newClassBook}`,
          description: newClassDesc.trim(),
          autoAssignLessons: autoAssignAllLessons,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Không tạo được lớp học.");
      if (data.grants) setGrants(data.grants);
      setNewClassName("");
      setNewClassDesc("");
      await onRefreshClasses();
      onNotify("success", `Đã tạo lớp Tiếng Hàn Tổng Hợp Quyển ${newClassBook} (Mã lớp: ${data.code}) thành công!`);
    } catch (err) {
      onNotify("error", err instanceof Error ? err.message : "Lỗi khi tạo lớp.");
    } finally {
      setBusy(null);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantTargetId.trim()) {
      onNotify("error", "Vui lòng chọn lớp học hoặc nhập email học viên.");
      return;
    }
    setBusy("grant_access");
    try {
      const res = await fetch("/api/admin/thth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_access",
          targetType: grantTargetType,
          targetId: grantTargetId.trim(),
          bookNumber: grantBookNumber,
          lessonPrefix: grantLessonPrefix.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Không cấp quyền được.");
      if (data.grants) setGrants(data.grants);
      onNotify("success", "Đã cấp quyền truy cập giáo trình Tiếng Hàn Tổng Hợp!");
    } catch (err) {
      onNotify("error", err instanceof Error ? err.message : "Lỗi khi cấp quyền.");
    } finally {
      setBusy(null);
    }
  };

  const handleRevokeAccess = async (id: string) => {
    setBusy(`revoke:${id}`);
    try {
      const res = await fetch("/api/admin/thth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_access", id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Không thu hồi được quyền.");
      if (data.grants) setGrants(data.grants);
      onNotify("success", "Đã thu hồi quyền truy cập.");
    } catch (err) {
      onNotify("error", err instanceof Error ? err.message : "Lỗi khi thu hồi quyền.");
    } finally {
      setBusy(null);
    }
  };

  const handleAssignToClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignClassId) {
      onNotify("error", "Vui lòng chọn lớp học để giao bài.");
      return;
    }
    setBusy("assign_to_class");
    try {
      const res = await fetch("/api/admin/thth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_to_class",
          classId: assignClassId,
          bookNumber: assignBook,
          lessonPrefix: assignLesson,
          deckId: assignDeckId,
          title: assignCustomTitle.trim(),
          dueDate: assignDueDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Không giao được bài tập.");
      setAssignCustomTitle("");
      await onRefreshClasses();
      onNotify("success", `Đã giao bộ thẻ (${data.totalCards} từ kèm âm thanh gốc) vào lớp học!`);
    } catch (err) {
      onNotify("error", err instanceof Error ? err.message : "Lỗi khi giao bài.");
    } finally {
      setBusy(null);
    }
  };

  const handleUploadMediaForCard = async (field: "image" | "audio_word" | "audio_example", file?: File) => {
    if (!file || !editingCard) return;
    setUploadingMediaField(field);
    try {
      const safeName = `custom-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const res = await fetch(`/api/admin/thth?file=${encodeURIComponent(safeName)}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Không tải được file lên R2.");
      const formattedValue =
        field === "image"
          ? `<img src="/api/thth-media?file=${encodeURIComponent(safeName)}">`
          : `[sound:${safeName}]`;
      setEditingCard((prev) => (prev ? { ...prev, card: { ...prev.card, [field]: formattedValue } } : null));
      onNotify("success", `Đã tải file ${file.name} lên máy chủ!`);
    } catch (err) {
      onNotify("error", err instanceof Error ? err.message : "Lỗi tải file.");
    } finally {
      setUploadingMediaField(null);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    setBusy("save_card");
    try {
      const res = await fetch("/api/admin/thth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_card",
          deckId: editingCard.deckId,
          card: editingCard.card,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Không lưu được thẻ.");
      clearAdminThthCurriculumCache();
      await loadAll(true);
      setEditingCard(null);
      onNotify("success", "Đã lưu thẻ từ vựng vào giáo trình Tiếng Hàn Tổng Hợp!");
    } catch (err) {
      onNotify("error", err instanceof Error ? err.message : "Lỗi lưu thẻ.");
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteCard = async (deckId: string, card: ThthCardItem) => {
    if (!window.confirm(`Xóa từ "${cleanText(card.word)}" khỏi bộ Tiếng Hàn Tổng Hợp?`)) return;
    const key = `del:${deckId}:${card.id}`;
    setBusy(key);
    try {
      const res = await fetch("/api/admin/thth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_card", deckId, cardId: card.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Không xóa được thẻ.");
      clearAdminThthCurriculumCache();
      await loadAll(true);
      onNotify("success", `Đã xóa từ "${cleanText(card.word)}".`);
    } catch (err) {
      onNotify("error", err instanceof Error ? err.message : "Lỗi xóa thẻ.");
    } finally {
      setBusy(null);
    }
  };

  const totalCardsAllBooks = useMemo(
    () => Array.from(bookStats.values()).reduce((sum, item) => sum + item.cards, 0),
    [bookStats],
  );

  return (
    <div className="space-y-6">
      {/* Top Hero Summary Banner */}
      <div className="card-duo rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/90 border border-blue-500/30 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-[11px] font-extrabold text-amber-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>BỘ GIÁO TRÌNH ĐỘC QUYỀN ADMIN · ÂM THANH GỐC (.APKG)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Tiếng Hàn Tổng Hợp (Quyển 1 – 4)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Tổng cộng <b>{totalCardsAllBooks.toLocaleString("vi-VN")} từ vựng</b> thuộc <b>{decks.length} chủ đề</b> với toàn bộ âm thanh từ vựng bản xứ, âm thanh câu ví dụ và hình ảnh minh họa gốc từ file <code>Tiếng Hàn Tổng Hợp.apkg</code>. Chỉ Admin mới có quyền quản lý, chỉnh sửa và cấp quyền theo Lớp học hoặc Học viên.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAll(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/20 hover:bg-sky-500/30 px-4 py-2.5 text-xs font-bold text-sky-200 transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Đồng bộ lại dữ liệu</span>
          </button>
        </div>

        {/* 4 Books Overview Cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((bookNum) => {
            const st = bookStats.get(bookNum);
            const active = selectedBook === bookNum && subTab === "cards";
            return (
              <button
                key={bookNum}
                type="button"
                onClick={() => {
                  setSelectedBook(bookNum);
                  setSelectedLesson("all");
                  setSelectedDeckId("all");
                  setCardPage(0);
                  setSubTab("cards");
                }}
                className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                  active
                    ? "border-amber-400 bg-amber-500/20 shadow-lg"
                    : "border-slate-700/80 bg-slate-900/70 hover:border-sky-400/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                    Quyển 0{bookNum}
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    {bookNum <= 2 ? `Sơ cấp ${bookNum}` : `Trung cấp ${bookNum}`}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-black text-white">
                  {(st?.cards || 0).toLocaleString("vi-VN")} <span className="text-xs font-semibold text-slate-400">từ</span>
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {st?.lessons.size || 0} bài học · {st?.decks || 0} chủ đề nhỏ
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 dark:border-slate-800 pb-3">
        {[
          {
            id: "classAccess" as const,
            label: "1. Quản lý Lớp & Phân quyền Học viên",
            icon: <Users className="h-4 w-4" />,
            badge: grants.length,
          },
          {
            id: "assign" as const,
            label: "2. Giao bài Tiếng Hàn Tổng Hợp vào Lớp",
            icon: <FolderPlus className="h-4 w-4" />,
          },
          {
            id: "cards" as const,
            label: "3. Kho Thẻ, Âm thanh Gốc & Chỉnh sửa",
            icon: <BookOpen className="h-4 w-4" />,
            badge: totalCardsAllBooks,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
              subTab === tab.id
                ? "bg-blue-600 text-white shadow-md"
                : "bg-stone-100 dark:bg-[#132247] text-stone-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-[#1a2f60]"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">
                {tab.badge.toLocaleString("vi-VN")}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* =====================================================================
          SUB-TAB 1: QUẢN LÝ KIỂU LỚP HỌC & PHÂN QUYỀN HỌC VIÊN
         ===================================================================== */}
      {subTab === "classAccess" && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Card 1: Tạo Lớp Tiếng Hàn Tổng Hợp 1-Click */}
            <form onSubmit={handleCreateThthClass} className="card-duo rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-300">
                    <Sparkles className="h-3 w-3" /> Khuyên dùng
                  </span>
                  <h3 className="mt-1 text-base font-bold text-stone-900 dark:text-white">
                    Tạo Lớp Học Tiếng Hàn Tổng Hợp (1-Click)
                  </h3>
                  <p className="mt-1 text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                    Tạo ngay một lớp học mới gắn với Quyển 1, 2, 3 hoặc 4. Học viên được duyệt vào lớp sẽ tự động mở khóa quyển đó trên trang Từ vựng và có sẵn toàn bộ bài tập từng bài trong lớp!
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Chọn Quyển Giáo Trình
                  <select
                    value={newClassBook}
                    onChange={(e) => setNewClassBook(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs font-bold text-stone-900 dark:text-white"
                  >
                    <option value={1}>Quyển 1 · Sơ cấp 1 (1.583 từ · 15 bài)</option>
                    <option value={2}>Quyển 2 · Sơ cấp 2 (1.629 từ · 15 bài)</option>
                    <option value={3}>Quyển 3 · Trung cấp 3 (2.422 từ · 15 bài)</option>
                    <option value={4}>Quyển 4 · Trung cấp 4 (385 từ · 3 bài)</option>
                  </select>
                </label>

                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Tên Lớp Học (tùy chọn)
                  <input
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder={`Lớp Tiếng Hàn Tổng Hợp - Quyển ${newClassBook}`}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs text-stone-900 dark:text-white"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                Mô tả lớp học
                <input
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  placeholder="Lớp học từ vựng Tiếng Hàn Tổng Hợp kèm âm thanh gốc chuẩn Naver & HyperTTS"
                  className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs text-stone-900 dark:text-white"
                />
              </label>

              <label className="flex items-center gap-2.5 text-xs font-semibold text-stone-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAssignAllLessons}
                  onChange={(e) => setAutoAssignAllLessons(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-blue-600"
                />
                <span>Tự động tạo sẵn các Bài tập theo từng Bài (Bài 01, Bài 02…) trong lớp học</span>
              </label>

              <button
                type="submit"
                disabled={busy === "create_thth_class"}
                className="btn-duo btn-duo-primary w-full py-3 text-xs font-extrabold inline-flex items-center justify-center gap-2"
              >
                {busy === "create_thth_class" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span>Tạo Lớp Tiếng Hàn Tổng Hợp Quyển {newClassBook}</span>
              </button>
            </form>

            {/* Card 2: Cấp quyền Học trực tiếp cho Lớp hoặc Học viên */}
            <form onSubmit={handleGrantAccess} className="card-duo rounded-2xl p-5 sm:p-6 space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-300">
                  <ShieldCheck className="h-3 w-3" /> Phân quyền truy cập
                </span>
                <h3 className="mt-1 text-base font-bold text-stone-900 dark:text-white">
                  Mở khóa Tiếng Hàn Tổng Hợp cho Lớp học hoặc Học viên
                </h3>
                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  Học viên thuộc Lớp được cấp quyền (hoặc được cấp quyền trực tiếp theo email) sẽ thấy bộ <b>Tiếng Hàn Tổng Hợp</b> ngay trên cây <b>Lộ trình học (/flashcards)</b> của họ.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGrantTargetType("class");
                    setGrantTargetId(classes[0]?.id || "");
                  }}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                    grantTargetType === "class"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-[#132247] text-stone-600 dark:text-slate-300"
                  }`}
                >
                  Cấp quyền theo Lớp học
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGrantTargetType("user");
                    setGrantTargetId("");
                  }}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                    grantTargetType === "user"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-[#132247] text-stone-600 dark:text-slate-300"
                  }`}
                >
                  Cấp quyền theo Học viên
                </button>
              </div>

              {grantTargetType === "class" ? (
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Chọn Lớp học được mở khóa
                  <select
                    value={grantTargetId}
                    onChange={(e) => setGrantTargetId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs font-bold text-stone-900 dark:text-white"
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Mã: {cls.code} · {cls.members} học viên)
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Nhập Email học viên (hoặc chọn từ danh sách)
                  <input
                    list="thth-admin-users-list"
                    value={grantTargetId}
                    onChange={(e) => setGrantTargetId(e.target.value)}
                    placeholder="Ví dụ: hocvien@gmail.com"
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs text-stone-900 dark:text-white"
                  />
                  <datalist id="thth-admin-users-list">
                    {users.map((u) => (
                      <option key={u.id} value={u.email}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </datalist>
                </label>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Quyển được phép học
                  <select
                    value={grantBookNumber}
                    onChange={(e) => setGrantBookNumber(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs font-bold text-stone-900 dark:text-white"
                  >
                    <option value={0}>Tất cả 4 Quyển (Quyển 1 – 4)</option>
                    <option value={1}>Chỉ Quyển 1 (Sơ cấp 1)</option>
                    <option value={2}>Chỉ Quyển 2 (Sơ cấp 2)</option>
                    <option value={3}>Chỉ Quyển 3 (Trung cấp 3)</option>
                    <option value={4}>Chỉ Quyển 4 (Trung cấp 4)</option>
                  </select>
                </label>

                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Giới hạn Bài học (để trống = trọn quyển)
                  <input
                    value={grantLessonPrefix}
                    onChange={(e) => setGrantLessonPrefix(e.target.value)}
                    placeholder="Ví dụ: Bài 01 (hoặc để trống)"
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs text-stone-900 dark:text-white"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={busy === "grant_access"}
                className="btn-duo btn-duo-primary w-full py-3 text-xs font-extrabold inline-flex items-center justify-center gap-2"
              >
                {busy === "grant_access" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                <span>Cấp Quyền Học Tiếng Hàn Tổng Hợp</span>
              </button>
            </form>
          </div>

          {/* Danh sách Lớp & Học viên đang có quyền truy cập THTH */}
          <section className="card-duo rounded-2xl overflow-hidden">
            <div className="border-b border-stone-200 dark:border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  Danh sách Lớp học & Học viên đã được cấp quyền ({grants.length})
                </h3>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-slate-400">
                  Ngoài Admin, chỉ những lớp học và tài khoản trong danh sách dưới đây mới xem và học được bộ Tiếng Hàn Tổng Hợp.
                </p>
              </div>
            </div>

            <div className="divide-y divide-stone-200 dark:divide-slate-800">
              {grants.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-stone-50 dark:hover:bg-slate-900/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                        g.targetType === "class"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                          : "bg-sky-500/15 text-sky-600 dark:text-sky-300"
                      }`}
                    >
                      {g.targetType === "class" ? <Users className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-stone-900 dark:text-white">
                          {g.targetType === "class"
                            ? g.className || `Lớp ${g.targetId}`
                            : g.userName || g.userEmail || g.targetId}
                        </span>
                        {g.targetType === "class" && g.classCode && (
                          <span className="rounded-md bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-600 dark:text-sky-300">
                            Mã lớp: {g.classCode}
                          </span>
                        )}
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                          {g.bookNumber === 0 ? "Tất cả Quyển 1–4" : `Quyển ${g.bookNumber}`}
                          {g.lessonPrefix ? ` · ${g.lessonPrefix}` : " · Trọn quyển"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500 dark:text-slate-400">
                        {g.targetType === "class"
                          ? "Tất cả học viên được duyệt trong lớp này"
                          : `Học viên cá nhân · ${g.userEmail || g.targetId}`}{" "}
                        · Cấp ngày {String(g.createdAt || "").slice(0, 10)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busy === `revoke:${g.id}`}
                    onClick={() => void handleRevokeAccess(g.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Thu hồi quyền</span>
                  </button>
                </div>
              ))}
              {grants.length === 0 && (
                <div className="p-8 text-center text-xs text-stone-500 dark:text-slate-400">
                  Chưa có lớp học hoặc học viên nào được mở khóa riêng. Hiện tại chỉ tài khoản Admin nhìn thấy bộ Tiếng Hàn Tổng Hợp.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: GIAO BÀI TẬP TIẾNG HÀN TỔNG HỢP VÀO LỚP CÓ SẴN
         ===================================================================== */}
      {subTab === "assign" && (
        <form onSubmit={handleAssignToClass} className="card-duo rounded-2xl p-5 sm:p-6 space-y-5 max-w-3xl">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              Giao Bài / Chủ Đề Tiếng Hàn Tổng Hợp vào Lớp học
            </h3>
            <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
              Chọn một lớp học bất kỳ để giao trọn 1 Bài học (ví dụ: Bài 01) hoặc 1 Chủ đề nhỏ (ví dụ: 1. Quốc gia). Học viên trong lớp sẽ ôn luyện kèm âm thanh gốc từ file <code>.apkg</code> và ghi nhận tiến độ hoàn thành cho giáo viên.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
              1. Chọn Lớp học nhận bài *
              <select
                required
                value={assignClassId}
                onChange={(e) => setAssignClassId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs font-bold text-stone-900 dark:text-white"
              >
                <option value="">-- Chọn lớp học --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.code}) · {cls.members} HV
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
              2. Chọn Quyển *
              <select
                value={assignBook}
                onChange={(e) => {
                  setAssignBook(Number(e.target.value));
                  setAssignLesson("");
                  setAssignDeckId("");
                }}
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs font-bold text-stone-900 dark:text-white"
              >
                <option value={1}>Quyển 1 · Sơ cấp 1</option>
                <option value={2}>Quyển 2 · Sơ cấp 2</option>
                <option value={3}>Quyển 3 · Trung cấp 3</option>
                <option value={4}>Quyển 4 · Trung cấp 4</option>
              </select>
            </label>

            <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
              3. Chọn Bài học (Bài 01..15)
              <select
                value={assignLesson}
                onChange={(e) => {
                  setAssignLesson(e.target.value);
                  setAssignDeckId("");
                }}
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs font-bold text-stone-900 dark:text-white"
              >
                <option value="">-- Cả quyển (tối đa 500 từ đầu) --</option>
                {lessonsForAssignBook.map((lesson) => (
                  <option key={lesson} value={lesson}>
                    {lesson}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
              4. Chọn Chủ đề nhỏ (để trống = giao trọn Bài)
              <select
                value={assignDeckId}
                onChange={(e) => setAssignDeckId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs font-bold text-stone-900 dark:text-white"
              >
                <option value="">-- Giao trọn tất cả chủ đề trong Bài đã chọn --</option>
                {subdecksForAssign.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name.split("::").slice(2).join(" · ")} ({d.cards.length} từ)
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
              5. Tiêu đề bài tập hiển thị trong lớp (tùy chọn)
              <input
                value={assignCustomTitle}
                onChange={(e) => setAssignCustomTitle(e.target.value)}
                placeholder="Để trống sẽ tự đặt theo tên Quyển & Bài"
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs text-stone-900 dark:text-white"
              />
            </label>

            <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
              6. Hạn hoàn thành
              <input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2.5 text-xs font-bold text-stone-900 dark:text-white"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={busy === "assign_to_class"}
            className="btn-duo btn-duo-primary px-6 py-3 text-xs font-extrabold inline-flex items-center gap-2"
          >
            {busy === "assign_to_class" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
            <span>Giao Bài Tập Cho Lớp Học</span>
          </button>
        </form>
      )}

      {/* =====================================================================
          SUB-TAB 3: KHO THẺ, ÂM THANH GỐC & CHỈNH SỬA TRỰC TIẾP
         ===================================================================== */}
      {subTab === "cards" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="card-duo rounded-2xl p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                Quyển sách
                <select
                  value={selectedBook}
                  onChange={(e) => {
                    setSelectedBook(Number(e.target.value));
                    setSelectedLesson("all");
                    setSelectedDeckId("all");
                    setCardPage(0);
                  }}
                  className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 text-xs font-bold text-stone-900 dark:text-white"
                >
                  {[1, 2, 3, 4].map((b) => (
                    <option key={b} value={b}>
                      Quyển 0{b} ({bookStats.get(b)?.cards || 0} từ)
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                Bài học
                <select
                  value={selectedLesson}
                  onChange={(e) => {
                    setSelectedLesson(e.target.value);
                    setSelectedDeckId("all");
                    setCardPage(0);
                  }}
                  className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 text-xs font-bold text-stone-900 dark:text-white"
                >
                  <option value="all">Tất cả bài trong Quyển {selectedBook}</option>
                  {lessonsForSelectedBook.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                Chủ đề con (Subdeck)
                <select
                  value={selectedDeckId}
                  onChange={(e) => {
                    setSelectedDeckId(e.target.value);
                    setCardPage(0);
                  }}
                  className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 text-xs font-bold text-stone-900 dark:text-white"
                >
                  <option value="all">Tất cả chủ đề ({subdecksForSelectedLesson.length})</option>
                  {subdecksForSelectedLesson.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name.split("::").slice(2).join(" · ")} ({d.cards.length})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                Tìm kiếm từ vựng / nghĩa / câu ví dụ
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3">
                  <Search className="h-3.5 w-3.5 text-stone-400" />
                  <input
                    value={cardSearch}
                    onChange={(e) => {
                      setCardSearch(e.target.value);
                      setCardPage(0);
                    }}
                    placeholder="Gõ tiếng Hàn hoặc tiếng Việt…"
                    className="w-full bg-transparent py-2 text-xs text-stone-900 dark:text-white outline-none"
                  />
                  {cardSearch && (
                    <button type="button" onClick={() => setCardSearch("")} className="text-stone-400 hover:text-white">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200 dark:border-slate-800 text-xs">
              <span className="text-stone-500 dark:text-slate-400">
                Đang hiển thị <b>{filteredCardsWithDeck.length.toLocaleString("vi-VN")}</b> thẻ · Trang {cardPage + 1} / {Math.max(1, Math.ceil(filteredCardsWithDeck.length / PAGE_SIZE))}
              </span>
              <button
                type="button"
                onClick={() => {
                  const targetDeck =
                    (selectedDeckId !== "all" ? decks.find((d) => d.id === selectedDeckId) : subdecksForSelectedLesson[0]) ||
                    decks[0];
                  if (!targetDeck) return;
                  setEditingCard({
                    deckId: targetDeck.id,
                    isNew: true,
                    card: {
                      id: Date.now(),
                      word: "",
                      meaning: "",
                      pos: "Danh từ",
                      transliteration: "",
                      explain: "",
                      image: "",
                      example: "",
                      example_translated: "",
                      collocation: "",
                      synonym: "",
                      antonym: "",
                      audio_word: "",
                      audio_meaning: "",
                      audio_example: "",
                      deckName: targetDeck.name,
                    },
                  });
                }}
                className="btn-duo btn-duo-primary px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm từ mới vào chủ đề này</span>
              </button>
            </div>
          </div>

          {/* Cards Table / List */}
          <div className="card-duo rounded-2xl overflow-hidden divide-y divide-stone-200 dark:divide-slate-800">
            {pagedCards.map(({ deck, card }) => {
              const imgUrl = resolveMediaUrl(card.image);
              const hasWordAudio = Boolean(resolveMediaUrl(card.audio_word));
              const hasExAudio = Boolean(resolveMediaUrl(card.audio_example));
              return (
                <article
                  key={`${deck.id}:${card.id}`}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-stone-50 dark:hover:bg-slate-900/40 transition"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={cleanText(card.word)}
                        loading="lazy"
                        className="h-14 w-14 rounded-xl object-cover border border-stone-200 dark:border-slate-700 shrink-0 bg-stone-100 dark:bg-slate-800"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl border border-dashed border-stone-300 dark:border-slate-700 flex items-center justify-center text-stone-400 shrink-0 text-[10px]">
                        No Img
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-noto text-base font-extrabold text-stone-900 dark:text-white">
                          {cleanText(card.word)}
                        </span>
                        {card.pos && (
                          <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-sky-300">
                            {card.pos}
                          </span>
                        )}
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          — {cleanText(card.meaning)}
                        </span>
                        {hasWordAudio && (
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-300">
                            ✓ Audio gốc
                          </span>
                        )}
                      </div>

                      {card.example && (
                        <p className="text-xs text-stone-600 dark:text-slate-300 truncate">
                          <span className="font-noto font-medium">{cleanText(card.example)}</span>
                          {card.example_translated && (
                            <span className="text-stone-400 dark:text-slate-400 italic">
                              {" "}
                              · {cleanText(card.example_translated)}
                            </span>
                          )}
                        </p>
                      )}

                      <p className="text-[10px] text-stone-400 dark:text-slate-500 font-mono truncate">
                        {deck.name.replaceAll("::", " › ")} {card.code ? `· #${card.code}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => playCardAudio(card.audio_word, card.word)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-300 cursor-pointer"
                      title={card.audio_word || "Phát âm từ vựng"}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Nghe từ</span>
                    </button>

                    {card.example && (
                      <button
                        type="button"
                        onClick={() => playCardAudio(card.audio_example, card.example)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold cursor-pointer ${
                          hasExAudio
                            ? "border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300"
                            : "border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300"
                        }`}
                        title="Nghe câu ví dụ"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        <span>Nghe VD</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setEditingCard({
                          deckId: deck.id,
                          isNew: false,
                          card: { ...card },
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] hover:border-blue-500 px-3 py-1.5 text-xs font-bold text-stone-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Sửa</span>
                    </button>

                    <button
                      type="button"
                      disabled={busy === `del:${deck.id}:${card.id}`}
                      onClick={() => void handleDeleteCard(deck.id, card)}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-300 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}

            {pagedCards.length === 0 && (
              <div className="p-8 text-center text-xs text-stone-500 dark:text-slate-400">
                Không tìm thấy thẻ từ vựng nào khớp với bộ lọc hiện tại.
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredCardsWithDeck.length > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={cardPage === 0}
                onClick={() => setCardPage((p) => Math.max(0, p - 1))}
                className="rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-4 py-2 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                ← Trang trước
              </button>
              <span className="text-xs font-bold text-stone-600 dark:text-slate-300">
                Trang {cardPage + 1} / {Math.ceil(filteredCardsWithDeck.length / PAGE_SIZE)}
              </span>
              <button
                type="button"
                disabled={(cardPage + 1) * PAGE_SIZE >= filteredCardsWithDeck.length}
                onClick={() => setCardPage((p) => p + 1)}
                className="rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-4 py-2 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Trang tiếp →
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL SỬA / THÊM THẺ TỪ VỰNG TIẾNG HÀN TỔNG HỢP
         ===================================================================== */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="card-duo w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0f1b38] border border-stone-200 dark:border-[#1e3466] p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
                  {editingCard.isNew ? "Thêm thẻ mới vào Tiếng Hàn Tổng Hợp" : `Chỉnh sửa thẻ: ${cleanText(editingCard.card.word)}`}
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  {editingCard.card.deckName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="rounded-lg p-1.5 text-stone-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4">
              {editingCard.isNew && (
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Thuộc Chủ đề (Subdeck)
                  <select
                    value={editingCard.deckId}
                    onChange={(e) => {
                      const d = decks.find((x) => x.id === e.target.value);
                      setEditingCard((prev) =>
                        prev ? { ...prev, deckId: e.target.value, card: { ...prev.card, deckName: d?.name || "" } } : null,
                      );
                    }}
                    className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 text-xs font-bold text-stone-900 dark:text-white"
                  >
                    {subdecksForSelectedLesson.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name.replaceAll("::", " › ")}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Từ tiếng Hàn (Hangul) *
                  <input
                    required
                    value={editingCard.card.word}
                    onChange={(e) =>
                      setEditingCard((prev) => (prev ? { ...prev, card: { ...prev.card, word: e.target.value } } : null))
                    }
                    className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 font-noto text-xs font-bold text-stone-900 dark:text-white"
                  />
                </label>

                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Nghĩa tiếng Việt *
                  <input
                    required
                    value={editingCard.card.meaning}
                    onChange={(e) =>
                      setEditingCard((prev) => (prev ? { ...prev, card: { ...prev.card, meaning: e.target.value } } : null))
                    }
                    className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 text-xs font-bold text-stone-900 dark:text-white"
                  />
                </label>

                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Từ loại (POS)
                  <input
                    value={editingCard.card.pos || ""}
                    onChange={(e) =>
                      setEditingCard((prev) => (prev ? { ...prev, card: { ...prev.card, pos: e.target.value } } : null))
                    }
                    placeholder="Danh từ, Động từ..."
                    className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 text-xs text-stone-900 dark:text-white"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Câu ví dụ tiếng Hàn
                  <input
                    value={editingCard.card.example || ""}
                    onChange={(e) =>
                      setEditingCard((prev) => (prev ? { ...prev, card: { ...prev.card, example: e.target.value } } : null))
                    }
                    className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 font-noto text-xs text-stone-900 dark:text-white"
                  />
                </label>

                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Dịch nghĩa câu ví dụ
                  <input
                    value={editingCard.card.example_translated || ""}
                    onChange={(e) =>
                      setEditingCard((prev) =>
                        prev ? { ...prev, card: { ...prev.card, example_translated: e.target.value } } : null,
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 text-xs text-stone-900 dark:text-white"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                Giải thích chi tiết / Ghi chú
                <textarea
                  rows={2}
                  value={editingCard.card.explain || ""}
                  onChange={(e) =>
                    setEditingCard((prev) => (prev ? { ...prev, card: { ...prev.card, explain: e.target.value } } : null))
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 text-xs text-stone-900 dark:text-white"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Cụm từ (Collocation)
                  <input
                    value={editingCard.card.collocation || ""}
                    onChange={(e) =>
                      setEditingCard((prev) =>
                        prev ? { ...prev, card: { ...prev.card, collocation: e.target.value } } : null,
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 text-xs text-stone-900 dark:text-white"
                  />
                </label>
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Từ đồng nghĩa
                  <input
                    value={editingCard.card.synonym || ""}
                    onChange={(e) =>
                      setEditingCard((prev) => (prev ? { ...prev, card: { ...prev.card, synonym: e.target.value } } : null))
                    }
                    className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 text-xs text-stone-900 dark:text-white"
                  />
                </label>
                <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                  Từ trái nghĩa
                  <input
                    value={editingCard.card.antonym || ""}
                    onChange={(e) =>
                      setEditingCard((prev) => (prev ? { ...prev, card: { ...prev.card, antonym: e.target.value } } : null))
                    }
                    className="mt-1 w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-2 text-xs text-stone-900 dark:text-white"
                  />
                </label>
              </div>

              {/* Media Upload / Edit Row */}
              <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t border-stone-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                    Âm thanh Từ vựng (.mp3)
                  </label>
                  <input
                    value={editingCard.card.audio_word || ""}
                    onChange={(e) =>
                      setEditingCard((prev) =>
                        prev ? { ...prev, card: { ...prev.card, audio_word: e.target.value } } : null,
                      )
                    }
                    placeholder="[sound:file.mp3]"
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-2.5 py-1.5 text-[11px] font-mono text-stone-900 dark:text-white"
                  />
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 rounded-lg bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-400 cursor-pointer hover:bg-sky-500/25">
                      <Upload className="h-3 w-3" />
                      <span>{uploadingMediaField === "audio_word" ? "Đang tải…" : "Tải MP3"}</span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => void handleUploadMediaForCard("audio_word", e.target.files?.[0])}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => playCardAudio(editingCard.card.audio_word, editingCard.card.word)}
                      className="inline-flex items-center gap-1 rounded-lg bg-stone-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-stone-700 dark:text-slate-300"
                    >
                      <Volume2 className="h-3 w-3" /> Nghe thử
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                    Âm thanh Câu ví dụ (.mp3)
                  </label>
                  <input
                    value={editingCard.card.audio_example || ""}
                    onChange={(e) =>
                      setEditingCard((prev) =>
                        prev ? { ...prev, card: { ...prev.card, audio_example: e.target.value } } : null,
                      )
                    }
                    placeholder="[sound:example.mp3]"
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-2.5 py-1.5 text-[11px] font-mono text-stone-900 dark:text-white"
                  />
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 rounded-lg bg-purple-500/15 px-2.5 py-1 text-[11px] font-bold text-purple-400 cursor-pointer hover:bg-purple-500/25">
                      <Upload className="h-3 w-3" />
                      <span>{uploadingMediaField === "audio_example" ? "Đang tải…" : "Tải MP3"}</span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => void handleUploadMediaForCard("audio_example", e.target.files?.[0])}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => playCardAudio(editingCard.card.audio_example, editingCard.card.example)}
                      className="inline-flex items-center gap-1 rounded-lg bg-stone-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-stone-700 dark:text-slate-300"
                    >
                      <Volume2 className="h-3 w-3" /> Nghe thử
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700 dark:text-slate-300">
                    Hình ảnh minh họa
                  </label>
                  <input
                    value={editingCard.card.image || ""}
                    onChange={(e) =>
                      setEditingCard((prev) =>
                        prev ? { ...prev, card: { ...prev.card, image: e.target.value } } : null,
                      )
                    }
                    placeholder='<img src="...">'
                    className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-2.5 py-1.5 text-[11px] font-mono text-stone-900 dark:text-white"
                  />
                  <label className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400 cursor-pointer hover:bg-emerald-500/25">
                    <ImageIcon className="h-3 w-3" />
                    <span>{uploadingMediaField === "image" ? "Đang tải…" : "Tải Ảnh mới"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleUploadMediaForCard("image", e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="rounded-xl border border-stone-200 dark:border-slate-700 px-4 py-2.5 text-xs font-bold text-stone-600 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={busy === "save_card"}
                  className="btn-duo btn-duo-primary px-5 py-2.5 text-xs font-extrabold inline-flex items-center gap-2"
                >
                  {busy === "save_card" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Lưu thẻ từ vựng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
