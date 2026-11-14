"use client";

import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { DEFAULT_FEATURE_FLAGS, FEATURE_CATALOG, FeatureFlags, FeatureKey } from "../../lib/featureFlags";
import { ExploreDeckManager } from "../../components/admin/ExploreDeckManager";
import { ThthCurriculumManager } from "../../components/admin/ThthCurriculumManager";
import { AdminClassManager, AdminClassRow } from "../../components/admin/AdminClassManager";
import { KOREAN_COURSE } from "../../data/koreanCourse";
import {
  browseLearningDictionary,
  countLearningDictionaryEntries,
  DictionaryEntry,
  DictionaryLevel,
  detectDictionarySearchLanguage,
  refreshLearningDictionaryCache,
  searchLearningDictionary,
} from "../../lib/dictionarySearch";
import { loadPrivateLearningContent } from "../../lib/privateLearningContent";

type Overview = {
  users: number;
  students: number;
  teachers: number;
  classes: number;
  posts: number;
  pendingFeedback: number;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "student" | "teacher" | "admin";
  xp: number;
  gems: number;
  streak: number;
  created_at: string;
  decks: number;
  studySessions: number;
  lastStudied: string | null;
};

type FeedbackRow = {
  id: string;
  category: string;
  message: string;
  status: string;
  created_at: string;
  email: string;
  name: string;
};

type PostRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  created_at: string;
  name: string;
  email: string;
};

type LessonRow = {
  id: string;
  title: string;
  lessonType: string;
  level: string;
  description: string;
  koreanText: string;
  vietnameseText: string;
  sourceUrl: string;
  isPublished: number;
  createdAt: string;
};

type ChatRow = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  name: string;
  email: string;
};

type DeckRow = {
  userId: string;
  deckId: string;
  cardCount: number;
  updatedAt: string;
  name: string;
  email: string;
};

type DeckWord = Pick<
  DictionaryEntry,
  "hangul" | "vietnamese" | "english" | "japanese" | "partOfSpeech" | "level" | "topik" | "topic"
>;

type ContentDeck = {
  sharedId: string;
  deckId: string;
  title: string;
  description: string;
  visibility: "public" | "private";
  cardCount: number;
  updatedAt: string;
};

type ContentDeckWithCards = ContentDeck & { cards: Array<Record<string, unknown>> };

type PlacementTestStats = {
  summary: {
    attempts: number;
    participants: number;
    passed: number;
    correctAnswers: number;
    answeredQuestions: number;
    averageScore: number;
  };
  tests: Array<{
    testSlug: string;
    attempts: number;
    participants: number;
    passed: number;
    correctAnswers: number;
    answeredQuestions: number;
    averageScore: number;
    bestScore: number;
  }>;
  accounts: Array<{
    userId: string;
    name: string;
    email: string;
    attempts: number;
    passed: number;
    correctAnswers: number;
    answeredQuestions: number;
    averageScore: number;
    bestScore: number;
    lastAttemptAt: string;
    seoulAttempts: number;
    seoulPassed: number;
    seoulCorrect: number;
    seoulQuestions: number;
    seoulBest: number;
    seoulAverage: number;
    ththAttempts: number;
    ththPassed: number;
    ththCorrect: number;
    ththQuestions: number;
    ththBest: number;
    ththAverage: number;
  }>;
  attempts: Array<{
    id: string;
    testSlug: string;
    correct: number;
    wrong: number;
    skipped: number;
    total: number;
    scorePercent: number;
    verdict: "pass" | "almost" | "fail";
    durationSeconds: number;
    createdAt: string;
    userId: string;
    name: string;
    email: string;
  }>;
};

type BuiltinLesson = {
  id: string;
  title: string;
  level: string;
  lessonType: string;
  count: number;
};

type Panel =
  | "overview"
  | "thth"
  | "classes"
  | "students"
  | "placementTests"
  | "vocabularyDecks"
  | "vocabularyManager"
  | "lessons"
  | "decks"
  | "community"
  | "chat"
  | "feedback"
  | "features";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Không thể hoàn tất thao tác quản trị.");
  return data as T;
}

const NAV_GROUPS: Array<{
  groupTitle: string;
  items: Array<{ id: Panel; label: string; subtitle: string; icon: React.ReactNode; highlight?: boolean }>;
}> = [
  {
    groupTitle: "Điều hành & Hệ thống",
    items: [
      {
        id: "overview",
        label: "Bảng điều khiển",
        subtitle: "Tổng quan & lối tắt",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        id: "features",
        label: "Tính năng Website",
        subtitle: "Bật / tắt menu & trang",
        icon: <SlidersHorizontal className="h-4 w-4" />,
      },
    ],
  },
  {
    groupTitle: "Giáo trình & Lớp học",
    items: [
      {
        id: "thth",
        label: "Tiếng Hàn Tổng Hợp",
        subtitle: "Quyển 1–4 · Âm thanh gốc",
        icon: <BookMarked className="h-4 w-4" />,
        highlight: true,
      },
      {
        id: "classes",
        label: "Quản lý Lớp học",
        subtitle: "Lớp, thành viên & bài tập",
        icon: <GraduationCap className="h-4 w-4" />,
      },
    ],
  },
  {
    groupTitle: "Học viên & Kiểm tra",
    items: [
      {
        id: "students",
        label: "Tài khoản & Học viên",
        subtitle: "Phân quyền, sửa XP & lớp",
        icon: <Users className="h-4 w-4" />,
      },
      {
        id: "placementTests",
        label: "Bài Test đầu vào",
        subtitle: "Kết quả Seoul & THTH",
        icon: <ClipboardCheck className="h-4 w-4" />,
      },
    ],
  },
  {
    groupTitle: "Học liệu & Từ điển",
    items: [
      {
        id: "vocabularyDecks",
        label: "Bộ thẻ Khám phá",
        subtitle: "Thư viện Explore công khai",
        icon: <Layers className="h-4 w-4" />,
      },
      {
        id: "vocabularyManager",
        label: "Kho Từ điển",
        subtitle: "Thêm / sửa mục từ vựng",
        icon: <Search className="h-4 w-4" />,
      },
      {
        id: "lessons",
        label: "Bài học Nghe · Nói",
        subtitle: "Dictation & Shadowing",
        icon: <BookOpen className="h-4 w-4" />,
      },
      {
        id: "decks",
        label: "Tiến độ Anki SRS",
        subtitle: "Đồng bộ thẻ học viên",
        icon: <Sparkles className="h-4 w-4" />,
      },
    ],
  },
  {
    groupTitle: "Cộng đồng & Hỗ trợ",
    items: [
      {
        id: "feedback",
        label: "Góp ý & Báo lỗi",
        subtitle: "Hỗ trợ người dùng",
        icon: <Check className="h-4 w-4" />,
      },
      {
        id: "community",
        label: "Bài viết Cộng đồng",
        subtitle: "Kiểm duyệt bài đăng",
        icon: <MessageSquare className="h-4 w-4" />,
      },
      {
        id: "chat",
        label: "Tin nhắn Phòng chat",
        subtitle: "Kiểm duyệt trò chuyện",
        icon: <MessageSquare className="h-4 w-4" />,
      },
    ],
  },
];

const fieldCls =
  "w-full rounded-xl border border-stone-200 dark:border-slate-700/80 bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner";
const selectCls =
  "rounded-xl border border-stone-200 dark:border-slate-700/80 bg-white dark:bg-[#132247] px-3 py-2 text-xs font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";
const labelCls = "block text-xs font-bold text-stone-700 dark:text-slate-300";
const ghostBtnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-100 hover:bg-stone-200 dark:bg-[#132247] dark:hover:bg-[#1a2f60] px-3 py-2 text-xs font-bold text-stone-700 dark:text-slate-200 transition-colors cursor-pointer";
const dangerBtnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-700/50 bg-rose-50/50 hover:bg-rose-100 dark:bg-transparent dark:hover:bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

export default function AdminPage() {
  const { currentUser, handleOpenAuth } = useApp();
  const [panel, setPanel] = useState<Panel>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [builtinLessons, setBuiltinLessons] = useState<BuiltinLesson[]>(() =>
    KOREAN_COURSE.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      level: lesson.level,
      lessonType: "Khóa học tiếng Hàn",
      count: lesson.dialogue.length,
    })),
  );
  const [hiddenLessonIds, setHiddenLessonIds] = useState<string[]>([]);
  const [classes, setClasses] = useState<AdminClassRow[]>([]);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "teacher" | "admin">("all");
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "new" | "in_progress" | "resolved">("all");

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    name: "",
    role: "student" as "student" | "teacher" | "admin",
    xp: 0,
    gems: 0,
    streak: 0,
    grantThthBook: "" as "" | "0" | "1" | "2" | "3" | "4",
  });

  // Lessons state
  const [editingLessonId, setEditingLessonId] = useState("");
  const [builtInQuery, setBuiltInQuery] = useState("");
  const [builtInLevel, setBuiltInLevel] = useState("all");
  const [builtInVisibility, setBuiltInVisibility] = useState("all");
  const [showAllBuiltIns, setShowAllBuiltIns] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    lessonType: "both",
    level: "TOPIK 1",
    description: "",
    koreanText: "",
    vietnameseText: "",
    sourceUrl: "",
  });

  // Explore & Dictionary state
  const [contentDecks, setContentDecks] = useState<ContentDeck[]>([]);
  const [contentDecksLoading, setContentDecksLoading] = useState(false);
  const [dictionaryManagerQuery, setDictionaryManagerQuery] = useState("");
  const [dictionaryManagerResults, setDictionaryManagerResults] = useState<DictionaryEntry[]>([]);
  const [dictionaryManagerTotal, setDictionaryManagerTotal] = useState<number | null>(null);
  const [dictionaryManagerPage, setDictionaryManagerPage] = useState(0);
  const [dictionaryManagerLoading, setDictionaryManagerLoading] = useState(false);
  const [editingDictionaryWord, setEditingDictionaryWord] = useState<DictionaryEntry | null>(null);
  const [dictionaryWordForm, setDictionaryWordForm] = useState({
    hangul: "",
    vietnamese: "",
    english: "",
    japanese: "",
    partOfSpeech: "",
    topik: "",
    topic: "",
  });
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [dictionaryResults, setDictionaryResults] = useState<DictionaryEntry[]>([]);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [builderTopik, setBuilderTopik] = useState("all");
  const [builderWords, setBuilderWords] = useState<DeckWord[]>([]);
  const [builderForm, setBuilderForm] = useState({
    title: "",
    description: "",
    visibility: "public" as "public" | "private",
  });
  const [editingContentDeck, setEditingContentDeck] = useState("");
  const [placementStats, setPlacementStats] = useState<PlacementTestStats | null>(null);
  const [placementStatsLoading, setPlacementStatsLoading] = useState(false);

  const notifySuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    window.setTimeout(() => {
      setSuccessMsg((prev) => (prev === msg ? "" : prev));
    }, 4000);
  }, []);

  const load = useCallback(async () => {
    if (!currentUser || currentUser.role !== "admin") return;
    setError("");
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    try {
      const [
        summary,
        userData,
        deckData,
        feedbackData,
        postData,
        lessonData,
        classData,
        chatData,
        featureData,
      ] = await Promise.all([
        adminFetch<Overview>("/api/admin/overview"),
        adminFetch<{ users: UserRow[] }>(`/api/admin/users${params.size ? `?${params}` : ""}`),
        adminFetch<{ decks: DeckRow[] }>("/api/admin/decks"),
        adminFetch<{ feedback: FeedbackRow[] }>("/api/admin/feedback"),
        adminFetch<{ posts: PostRow[] }>("/api/admin/community"),
        adminFetch<{ lessons: LessonRow[]; hiddenLessonIds: string[] }>("/api/admin/lessons"),
        adminFetch<{ classes: AdminClassRow[] }>("/api/admin/classes"),
        adminFetch<{ messages: ChatRow[] }>("/api/admin/chat"),
        adminFetch<{ features: Partial<FeatureFlags> }>("/api/admin/features"),
      ]);
      setOverview(summary);
      setUsers(userData.users);
      setDecks(deckData.decks);
      setFeedback(feedbackData.feedback);
      setPosts(postData.posts);
      setLessons(lessonData.lessons);
      setHiddenLessonIds(lessonData.hiddenLessonIds || []);
      setClasses(classData.classes);
      setMessages(chatData.messages);
      setFeatureFlags({ ...DEFAULT_FEATURE_FLAGS, ...featureData.features });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được trang quản trị.");
    }
  }, [currentUser, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (currentUser?.role !== "admin") return;
    let active = true;
    loadPrivateLearningContent().then((content) => {
      if (!active || !content) return;
      setBuiltinLessons([
        ...content.topikLessons.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          level: lesson.topikName,
          lessonType: "Video · Dictation + Shadowing",
          count: lesson.segments?.length || 0,
        })),
        ...content.curatedPractice.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          level: lesson.topikName,
          lessonType: "Bài sáng tác · Dictation + Shadowing",
          count: lesson.segments?.length || 0,
        })),
        ...KOREAN_COURSE.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          level: lesson.level,
          lessonType: "Khóa học tiếng Hàn",
          count: lesson.dialogue.length,
        })),
      ]);
    });
    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (panel !== "vocabularyDecks" || currentUser?.role !== "admin") return;
    let cancelled = false;
    setContentDecksLoading(true);
    adminFetch<{ decks: ContentDeck[] }>("/api/admin/content-decks")
      .then((data) => {
        if (!cancelled) setContentDecks(data.decks);
      })
      .catch((cause) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "Không tải được bộ từ Explore.");
      })
      .finally(() => {
        if (!cancelled) setContentDecksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [panel, currentUser]);

  useEffect(() => {
    if (panel !== "placementTests" || currentUser?.role !== "admin") return;
    let cancelled = false;
    setPlacementStatsLoading(true);
    adminFetch<PlacementTestStats>("/api/placement-tests")
      .then((data) => {
        if (!cancelled) setPlacementStats(data);
      })
      .catch((cause) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "Không tải được lịch sử bài test.");
      })
      .finally(() => {
        if (!cancelled) setPlacementStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [panel, currentUser]);

  useEffect(() => {
    if (panel !== "vocabularyManager" || currentUser?.role !== "admin") return;
    let cancelled = false;
    const queryText = dictionaryManagerQuery.trim();
    setDictionaryManagerLoading(true);
    const timer = window.setTimeout(() => {
      const lookup = queryText
        ? searchLearningDictionary(
            queryText,
            60,
            undefined,
            detectDictionarySearchLanguage(queryText),
          )
        : browseLearningDictionary("all", "vi", dictionaryManagerPage * 30, 30);
      void Promise.all([lookup, countLearningDictionaryEntries()])
        .then(([results, total]) => {
          if (!cancelled) {
            setDictionaryManagerResults(results);
            setDictionaryManagerTotal(total);
          }
        })
        .catch((cause) => {
          if (!cancelled) setError(cause instanceof Error ? cause.message : "Không tải được kho từ.");
        })
        .finally(() => {
          if (!cancelled) setDictionaryManagerLoading(false);
        });
    }, queryText ? 220 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [panel, currentUser, dictionaryManagerQuery, dictionaryManagerPage]);

  useEffect(() => {
    if (panel !== "vocabularyDecks") return;
    const queryText = dictionaryQuery.trim();
    if (!queryText) {
      setDictionaryResults([]);
      setDictionaryLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setDictionaryLoading(true);
      void searchLearningDictionary(
        queryText,
        24,
        controller.signal,
        detectDictionarySearchLanguage(queryText),
        builderTopik as DictionaryLevel,
      )
        .then((results) => {
          if (!controller.signal.aborted) setDictionaryResults(results);
        })
        .catch(() => {
          if (!controller.signal.aborted) setDictionaryResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setDictionaryLoading(false);
        });
    }, 280);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [panel, dictionaryQuery, builderTopik]);

  async function action<T = unknown>(key: string, run: () => Promise<T>): Promise<T | undefined> {
    setBusy(key);
    setError("");
    try {
      const result = await run();
      await load();
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Thao tác không thành công.");
      return undefined;
    } finally {
      setBusy("");
    }
  }

  function toggleFeature(key: FeatureKey) {
    const enabled = !featureFlags[key];
    void action(`feature:${key}`, async () => {
      await adminFetch("/api/admin/features", {
        method: "PATCH",
        body: JSON.stringify({ key, enabled }),
      });
      notifySuccess(`Đã ${enabled ? "hiện" : "ẩn"} tính năng "${FEATURE_CATALOG.find((f) => f.key === key)?.label || key}".`);
    });
  }

  async function handleSaveEditUser(e: FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setBusy(`edit-user:${editingUser.id}`);
    setError("");
    try {
      await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: editingUser.id,
          name: editUserForm.name.trim(),
          role: editUserForm.role,
          xp: Number(editUserForm.xp) || 0,
          gems: Number(editUserForm.gems) || 0,
          streak: Number(editUserForm.streak) || 0,
        }),
      });
      if (editUserForm.grantThthBook !== "") {
        await adminFetch("/api/admin/thth", {
          method: "POST",
          body: JSON.stringify({
            action: "grant_access",
            targetType: "user",
            targetId: editingUser.id,
            bookNumber: Number(editUserForm.grantThthBook),
            note: "Cấp trực tiếp từ Quản lý Tài khoản",
          }),
        });
      }
      setEditingUser(null);
      notifySuccess(`Đã cập nhật thông tin tài khoản ${editUserForm.name}!`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được tài khoản.");
    } finally {
      setBusy("");
    }
  }

  async function createLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action("new-lesson", async () => {
      await adminFetch("/api/admin/lessons", {
        method: editingLessonId ? "PATCH" : "POST",
        body: JSON.stringify({
          ...lessonForm,
          ...(editingLessonId ? { id: editingLessonId } : {}),
        }),
      });
      setLessonForm({
        title: "",
        lessonType: "both",
        level: "TOPIK 1",
        description: "",
        koreanText: "",
        vietnameseText: "",
        sourceUrl: "",
      });
      setEditingLessonId("");
      notifySuccess(editingLessonId ? "Đã cập nhật bài học." : "Đã tạo và phát hành bài học mới.");
    });
  }

  function deleteLesson(lesson: LessonRow) {
    if (!window.confirm(`Xóa bài “${lesson.title}”? Bài sẽ bị gỡ khỏi thư viện học viên.`)) return;
    void action(lesson.id, () =>
      adminFetch(`/api/admin/lessons?id=${encodeURIComponent(lesson.id)}`, { method: "DELETE" }),
    );
  }

  function deleteDeck(deck: DeckRow) {
    if (
      !window.confirm(
        `Xóa toàn bộ trạng thái SRS của bộ thẻ ${deck.deckId} thuộc ${deck.name}? Thao tác này không thể hoàn tác.`,
      )
    )
      return;
    const key = `${deck.userId}:${deck.deckId}`;
    void action(key, () =>
      adminFetch(
        `/api/admin/decks?userId=${encodeURIComponent(deck.userId)}&deckId=${encodeURIComponent(deck.deckId)}`,
        { method: "DELETE" },
      ),
    );
  }

  function deleteUser(user: UserRow) {
    if (user.id === currentUser?.id || user.role === "admin") return;
    const confirmed = window.confirm(
      `Xóa tài khoản ${user.name} (${user.email}) vĩnh viễn? Tiến độ Anki, điểm, lớp do tài khoản này sở hữu, bài tập do tài khoản tạo và bài học do tài khoản soạn sẽ bị xóa. Thao tác này không thể hoàn tác.`,
    );
    if (!confirmed) return;
    void action(user.id, () =>
      adminFetch<{ failedMediaCleanup?: number }>(
        `/api/admin/users?userId=${encodeURIComponent(user.id)}`,
        { method: "DELETE" },
      ),
    ).then((result) => {
      if (result?.failedMediaCleanup)
        setError(
          `Đã xóa tài khoản nhưng còn ${result.failedMediaCleanup} tệp media không thể dọn khỏi kho lưu trữ.`,
        );
      else notifySuccess(`Đã xóa tài khoản ${user.email}.`);
    });
  }

  function addDictionaryWord(entry: DictionaryEntry) {
    setBuilderWords((current) =>
      current.some((word) => word.hangul === entry.hangul)
        ? current
        : [
            ...current,
            {
              hangul: entry.hangul,
              vietnamese: entry.vietnamese,
              english: entry.english,
              japanese: entry.japanese,
              partOfSpeech: entry.partOfSpeech,
              level: entry.level,
              topik: entry.topik,
              topic: entry.topic,
            },
          ],
    );
  }

  async function editContentDeck(deck: ContentDeck) {
    setBusy(`load:${deck.sharedId}`);
    setError("");
    try {
      const response = await adminFetch<{ deck: ContentDeckWithCards }>(
        `/api/admin/content-decks?id=${encodeURIComponent(deck.sharedId)}`,
      );
      const record = response.deck;
      setEditingContentDeck(record.sharedId);
      setBuilderForm({
        title: record.title,
        description: record.description,
        visibility: record.visibility,
      });
      setBuilderWords(
        record.cards
          .map((card) => {
            const fields = Array.isArray(card.fields) ? (card.fields as unknown[]) : [];
            const str = (value: unknown) => (typeof value === "string" ? value : "");
            return {
              hangul: str(card.koreanText) || str(card.frontText) || str(fields[0]),
              vietnamese: str(card.vietnameseMeaning) || str(fields[1]),
              english: str(fields[2]),
              japanese: str(fields[3]),
              partOfSpeech: str(fields[4]),
              level: str(fields[5]),
              topic: str(fields[6]),
            };
          })
          .filter((word) => word.hangul),
      );
      setDictionaryQuery("");
      setPanel("vocabularyDecks");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được nội dung bộ thẻ.");
    } finally {
      setBusy("");
    }
  }

  async function saveContentDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!builderWords.length) {
      setError("Hãy chọn ít nhất một từ từ kho dữ liệu trước khi lưu.");
      return;
    }
    setBusy("save-content-deck");
    setError("");
    try {
      const deckId = editingContentDeck
        ? contentDecks.find((deck) => deck.sharedId === editingContentDeck)?.deckId ||
          editingContentDeck
        : `admin-vocab-${crypto.randomUUID()}`;
      const cards = builderWords.map((word, index) => {
        const meaning = word.vietnamese || word.english || word.japanese || "";
        const fields = [
          word.hangul,
          word.vietnamese,
          word.english,
          word.japanese,
          word.partOfSpeech,
          word.level,
          word.topic,
        ].map((value) => value || "");
        return {
          id: index + 1,
          noteId: index + 1,
          frontHtml: word.hangul,
          backHtml: meaning,
          frontText: word.hangul,
          backText: meaning,
          koreanText: word.hangul,
          vietnameseMeaning: word.vietnamese,
          fields,
          tags: [word.topik, word.level, word.topic, word.partOfSpeech].filter(Boolean),
        };
      });
      const response = await adminFetch<{ success: boolean; sharedId: string }>(
        "/api/admin/content-decks",
        {
          method: "POST",
          body: JSON.stringify({
            sharedId: editingContentDeck || undefined,
            deckId,
            title: builderForm.title,
            description: builderForm.description,
            visibility: builderForm.visibility,
            cards,
          }),
        },
      );
      const list = await adminFetch<{ decks: ContentDeck[] }>("/api/admin/content-decks");
      setContentDecks(list.decks);
      setEditingContentDeck("");
      setBuilderWords([]);
      setDictionaryQuery("");
      setDictionaryResults([]);
      setBuilderForm({ title: "", description: "", visibility: "public" });
      if (!response.success) throw new Error("Máy chủ chưa xác nhận lưu bộ từ.");
      notifySuccess("Đã lưu bộ thẻ Explore thành công!");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được bộ từ.");
    } finally {
      setBusy("");
    }
  }

  function startDictionaryEdit(entry?: DictionaryEntry) {
    setEditingDictionaryWord(entry || null);
    setDictionaryWordForm({
      hangul: entry?.hangul || "",
      vietnamese: entry?.vietnamese || "",
      english: entry?.english || "",
      japanese: entry?.japanese || "",
      partOfSpeech: entry?.partOfSpeech || "",
      topik: entry?.topik || "",
      topic: entry?.topic || "",
    });
  }

  async function reloadDictionaryManager() {
    refreshLearningDictionaryCache();
    const queryText = dictionaryManagerQuery.trim();
    const [total, results] = await Promise.all([
      countLearningDictionaryEntries(),
      queryText
        ? searchLearningDictionary(
            queryText,
            60,
            undefined,
            detectDictionarySearchLanguage(queryText),
          )
        : browseLearningDictionary("all", "vi", dictionaryManagerPage * 30, 30),
    ]);
    setDictionaryManagerTotal(total);
    setDictionaryManagerResults(results);
  }

  async function saveDictionaryWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save-dictionary-word");
    setError("");
    try {
      await adminFetch("/api/admin/dictionary", {
        method: "POST",
        body: JSON.stringify({
          ...dictionaryWordForm,
          oldHangul: editingDictionaryWord?.hangul || "",
        }),
      });
      await reloadDictionaryManager();
      setEditingDictionaryWord(null);
      setDictionaryWordForm({
        hangul: "",
        vietnamese: "",
        english: "",
        japanese: "",
        partOfSpeech: "",
        topik: "",
        topic: "",
      });
      notifySuccess("Đã lưu mục từ vào từ điển chung!");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được mục từ.");
    } finally {
      setBusy("");
    }
  }

  async function deleteDictionaryWord(entry: DictionaryEntry) {
    if (!window.confirm(`Ẩn “${entry.hangul}” khỏi từ điển trên toàn hệ thống?`)) return;
    setBusy(`delete-word:${entry.hangul}`);
    setError("");
    try {
      await adminFetch(`/api/admin/dictionary?hangul=${encodeURIComponent(entry.hangul)}`, {
        method: "DELETE",
      });
      await reloadDictionaryManager();
      notifySuccess(`Đã ẩn "${entry.hangul}" khỏi từ điển.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không xóa được mục từ.");
    } finally {
      setBusy("");
    }
  }

  async function deleteContentDeck(deck: ContentDeck) {
    if (!window.confirm(`Gỡ bộ “${deck.title}” khỏi Explore và xóa dữ liệu thẻ trên máy chủ?`))
      return;
    setBusy(`delete:${deck.sharedId}`);
    setError("");
    try {
      await adminFetch(`/api/admin/content-decks?id=${encodeURIComponent(deck.sharedId)}`, {
        method: "DELETE",
      });
      setContentDecks((current) => current.filter((item) => item.sharedId !== deck.sharedId));
      notifySuccess(`Đã gỡ bộ thẻ "${deck.title}".`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không xóa được bộ từ.");
    } finally {
      setBusy("");
    }
  }

  const getBadgeCount = (id: Panel): number | string | null => {
    switch (id) {
      case "thth":
        return "4 quyển";
      case "classes":
        return classes.length;
      case "students":
        return overview?.users ?? users.length;
      case "vocabularyDecks":
        return contentDecks.length || null;
      case "lessons":
        return lessons.length + builtinLessons.length;
      case "decks":
        return decks.length;
      case "community":
        return posts.length;
      case "chat":
        return messages.length;
      case "feedback":
        return overview?.pendingFeedback ?? feedback.length;
      case "features":
        return `${Object.values(featureFlags).filter(Boolean).length}/${FEATURE_CATALOG.length}`;
      default:
        return null;
    }
  };

  const filteredUsers = users.filter((u) =>
    roleFilter === "all" ? true : u.role === roleFilter,
  );

  const filteredFeedback = feedback.filter((item) =>
    feedbackFilter === "all" ? true : item.status === feedbackFilter,
  );

  return (
    <AppShell>
      <main className="mx-auto max-w-[1440px] space-y-5 pb-24">
        {/* Top Admin Header */}
        <header className="card-duo rounded-3xl flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 p-3.5 shrink-0 border border-blue-500/20">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-white">
                  Trung tâm Quản trị <span className="text-blue-500 dark:text-blue-400">HaechiVN</span>
                </h1>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                  No-Code Admin CMS
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-stone-500 dark:text-slate-400">
                Quản lý giáo trình Tiếng Hàn Tổng Hợp (kèm âm thanh gốc), lớp học, học viên, từ điển và mọi tính năng của website.
              </p>
            </div>
          </div>

          {currentUser?.role === "admin" && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPanel("thth")}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 px-3.5 py-2.5 text-xs font-extrabold text-blue-600 dark:text-sky-300 transition cursor-pointer"
              >
                <Volume2 className="h-4 w-4" />
                <span>Tiếng Hàn Tổng Hợp (1–4)</span>
              </button>
              <button
                type="button"
                onClick={() => void load()}
                className={ghostBtnCls}
                title="Làm mới dữ liệu"
              >
                <RefreshCw className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>
          )}
        </header>

        {!currentUser ? (
          <div className="card-duo rounded-2xl p-8 text-center">
            <p className="mb-4 text-stone-600 dark:text-slate-300">
              Đăng nhập bằng tài khoản quản trị để tiếp tục.
            </p>
            <button onClick={() => handleOpenAuth(false)} className="btn-duo btn-duo-primary px-5 py-2">
              Đăng nhập
            </button>
          </div>
        ) : currentUser.role !== "admin" ? (
          <div className="card-duo rounded-2xl p-8 text-center text-rose-600 dark:text-rose-300">
            Tài khoản này không có quyền quản trị.
          </div>
        ) : (
          <>
            {/* Notifications */}
            {error && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-2xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-200"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <button type="button" onClick={() => setError("")} className="opacity-70 hover:opacity-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-200"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
                <button type="button" onClick={() => setSuccessMsg("")} className="opacity-70 hover:opacity-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Mobile horizontal navigation bar */}
            <nav
              aria-label="Menu quản trị di động"
              className="flex lg:hidden items-center gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
                const active = panel === item.id;
                const badge = getBadgeCount(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPanel(item.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                        : "border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-[#132247] text-stone-600 dark:text-slate-300"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {badge !== null && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                          active
                            ? "bg-blue-500/40 text-white"
                            : "bg-stone-200 dark:bg-slate-800 text-stone-500 dark:text-slate-400"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Main 2-column Layout: Categorized Sidebar + Workspace */}
            <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)] items-start">
              {/* Desktop Categorized Sidebar */}
              <aside className="hidden lg:block card-duo rounded-3xl p-4 space-y-5 sticky top-20">
                {NAV_GROUPS.map((group) => (
                  <div key={group.groupTitle} className="space-y-1.5">
                    <p className="px-3 text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-slate-500">
                      {group.groupTitle}
                    </p>
                    {group.items.map((item) => {
                      const active = panel === item.id;
                      const badge = getBadgeCount(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPanel(item.id)}
                          className={`w-full flex items-center justify-between gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all cursor-pointer ${
                            active
                              ? "bg-blue-600 text-white shadow-md shadow-blue-900/25"
                              : item.highlight
                              ? "border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/15 text-stone-800 dark:text-white"
                              : "hover:bg-stone-100 dark:hover:bg-[#132247] text-stone-700 dark:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`shrink-0 rounded-xl p-2 ${
                                active
                                  ? "bg-white/20 text-white"
                                  : item.highlight
                                  ? "bg-blue-500/15 text-blue-600 dark:text-sky-300"
                                  : "bg-stone-100 dark:bg-[#132247] text-stone-500 dark:text-slate-400"
                              }`}
                            >
                              {item.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-extrabold">{item.label}</p>
                              <p
                                className={`truncate text-[10px] ${
                                  active ? "text-blue-100" : "text-stone-400 dark:text-slate-500"
                                }`}
                              >
                                {item.subtitle}
                              </p>
                            </div>
                          </div>
                          {badge !== null && (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                                active
                                  ? "bg-white/20 text-white"
                                  : "bg-stone-200/80 dark:bg-slate-800 text-stone-600 dark:text-slate-300"
                              }`}
                            >
                              {badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </aside>

              {/* Right Content Area */}
              <div className="min-w-0 space-y-6">
                {!overview ? (
                  <div className="card-duo rounded-2xl p-8 text-center text-stone-500 dark:text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-500" />
                    Đang tải dữ liệu quản trị…
                  </div>
                ) : (
                  <>
                    {/* PANEL: OVERVIEW */}
                    {panel === "overview" && (
                      <div className="space-y-6">
                        {/* Stat Cards */}
                        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                          {[
                            { label: "Tổng Tài khoản", count: overview.users, target: "students" as Panel },
                            { label: "Học viên", count: overview.students, target: "students" as Panel },
                            { label: "Giáo viên", count: overview.teachers, target: "students" as Panel },
                            { label: "Lớp học", count: overview.classes, target: "classes" as Panel },
                            { label: "Bài cộng đồng", count: overview.posts, target: "community" as Panel },
                            { label: "Góp ý chờ xử lý", count: overview.pendingFeedback, target: "feedback" as Panel },
                          ].map((stat) => (
                            <button
                              key={stat.label}
                              type="button"
                              onClick={() => setPanel(stat.target)}
                              className="card-duo rounded-2xl p-4 sm:p-5 text-left transition hover:border-blue-500/50 cursor-pointer"
                            >
                              <div className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 dark:text-slate-400">
                                {stat.label}
                              </div>
                              <div className="mt-2 text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
                                {stat.count}
                              </div>
                            </button>
                          ))}
                        </section>

                        {/* Highlight Banner for THTH Curriculum */}
                        <section className="card-duo rounded-3xl border-2 border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-3 py-1 text-[11px] font-extrabold text-blue-600 dark:text-sky-300">
                              <Volume2 className="h-3.5 w-3.5" />
                              Giáo trình Độc quyền Admin · Đã đồng bộ từ Tiếng Hàn Tổng Hợp.apkg
                            </div>
                            <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white">
                              Bộ Tiếng Hàn Tổng Hợp (Quyển 1, 2, 3, 4 · 6.019 thẻ + 17.480 file âm thanh/hình gốc)
                            </h2>
                            <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 max-w-3xl">
                              Toàn bộ âm thanh từ vựng, âm thanh câu ví dụ và hình minh họa gốc trong file <code className="font-mono font-bold">.apkg</code> đã được tích hợp. Chỉ Admin mới có quyền tạo lớp Tiếng Hàn Tổng Hợp, mở khóa từng quyển cho lớp/học viên, hoặc chỉnh sửa thẻ và tải file MP3 mới.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPanel("thth")}
                              className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-5 py-3 text-xs font-bold"
                            >
                              <BookMarked className="h-4 w-4" />
                              Quản lý Tiếng Hàn Tổng Hợp →
                            </button>
                          </div>
                        </section>

                        {/* Highlight Banner for TOPIK II Writing Curriculum */}
                        <section className="card-duo rounded-3xl border-2 border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-extrabold text-rose-600 dark:text-rose-300">
                              <Pencil className="h-3.5 w-3.5" />
                              Bộ thẻ Cracking the TOPIK II Writing · Độc quyền Admin (Bảo mật)
                            </div>
                            <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white">
                              728 thẻ luyện viết Câu 51, 53, 54 & Đề thi thật kèm cơ chế gõ tự chấm
                            </h2>
                            <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 max-w-3xl">
                              Toàn bộ hệ thống thẻ điền ㉠ ㉡, chọn từ khóa, phân tích biểu đồ và viết luận đã được tích hợp ô gõ tiếng Hàn trực tiếp, so sánh biến thể đáp án chuẩn NIIED. Bộ thẻ này không công khai ra production, chỉ tài khoản Admin mới có quyền truy cập học.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <a
                              href="/flashcards"
                              className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-5 py-3 text-xs font-bold"
                            >
                              <BookOpen className="h-4 w-4" />
                              Mở học trên /flashcards →
                            </a>
                          </div>
                        </section>

                        {/* Quick Action Cards Grid */}
                        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {[
                            {
                              title: "Lớp học & Giao bài tập",
                              desc: "Tạo lớp học mới, thêm học viên bằng email, duyệt thành viên và giao bộ thẻ Tiếng Hàn Tổng Hợp hoặc bộ từ bất kỳ.",
                              btn: "Mở Quản lý Lớp học →",
                              target: "classes" as Panel,
                            },
                            {
                              title: "Học viên & Phân quyền",
                              desc: "Tìm kiếm học viên, nâng cấp quyền Giáo viên/Admin, điều chỉnh điểm XP, Gems, chuỗi ngày học và cấp quyền giáo trình riêng.",
                              btn: "Mở Quản lý Tài khoản →",
                              target: "students" as Panel,
                            },
                            {
                              title: "Bật / Tắt Tính năng Website",
                              desc: `Đang bật ${Object.values(featureFlags).filter(Boolean).length}/${FEATURE_CATALOG.length} tính năng. Ẩn hoặc hiện bất kỳ mục nào trên thanh menu máy tính và điện thoại ngay lập tức.`,
                              btn: "Cấu hình Tính năng →",
                              target: "features" as Panel,
                            },
                            {
                              title: "Bộ thẻ Explore & Kho Từ điển",
                              desc: "Tạo bộ thẻ công khai trên trang Khám phá, tải lên file .apkg mới hoặc thêm/sửa trực tiếp từ điển Hàn - Việt - Anh - Nhật.",
                              btn: "Quản lý Bộ từ Explore →",
                              target: "vocabularyDecks" as Panel,
                            },
                            {
                              title: "Bài học Dictation & Shadowing",
                              desc: "Soạn bài luyện nghe chép chính tả và nói đuổi mới, hoặc ẩn/hiện các bài học có sẵn trong kho học liệu.",
                              btn: "Quản lý Bài học →",
                              target: "lessons" as Panel,
                            },
                            {
                              title: "Lịch sử Bài Test đầu vào",
                              desc: "Theo dõi chi tiết số lượt làm bài, tỷ lệ vượt qua và điểm số của từng học viên ở các bài kiểm tra xếp lớp.",
                              btn: "Xem Thống kê Bài Test →",
                              target: "placementTests" as Panel,
                            },
                          ].map((card) => (
                            <div
                              key={card.title}
                              className="card-duo rounded-2xl p-5 flex flex-col justify-between"
                            >
                              <div>
                                <h3 className="text-sm font-black text-stone-900 dark:text-white">
                                  {card.title}
                                </h3>
                                <p className="mt-2 text-xs leading-5 text-stone-500 dark:text-slate-400">
                                  {card.desc}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPanel(card.target)}
                                className="mt-4 inline-flex items-center text-xs font-extrabold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                              >
                                {card.btn}
                              </button>
                            </div>
                          ))}
                        </section>
                      </div>
                    )}

                    {/* PANEL: TIẾNG HÀN TỔNG HỢP (ADMIN EXCLUSIVE) */}
                    {panel === "thth" && (
                      <ThthCurriculumManager
                        classes={classes.map((c) => ({
                          id: c.id,
                          code: c.code,
                          name: c.name,
                          description: c.description || "",
                          ownerName: c.ownerName || "",
                          members: c.members,
                          assignments: c.assignments,
                        }))}
                        users={users.map((u) => ({
                          id: u.id,
                          name: u.name,
                          email: u.email,
                          role: u.role,
                        }))}
                        onRefreshClasses={load}
                        onNotify={(type, message) => {
                          if (type === "error") setError(message);
                          else notifySuccess(message);
                        }}
                      />
                    )}

                    {/* PANEL: CLASSES */}
                    {panel === "classes" && (
                      <AdminClassManager
                        classes={classes}
                        request={adminFetch}
                        onError={setError}
                        onSuccess={notifySuccess}
                        onRefresh={() => void load()}
                        onOpenThthPanel={() => setPanel("thth")}
                      />
                    )}

                    {/* PANEL: FEATURES */}
                    {panel === "features" && (
                      <section className="space-y-4">
                        <div className="card-duo rounded-2xl border-blue-500/20 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <h2 className="text-base font-black text-stone-900 dark:text-white">
                              Ẩn hoặc hiện tính năng trên toàn hệ thống
                            </h2>
                            <p className="mt-1.5 max-w-3xl text-xs sm:text-sm leading-6 text-stone-500 dark:text-slate-400">
                              Tắt tính năng sẽ gỡ mục đó khỏi menu trên máy tính và điện thoại, đồng thời chặn trang đó khi người học truy cập trực tiếp. Dữ liệu vẫn được giữ nguyên.
                            </p>
                          </div>
                          <div className="rounded-2xl bg-blue-500/10 px-4 py-3 text-right">
                            <p className="text-xs font-black text-blue-600 dark:text-sky-300">
                              {Object.values(featureFlags).filter(Boolean).length} / {FEATURE_CATALOG.length} đang bật
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {FEATURE_CATALOG.map((feature) => {
                            const enabled = featureFlags[feature.key];
                            const busyKey = `feature:${feature.key}`;
                            return (
                              <article
                                key={feature.key}
                                className={`card-duo rounded-2xl flex items-center justify-between gap-4 p-4 transition ${
                                  enabled ? "border-emerald-500/30" : "border-amber-500/30 opacity-80"
                                }`}
                              >
                                <div className="min-w-0">
                                  <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                                    {feature.label}
                                  </h3>
                                  <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-slate-400">
                                    {feature.description}
                                  </p>
                                  <span
                                    className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                                      enabled
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                                    }`}
                                  >
                                    {enabled ? "Đang hiện trên web" : "Đang ẩn"}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={enabled}
                                  aria-label={`${enabled ? "Ẩn" : "Hiện lại"} ${feature.label}`}
                                  disabled={busy === busyKey}
                                  onClick={() => toggleFeature(feature.key)}
                                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition cursor-pointer disabled:cursor-wait disabled:opacity-50 ${
                                    enabled
                                      ? "border-emerald-500 bg-emerald-500/20"
                                      : "border-stone-300 dark:border-slate-600 bg-stone-200 dark:bg-slate-800"
                                  }`}
                                >
                                  <span
                                    className={`flex h-5 w-5 items-center justify-center rounded-full transition ${
                                      enabled
                                        ? "translate-x-6 bg-emerald-500 text-white"
                                        : "translate-x-1 bg-stone-400 text-stone-900 dark:bg-slate-400 dark:text-slate-900"
                                    }`}
                                  >
                                    <Power className="h-3 w-3" />
                                  </span>
                                </button>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {/* PANEL: STUDENTS & USERS */}
                    {panel === "students" && (
                      <section className="card-duo rounded-2xl overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-slate-800 p-4 sm:p-5">
                          <div>
                            <h2 className="text-base font-black text-stone-900 dark:text-white">
                              Quản lý Tài khoản & Học viên ({filteredUsers.length})
                            </h2>
                            <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                              Chỉnh sửa tên, vai trò (Học viên / Giáo viên / Admin), điểm XP, Gems, chuỗi ngày học hoặc cấp quyền bộ Tiếng Hàn Tổng Hợp.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={roleFilter}
                              onChange={(e) => setRoleFilter(e.target.value as any)}
                              className={selectCls}
                            >
                              <option value="all">Tất cả vai trò ({users.length})</option>
                              <option value="student">
                                Học viên ({users.filter((u) => u.role === "student").length})
                              </option>
                              <option value="teacher">
                                Giáo viên ({users.filter((u) => u.role === "teacher").length})
                              </option>
                              <option value="admin">
                                Admin ({users.filter((u) => u.role === "admin").length})
                              </option>
                            </select>
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                setSearch(query.trim());
                              }}
                              className="flex gap-2"
                            >
                              <label className="flex items-center gap-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#132247] px-3 py-1.5 shadow-inner">
                                <Search className="h-4 w-4 text-stone-400 dark:text-slate-500" />
                                <input
                                  value={query}
                                  onChange={(event) => setQuery(event.target.value)}
                                  placeholder="Tìm tên hoặc email..."
                                  className="w-36 sm:w-48 bg-transparent py-1 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 outline-none"
                                />
                              </label>
                              <button className="btn-duo btn-duo-primary h-8 px-4 text-xs font-bold">
                                Tìm
                              </button>
                            </form>
                          </div>
                        </div>

                        <div className="overflow-x-auto max-w-full">
                          <table className="w-full min-w-[920px] text-left text-xs">
                            <thead className="border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900/40 text-[11px] font-extrabold uppercase tracking-widest text-stone-500 dark:text-slate-400">
                              <tr>
                                <th className="p-3.5">Tài khoản</th>
                                <th className="p-3.5">XP / Gems</th>
                                <th className="p-3.5">Chuỗi</th>
                                <th className="p-3.5">Bộ thẻ / Phiên</th>
                                <th className="p-3.5">Học gần nhất</th>
                                <th className="p-3.5">Vai trò</th>
                                <th className="p-3.5">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200 dark:divide-slate-800">
                              {filteredUsers.map((user) => (
                                <tr
                                  key={user.id}
                                  className="transition hover:bg-stone-50 dark:hover:bg-slate-900/40"
                                >
                                  <td className="p-3.5 text-stone-900 dark:text-white">
                                    <span className="font-bold">{user.name}</span>
                                    <span className="block text-xs text-stone-500 dark:text-slate-400">
                                      {user.email}
                                    </span>
                                  </td>
                                  <td className="p-3.5">
                                    <span className="text-amber-600 dark:text-amber-300 font-bold">
                                      {user.xp} XP
                                    </span>
                                    <span className="block text-[11px] text-sky-500">
                                      {user.gems || 0} Gems
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-blue-600 dark:text-sky-300 font-bold">
                                    {user.streak || 0} ngày
                                  </td>
                                  <td className="p-3.5 text-stone-700 dark:text-slate-300">
                                    {user.decks || 0} bộ · {user.studySessions || 0} phiên
                                  </td>
                                  <td className="p-3.5 text-stone-500 dark:text-slate-400">
                                    {user.lastStudied
                                      ? String(user.lastStudied).slice(0, 16)
                                      : "Chưa học"}
                                  </td>
                                  <td className="p-3.5">
                                    <select
                                      disabled={busy === user.id || user.id === currentUser.id}
                                      value={user.role}
                                      onChange={(event) =>
                                        void action(user.id, async () => {
                                          await adminFetch("/api/admin/users", {
                                            method: "PATCH",
                                            body: JSON.stringify({
                                              userId: user.id,
                                              role: event.target.value,
                                            }),
                                          });
                                          notifySuccess(`Đã đổi vai trò của ${user.name}.`);
                                        })
                                      }
                                      className={selectCls}
                                    >
                                      <option value="student">Học viên</option>
                                      <option value="teacher">Giáo viên</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                  </td>
                                  <td className="p-3.5">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingUser(user);
                                          setEditUserForm({
                                            name: user.name,
                                            role: user.role,
                                            xp: user.xp || 0,
                                            gems: user.gems || 0,
                                            streak: user.streak || 0,
                                            grantThthBook: "",
                                          });
                                        }}
                                        className={`${ghostBtnCls} h-8 px-3 text-xs`}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Sửa / Cấp THTH
                                      </button>
                                      {user.role !== "admin" && user.id !== currentUser.id && (
                                        <button
                                          disabled={busy === user.id}
                                          onClick={() => deleteUser(user)}
                                          className={`${dangerBtnCls} h-8 px-3 text-xs`}
                                          title="Xóa tài khoản vĩnh viễn"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {filteredUsers.length === 0 && (
                            <p className="p-5 text-sm text-stone-500 dark:text-slate-400">
                              Không tìm thấy tài khoản phù hợp.
                            </p>
                          )}
                        </div>

                        {/* Edit User Modal */}
                        {editingUser && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                            <form
                              onSubmit={handleSaveEditUser}
                              className="card-duo w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl"
                            >
                              <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
                                <div>
                                  <h3 className="text-base font-black text-stone-900 dark:text-white">
                                    Chỉnh sửa tài khoản
                                  </h3>
                                  <p className="text-xs text-stone-500">{editingUser.email}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditingUser(null)}
                                  className={ghostBtnCls}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className={labelCls}>
                                  Tên hiển thị
                                  <input
                                    required
                                    value={editUserForm.name}
                                    onChange={(e) =>
                                      setEditUserForm({ ...editUserForm, name: e.target.value })
                                    }
                                    className={`mt-1.5 ${fieldCls}`}
                                  />
                                </label>
                                <label className={labelCls}>
                                  Vai trò hệ thống
                                  <select
                                    disabled={editingUser.id === currentUser.id}
                                    value={editUserForm.role}
                                    onChange={(e) =>
                                      setEditUserForm({
                                        ...editUserForm,
                                        role: e.target.value as any,
                                      })
                                    }
                                    className={`mt-1.5 ${fieldCls}`}
                                  >
                                    <option value="student">Học viên</option>
                                    <option value="teacher">Giáo viên</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </label>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-3">
                                <label className={labelCls}>
                                  Điểm XP
                                  <input
                                    type="number"
                                    min={0}
                                    value={editUserForm.xp}
                                    onChange={(e) =>
                                      setEditUserForm({
                                        ...editUserForm,
                                        xp: Number(e.target.value),
                                      })
                                    }
                                    className={`mt-1.5 ${fieldCls}`}
                                  />
                                </label>
                                <label className={labelCls}>
                                  Gems
                                  <input
                                    type="number"
                                    min={0}
                                    value={editUserForm.gems}
                                    onChange={(e) =>
                                      setEditUserForm({
                                        ...editUserForm,
                                        gems: Number(e.target.value),
                                      })
                                    }
                                    className={`mt-1.5 ${fieldCls}`}
                                  />
                                </label>
                                <label className={labelCls}>
                                  Chuỗi ngày học (Streak)
                                  <input
                                    type="number"
                                    min={0}
                                    value={editUserForm.streak}
                                    onChange={(e) =>
                                      setEditUserForm({
                                        ...editUserForm,
                                        streak: Number(e.target.value),
                                      })
                                    }
                                    className={`mt-1.5 ${fieldCls}`}
                                  />
                                </label>
                              </div>

                              <label className={labelCls}>
                                Mở khóa nhanh giáo trình Tiếng Hàn Tổng Hợp (tùy chọn)
                                <select
                                  value={editUserForm.grantThthBook}
                                  onChange={(e) =>
                                    setEditUserForm({
                                      ...editUserForm,
                                      grantThthBook: e.target.value as any,
                                    })
                                  }
                                  className={`mt-1.5 ${fieldCls}`}
                                >
                                  <option value="">— Không thay đổi quyền THTH —</option>
                                  <option value="0">Mở khóa trọn bộ Quyển 1, 2, 3, 4</option>
                                  <option value="1">Mở khóa Quyển 1 (Sơ cấp 1)</option>
                                  <option value="2">Mở khóa Quyển 2 (Sơ cấp 2)</option>
                                  <option value="3">Mở khóa Quyển 3 (Trung cấp 3)</option>
                                  <option value="4">Mở khóa Quyển 4 (Trung cấp 4)</option>
                                </select>
                              </label>

                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingUser(null)}
                                  className={ghostBtnCls}
                                >
                                  Hủy
                                </button>
                                <button
                                  type="submit"
                                  disabled={busy === `edit-user:${editingUser.id}`}
                                  className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
                                >
                                  {busy === `edit-user:${editingUser.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                  Lưu thay đổi
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </section>
                    )}

                    {/* PANEL: PLACEMENT TESTS */}
                    {panel === "placementTests" && (
                      <section className="space-y-4">
                        {placementStatsLoading && (
                          <div className="card-duo rounded-2xl p-6 text-center text-sm text-stone-500 dark:text-slate-400">
                            Đang tải lịch sử bài test…
                          </div>
                        )}
                        {!placementStatsLoading && placementStats && (
                          <>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                              {[
                                ["Người đã làm", placementStats.summary.participants],
                                ["Tổng lượt làm", placementStats.summary.attempts],
                                ["Lượt pass", placementStats.summary.passed],
                                ["Câu trả lời đúng", placementStats.summary.correctAnswers],
                                ["Điểm trung bình", `${placementStats.summary.averageScore}%`],
                              ].map(([label, value]) => (
                                <article key={label} className="card-duo rounded-2xl p-4">
                                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                                    {label}
                                  </p>
                                  <p className="mt-2 text-2xl font-black text-stone-900 dark:text-white">
                                    {value}
                                  </p>
                                </article>
                              ))}
                            </div>
                            <div className="grid gap-3 lg:grid-cols-3">
                              {[
                                {
                                  slug: "seoul-1a",
                                  title: "Seoul 1A",
                                  description: "Đầu vào học tiếp 1B",
                                },
                                {
                                  slug: "thth-1",
                                  title: "Tiếng Hàn Tổng Hợp 1",
                                  description: "Đầu vào học tiếp quyển 2",
                                },
                                {
                                  slug: "thth-1-5",
                                  title: "Tiếng Hàn Tổng Hợp 1 (Bài 1–5)",
                                  description: "Kiểm tra nhanh 5 bài đầu",
                                },
                              ].map((test) => {
                                const stats = placementStats.tests.find(
                                  (item) => item.testSlug === test.slug,
                                );
                                return (
                                  <article key={test.slug} className="card-duo rounded-2xl p-5">
                                    <h2 className="font-bold text-stone-900 dark:text-white">
                                      {test.title}
                                    </h2>
                                    <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                                      {test.description}
                                    </p>
                                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                                      <p>
                                        <b>{stats?.participants || 0}</b>
                                        <span className="block text-stone-500 dark:text-slate-400">
                                          người làm
                                        </span>
                                      </p>
                                      <p>
                                        <b>{stats?.attempts || 0}</b>
                                        <span className="block text-stone-500 dark:text-slate-400">
                                          lượt làm
                                        </span>
                                      </p>
                                      <p>
                                        <b>{stats?.passed || 0}</b>
                                        <span className="block text-stone-500 dark:text-slate-400">
                                          lượt pass
                                        </span>
                                      </p>
                                      <p>
                                        <b>{stats?.averageScore || 0}%</b>
                                        <span className="block text-stone-500 dark:text-slate-400">
                                          điểm TB
                                        </span>
                                      </p>
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                            <div className="card-duo overflow-hidden rounded-2xl">
                              <div className="border-b border-stone-200 p-4 dark:border-slate-800">
                                <h2 className="font-bold text-stone-900 dark:text-white">
                                  Kết quả theo tài khoản
                                </h2>
                                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                                  Số câu đúng, tổng câu đã làm, điểm trung bình/cao nhất và số lần pass của từng tài khoản.
                                </p>
                              </div>
                              <div className="max-w-full overflow-x-auto">
                                <table className="w-full min-w-[1050px] text-left text-xs">
                                  <thead className="bg-stone-50 text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:bg-slate-900/40 dark:text-slate-400">
                                    <tr>
                                      <th className="p-3">Tài khoản</th>
                                      <th className="p-3">Tổng lượt</th>
                                      <th className="p-3">Tổng đúng / câu</th>
                                      <th className="p-3">Pass</th>
                                      <th className="p-3">Điểm TB / cao nhất</th>
                                      <th className="p-3">Seoul 1A</th>
                                      <th className="p-3">Tổng Hợp 1</th>
                                      <th className="p-3">Làm gần nhất</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-200 dark:divide-slate-800">
                                    {placementStats.accounts.map((account) => (
                                      <tr key={account.userId}>
                                        <td className="p-3">
                                          <b className="text-stone-900 dark:text-white">
                                            {account.name}
                                          </b>
                                          <span className="mt-1 block text-stone-500 dark:text-slate-400">
                                            {account.email}
                                          </span>
                                        </td>
                                        <td className="p-3">{account.attempts}</td>
                                        <td className="p-3">
                                          {account.correctAnswers} / {account.answeredQuestions}
                                        </td>
                                        <td className="p-3">
                                          {account.passed} / {account.attempts} (
                                          {account.attempts
                                            ? Math.round((account.passed / account.attempts) * 100)
                                            : 0}
                                          %)
                                        </td>
                                        <td className="p-3">
                                          {account.averageScore}% / {account.bestScore}%
                                        </td>
                                        <td className="p-3">
                                          {account.seoulAttempts ? (
                                            <>
                                              {account.seoulCorrect}/{account.seoulQuestions} đúng · pass{" "}
                                              {account.seoulPassed}/{account.seoulAttempts} (
                                              {Math.round(
                                                (account.seoulPassed / account.seoulAttempts) * 100,
                                              )}
                                              %)
                                              <span className="mt-1 block text-stone-500 dark:text-slate-400">
                                                TB {account.seoulAverage}% · cao nhất{" "}
                                                {account.seoulBest}%
                                              </span>
                                            </>
                                          ) : (
                                            "Chưa làm"
                                          )}
                                        </td>
                                        <td className="p-3">
                                          {account.ththAttempts ? (
                                            <>
                                              {account.ththCorrect}/{account.ththQuestions} đúng · pass{" "}
                                              {account.ththPassed}/{account.ththAttempts} (
                                              {Math.round(
                                                (account.ththPassed / account.ththAttempts) * 100,
                                              )}
                                              %)
                                              <span className="mt-1 block text-stone-500 dark:text-slate-400">
                                                TB {account.ththAverage}% · cao nhất{" "}
                                                {account.ththBest}%
                                              </span>
                                            </>
                                          ) : (
                                            "Chưa làm"
                                          )}
                                        </td>
                                        <td className="p-3">
                                          {String(account.lastAttemptAt || "").slice(0, 16) || "—"}
                                        </td>
                                      </tr>
                                    ))}
                                    {!placementStats.accounts.length && (
                                      <tr>
                                        <td
                                          colSpan={8}
                                          className="p-6 text-center text-stone-500 dark:text-slate-400"
                                        >
                                          Chưa có tài khoản nào hoàn thành bài test.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <div className="card-duo overflow-hidden rounded-2xl">
                              <div className="border-b border-stone-200 p-4 dark:border-slate-800">
                                <h2 className="font-bold text-stone-900 dark:text-white">
                                  Lịch sử từng lượt làm
                                </h2>
                                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                                  1000 lượt gần nhất; thống kê theo tài khoản phía trên tính trên toàn bộ lịch sử.
                                </p>
                              </div>
                              <div className="max-w-full overflow-x-auto">
                                <table className="w-full min-w-[900px] text-left text-xs">
                                  <thead className="bg-stone-50 text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:bg-slate-900/40 dark:text-slate-400">
                                    <tr>
                                      <th className="p-3">Tài khoản</th>
                                      <th className="p-3">Bài test</th>
                                      <th className="p-3">Đúng / sai / bỏ qua</th>
                                      <th className="p-3">Điểm</th>
                                      <th className="p-3">Kết quả</th>
                                      <th className="p-3">Thời lượng</th>
                                      <th className="p-3">Thời gian</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-200 dark:divide-slate-800">
                                    {placementStats.attempts.map((attempt) => (
                                      <tr key={attempt.id}>
                                        <td className="p-3">
                                          <b className="text-stone-900 dark:text-white">
                                            {attempt.name}
                                          </b>
                                          <span className="mt-1 block text-stone-500 dark:text-slate-400">
                                            {attempt.email}
                                          </span>
                                        </td>
                                        <td className="p-3">
                                          {attempt.testSlug === "seoul-1a"
                                            ? "Seoul 1A"
                                            : attempt.testSlug === "thth-1-5"
                                            ? "Tiếng Hàn Tổng Hợp 1 (Bài 1–5)"
                                            : "Tiếng Hàn Tổng Hợp 1"}
                                        </td>
                                        <td className="p-3">
                                          {attempt.correct} / {attempt.wrong} / {attempt.skipped} ·{" "}
                                          {attempt.total} câu
                                        </td>
                                        <td className="p-3 font-bold">{attempt.scorePercent}%</td>
                                        <td className="p-3">
                                          {attempt.verdict === "pass"
                                            ? "Pass"
                                            : attempt.verdict === "almost"
                                            ? "Gần đạt"
                                            : "Chưa đạt"}
                                        </td>
                                        <td className="p-3">
                                          {Math.floor(attempt.durationSeconds / 60)}:
                                          {String(attempt.durationSeconds % 60).padStart(2, "0")}
                                        </td>
                                        <td className="p-3">{String(attempt.createdAt).slice(0, 16)}</td>
                                      </tr>
                                    ))}
                                    {!placementStats.attempts.length && (
                                      <tr>
                                        <td
                                          colSpan={7}
                                          className="p-6 text-center text-stone-500 dark:text-slate-400"
                                        >
                                          Chưa có lịch sử bài test.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </>
                        )}
                      </section>
                    )}

                    {/* PANEL: DECKS */}
                    {panel === "decks" && (
                      <section className="card-duo rounded-2xl overflow-hidden">
                        <div className="border-b border-stone-200 dark:border-slate-800 p-4 sm:p-5">
                          <h2 className="text-base font-bold text-stone-900 dark:text-white">
                            Bộ thẻ Anki có tiến độ đồng bộ ({decks.length})
                          </h2>
                          <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                            Xem số thẻ có trạng thái SRS trên máy chủ; xóa chỉ xóa trạng thái ôn tập đồng bộ, không xóa tệp Anki trong thiết bị.
                          </p>
                        </div>
                        <div className="divide-y divide-stone-200 dark:divide-slate-800">
                          {decks.map((deck) => {
                            const key = `${deck.userId}:${deck.deckId}`;
                            return (
                              <article
                                key={key}
                                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-stone-50 dark:hover:bg-slate-900/40"
                              >
                                <div>
                                  <h3 className="break-all font-mono text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                                    {deck.deckId}
                                  </h3>
                                  <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                                    {deck.name} · {deck.email}
                                  </p>
                                  <p className="mt-1 text-[11px] text-stone-400 dark:text-slate-500">
                                    {deck.cardCount} trạng thái thẻ · cập nhật{" "}
                                    {String(deck.updatedAt).slice(0, 16)}
                                  </p>
                                </div>
                                <button
                                  disabled={busy === key}
                                  onClick={() => deleteDeck(deck)}
                                  className={`${dangerBtnCls} h-8 px-3 text-xs shrink-0`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Xóa tiến độ SRS
                                </button>
                              </article>
                            );
                          })}
                          {decks.length === 0 && (
                            <p className="p-5 text-sm text-stone-500 dark:text-slate-400">
                              Chưa có bộ thẻ nào có tiến độ SRS đồng bộ.
                            </p>
                          )}
                        </div>
                      </section>
                    )}

                    {/* PANEL: VOCABULARY MANAGER (DICTIONARY) */}
                    {panel === "vocabularyManager" && (
                      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                        <section className="card-duo rounded-2xl overflow-hidden">
                          <div className="border-b border-stone-200 dark:border-slate-800 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h2 className="text-base font-bold text-stone-900 dark:text-white">
                                  Quản lý Từ điển Hàn - Việt - Anh - Nhật
                                </h2>
                                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                                  Tìm và duyệt từ trong kho hiện có; chọn một mục để sửa, hoặc tạo mục mới.
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-xs font-extrabold text-blue-700 dark:text-sky-300">
                                  Tổng kho:{" "}
                                  {dictionaryManagerTotal === null
                                    ? "Đang đếm…"
                                    : `${dictionaryManagerTotal.toLocaleString("vi-VN")} từ`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => startDictionaryEdit()}
                                  className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold"
                                >
                                  <Plus className="h-4 w-4" />
                                  Thêm từ
                                </button>
                              </div>
                            </div>
                            <label className="mt-4 flex items-center gap-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#0b1329] px-3.5">
                              <Search className="h-4 w-4 text-blue-500" />
                              <input
                                value={dictionaryManagerQuery}
                                onChange={(event) => {
                                  setDictionaryManagerQuery(event.target.value);
                                  setDictionaryManagerPage(0);
                                }}
                                placeholder="Tìm Hangul, tiếng Việt, English hoặc 日本語"
                                className="w-full bg-transparent py-3 text-xs text-stone-900 dark:text-white outline-none placeholder:text-stone-400"
                              />
                              {dictionaryManagerQuery && (
                                <button
                                  type="button"
                                  onClick={() => setDictionaryManagerQuery("")}
                                  aria-label="Xóa tìm kiếm"
                                  className="text-stone-500"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </label>
                          </div>
                          <div className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-slate-800 px-4 py-2 text-[11px] text-stone-500 dark:text-slate-400">
                            <span>
                              {dictionaryManagerQuery.trim()
                                ? `Kết quả tìm kiếm: ${dictionaryManagerResults.length}${
                                    dictionaryManagerResults.length === 60
                                      ? "+ (đang hiển thị tối đa 60)"
                                      : ""
                                  }`
                                : `Mục ${
                                    dictionaryManagerPage * 30 +
                                    (dictionaryManagerResults.length ? 1 : 0)
                                  }–${
                                    dictionaryManagerPage * 30 + dictionaryManagerResults.length
                                  }`}
                            </span>
                            <span>
                              {dictionaryManagerTotal?.toLocaleString("vi-VN") ?? "—"} mục từ duy nhất
                            </span>
                          </div>
                          <div className="divide-y divide-stone-200 dark:divide-slate-800">
                            {dictionaryManagerLoading && (
                              <div className="p-6 text-center text-xs text-stone-500">
                                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                                Đang tải từ vựng…
                              </div>
                            )}
                            {!dictionaryManagerLoading &&
                              dictionaryManagerResults.map((entry) => (
                                <article
                                  key={`${entry.hangul}:${entry.vietnamese}`}
                                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-stone-50 dark:hover:bg-slate-900/40"
                                >
                                  <button
                                    type="button"
                                    onClick={() => startDictionaryEdit(entry)}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <span className="font-noto text-sm font-bold text-stone-900 dark:text-white">
                                      {entry.hangul}
                                    </span>
                                    <span className="ml-2 text-[10px] font-bold text-blue-600 dark:text-sky-300">
                                      {entry.topik || entry.level || "Chưa gán TOPIK"}
                                    </span>
                                    <p className="mt-1 text-xs text-stone-600 dark:text-slate-300">
                                      {entry.vietnamese || "Chưa có nghĩa tiếng Việt"}
                                    </p>
                                    {(entry.english || entry.japanese || entry.topic) && (
                                      <p className="mt-1 truncate text-[11px] text-stone-500 dark:text-slate-400">
                                        {[entry.english, entry.japanese, entry.topic]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </p>
                                    )}
                                  </button>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startDictionaryEdit(entry)}
                                      className={ghostBtnCls}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Sửa
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy === `delete-word:${entry.hangul}`}
                                      onClick={() => void deleteDictionaryWord(entry)}
                                      aria-label={`Ẩn ${entry.hangul}`}
                                      className={dangerBtnCls}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </article>
                              ))}
                            {!dictionaryManagerLoading &&
                              dictionaryManagerResults.length === 0 && (
                                <p className="p-6 text-center text-xs text-stone-500">
                                  Không có kết quả. Bạn có thể thêm mục từ mới bằng nút phía trên.
                                </p>
                              )}
                          </div>
                          {!dictionaryManagerQuery.trim() && (
                            <div className="flex items-center justify-between border-t border-stone-200 dark:border-slate-800 p-3">
                              <span className="text-[11px] text-stone-500">
                                Trang {dictionaryManagerPage + 1} · mỗi trang 30 mục
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={!dictionaryManagerPage || dictionaryManagerLoading}
                                  onClick={() =>
                                    setDictionaryManagerPage((page) => Math.max(0, page - 1))
                                  }
                                  className={ghostBtnCls}
                                >
                                  Trước
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    dictionaryManagerLoading ||
                                    dictionaryManagerResults.length < 30
                                  }
                                  onClick={() => setDictionaryManagerPage((page) => page + 1)}
                                  className={ghostBtnCls}
                                >
                                  Tiếp
                                </button>
                              </div>
                            </div>
                          )}
                        </section>

                        <form
                          onSubmit={saveDictionaryWord}
                          className="card-duo h-fit space-y-3 rounded-2xl p-5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                              {editingDictionaryWord
                                ? `Sửa: ${editingDictionaryWord.hangul}`
                                : "Thêm mục từ"}
                            </h2>
                            {editingDictionaryWord && (
                              <button
                                type="button"
                                onClick={() => startDictionaryEdit()}
                                className="text-xs text-stone-500"
                              >
                                Mục mới
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] leading-5 text-stone-500 dark:text-slate-400">
                            Dữ liệu lưu trên máy chủ và áp dụng vào kết quả từ điển chung.
                          </p>
                          {(
                            [
                              ["hangul", "Từ tiếng Hàn · Hangul", true],
                              ["vietnamese", "Nghĩa tiếng Việt", false],
                              ["english", "Meaning in English", false],
                              ["japanese", "日本語の意味", false],
                              ["partOfSpeech", "Từ loại", false],
                              ["topik", "Cấp TOPIK (ví dụ TOPIK 3)", false],
                              ["topic", "Chủ đề", false],
                            ] as const
                          ).map(([key, label, required]) => (
                            <label key={key} className={labelCls}>
                              {label}
                              <input
                                required={required}
                                maxLength={key === "hangul" ? 120 : 2000}
                                value={dictionaryWordForm[key]}
                                onChange={(event) =>
                                  setDictionaryWordForm((form) => ({
                                    ...form,
                                    [key]: event.target.value,
                                  }))
                                }
                                className={`mt-1.5 ${fieldCls}`}
                              />
                            </label>
                          ))}
                          <div className="flex gap-2 pt-1">
                            <button
                              type="submit"
                              disabled={busy === "save-dictionary-word"}
                              className="btn-duo btn-duo-primary inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold disabled:opacity-50"
                            >
                              {busy === "save-dictionary-word" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              {editingDictionaryWord ? "Lưu chỉnh sửa" : "Thêm vào từ điển"}
                            </button>
                            {editingDictionaryWord && (
                              <button
                                type="button"
                                onClick={() => startDictionaryEdit()}
                                className={ghostBtnCls}
                              >
                                Hủy
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    )}

                    {/* PANEL: VOCABULARY DECKS (EXPLORE) */}
                    {panel === "vocabularyDecks" && (
                      <div className="space-y-6">
                        <ExploreDeckManager request={adminFetch} onError={setError} />
                        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                          <section className="card-duo rounded-2xl space-y-4 p-5 sm:p-6">
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="text-base font-bold text-stone-900 dark:text-white">
                                  {editingContentDeck
                                    ? "Cập nhật bộ từ Explore"
                                    : "Tạo bộ thẻ từ kho từ vựng"}
                                </h2>
                                {editingContentDeck && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingContentDeck("");
                                      setBuilderWords([]);
                                      setBuilderForm({
                                        title: "",
                                        description: "",
                                        visibility: "public",
                                      });
                                    }}
                                    className={`${ghostBtnCls} h-8 px-3 text-xs`}
                                  >
                                    Tạo bộ mới
                                  </button>
                                )}
                              </div>
                              <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-slate-400">
                                Tìm từ trong kho từ điển của web, chọn kết quả, sửa nghĩa nếu cần rồi lưu thành bộ thẻ trên máy chủ. Bộ công khai sẽ hiện trong Khám phá.
                              </p>
                            </div>

                            <label className={labelCls}>
                              Tìm bằng Hangul hoặc nghĩa tiếng Việt / Anh / Nhật
                              <div className="mt-1.5 flex gap-2">
                                <span className="flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-stone-200 dark:border-transparent bg-white dark:bg-[#132247] px-3.5 shadow-inner">
                                  <Search className="h-4 w-4 text-stone-400 dark:text-slate-500" />
                                  <input
                                    value={dictionaryQuery}
                                    onChange={(event) => setDictionaryQuery(event.target.value)}
                                    placeholder="사랑, tình yêu, love"
                                    className="w-full bg-transparent py-2.5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-400 outline-none"
                                  />
                                </span>
                                <select
                                  value={builderTopik}
                                  onChange={(event) => setBuilderTopik(event.target.value)}
                                  className={selectCls}
                                >
                                  <option value="all">Mọi cấp</option>
                                  {[1, 2, 3, 4, 5, 6].map((level) => (
                                    <option key={level} value={`TOPIK ${level}`}>
                                      TOPIK {level}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </label>

                            <div className="max-h-72 divide-y divide-stone-200 dark:divide-slate-800 overflow-y-auto rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950/60">
                              {dictionaryLoading && (
                                <p className="p-4 text-xs text-stone-500 dark:text-slate-400">
                                  Đang tìm…
                                </p>
                              )}
                              {!dictionaryLoading &&
                                dictionaryQuery.trim() &&
                                dictionaryResults.length === 0 && (
                                  <p className="p-4 text-xs text-stone-400 dark:text-slate-500">
                                    Không thấy kết quả phù hợp.
                                  </p>
                                )}
                              {dictionaryResults.map((entry) => {
                                const added = builderWords.some(
                                  (word) => word.hangul === entry.hangul,
                                );
                                return (
                                  <article
                                    key={`${entry.hangul}:${entry.vietnamese}`}
                                    className="flex items-center justify-between gap-3 p-3 transition hover:bg-stone-100/60 dark:hover:bg-slate-900/40"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate font-noto text-sm font-bold text-stone-900 dark:text-white">
                                        {entry.hangul}
                                        <span className="ml-2 font-sans text-[10px] font-bold text-blue-600 dark:text-sky-300">
                                          {entry.topik || entry.level || "Chưa gán cấp"}
                                        </span>
                                      </p>
                                      <p className="mt-1 truncate text-xs text-stone-600 dark:text-slate-300">
                                        {entry.vietnamese ||
                                          entry.english ||
                                          entry.japanese ||
                                          "Chưa có nghĩa"}
                                      </p>
                                      {entry.topic && (
                                        <p className="mt-1 truncate text-[10px] text-stone-400 dark:text-slate-500">
                                          {entry.topic}
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      disabled={added || builderWords.length >= 2000}
                                      onClick={() => addDictionaryWord(entry)}
                                      className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-blue-500/50 dark:border-sky-700/50 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-sky-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50 transition-colors"
                                    >
                                      {added ? (
                                        <>
                                          <Check className="h-3.5 w-3.5" />
                                          Đã chọn
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="h-3.5 w-3.5" />
                                          Thêm
                                        </>
                                      )}
                                    </button>
                                  </article>
                                );
                              })}
                              {!dictionaryQuery.trim() && (
                                <p className="p-4 text-xs text-stone-400 dark:text-slate-500">
                                  Nhập từ khóa để tìm và chọn từ.
                                </p>
                              )}
                            </div>

                            <form
                              onSubmit={saveContentDeck}
                              className="space-y-3 border-t border-stone-200 dark:border-slate-800 pt-4"
                            >
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className={labelCls}>
                                  Tên bộ thẻ
                                  <input
                                    required
                                    minLength={2}
                                    maxLength={120}
                                    value={builderForm.title}
                                    onChange={(event) =>
                                      setBuilderForm({ ...builderForm, title: event.target.value })
                                    }
                                    className={`mt-1.5 ${fieldCls}`}
                                  />
                                </label>
                                <label className={labelCls}>
                                  Quyền
                                  <select
                                    value={builderForm.visibility}
                                    onChange={(event) =>
                                      setBuilderForm({
                                        ...builderForm,
                                        visibility: event.target.value as "public" | "private",
                                      })
                                    }
                                    className={`mt-1.5 ${fieldCls}`}
                                  >
                                    <option value="public">Công khai trên Explore</option>
                                    <option value="private">Riêng tư</option>
                                  </select>
                                </label>
                              </div>
                              <label className={labelCls}>
                                Mô tả
                                <textarea
                                  maxLength={1000}
                                  rows={2}
                                  value={builderForm.description}
                                  onChange={(event) =>
                                    setBuilderForm({
                                      ...builderForm,
                                      description: event.target.value,
                                    })
                                  }
                                  className={`mt-1.5 ${fieldCls}`}
                                />
                              </label>
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <span className="text-xs text-stone-500 dark:text-slate-400">
                                  {builderWords.length} từ đã chọn · tối đa 2.000
                                </span>
                                <button
                                  disabled={busy === "save-content-deck" || !builderWords.length}
                                  className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-5 py-3 text-xs font-bold disabled:opacity-50"
                                >
                                  {busy === "save-content-deck" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                  {editingContentDeck ? "Lưu cập nhật" : "Tạo bộ thẻ"}
                                </button>
                              </div>
                            </form>
                          </section>

                          <section className="card-duo rounded-2xl overflow-hidden">
                            <div className="border-b border-stone-200 dark:border-slate-800 p-4 sm:p-5">
                              <h2 className="text-base font-bold text-stone-900 dark:text-white">
                                Từ trong bộ đang soạn ({builderWords.length})
                              </h2>
                              <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                                Có thể chỉnh nghĩa hoặc bỏ từ trước khi lưu.
                              </p>
                            </div>
                            <div className="max-h-[34rem] divide-y divide-stone-200 dark:divide-slate-800 overflow-y-auto">
                              {builderWords.map((word, index) => (
                                <article
                                  key={`${word.hangul}:${index}`}
                                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-3"
                                >
                                  <div className="min-w-0">
                                    <p className="font-noto text-sm font-bold text-stone-900 dark:text-white">
                                      {word.hangul}
                                      <span className="ml-2 font-sans text-[10px] text-stone-400 dark:text-slate-500">
                                        {word.topik || word.level || ""}
                                      </span>
                                    </p>
                                    <input
                                      aria-label={`Nghĩa tiếng Việt cho ${word.hangul}`}
                                      value={word.vietnamese}
                                      onChange={(event) =>
                                        setBuilderWords((current) =>
                                          current.map((item, itemIndex) =>
                                            itemIndex === index
                                              ? { ...item, vietnamese: event.target.value }
                                              : item,
                                          ),
                                        )
                                      }
                                      placeholder={word.english || "Nhập nghĩa tiếng Việt"}
                                      className={`mt-1 ${fieldCls}`}
                                    />
                                    {word.topic && (
                                      <p className="mt-1 truncate text-[10px] text-stone-400 dark:text-slate-500">
                                        {word.topic}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    aria-label={`Bỏ ${word.hangul}`}
                                    onClick={() =>
                                      setBuilderWords((current) =>
                                        current.filter((_, itemIndex) => itemIndex !== index),
                                      )
                                    }
                                    className="self-start rounded-xl border border-rose-300 dark:border-rose-900/40 bg-rose-50/50 hover:bg-rose-100 dark:bg-transparent dark:hover:bg-rose-950/40 p-2 text-rose-600 dark:text-rose-300 transition-colors"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </article>
                              ))}
                              {!builderWords.length && (
                                <p className="p-5 text-sm text-stone-400 dark:text-slate-500">
                                  Chưa chọn từ nào.
                                </p>
                              )}
                            </div>
                          </section>

                          <section className="card-duo rounded-2xl overflow-hidden xl:col-span-2">
                            <div className="border-b border-stone-200 dark:border-slate-800 p-4 sm:p-5">
                              <h2 className="text-base font-bold text-stone-900 dark:text-white">
                                Bộ thẻ do admin quản lý ({contentDecks.length})
                              </h2>
                              <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                                Sửa nội dung hoặc quyền truy cập; gỡ bộ sẽ xóa dữ liệu trên máy chủ.
                              </p>
                            </div>
                            <div className="divide-y divide-stone-200 dark:divide-slate-800">
                              {contentDecksLoading && (
                                <p className="p-4 text-sm text-stone-500 dark:text-slate-400">
                                  Đang tải…
                                </p>
                              )}
                              {contentDecks.map((deck) => (
                                <article
                                  key={deck.sharedId}
                                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-stone-50 dark:hover:bg-slate-900/40"
                                >
                                  <div className="min-w-0">
                                    <h3 className="truncate font-bold text-stone-900 dark:text-white">
                                      {deck.title}
                                    </h3>
                                    <p className="mt-1 line-clamp-2 text-xs text-stone-500 dark:text-slate-400">
                                      {deck.description || "Chưa có mô tả"}
                                    </p>
                                    <p className="mt-1 text-[11px] text-stone-400 dark:text-slate-500">
                                      {deck.cardCount} thẻ ·{" "}
                                      {deck.visibility === "public" ? (
                                        <span className="font-bold text-emerald-600 dark:text-emerald-300">
                                          Công khai
                                        </span>
                                      ) : (
                                        <span className="font-bold text-amber-600 dark:text-amber-300">
                                          Riêng tư
                                        </span>
                                      )}{" "}
                                      · {String(deck.updatedAt).slice(0, 10)}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-2">
                                    <button
                                      disabled={busy === `load:${deck.sharedId}`}
                                      onClick={() => void editContentDeck(deck)}
                                      className={`${ghostBtnCls} h-8 px-3 text-xs`}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Sửa
                                    </button>
                                    <button
                                      disabled={busy === `delete:${deck.sharedId}`}
                                      onClick={() => void deleteContentDeck(deck)}
                                      className={`${dangerBtnCls} h-8 px-3 text-xs`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Gỡ
                                    </button>
                                  </div>
                                </article>
                              ))}
                              {!contentDecksLoading && !contentDecks.length && (
                                <p className="p-5 text-sm text-stone-400 dark:text-slate-500">
                                  Chưa có bộ thẻ Explore do admin tạo.
                                </p>
                              )}
                            </div>
                          </section>
                        </div>
                      </div>
                    )}

                    {/* PANEL: LESSONS */}
                    {panel === "lessons" && (
                      <div className="space-y-6">
                        <div className="card-duo rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h2 className="text-sm font-black text-stone-900 dark:text-white">
                              Lối tắt Học liệu Tương tác trên Website
                            </h2>
                            <p className="text-xs text-stone-500 dark:text-slate-400">
                              Kiểm tra nhanh Sách tiếng Hàn tương tác và phòng luyện thi TOPIK I / II.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <a href="/sach" target="_blank" rel="noreferrer" className={ghostBtnCls}>
                              <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                              Sách Tiếng Hàn (/sach)
                            </a>
                            <a href="/topik" target="_blank" rel="noreferrer" className={ghostBtnCls}>
                              <ExternalLink className="h-3.5 w-3.5 text-emerald-500" />
                              Phòng Thi TOPIK (/topik)
                            </a>
                          </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                          <form
                            onSubmit={createLesson}
                            className="card-duo rounded-2xl space-y-4 p-5 sm:p-6"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <h2 className="text-base font-bold text-stone-900 dark:text-white">
                                  {editingLessonId ? "Sửa bài học" : "Thêm bài học dùng chung"}
                                </h2>
                                <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-slate-400">
                                  Mỗi dòng là một câu tiếng Hàn. Bản dịch cùng thứ tự; có thể để trống.
                                </p>
                              </div>
                              {editingLessonId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLessonId("");
                                    setLessonForm({
                                      title: "",
                                      lessonType: "both",
                                      level: "TOPIK 1",
                                      description: "",
                                      koreanText: "",
                                      vietnameseText: "",
                                      sourceUrl: "",
                                    });
                                  }}
                                  className={ghostBtnCls}
                                >
                                  Hủy sửa
                                </button>
                              )}
                            </div>
                            <label className={labelCls}>
                              Tên bài
                              <input
                                required
                                maxLength={160}
                                value={lessonForm.title}
                                onChange={(event) =>
                                  setLessonForm({ ...lessonForm, title: event.target.value })
                                }
                                className={`mt-1.5 ${fieldCls}`}
                              />
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <label className={labelCls}>
                                Loại
                                <select
                                  value={lessonForm.lessonType}
                                  onChange={(event) =>
                                    setLessonForm({ ...lessonForm, lessonType: event.target.value })
                                  }
                                  className={`mt-1.5 ${fieldCls}`}
                                >
                                  <option value="both">Dictation + Shadowing</option>
                                  <option value="dictation">Dictation</option>
                                  <option value="shadowing">Shadowing</option>
                                </select>
                              </label>
                              <label className={labelCls}>
                                Cấp độ
                                <input
                                  value={lessonForm.level}
                                  onChange={(event) =>
                                    setLessonForm({ ...lessonForm, level: event.target.value })
                                  }
                                  className={`mt-1.5 ${fieldCls}`}
                                />
                              </label>
                            </div>
                            <label className={labelCls}>
                              Mô tả
                              <textarea
                                rows={2}
                                value={lessonForm.description}
                                onChange={(event) =>
                                  setLessonForm({ ...lessonForm, description: event.target.value })
                                }
                                className={`mt-1.5 ${fieldCls}`}
                              />
                            </label>
                            <label className={labelCls}>
                              Câu tiếng Hàn · mỗi câu một dòng
                              <textarea
                                required
                                rows={7}
                                value={lessonForm.koreanText}
                                onChange={(event) =>
                                  setLessonForm({ ...lessonForm, koreanText: event.target.value })
                                }
                                className={`mt-1.5 font-noto ${fieldCls}`}
                              />
                            </label>
                            <label className={labelCls}>
                              Dịch tiếng Việt · cùng thứ tự
                              <textarea
                                rows={5}
                                value={lessonForm.vietnameseText}
                                onChange={(event) =>
                                  setLessonForm({
                                    ...lessonForm,
                                    vietnameseText: event.target.value,
                                  })
                                }
                                className={`mt-1.5 ${fieldCls}`}
                              />
                            </label>
                            <label className={labelCls}>
                              Link nguồn (không bắt buộc)
                              <input
                                type="url"
                                value={lessonForm.sourceUrl}
                                onChange={(event) =>
                                  setLessonForm({ ...lessonForm, sourceUrl: event.target.value })
                                }
                                className={`mt-1.5 ${fieldCls}`}
                              />
                            </label>
                            <button
                              disabled={busy === "new-lesson"}
                              className="btn-duo btn-duo-primary w-full px-4 py-3.5 text-xs font-bold disabled:opacity-50"
                            >
                              {busy === "new-lesson"
                                ? "Đang lưu…"
                                : editingLessonId
                                ? "Lưu thay đổi"
                                : "Tạo và phát hành bài học"}
                            </button>
                          </form>

                          <section className="card-duo rounded-2xl overflow-hidden">
                            <div className="border-b border-stone-200 dark:border-slate-800 p-4 sm:p-5">
                              <h2 className="text-base font-bold text-stone-900 dark:text-white">
                                Thư viện bài do quản trị viên thêm ({lessons.length})
                              </h2>
                              <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                                Bài xóa sẽ biến mất khỏi thư viện học viên.
                              </p>
                            </div>
                            <div className="divide-y divide-stone-200 dark:divide-slate-800">
                              {lessons.map((lesson) => (
                                <article
                                  key={lesson.id}
                                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between transition hover:bg-stone-50 dark:hover:bg-slate-900/40"
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap gap-2">
                                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-sky-300">
                                        {lesson.lessonType}
                                      </span>
                                      <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                                        {lesson.level}
                                      </span>
                                    </div>
                                    <h3 className="mt-2 font-bold text-stone-900 dark:text-white">
                                      {lesson.title}
                                    </h3>
                                    {lesson.description && (
                                      <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                                        {lesson.description}
                                      </p>
                                    )}
                                    <p className="mt-2 line-clamp-2 whitespace-pre-line font-noto text-xs text-stone-600 dark:text-slate-300">
                                      {lesson.koreanText}
                                    </p>
                                    <p className="mt-1 text-[10px] text-stone-400 dark:text-slate-500">
                                      {lesson.koreanText.split(/\r?\n/).filter(Boolean).length} câu ·{" "}
                                      {String(lesson.createdAt).slice(0, 10)}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingLessonId(lesson.id);
                                        setLessonForm({
                                          title: lesson.title,
                                          lessonType: lesson.lessonType,
                                          level: lesson.level,
                                          description: lesson.description,
                                          koreanText: lesson.koreanText,
                                          vietnameseText: lesson.vietnameseText,
                                          sourceUrl: lesson.sourceUrl,
                                        });
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                      }}
                                      className={`${ghostBtnCls} h-8 px-3 text-xs`}
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      disabled={busy === lesson.id}
                                      onClick={() => deleteLesson(lesson)}
                                      className={`${dangerBtnCls} h-8 px-3 text-xs`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Xóa bài
                                    </button>
                                  </div>
                                </article>
                              ))}
                              {lessons.length === 0 && (
                                <p className="p-5 text-sm text-stone-500 dark:text-slate-400">
                                  Chưa có bài do quản trị viên tạo.
                                </p>
                              )}
                            </div>
                          </section>
                        </div>

                        <details className="card-duo rounded-2xl overflow-hidden group" open>
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base font-bold text-stone-900 dark:text-white">
                                  Kho bài học có sẵn
                                </h2>
                                <span className="rounded-full bg-stone-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-stone-600 dark:text-slate-300">
                                  {builtinLessons.length} bài
                                </span>
                                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                                  {builtinLessons.length - hiddenLessonIds.length} đang hiện
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                                Tìm bài, lọc theo cấp độ, rồi ẩn hoặc khôi phục khỏi thư viện học viên.
                              </p>
                            </div>
                            <span
                              className={`${ghostBtnCls} h-8 px-3 text-xs text-blue-600 dark:text-sky-300 group-open:hidden`}
                            >
                              Mở kho bài
                            </span>
                            <span
                              className={`hidden ${ghostBtnCls} h-8 px-3 text-xs group-open:inline-flex`}
                            >
                              Thu gọn
                            </span>
                          </summary>
                          <div className="border-t border-stone-200 dark:border-slate-800">
                            <div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-stone-200 dark:border-slate-800 bg-stone-50/90 dark:bg-slate-950/95 p-3 backdrop-blur">
                              <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-stone-200 dark:border-transparent bg-white dark:bg-[#132247] px-3 shadow-inner">
                                <Search className="h-4 w-4 text-stone-400 dark:text-slate-500" />
                                <input
                                  value={builtInQuery}
                                  onChange={(event) => {
                                    setBuiltInQuery(event.target.value);
                                    setShowAllBuiltIns(false);
                                  }}
                                  placeholder="Tìm tên bài học…"
                                  className="w-full bg-transparent py-2 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-400 outline-none"
                                />
                              </label>
                              <select
                                value={builtInLevel}
                                onChange={(event) => {
                                  setBuiltInLevel(event.target.value);
                                  setShowAllBuiltIns(false);
                                }}
                                className={selectCls}
                              >
                                <option value="all">Mọi cấp độ</option>
                                {Array.from(new Set(builtinLessons.map((lesson) => lesson.level))).map(
                                  (level) => (
                                    <option key={level} value={level}>
                                      {level}
                                    </option>
                                  ),
                                )}
                              </select>
                              <select
                                value={builtInVisibility}
                                onChange={(event) => setBuiltInVisibility(event.target.value)}
                                className={selectCls}
                              >
                                <option value="all">Hiện cả bài ẩn</option>
                                <option value="visible">Chỉ bài đang hiện</option>
                                <option value="hidden">Chỉ bài đang ẩn</option>
                              </select>
                            </div>
                            <div className="divide-y divide-stone-200 dark:divide-slate-800">
                              {(() => {
                                const normalizedQuery = builtInQuery.trim().toLocaleLowerCase("vi");
                                const filtered = builtinLessons.filter((lesson) => {
                                  const hidden = hiddenLessonIds.includes(lesson.id);
                                  const searchMatches =
                                    !normalizedQuery ||
                                    lesson.title.toLocaleLowerCase("vi").includes(normalizedQuery);
                                  const levelMatches =
                                    builtInLevel === "all" || lesson.level === builtInLevel;
                                  const visibilityMatches =
                                    builtInVisibility === "hidden"
                                      ? hidden
                                      : builtInVisibility === "visible"
                                      ? !hidden
                                      : true;
                                  return searchMatches && levelMatches && visibilityMatches;
                                });
                                const shown = showAllBuiltIns ? filtered : filtered.slice(0, 12);
                                return (
                                  <>
                                    {shown.map((lesson) => {
                                      const hidden = hiddenLessonIds.includes(lesson.id);
                                      return (
                                        <article
                                          key={lesson.id}
                                          className="flex flex-col gap-3 p-4 transition hover:bg-stone-50 dark:hover:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                          <div className="min-w-0">
                                            <h3
                                              className={`truncate text-sm font-bold ${
                                                hidden
                                                  ? "text-stone-400 dark:text-slate-500"
                                                  : "text-stone-900 dark:text-white"
                                              }`}
                                            >
                                              {lesson.title}
                                            </h3>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-stone-500 dark:text-slate-400">
                                              <span className="rounded-md bg-stone-100 dark:bg-slate-800 px-2 py-0.5 font-medium">
                                                {lesson.level}
                                              </span>
                                              <span>{lesson.lessonType}</span>
                                              <span>{lesson.count} câu</span>
                                              <span
                                                className={`rounded-md px-2 py-0.5 font-bold ${
                                                  hidden
                                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                                }`}
                                              >
                                                {hidden ? "Đang ẩn" : "Đang hiển thị"}
                                              </span>
                                            </div>
                                          </div>
                                          <button
                                            disabled={busy === lesson.id}
                                            onClick={() =>
                                              void action(lesson.id, () =>
                                                adminFetch("/api/admin/lessons", {
                                                  method: "PATCH",
                                                  body: JSON.stringify({
                                                    id: lesson.id,
                                                    visibilityOnly: true,
                                                    isPublished: hidden,
                                                  }),
                                                }),
                                              )
                                            }
                                            className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                                              hidden
                                                ? "border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-transparent dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300"
                                                : "border-stone-200 dark:border-slate-700 bg-stone-100 hover:bg-stone-200 dark:bg-[#132247] dark:hover:bg-[#1a2f60] text-stone-700 dark:text-slate-300 hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-200"
                                            }`}
                                          >
                                            {hidden ? "Khôi phục bài" : "Ẩn khỏi học viên"}
                                          </button>
                                        </article>
                                      );
                                    })}
                                    {filtered.length === 0 && (
                                      <p className="p-6 text-center text-sm text-stone-500 dark:text-slate-400">
                                        Không tìm thấy bài học phù hợp.
                                      </p>
                                    )}
                                    {filtered.length > 12 && (
                                      <div className="p-3 text-center">
                                        <button
                                          onClick={() => setShowAllBuiltIns((value) => !value)}
                                          className={`${ghostBtnCls} h-8 px-4 text-xs text-blue-600 dark:text-sky-300`}
                                        >
                                          {showAllBuiltIns
                                            ? "Thu gọn danh sách"
                                            : `Xem thêm ${filtered.length - shown.length} bài`}
                                        </button>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </details>
                      </div>
                    )}

                    {/* PANEL: COMMUNITY */}
                    {panel === "community" && (
                      <section className="card-duo rounded-2xl overflow-hidden">
                        <div className="border-b border-stone-200 dark:border-slate-800 p-4 sm:p-5 font-bold text-stone-900 dark:text-white">
                          Kiểm duyệt bài cộng đồng ({posts.length})
                        </div>
                        <div className="divide-y divide-stone-200 dark:divide-slate-800">
                          {posts.map((post) => (
                            <article
                              key={post.id}
                              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between transition hover:bg-stone-50 dark:hover:bg-slate-900/40"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-stone-900 dark:text-white">
                                    {post.title}
                                  </h3>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      post.status === "published"
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                                    }`}
                                  >
                                    {post.status === "published" ? "Đang hiện" : "Đã ẩn"}
                                  </span>
                                </div>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600 dark:text-slate-300">
                                  {post.body}
                                </p>
                                <p className="mt-2 text-xs text-stone-400 dark:text-slate-500">
                                  {post.name} · {post.email} · {post.category}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <button
                                  disabled={busy === post.id}
                                  onClick={() =>
                                    void action(post.id, () =>
                                      adminFetch("/api/admin/community", {
                                        method: "PATCH",
                                        body: JSON.stringify({
                                          id: post.id,
                                          status:
                                            post.status === "published" ? "hidden" : "published",
                                        }),
                                      }),
                                    )
                                  }
                                  className={`${ghostBtnCls} h-8 px-3 text-xs`}
                                >
                                  {post.status === "published" ? "Ẩn bài" : "Hiện bài"}
                                </button>
                                <button
                                  disabled={busy === post.id}
                                  onClick={() => {
                                    if (window.confirm("Xóa bài viết này vĩnh viễn?"))
                                      void action(post.id, () =>
                                        adminFetch(
                                          `/api/admin/community?id=${encodeURIComponent(post.id)}`,
                                          { method: "DELETE" },
                                        ),
                                      );
                                  }}
                                  className={`${dangerBtnCls} h-8 px-3 text-xs`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Xóa
                                </button>
                              </div>
                            </article>
                          ))}
                          {posts.length === 0 && (
                            <p className="p-5 text-sm text-stone-500 dark:text-slate-400">
                              Chưa có bài viết.
                            </p>
                          )}
                        </div>
                      </section>
                    )}

                    {/* PANEL: CHAT */}
                    {panel === "chat" && (
                      <section className="card-duo rounded-2xl overflow-hidden">
                        <div className="border-b border-stone-200 dark:border-slate-800 p-4 sm:p-5 font-bold text-stone-900 dark:text-white">
                          Tin nhắn cộng đồng ({messages.length} gần đây)
                        </div>
                        <div className="divide-y divide-stone-200 dark:divide-slate-800">
                          {messages.map((item) => (
                            <article
                              key={item.id}
                              className="flex items-start justify-between gap-4 p-4 transition hover:bg-stone-50 dark:hover:bg-slate-900/40"
                            >
                              <div>
                                <p className="whitespace-pre-wrap text-sm text-stone-700 dark:text-slate-200">
                                  {item.body}
                                </p>
                                <p className="mt-2 text-xs text-stone-400 dark:text-slate-500">
                                  {item.name} · {item.email} · {String(item.createdAt).slice(0, 16)}
                                </p>
                              </div>
                              <button
                                disabled={busy === item.id}
                                onClick={() => {
                                  if (window.confirm("Xóa tin nhắn này?"))
                                    void action(item.id, () =>
                                      adminFetch(
                                        `/api/admin/chat?id=${encodeURIComponent(item.id)}`,
                                        { method: "DELETE" },
                                      ),
                                    );
                                }}
                                className={`${dangerBtnCls} h-8 px-3 text-xs shrink-0`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Xóa
                              </button>
                            </article>
                          ))}
                          {messages.length === 0 && (
                            <p className="p-5 text-sm text-stone-500 dark:text-slate-400">
                              Chưa có tin nhắn.
                            </p>
                          )}
                        </div>
                      </section>
                    )}

                    {/* PANEL: FEEDBACK */}
                    {panel === "feedback" && (
                      <section className="card-duo rounded-2xl overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-slate-800 p-4 sm:p-5">
                          <div>
                            <h2 className="font-bold text-stone-900 dark:text-white">
                              Góp ý và yêu cầu hỗ trợ ({filteredFeedback.length})
                            </h2>
                            <p className="mt-0.5 text-xs text-stone-500 dark:text-slate-400">
                              Cập nhật trạng thái xử lý để theo dõi phản hồi của người học.
                            </p>
                          </div>
                          <select
                            value={feedbackFilter}
                            onChange={(e) => setFeedbackFilter(e.target.value as any)}
                            className={selectCls}
                          >
                            <option value="all">Tất cả ({feedback.length})</option>
                            <option value="new">
                              Mới ({feedback.filter((f) => f.status === "new").length})
                            </option>
                            <option value="in_progress">
                              Đang xử lý ({feedback.filter((f) => f.status === "in_progress").length})
                            </option>
                            <option value="resolved">
                              Đã xử lý ({feedback.filter((f) => f.status === "resolved").length})
                            </option>
                          </select>
                        </div>
                        <div className="divide-y divide-stone-200 dark:divide-slate-800">
                          {filteredFeedback.map((item) => (
                            <article
                              key={item.id}
                              className="space-y-3 p-4 transition hover:bg-stone-50 dark:hover:bg-slate-900/40"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <strong className="text-stone-900 dark:text-white">
                                    {item.category}
                                  </strong>
                                  <span className="ml-2 text-xs text-stone-500 dark:text-slate-400">
                                    {item.name} · {item.email} ·{" "}
                                    {String(item.created_at).slice(0, 16)}
                                  </span>
                                </div>
                                <select
                                  disabled={busy === item.id}
                                  value={item.status}
                                  onChange={(event) =>
                                    void action(item.id, async () => {
                                      await adminFetch("/api/admin/feedback", {
                                        method: "PATCH",
                                        body: JSON.stringify({
                                          id: item.id,
                                          status: event.target.value,
                                        }),
                                      });
                                      notifySuccess("Đã cập nhật trạng thái góp ý.");
                                    })
                                  }
                                  className={selectCls}
                                >
                                  <option value="new">Mới</option>
                                  <option value="in_progress">Đang xử lý</option>
                                  <option value="resolved">Đã xử lý</option>
                                </select>
                              </div>
                              <p className="whitespace-pre-wrap text-sm text-stone-600 dark:text-slate-300">
                                {item.message}
                              </p>
                            </article>
                          ))}
                          {filteredFeedback.length === 0 && (
                            <p className="p-5 text-sm text-stone-500 dark:text-slate-400">
                              Chưa có góp ý nào trong mục này.
                            </p>
                          )}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
