"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Plus,
  KeyRound,
  Trophy,
  CheckCircle2,
  Copy,
  Sparkles,
  ArrowRight,
  Layers,
  Clock,
  UserPlus,
  Trash2,
  ChevronLeft,
  XCircle,
  Loader2,
  Lock,
  Search,
  X,
  Globe,
  EyeOff,
} from "lucide-react";
import { ApiClient, UserProfile } from "../lib/apiClient";
import { useApp } from "../contexts/AppProvider";
import { AnkiDeck, AnkiParser } from "../lib/ankiParser";
import { loadCourseVocabulary, TopikDeck } from "../lib/courseVocabulary";
import { loadAdminThthCurriculum } from "../lib/privateLearningContent";
import {
  detectDictionarySearchLanguage,
  DictionaryEntry,
  searchLearningDictionary,
} from "../lib/dictionarySearch";

export interface ClassMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "staff" | "student";
  status: "approved" | "pending";
  joinedAt: string;
  xp: number;
  streak: number;
  completedAssignments?: string[];
}

export interface StudentAssignmentProgress {
  studentId: string;
  studentName: string;
  reviewedCards: number;
  totalCards: number;
  correctCards: number;
  lastStudiedAt: string | null;
  completed: boolean;
}

export interface ClassAssignment {
  id: string;
  title: string;
  deckName: string;
  dueDate: string;
  assignedBy: string;
  completed?: boolean;
  totalCards?: number;
  reviewedCards?: number;
  correctCards?: number;
  lastStudiedAt?: string | null;
  progress?: StudentAssignmentProgress[];
}

export type ClassVisibility = "public" | "private" | "secret";

export const CLASS_VISIBILITY_OPTIONS: {
  value: ClassVisibility;
  label: string;
  description: string;
}[] = [
  { value: "public", label: "Công khai", description: "Hiện ở trang Tham gia lớp học, ai cũng vào học được ngay." },
  { value: "private", label: "Riêng tư", description: "Hiện ở trang Tham gia lớp học, cần chủ lớp duyệt yêu cầu." },
  { value: "secret", label: "Bí mật", description: "Ẩn khỏi trang Tham gia lớp học, chỉ vào được bằng mã lớp." },
];

const visibilityLabel = (visibility: ClassVisibility) =>
  CLASS_VISIBILITY_OPTIONS.find((option) => option.value === visibility)?.label || "Bí mật";

export interface Classroom {
  id: string;
  code: string;
  name: string;
  description: string;
  visibility: ClassVisibility;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  members: ClassMember[];
  assignments: ClassAssignment[];
}

export interface DiscoverClass {
  id: string;
  name: string;
  description: string;
  visibility: ClassVisibility;
  ownerName: string;
  memberCount: number;
  myStatus: "approved" | "pending" | null;
  createdAt: string;
}

const DEMO_DISCOVER_CLASSES: (DiscoverClass & { isDemo: true })[] = [
  {
    id: "demo-tieng-han-nhap-mon",
    name: "Tiếng Hàn Nhập Môn – Lớp Cô Mai",
    description: "Bảng chữ cái Hangul, phát âm chuẩn và 500 từ vựng nền tảng dành cho người mới bắt đầu.",
    visibility: "public",
    ownerName: "HaechiVN Academy",
    memberCount: 128,
    myStatus: null,
    createdAt: "",
    isDemo: true,
  },
  {
    id: "demo-topik-2",
    name: "TOPIK II – Luyện Đề Cấp Tốc",
    description: "Chinh phục TOPIK II cấp 4–5 với đề thi thật, chữa chi tiết và chiến lược làm bài từng phần.",
    visibility: "public",
    ownerName: "Thầy Minh",
    memberCount: 86,
    myStatus: null,
    createdAt: "",
    isDemo: true,
  },
  {
    id: "demo-giao-tiep-toi",
    name: "Giao Tiếp Hàn – Lớp Tối",
    description: "Luyện hội thoại theo chủ đề đời sống, sửa phát âm trực tiếp trong mỗi buổi học tối.",
    visibility: "private",
    ownerName: "Cô Hana",
    memberCount: 42,
    myStatus: null,
    createdAt: "",
    isDemo: true,
  },
  {
    id: "demo-shadowing",
    name: "Luyện Nghe – Shadowing 30 Ngày",
    description: "30 ngày luyện nghe và nhại giọng người bản xứ, kèm phụ đề và bài tập phản xạ mỗi ngày.",
    visibility: "public",
    ownerName: "HaechiVN",
    memberCount: 215,
    myStatus: null,
    createdAt: "",
    isDemo: true,
  },
];

const DEMO_MEMBERS: ClassMember[] = [
  { id: "u-teacher", name: "Cô Hana", email: "hana@haechivn.com", role: "owner", status: "approved", joinedAt: "2026-10-01", xp: 4820, streak: 12, completedAssignments: [] },
  { id: "u-student", name: "Minh Anh", email: "minh@haechivn.com", role: "student", status: "approved", joinedAt: "2026-10-05", xp: 1960, streak: 7, completedAssignments: ["a1"] },
  { id: "u-s2", name: "Jiwoo Park", email: "jiwoo@haechivn.com", role: "student", status: "approved", joinedAt: "2026-10-06", xp: 3400, streak: 15, completedAssignments: ["a1"] },
  { id: "u-s3", name: "Bảo Trân", email: "baotran@haechivn.com", role: "student", status: "approved", joinedAt: "2026-10-07", xp: 1220, streak: 3, completedAssignments: [] },
  { id: "u-p1", name: "Lan Chi", email: "lanchi@haechivn.com", role: "student", status: "pending", joinedAt: "2026-11-18", xp: 0, streak: 0, completedAssignments: [] },
];

export const DEMO_CLASSES: Classroom[] = [
  {
    id: "c1",
    code: "HAECHI-T1",
    name: "TOPIK I · Nền tảng",
    description: "Lớp luyện từ vựng và mẫu câu nền tảng cho học viên mới, mỗi tuần một bộ thẻ Anki.",
    visibility: "private",
    ownerId: "u-teacher",
    ownerName: "Cô Hana",
    createdAt: "01/10/2026",
    members: DEMO_MEMBERS,
    assignments: [
      {
        id: "a1",
        title: "Tuần 1 · 200 từ vựng cơ bản",
        deckName: "Tiếng Hàn Tổng Hợp 1 · Bài 1",
        dueDate: "2026-11-25",
        assignedBy: "Cô Hana",
        totalCards: 200,
        progress: [
          { studentId: "u-student", studentName: "Minh Anh", reviewedCards: 200, totalCards: 200, correctCards: 176, lastStudiedAt: "2026-11-18", completed: true },
          { studentId: "u-s2", studentName: "Jiwoo Park", reviewedCards: 184, totalCards: 200, correctCards: 170, lastStudiedAt: "2026-11-18", completed: true },
          { studentId: "u-s3", studentName: "Bảo Trân", reviewedCards: 96, totalCards: 200, correctCards: 81, lastStudiedAt: "2026-11-17", completed: false },
        ],
      },
      {
        id: "a2",
        title: "Tuần 2 · Ngữ pháp & mẫu câu",
        deckName: "TOPIK I · Bài 2",
        dueDate: "2026-12-02",
        assignedBy: "Cô Hana",
        totalCards: 140,
        progress: [
          { studentId: "u-student", studentName: "Minh Anh", reviewedCards: 42, totalCards: 140, correctCards: 33, lastStudiedAt: "2026-11-19", completed: false },
          { studentId: "u-s2", studentName: "Jiwoo Park", reviewedCards: 120, totalCards: 140, correctCards: 104, lastStudiedAt: "2026-11-18", completed: false },
          { studentId: "u-s3", studentName: "Bảo Trân", reviewedCards: 12, totalCards: 140, correctCards: 9, lastStudiedAt: "2026-11-16", completed: false },
        ],
      },
    ],
  },
  {
    id: "c2",
    code: "HANA-TOI",
    name: "Giao tiếp hằng ngày",
    description: "Bộ thẻ hội thoại thực tế cho người đi làm, học 15 phút mỗi ngày trong mục Từ vựng.",
    visibility: "public",
    ownerId: "u-teacher",
    ownerName: "Cô Hana",
    createdAt: "12/10/2026",
    members: DEMO_MEMBERS,
    assignments: [
      { id: "a3", title: "Chào hỏi & giới thiệu bản thân", deckName: "Giao tiếp · Bài 1", dueDate: "2026-11-28", assignedBy: "Cô Hana", totalCards: 150, completed: true, reviewedCards: 150, correctCards: 138, lastStudiedAt: "2026-11-18", progress: [] },
      { id: "a4", title: "Mua sắm & gọi món", deckName: "Giao tiếp · Bài 2", dueDate: "2026-12-05", assignedBy: "Cô Hana", totalCards: 120, completed: false, reviewedCards: 48, correctCards: 39, lastStudiedAt: "2026-11-19", progress: [] },
    ],
  },
];

interface ClassroomModuleProps {
  currentUser: UserProfile | null;
  /** Dùng dữ liệu mẫu thay vì gọi API — để xem trước giao diện khi chưa có backend. */
  demo?: boolean;
  /** Báo danh sách lớp hiện tại (để mục lớp mở biết người học đã vào lớp nào). */
  onClassesChange?: (classIds: string[]) => void;
  /** Mở sẵn lớp này khi hiện module (nút "Vào học" của lớp mở). */
  initialClassId?: string | null;
  /** Nút "Trở về" hiển thị cùng hàng với hai tab chính. */
  onBack?: () => void;
}

export const ClassroomModule: React.FC<ClassroomModuleProps> = ({ currentUser, demo = false, onClassesChange, initialClassId = null, onBack }) => {
  const { handleOpenAuth, userDecks } = useApp();
  const [courseDeckGroups, setCourseDeckGroups] = useState<TopikDeck[]>([]);
  const [adminThthDecks, setAdminThthDecks] = useState<any[]>([]);
  const isAdmin = currentUser?.role === "admin";

  const [classes, setClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(initialClassId);
  useEffect(() => { onClassesChange?.(classes.map((item) => item.id)); }, [classes, onClassesChange]);

  // Tab điều hướng giữa danh sách lớp và form tham gia bằng mã
  const [mainTab, setMainTab] = useState<"mine" | "join">("mine");
  // Danh sách lớp công khai / riêng tư để khám phá ở tab Tham gia
  const [discoverClasses, setDiscoverClasses] = useState<DiscoverClass[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [demoPreview, setDemoPreview] = useState<string | null>(null);
  // Join Class Form State
  const [joinCodeInput, setJoinCodeInput] = useState("");
  // Link mời /classes?join=MÃ điền sẵn ô mã lớp cho người được mời.
  useEffect(() => {
    const invited = new URLSearchParams(window.location.search).get("join");
    if (invited) {
      setJoinCodeInput(invited.trim().toUpperCase());
      setMainTab("join");
    }
  }, []);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create Class Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [newClassVisibility, setNewClassVisibility] = useState<ClassVisibility>("private");

  // Assign Deck Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignMode, setAssignMode] = useState<"existing" | "dictionary">("existing");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDeckId, setAssignDeckId] = useState("");
  const [assignBookFilter, setAssignBookFilter] = useState("1");
  const [assignTopicFilter, setAssignTopicFilter] = useState("all");
  const [uploadedAssignmentDecks, setUploadedAssignmentDecks] = useState<AnkiDeck[]>([]);
  const [parsingAssignmentApkg, setParsingAssignmentApkg] = useState(false);
  const [assignDueDate, setAssignDueDate] = useState("");
  const [dictQuery, setDictQuery] = useState("");
  const [dictResults, setDictResults] = useState<DictionaryEntry[]>([]);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictSelectedWords, setDictSelectedWords] = useState<
    Array<{ korean: string; meaning: string; example: string; pos?: string }>
  >([]);

  useEffect(() => {
    if (!showAssignModal || assignMode !== "dictionary") return;
    const q = dictQuery.trim();
    if (!q) {
      setDictResults([]);
      setDictLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setDictLoading(true);
      void searchLearningDictionary(
        q,
        24,
        controller.signal,
        detectDictionarySearchLanguage(q),
      )
        .then((res) => {
          if (!controller.signal.aborted) setDictResults(res);
        })
        .catch(() => {
          if (!controller.signal.aborted) setDictResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setDictLoading(false);
        });
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [showAssignModal, assignMode, dictQuery]);

  // Detail View Active Tab
  const [activeTab, setActiveTab] = useState<"assignments" | "leaderboard" | "members" | "settings">("assignments");

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadCourseVocabulary().then((data) => {
      if (active) setCourseDeckGroups(data?.decks || []);
    });
    if (isAdmin) {
      void loadAdminThthCurriculum().then((decks) => {
        if (active) setAdminThthDecks(decks || []);
      });
    } else {
      setAdminThthDecks([]);
    }
    return () => { active = false; };
  }, [isAdmin]);

  const adminThthLessonDecks = React.useMemo(() => {
    if (!isAdmin || !adminThthDecks.length) return [];
    type RichAssignmentCard = {
      id: number;
      korean: string;
      meaning: string;
      example: string;
      mediaRefs: string[];
      [key: string]: unknown;
    };
    const byLesson = new Map<string, { id: string; name: string; book: number; topic: string; difficulty: string; cards: RichAssignmentCard[] }>();
    for (const d of adminThthDecks) {
      const parts = String(d.name || "").split("::");
      const bookNum = Number(d.book || 1);
      const lessonName = (parts[2] || d.topic || "Bài học").trim();
      const key = `thth-lesson:${bookNum}:${lessonName}`;
      if (!byLesson.has(key)) {
        byLesson.set(key, {
          id: key,
          name: `Tiếng Hàn Tổng Hợp ${bookNum} · ${lessonName} (Trọn bài)`,
          book: 100 + bookNum,
          topic: lessonName,
          difficulty: d.difficulty || `Quyển ${bookNum}`,
          cards: [],
        });
      }
      const entry = byLesson.get(key)!;
      for (const c of d.cards || []) {
        entry.cards.push({
          id: Number(c.id) || entry.cards.length + 1,
          korean: String(c.word || "").replace(/<[^>]*>/g, "").trim(),
          meaning: String(c.meaning || "").replace(/<[^>]*>/g, "").trim(),
          word: c.word,
          pos: c.pos || "",
          transliteration: c.transliteration || "",
          explain: c.explain || "",
          image: c.image || "",
          example: String(c.example || ""),
          example_translated: c.example_translated || "",
          collocation: c.collocation || "",
          synonym: c.synonym || "",
          antonym: c.antonym || "",
          audio_word: c.audio_word || "",
          audio_meaning: c.audio_meaning || "",
          audio_example: c.audio_example || "",
          mediaRefs: [] as string[],
        });
      }
    }
    const subdecks = adminThthDecks.map((d: any) => {
      const parts = String(d.name || "").split("::");
      const bookNum = Number(d.book || 1);
      const lessonName = (parts[2] || "Bài học").trim();
      const subName = (parts[3] || d.topic || d.name).trim();
      const rawCards: any[] = Array.isArray(d.cards) ? d.cards : [];
      return {
        id: `thth-sub:${d.id}`,
        name: `Tiếng Hàn Tổng Hợp ${bookNum} · ${lessonName} · ${subName}`,
        book: 100 + bookNum,
        topic: lessonName,
        difficulty: String(d.difficulty || `Quyển ${bookNum}`),
        mediaAssets: [] as Array<{ filename: string; contentType: string; blob: Blob }>,
        cards: rawCards.map((c: any, idx: number): RichAssignmentCard => ({
          id: Number(c.id) || idx + 1,
          korean: String(c.word || "").replace(/<[^>]*>/g, "").trim(),
          meaning: String(c.meaning || "").replace(/<[^>]*>/g, "").trim(),
          word: c.word,
          pos: c.pos || "",
          transliteration: c.transliteration || "",
          explain: c.explain || "",
          image: c.image || "",
          example: String(c.example || ""),
          example_translated: c.example_translated || "",
          collocation: c.collocation || "",
          synonym: c.synonym || "",
          antonym: c.antonym || "",
          audio_word: c.audio_word || "",
          audio_meaning: c.audio_meaning || "",
          audio_example: c.audio_example || "",
          mediaRefs: [] as string[],
        })),
      };
    });
    return [...Array.from(byLesson.values()).map((x) => ({ ...x, mediaAssets: [] as Array<{ filename: string; contentType: string; blob: Blob }> })), ...subdecks];
  }, [isAdmin, adminThthDecks]);

  const assignmentDecks = [
    ...adminThthLessonDecks,
    ...courseDeckGroups.flatMap((group) => group.courses.flatMap((course) => course.units.map((unit) => ({
      id: `course:${course.id}:${unit.number}`,
      name: `${course.title} · ${unit.title}`,
      book: Number(course.topik.match(/\d+/)?.[0] || 1),
      topic: course.title,
      difficulty: course.topik,
      mediaAssets: [],
      cards: unit.words.filter(([, korean, meaning]) => korean && meaning).map(([id, korean, meaning, , hanja, pronunciation]) => ({
        id, korean, meaning,
        example: [hanja, pronunciation].filter(Boolean).join(" · "),
        mediaRefs: [] as string[],
      })),
    })))),
    ...userDecks.map((deck) => ({ id: `anki:${deck.id}`, name: `Anki · ${deck.name}`, book: 0, topic: "Bộ Anki đã nhập", difficulty: "Anki cá nhân", mediaAssets: deck.mediaAssets || [], cards: deck.cards.map((card) => ({
      id: Number(card.id), korean: (card.koreanText || card.frontText || "").replace(/<[^>]*>/g, "").trim(),
      meaning: (card.vietnameseMeaning || card.backText || "").replace(/<[^>]*>/g, "").trim(),
      example: (card.exampleSentence || "").replace(/<[^>]*>/g, "").trim(),
      mediaRefs: card.mediaRefs || [],
    })) })),
    ...uploadedAssignmentDecks.map((deck) => ({ id: `upload:${deck.id}`, name: `Anki · ${deck.name}`, book: 0, topic: "Bộ Anki đã tải lên", difficulty: "Anki cá nhân", mediaAssets: deck.mediaAssets || [], cards: deck.cards.map((card) => ({
      id: Number(card.id), korean: (card.koreanText || card.frontText || "").replace(/<[^>]*>/g, "").trim(),
      meaning: (card.vietnameseMeaning || card.backText || "").replace(/<[^>]*>/g, "").trim(),
      example: (card.exampleSentence || "").replace(/<[^>]*>/g, "").trim(),
      mediaRefs: card.mediaRefs || [],
    })) })),
  ].filter((deck) => deck.cards.length > 0);
  const builtinAssignmentDecks = assignmentDecks.filter((deck) => deck.book > 0);
  const assignmentTopics = Array.from(new Set(builtinAssignmentDecks.filter((deck) => deck.book === Number(assignBookFilter)).map((deck) => deck.topic))).sort((a, b) => a.localeCompare(b, "vi"));
  const visibleAssignmentDecks = assignmentDecks.filter((deck) => deck.book === 0 || (deck.book === Number(assignBookFilter) && (assignTopicFilter === "all" || deck.topic === assignTopicFilter)));
  const selectedAssignmentDeck = assignmentDecks.find((deck) => deck.id === assignDeckId) || assignmentDecks[0];

  // Classes are shared server-side so teachers and learners see the same state.
  useEffect(() => {
    let active = true;
    if (demo) {
      setClasses(DEMO_CLASSES);
      setDiscoverClasses([]);
      setLoading(false);
      setDiscoverLoading(false);
      return () => { active = false; };
    }
    if (!currentUser) {
      setClasses([]);
      setDiscoverClasses([]);
      setLoading(false);
      setDiscoverLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setDiscoverLoading(true);
    ApiClient.getClasses().then((result) => {
      if (active) setClasses(result);
    }).catch((error) => {
      if (active) setMsg({ type: "error", text: error.message || "Không tải được lớp học." });
    }).finally(() => {
      if (active) setLoading(false);
    });
    ApiClient.getDiscoverClasses().then((result) => {
      if (active) setDiscoverClasses(result as DiscoverClass[]);
    }).catch(() => {
      if (active) setDiscoverClasses([]);
    }).finally(() => {
      if (active) setDiscoverLoading(false);
    });
    return () => { active = false; };
  }, [currentUser?.id, demo]);

  const runClassAction = async (payload: Record<string, unknown>) => {
    try {
      setClasses(await ApiClient.classAction(payload));
      return true;
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Không thể lưu thay đổi." });
      return false;
    }
  };

  // 1. Submit Join Request by Code
  const handleJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!currentUser) {
      handleOpenAuth(false);
      return;
    }

    const trimmedCode = joinCodeInput.trim().toUpperCase();
    if (!trimmedCode) {
      setMsg({ type: "error", text: "Vui lòng nhập mã lớp học!" });
      return;
    }

    try {
      const result = await ApiClient.joinClass({ code: trimmedCode });
      setClasses(result.classes);
      setJoinCodeInput("");
      setMsg({
        type: "success",
        text: result.status === "approved"
          ? "Bạn đã tham gia lớp học công khai này."
          : "Đã gửi yêu cầu tham gia lớp. Chủ lớp sẽ duyệt yêu cầu của bạn.",
      });
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Không thể tham gia lớp học." });
    }
  };

  // 1b. Join a discovered public/private class without typing its code
  const handleJoinDiscoveredClass = async (cls: DiscoverClass) => {
    setMsg(null);
    try {
      const result = await ApiClient.joinClass({ classId: cls.id });
      setClasses(result.classes);
      setDiscoverClasses((prev) => prev.map((item) => item.id === cls.id
        ? { ...item, myStatus: result.status, memberCount: result.status === "approved" ? item.memberCount + 1 : item.memberCount }
        : item));
      setMsg({
        type: "success",
        text: result.status === "approved"
          ? `Bạn đã tham gia lớp “${cls.name}”.`
          : `Đã gửi yêu cầu tham gia lớp “${cls.name}”. Chủ lớp sẽ duyệt yêu cầu của bạn.`,
      });
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Không thể tham gia lớp học." });
    }
  };

  // 1c. Change who can see this class (owner only)
  const handleVisibilityChange = async (visibility: ClassVisibility) => {
    if (!selectedClassId) return;
    try {
      setClasses(await ApiClient.classAction({ action: "set_visibility", classId: selectedClassId, visibility }));
      ApiClient.getDiscoverClasses().then((result) => setDiscoverClasses(result as DiscoverClass[])).catch(() => {});
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Không thể đổi chế độ hiển thị lớp." });
    }
  };

  // 2. Create Private Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!currentUser) {
      handleOpenAuth(false);
      return;
    }

    if (!newClassName.trim()) return;

    setCreating(true);
    const created = await runClassAction({ action: "create", name: newClassName, description: newClassDesc, visibility: newClassVisibility });
    setCreating(false);
    if (!created) return;
    setShowCreateModal(false);
    setNewClassName("");
    setNewClassDesc("");
    setNewClassVisibility("private");
    ApiClient.getDiscoverClasses().then((result) => setDiscoverClasses(result as DiscoverClass[])).catch(() => {});
    setMsg({
      type: "success",
      text: "Tạo lớp học thành công. Mã mời nằm trong trang lớp để bạn sao chép và gửi cho học viên.",
    });
  };

  // 3. Approve Member
  const handleApproveMember = (classId: string, memberId: string) => {
    void runClassAction({ action: "approve", classId, memberId });
  };

  // 4. Reject / Kick Member
  const handleRemoveMember = (classId: string, memberId: string) => {
    void runClassAction({ action: "remove", classId, memberId });
  };

  // 5. Change Role (Student <-> Admin)
  const handleChangeRole = (classId: string, memberId: string, newRole: "admin" | "staff" | "student") => {
    void runClassAction({ action: "role", classId, memberId, role: newRole });
  };

  // 6. Assign New Deck / Assignment
  const handleAssignDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !assignTitle.trim()) return;

    const dueDate = assignDueDate || (() => {
      const due = new Date();
      due.setDate(due.getDate() + 7);
      return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
    })();
    const assignmentId = `asg_${crypto.randomUUID().replace(/-/g, "")}`;

    if (assignMode === "dictionary") {
      const validWords = dictSelectedWords.filter((w) => w.korean.trim() && w.meaning.trim()).slice(0, 500);
      if (!validWords.length) {
        setMsg({ type: "error", text: "Hãy chọn ít nhất 1 từ vựng từ Từ điển trước khi giao bài." });
        return;
      }
      const deckCards = validWords.map((w, idx) => ({
        id: idx + 1,
        korean: w.korean.trim(),
        meaning: w.meaning.trim(),
        example: w.example.trim(),
        pos: w.pos || "",
        mediaAssetIds: [],
      }));
      const saved = await runClassAction({
        action: "assignment",
        classId: selectedClassId,
        assignmentId,
        title: assignTitle.trim(),
        deckName: `Từ điển · ${assignTitle.trim()}`,
        dueDate,
        deckCards,
        mediaAssets: [],
      });
      if (!saved) return;
      setShowAssignModal(false);
      setAssignTitle("");
      setDictSelectedWords([]);
      setDictQuery("");
      return;
    }

    if (!selectedAssignmentDeck?.cards.length) {
      setMsg({ type: "error", text: "Bộ thẻ này không có thẻ hợp lệ để giao." });
      return;
    }
    const cards = selectedAssignmentDeck.cards.filter((card) => card.korean && card.meaning).slice(0, 500);
    const referencedFilenames = new Set(cards.flatMap((card) => card.mediaRefs || []));
    const sourceAssets = [...new Map((selectedAssignmentDeck.mediaAssets || [])
      .filter((asset) => referencedFilenames.has(asset.filename))
      .map((asset) => [asset.filename, asset])).values()];
    if (referencedFilenames.size && sourceAssets.length !== referencedFilenames.size) {
      setMsg({ type: "error", text: "Bộ thẻ có media cục bộ đã hết phiên. Hãy tải lại file .apkg tại đây để chia sẻ đủ ảnh và âm thanh." });
      return;
    }
    const assetIds = new Map(sourceAssets.map((asset) => [asset.filename, crypto.randomUUID().replace(/-/g, "")]));
    const mediaAssets = sourceAssets.map((asset) => ({
      id: assetIds.get(asset.filename)!, filename: asset.filename, contentType: asset.contentType, size: asset.blob.size,
    }));
    if (mediaAssets.reduce((sum, asset) => sum + asset.size, 0) > 60_000_000) {
      setMsg({ type: "error", text: "Tổng dung lượng ảnh và âm thanh tối đa 60 MB cho mỗi bài tập." });
      return;
    }
    const deckCards = cards.map((card) => ({
      ...card,
      mediaAssetIds: (card.mediaRefs || []).map((filename) => assetIds.get(filename)).filter((id): id is string => !!id),
    }));
    const saved = await runClassAction({ action: "assignment", classId: selectedClassId, assignmentId, title: assignTitle, deckName: selectedAssignmentDeck.name, dueDate, deckCards, mediaAssets });
    if (!saved) return;
    try {
      for (let index = 0; index < sourceAssets.length; index += 8) {
        await Promise.all(sourceAssets.slice(index, index + 8).map((asset) => ApiClient.uploadClassAssignmentMedia(selectedClassId, assignmentId, assetIds.get(asset.filename)!, asset.blob, asset.contentType)));
      }
    } catch (error) {
      const wasRemoved = await ApiClient.classAction({ action: "delete_assignment", classId: selectedClassId, assignmentId }).then(() => true).catch(() => false);
      setClasses(await ApiClient.getClasses().catch(() => classes));
      setMsg({ type: "error", text: error instanceof Error ? `${error.message} ${wasRemoved ? "Bài giao lỗi đã được gỡ bỏ." : "Không xác nhận được việc gỡ bài; hãy kiểm tra lại danh sách bài tập."}` : "Không tải được media lên Cloudflare." });
      return;
    }
    if (sourceAssets.length) setClasses(await ApiClient.getClasses().catch(() => classes));
    setShowAssignModal(false);
    setAssignTitle("");
  };

  const handleAssignmentApkgUpload = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".apkg")) {
      setMsg({ type: "error", text: "Vui lòng chọn file .apkg." });
      return;
    }
    setParsingAssignmentApkg(true);
    setMsg(null);
    try {
      const decks = await AnkiParser.parseApkg(file);
      const uniqueDecks = decks.map((deck) => ({ ...deck, id: `${Date.now()}_${deck.id}` }));
      setUploadedAssignmentDecks((prev) => [...prev, ...uniqueDecks]);
      if (uniqueDecks[0]) setAssignDeckId(`upload:${uniqueDecks[0].id}`);
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Không đọc được file Anki." });
    } finally {
      setParsingAssignmentApkg(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const myClasses = currentUser
    ? classes.filter((c) =>
        c.members.some(
          (m) =>
            (m.id === currentUser.id || m.email === currentUser.email) &&
            m.status === "approved"
        )
      )
    : [];

  const pendingClasses = currentUser
    ? classes.filter((c) =>
        c.members.some(
          (m) =>
            (m.id === currentUser.id || m.email === currentUser.email) &&
            m.status === "pending"
        )
      )
    : [];

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const myMemberRecord = selectedClass?.members.find(
    (m) => m.id === currentUser?.id || m.email === currentUser?.email
  );
  const canManageClass = myMemberRecord?.role === "owner" || myMemberRecord?.role === "admin" || myMemberRecord?.role === "staff";
  const isClassOwner = myMemberRecord?.role === "owner";

  // =========================================================================
  // VIEW MODE: CLASSROOM DETAIL SCREEN
  // =========================================================================
  if (selectedClass) {
    const pendingMembers = selectedClass.members.filter((m) => m.status === "pending");
    const approvedMembers = selectedClass.members
      .filter((m) => m.status === "approved")
      .sort((a, b) => b.xp - a.xp);

    const myCompletedCount = myMemberRecord?.completedAssignments?.length || 0;
    const totalAssignments = selectedClass.assignments.length;
    const myProgressPercent = totalAssignments > 0 ? Math.round((myCompletedCount / totalAssignments) * 100) : 0;

    const studentMembers = approvedMembers.filter((m) => m.role === "student");
    const totalSlots = selectedClass.assignments.length * Math.max(studentMembers.length, 1);
    const completedSlots = selectedClass.assignments.reduce(
      (sum, asg) => sum + (asg.progress || []).filter((p) => p.completed).length,
      0
    );
    const classPercent = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;
    const nextAssignment =
      selectedClass.assignments.find((asg) => !asg.completed) || selectedClass.assignments[0];
    const studyHref = nextAssignment
      ? `/flashcards?assignment=${encodeURIComponent(nextAssignment.id)}&classId=${encodeURIComponent(selectedClass.id)}`
      : "/flashcards";
    const roleLabel =
      myMemberRecord?.role === "owner"
        ? "Giáo viên chủ lớp"
        : myMemberRecord?.role === "admin"
          ? "Quản trị viên"
          : myMemberRecord?.role === "staff"
            ? "Giáo vụ"
            : "Học viên";
    const shortDate = (value?: string | null) =>
      value
        ? new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "—";
    const percentOf = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0);

    const initialsOf = (name?: string | null) =>
      (name || "?")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(-2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase();
    const viewerInitials = initialsOf(currentUser?.name);
    const heroAvatars = approvedMembers.slice(0, 4);
    const rankedStudents = [...studentMembers].sort((a, b) => {
      const aDone = a.completedAssignments?.length ?? 0;
      const bDone = b.completedAssignments?.length ?? 0;
      if (bDone !== aDone) return bDone - aDone;
      return (b.xp ?? 0) - (a.xp ?? 0);
    });
    const myRankIndex = rankedStudents.findIndex((m) => m.id === currentUser?.id);
    const openAssignments = selectedClass.assignments.filter((asg) => !asg.completed).length;
    const totalCardCount = selectedClass.assignments.reduce((sum, asg) => sum + (asg.totalCards || 0), 0);
    const nextAgg = nextAssignment
      ? (() => {
          const rows = nextAssignment.progress || [];
          const reviewed = rows.reduce((sum, point) => sum + (point.reviewedCards || 0), 0);
          const total = rows.reduce((sum, point) => sum + (point.totalCards || 0), 0) || nextAssignment.totalCards || 0;
          return { reviewed, total, pct: percentOf(reviewed, total) };
        })()
      : { reviewed: 0, total: 0, pct: 0 };
    const joinLink = `${typeof window !== "undefined" ? window.location.origin : ""}/classes?join=${encodeURIComponent(selectedClass.code)}`;

    return (
      <div className="classroom-module cm-page rd cd">
        <div className="rd-nav-shell">
          <nav className="rd-nav" aria-label="Điều hướng lớp học">
            <button
              type="button"
              onClick={() => setSelectedClassId(null)}
              className="rd-nav-back cd-nav-back"
              aria-label="Về danh sách lớp"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="cd-nav-back-label">Lớp học</span>
            </button>
            <span className="rd-nav-divider" aria-hidden="true" />
            <Link className="rd-nav-brand" href="/" aria-label="HaechiVN">
              <Image src="/brand/haechivn-mark.webp" alt="" width={26} height={26} />
              <span>HaechiVN</span>
            </Link>
            <span className="rd-nav-scope">{canManageClass ? "Quản lý lớp" : selectedClass.name}</span>
            <div className="rd-nav-user">
              <span className="rd-avatar">{viewerInitials}</span>
              <span className="rd-user-copy">
                <span className="rd-user-name">{currentUser?.name}</span>
                <span className="rd-user-role">{roleLabel}</span>
              </span>
            </div>
          </nav>
        </div>

        {msg?.type === "error" && (
          <p className="rd-msg rd-msg--error">
            <XCircle className="h-4 w-4" />
            {msg.text}
          </p>
        )}
        {msg?.type === "success" && (
          <p className="rd-msg rd-msg--ok">
            <CheckCircle2 className="h-4 w-4" />
            {msg.text}
          </p>
        )}

        <section className="cd-hero" aria-labelledby="cd-class-title">
          <div className="cd-copy">
            <div className="cd-kicker">
              {canManageClass && <span className="rd-tag rd-tag--strong">Bạn phụ trách</span>}
              {isClassOwner ? (
                <select
                  value={selectedClass.visibility}
                  onChange={(e) => handleVisibilityChange(e.target.value as ClassVisibility)}
                  title="Quyền truy cập của lớp"
                  className="cd-select"
                >
                  {CLASS_VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="rd-tag">{visibilityLabel(selectedClass.visibility)}</span>
              )}
              {!canManageClass && (
                <span className="rd-tag">
                  {totalAssignments > 0 && myCompletedCount >= totalAssignments ? "Hoàn thành" : "Đang học"}
                </span>
              )}
              <button
                type="button"
                onClick={() => copyToClipboard(selectedClass.code)}
                className="rd-code cd-code"
                title="Sao chép mã lớp"
                aria-label={`Sao chép mã lớp ${selectedClass.code}`}
              >
                <span>{selectedClass.code}</span>
                {copiedCode === selectedClass.code ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <h1 className="cd-title" id="cd-class-title">
              {selectedClass.name}
            </h1>
            {selectedClass.description && <p className="cd-lead">{selectedClass.description}</p>}

            <div className="cd-meta">
              {heroAvatars.length > 0 && (
                <span className="cd-avatar-stack" aria-hidden="true">
                  {heroAvatars.map((member) => (
                    <span key={member.id} className="rd-avatar cd-avatar-sm">
                      {initialsOf(member.name)}
                    </span>
                  ))}
                </span>
              )}
              <span>{selectedClass.ownerName}</span>
              <span className="cd-dot" aria-hidden="true" />
              <span>{approvedMembers.length} thành viên</span>
              <span className="cd-dot" aria-hidden="true" />
              <span>{selectedClass.assignments.length} bài tập</span>
              <span className="cd-dot cd-dot--more" aria-hidden="true" />
              <span className="cd-dot--more">Tạo {shortDate(selectedClass.createdAt)}</span>
            </div>

            <div className="cd-actions">
              {canManageClass ? (
                <>
                  <button
                    type="button"
                    className="rd-btn rd-btn-primary cd-btn-primary"
                    onClick={() => setShowAssignModal(true)}
                  >
                    <span>Giao bài tập</span>
                    <span className="rd-orb" aria-hidden="true">
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                  <button type="button" className="rd-btn cd-btn-secondary" onClick={() => setActiveTab("members")}>
                    Mời thành viên
                  </button>
                </>
              ) : (
                <>
                  <a className="rd-btn rd-btn-primary cd-btn-primary" href={studyHref}>
                    <span>{nextAssignment?.completed ? "Ôn lại bài học" : "Vào học"}</span>
                    <span className="rd-orb" aria-hidden="true">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </a>
                  <button type="button" className="rd-btn cd-btn-secondary" onClick={() => setActiveTab("assignments")}>
                    Xem bài tập
                  </button>
                </>
              )}
            </div>
          </div>

          <aside className="cd-summary" aria-label="Tóm tắt lớp học">
            <div className="cd-card-top">
              <span className="cd-card-label">{canManageClass ? "Tổng quan lớp" : "Tiến độ của bạn"}</span>
              <span className="rd-tag">
                {canManageClass
                  ? `${selectedClass.assignments.length} bài`
                  : totalAssignments > 0 && myCompletedCount >= totalAssignments
                    ? "Hoàn thành"
                    : "Đang học"}
              </span>
            </div>

            {canManageClass ? (
              <>
                <div className="cd-stats">
                  <div className="cd-stat">
                    <strong>{studentMembers.length}</strong>
                    <span>học viên</span>
                  </div>
                  <div className="cd-stat">
                    <strong>{selectedClass.assignments.length}</strong>
                    <span>bài tập</span>
                  </div>
                  <div className="cd-stat">
                    <strong>{classPercent}%</strong>
                    <span>hoàn thành</span>
                  </div>
                </div>
                <div className="cd-open">
                  <p className="rd-side-label">Bài tập đang mở</p>
                  <p className="rd-side-title">{nextAssignment ? nextAssignment.title : "Chưa giao bài tập"}</p>
                  {nextAssignment ? (
                    <>
                      <div className="rd-progress" aria-hidden="true">
                        <span style={{ width: `${nextAgg.pct}%` }} />
                      </div>
                      <div className="rd-progress-meta">
                        <span>
                          <strong>{nextAgg.reviewed}</strong>/{nextAgg.total} thẻ
                        </span>
                        <span>{nextAssignment.dueDate ? `Hạn ${shortDate(nextAssignment.dueDate)}` : `${nextAgg.pct}%`}</span>
                      </div>
                    </>
                  ) : (
                    <p className="rd-side-empty">Giao bộ thẻ đầu tiên để học viên bắt đầu.</p>
                  )}
                </div>
                <p className="cd-note">
                  {pendingMembers.length > 0 ? (
                    <button type="button" className="cd-note-link" onClick={() => setActiveTab("members")}>
                      {pendingMembers.length} yêu cầu tham gia đang chờ duyệt.
                    </button>
                  ) : (
                    <>
                      Tất cả thành viên đã được duyệt · {openAssignments} bài đang mở.
                    </>
                  )}
                </p>
              </>
            ) : (
              <>
                <div className="cd-big">
                  <strong>{myCompletedCount}</strong>
                  <span>/ {totalAssignments} bài tập</span>
                </div>
                <p className="cd-sub">{nextAssignment ? nextAssignment.title : "Chưa có bài tập"}</p>
                <div className="rd-progress" aria-hidden="true">
                  <span style={{ width: `${myProgressPercent}%` }} />
                </div>
                <div className="rd-progress-meta">
                  <span>
                    <strong>{myCompletedCount}</strong> bài đã xong
                  </span>
                  <span>{myProgressPercent}%</span>
                </div>
                <p className="cd-note">
                  {totalAssignments > 0 && myCompletedCount >= totalAssignments
                    ? "Bạn đã hoàn thành toàn bộ bài tập của lớp. Ôn lại bất cứ lúc nào để giữ phản xạ."
                    : "Học đều mỗi ngày để giữ phản xạ. Tiến độ được ghi nhận tự động."}
                </p>
              </>
            )}
          </aside>
        </section>

        <div className="rd-tabs-wrap cd-tabs-wrap">
          <div className="rd-segmented" role="tablist" aria-label="Nội dung lớp học">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "assignments"}
              onClick={() => setActiveTab("assignments")}
              className="rd-tab"
            >
              Bài tập<span className="cd-tab-count">{selectedClass.assignments.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "leaderboard"}
              onClick={() => setActiveTab("leaderboard")}
              className="rd-tab"
            >
              Xếp hạng<span className="cd-tab-count">{rankedStudents.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "members"}
              onClick={() => setActiveTab("members")}
              className="rd-tab"
            >
              Thành viên<span className="cd-tab-count">{approvedMembers.length}</span>
            </button>
            {canManageClass && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
                className="rd-tab"
              >
                Cài đặt
              </button>
            )}
          </div>
        </div>

        <div className="cd-room">
          <div className="cd-main">
            {activeTab === "assignments" && (
              <section className="cd-panel" aria-label="Bài tập của lớp">
                <div className="cd-core">
                  <div className="cd-panel-head">
                    <h2>Bài tập của lớp</h2>
                    <p className="cd-section-note">
                      {selectedClass.assignments.length} bài · {totalCardCount} thẻ
                    </p>
                  </div>

                  {selectedClass.assignments.length === 0 ? (
                    <div className="cd-empty">
                      <span className="cd-empty-icon">
                        <Layers className="h-6 w-6" />
                      </span>
                      <h3>Chưa có bài tập nào được giao</h3>
                      <p>
                        {canManageClass
                          ? "Giao một bộ thẻ Anki hoặc bài học có sẵn để học viên bắt đầu ôn luyện trong mục Từ vựng."
                          : "Khi giáo viên giao bộ thẻ, bạn sẽ học và theo dõi tiến độ ngay trong mục Từ vựng."}
                      </p>
                      {canManageClass && (
                        <button
                          type="button"
                          className="rd-btn rd-btn-primary"
                          onClick={() => setShowAssignModal(true)}
                        >
                          <Plus className="h-4 w-4" />
                          Giao bộ thẻ đầu tiên
                        </button>
                      )}
                    </div>
                  ) : (
                    selectedClass.assignments.map((asg) => {
                      const myPct = percentOf(asg.reviewedCards || 0, asg.totalCards || 0);
                      const rows = (asg.progress || [])
                        .map((point) => ({ ...point, percent: percentOf(point.reviewedCards, point.totalCards) }))
                        .sort((a, b) => b.percent - a.percent);
                      const doneCount = rows.filter((point) => point.completed).length;
                      const avg = rows.length
                        ? Math.round(rows.reduce((sum, point) => sum + point.percent, 0) / rows.length)
                        : 0;
                      const isDone = canManageClass
                        ? rows.length > 0 && rows.every((point) => point.completed)
                        : asg.completed;

                      return (
                        <article key={asg.id} className={`cd-assignment ${isDone ? "is-done" : ""}`}>
                          <div className="cd-assignment-top">
                            <span className={`rd-tag ${isDone ? "cd-tag--done" : "cd-tag--open"}`}>
                              {isDone ? "Hoàn thành" : "Đang mở"}
                            </span>
                            <span className="rd-tag">{asg.totalCards ?? 0} thẻ</span>
                            <span className="rd-tag">
                              {asg.dueDate ? `Hạn ${shortDate(asg.dueDate)}` : "Không hạn"}
                            </span>
                          </div>

                          <h3 className="cd-assignment-title">{asg.title}</h3>
                          <p className="cd-assignment-desc">{asg.deckName}</p>

                          {canManageClass ? (
                            <>
                              <div className="rd-progress" aria-hidden="true">
                                <span style={{ width: `${avg}%` }} />
                              </div>
                              <div className="rd-progress-meta">
                                <span>
                                  <strong>{doneCount}</strong>/{rows.length} học viên hoàn thành
                                </span>
                                <span>{avg}%</span>
                              </div>

                              {rows.length > 0 && (
                                <div className="cd-students">
                                  {rows.slice(0, 5).map((point) => (
                                    <div key={point.studentId} className="cd-studentrow">
                                      <span className="rd-avatar cd-avatar-xs">{initialsOf(point.studentName)}</span>
                                      <div className="cd-student-main">
                                        <div className="cd-student-name">
                                          <span>{point.studentName}</span>
                                          <small>
                                            {point.reviewedCards}/{point.totalCards} thẻ
                                          </small>
                                        </div>
                                        <div className="rd-progress cd-progress-thin" aria-hidden="true">
                                          <span style={{ width: `${point.percent}%` }} />
                                        </div>
                                      </div>
                                      <span className={`cd-pct ${point.completed ? "is-done" : ""}`}>
                                        {point.percent}%
                                      </span>
                                    </div>
                                  ))}
                                  {rows.length > 5 && (
                                    <p className="cd-muted">+{rows.length - 5} học viên khác trong tab Thành viên.</p>
                                  )}
                                </div>
                              )}
                              {rows.length === 0 && (
                                <p className="cd-muted">
                                  Chưa có dữ liệu tiến độ. Học viên cần mở bộ thẻ trong mục Từ vựng.
                                </p>
                              )}

                              <div className="cd-assignment-foot">
                                <span className="cd-soft">
                                  {asg.assignedBy ? `Giao bởi ${asg.assignedBy}` : `${asg.totalCards ?? 0} thẻ`}
                                </span>
                                <div className="cd-inline-actions">
                                  <button
                                    type="button"
                                    className="rd-btn cd-btn-secondary cd-btn-sm"
                                    onClick={() => setActiveTab("members")}
                                  >
                                    Xem tiến độ
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="rd-progress" aria-hidden="true">
                                <span style={{ width: `${myPct}%` }} />
                              </div>
                              <div className="rd-progress-meta">
                                <span>
                                  <strong>{asg.reviewedCards || 0}</strong>/{asg.totalCards || 0} thẻ
                                </span>
                                <span>{myPct}%</span>
                              </div>
                              <div className="cd-assignment-foot">
                                <span className={`cd-done ${isDone ? "" : "is-muted"}`}>
                                  {isDone ? (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Đã hoàn thành
                                    </>
                                  ) : (
                                    <>Đúng {asg.correctCards || 0} thẻ</>
                                  )}
                                </span>
                                <a
                                  className="rd-btn cd-btn-secondary cd-btn-sm"
                                  href={`/flashcards?assignment=${encodeURIComponent(asg.id)}&classId=${encodeURIComponent(
                                    selectedClass.id
                                  )}`}
                                >
                                  {isDone ? "Ôn lại" : "Vào học"}
                                </a>
                              </div>
                            </>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            )}

            {activeTab === "leaderboard" && (
              <section className="cd-panel" aria-label="Bảng xếp hạng">
                <div className="cd-core">
                  <div className="cd-panel-head">
                    <h2>Bảng xếp hạng</h2>
                    <p className="cd-section-note">{rankedStudents.length} học viên</p>
                  </div>

                  {rankedStudents.length === 0 ? (
                    <p className="cd-empty-line">Chưa có học viên nào trong bảng xếp hạng.</p>
                  ) : (
                    <>
                      <div className="cd-highlight">
                        <Trophy className="h-4 w-4" />
                        {myRankIndex === 0
                          ? `Bạn đang đứng đầu lớp với ${myCompletedCount}/${totalAssignments} bài tập.`
                          : `${rankedStudents[0].name} đang dẫn đầu lớp với ${
                              rankedStudents[0].completedAssignments?.length || 0
                            }/${totalAssignments} bài tập.`}
                      </div>
                      <div className="cd-leaders">
                        {rankedStudents.map((member, index) => {
                          const done = member.completedAssignments?.length || 0;
                          const pct = percentOf(done, totalAssignments);
                          const isYou = member.id === currentUser?.id;
                          return (
                            <div key={member.id} className={`cd-leader ${isYou ? "is-you" : ""}`}>
                              <span className="cd-rank">{String(index + 1).padStart(2, "0")}</span>
                              <span className="rd-avatar cd-avatar-lg">{initialsOf(member.name)}</span>
                              <div className="cd-leader-copy">
                                <span className="cd-leader-name">
                                  <Link href={`/member?id=${encodeURIComponent(member.id)}`}>{member.name}</Link>
                                  {isYou && <span className="cd-you">Bạn</span>}
                                </span>
                                <span className="cd-leader-role">
                                  Học viên · {member.xp} XP · {member.streak} ngày
                                </span>
                              </div>
                              <div className="cd-leader-score">
                                <strong>
                                  {done}/{totalAssignments}
                                </strong>
                                <span>{pct}%</span>
                              </div>
                            </div>
                          );
                        })}
                        {myMemberRecord && myMemberRecord.role !== "student" && (
                          <div className="cd-leader cd-leader--staff">
                            <span className="cd-rank">—</span>
                            <span className="rd-avatar cd-avatar-lg">{initialsOf(myMemberRecord.name)}</span>
                            <div className="cd-leader-copy">
                              <span className="cd-leader-name">{myMemberRecord.name}</span>
                              <span className="cd-leader-role">{roleLabel}</span>
                            </div>
                            <span className="rd-tag">Phụ trách</span>
                          </div>
                        )}
                      </div>
                      <p className="cd-hint-line">Giáo viên không tham gia xếp hạng. Bảng chỉ tính học viên trong lớp.</p>
                    </>
                  )}
                </div>
              </section>
            )}

            {activeTab === "members" && (
              <section className="cd-panel" aria-label="Thành viên lớp">
                <div className="cd-core">
                  <div className="cd-panel-head">
                    <h2>Thành viên</h2>
                    <p className="cd-section-note">{approvedMembers.length} thành viên</p>
                  </div>

                  {canManageClass && (
                    <div className="cd-invite">
                      <div className="cd-invite-copy">
                        <strong>Mời vào lớp</strong>
                        <span>Gửi link hoặc mã lớp. Học viên tham gia rồi bạn duyệt ở danh sách chờ.</span>
                      </div>
                      <div className="cd-invite-actions">
                        <button
                          type="button"
                          className="rd-btn cd-btn-secondary cd-btn-sm"
                          onClick={() => copyToClipboard(joinLink)}
                        >
                          {copiedCode?.includes("?join=") ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span aria-live="polite">
                            {copiedCode?.includes("?join=") ? "Đã chép link" : "Chép link mời"}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="rd-code cd-code"
                          onClick={() => copyToClipboard(selectedClass.code)}
                          title="Sao chép mã lớp"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>{copiedCode === selectedClass.code ? "Đã chép mã" : selectedClass.code}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {canManageClass && pendingMembers.length > 0 && (
                    <div className="cd-requests">
                      {pendingMembers.map((member) => (
                        <div key={member.id} className="cd-request">
                          <span className="rd-avatar cd-avatar-md">{initialsOf(member.name)}</span>
                          <div className="cd-request-copy">
                            <strong>{member.name}</strong>
                            <span>
                              {member.email} · Xin vào {shortDate(member.joinedAt)}
                            </span>
                          </div>
                          <div className="cd-inline-actions">
                            <button
                              type="button"
                              className="rd-btn rd-btn-primary cd-btn-sm"
                              onClick={() => handleApproveMember(selectedClass.id, member.id)}
                            >
                              Chấp nhận
                            </button>
                            <button
                              type="button"
                              className="rd-btn cd-btn-ghost cd-btn-sm"
                              onClick={() => handleRemoveMember(selectedClass.id, member.id)}
                            >
                              Từ chối
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="cd-list-label">Danh sách thành viên</p>
                  <div className="cd-members">
                    {approvedMembers.map((member) => {
                      const memberDone = member.completedAssignments?.length || 0;
                      const memberPercent = percentOf(memberDone, totalAssignments);
                      const isYou = member.id === currentUser?.id;
                      const memberRoleText =
                        member.role === "owner"
                          ? "Giáo viên · phụ trách lớp"
                          : member.role === "admin"
                            ? "Quản trị viên"
                            : member.role === "staff"
                              ? "Giáo vụ"
                              : `Học viên · tham gia ${shortDate(member.joinedAt)}`;
                      return (
                        <div key={member.id} className="cd-member">
                          <span className="rd-avatar cd-avatar-md">{initialsOf(member.name)}</span>
                          <div className="cd-member-copy">
                            <span className="cd-member-name">
                              <Link href={`/member?id=${encodeURIComponent(member.id)}`}>{member.name}</Link>
                              {isYou && <span className="cd-you">Bạn</span>}
                            </span>
                            <span className="cd-member-sub">{memberRoleText}</span>
                          </div>
                          <div className="cd-member-data">
                            {member.role === "student" ? (
                              <>
                                <span>
                                  {memberDone}/{totalAssignments} bài
                                </span>
                                <div className="rd-progress" aria-hidden="true">
                                  <span style={{ width: `${memberPercent}%` }} />
                                </div>
                              </>
                            ) : (
                              <span className="rd-tag rd-tag--strong">
                                {member.role === "owner" ? "Quản trị" : member.role === "admin" ? "Quản trị viên" : "Giáo vụ"}
                              </span>
                            )}
                            {(isClassOwner && member.role !== "owner") ||
                            (canManageClass && myMemberRecord?.role !== "staff" && member.role !== "owner") ? (
                              <div className="cd-member-tools">
                                {isClassOwner && (
                                  <select
                                    value={member.role}
                                    onChange={(e) =>
                                      handleChangeRole(
                                        selectedClass.id,
                                        member.id,
                                        e.target.value as "admin" | "staff" | "student"
                                      )
                                    }
                                    aria-label={`Vai trò của ${member.name}`}
                                  >
                                    <option value="student">Học sinh</option>
                                    <option value="staff">Giáo vụ</option>
                                    <option value="admin">Quản trị viên</option>
                                  </select>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(selectedClass.id, member.id)}
                                  title="Xóa khỏi lớp"
                                  aria-label={`Xóa ${member.name} khỏi lớp`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {canManageClass && activeTab === "settings" && (
              <section className="cd-panel" aria-label="Cài đặt lớp">
                <div className="cd-core">
                  <div className="cd-panel-head">
                    <h2>Cài đặt lớp</h2>
                    <p className="cd-section-note">Chỉ giáo viên</p>
                  </div>

                  <div className="cd-form">
                    <div className="cd-form-row">
                      <div className="cd-field">
                        <span className="cd-field-label">Tên lớp</span>
                        <div className="cd-readonly">{selectedClass.name}</div>
                      </div>
                      <div className="cd-field">
                        <label className="cd-field-label" htmlFor="cd-visibility">
                          Quyền truy cập
                        </label>
                        <select
                          id="cd-visibility"
                          value={selectedClass.visibility}
                          onChange={(e) => handleVisibilityChange(e.target.value as ClassVisibility)}
                          className="cd-form-select"
                        >
                          {CLASS_VISIBILITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedClass.description && (
                      <div className="cd-field">
                        <span className="cd-field-label">Mô tả</span>
                        <div className="cd-readonly cd-readonly--area">{selectedClass.description}</div>
                      </div>
                    )}

                    <div className="cd-form-row">
                      <div className="cd-field">
                        <span className="cd-field-label">Mã lớp</span>
                        <div className="cd-code-display">
                          <code>{selectedClass.code}</code>
                          <button
                            type="button"
                            className="rd-btn cd-btn-secondary cd-btn-sm"
                            onClick={() => copyToClipboard(selectedClass.code)}
                          >
                            {copiedCode === selectedClass.code ? "Đã chép" : "Sao chép"}
                          </button>
                        </div>
                      </div>
                      <div className="cd-field">
                        <span className="cd-field-label">Thành viên</span>
                        <div className="cd-readonly">{approvedMembers.length} thành viên đã duyệt</div>
                      </div>
                    </div>

                    <div className="cd-form-foot">
                      <p className="cd-soft">
                        Quyền truy cập áp dụng ngay cho toàn bộ thành viên. Tên lớp và mô tả hiện do quản trị viên quản lý.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="cd-side" aria-label="Thông tin lớp học">
            <section className="cd-panel cd-side-card">
              <div className="cd-core">
                <p className="rd-side-label">Thông tin lớp</p>
                <dl className="cd-info-list">
                  <div>
                    <dt>Giáo viên</dt>
                    <dd>{selectedClass.ownerName}</dd>
                  </div>
                  <div>
                    <dt>Mã lớp</dt>
                    <dd>
                      <button
                        type="button"
                        className="rd-code cd-code cd-code--sm"
                        onClick={() => copyToClipboard(selectedClass.code)}
                        title="Sao chép mã lớp"
                      >
                        {selectedClass.code}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Quyền truy cập</dt>
                    <dd>{visibilityLabel(selectedClass.visibility)}</dd>
                  </div>
                  <div>
                    <dt>Thành viên</dt>
                    <dd>{approvedMembers.length}</dd>
                  </div>
                  <div>
                    <dt>Ngày tạo</dt>
                    <dd>{shortDate(selectedClass.createdAt)}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="cd-panel cd-side-card">
              <div className="cd-core">
                <p className="rd-side-label">{canManageClass ? "Cần chú ý" : "Bạn sẽ luyện"}</p>
                {canManageClass ? (
                  <ul className="cd-tasks">
                    <li>
                      <div>
                        <strong>{selectedClass.assignments.length} bài tập</strong>
                        <span>trong lớp</span>
                      </div>
                      <button
                        type="button"
                        className="rd-btn cd-btn-ghost cd-btn-sm"
                        onClick={() => setActiveTab("assignments")}
                      >
                        Xem
                      </button>
                    </li>
                    <li>
                      <div>
                        <strong>{pendingMembers.length} yêu cầu</strong>
                        <span>tham gia lớp</span>
                      </div>
                      <button
                        type="button"
                        className="rd-btn cd-btn-ghost cd-btn-sm"
                        onClick={() => setActiveTab("members")}
                      >
                        Duyệt
                      </button>
                    </li>
                    <li>
                      <div>
                        <strong>{studentMembers.length} học viên</strong>
                        <span>đang theo học</span>
                      </div>
                      <button
                        type="button"
                        className="rd-btn cd-btn-ghost cd-btn-sm"
                        onClick={() => setShowAssignModal(true)}
                      >
                        Giao bài
                      </button>
                    </li>
                  </ul>
                ) : (
                  <ul className="cd-goals">
                    <li>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Theo dõi tiến độ từng bộ thẻ
                    </li>
                    <li>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Học và ôn lại trong mục Từ vựng
                    </li>
                    <li>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      So sánh với các bạn trong lớp
                    </li>
                  </ul>
                )}
              </div>
            </section>
          </aside>
        </div>

        {showAssignModal && (
          <div className="cd-modal fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="cd-modal-card card-duo p-6 bg-[#0f1b38] border-[#1e3466] max-w-xl w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-400" />
                  <span>Giao Bài Tập & Bộ Thẻ Mới</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="cm-mode" role="tablist" aria-label="Cách giao bài tập">
                <button
                  type="button"
                  role="tab"
                  aria-selected={assignMode === "existing"}
                  onClick={() => setAssignMode("existing")}
                  className={`cm-mode-btn ${assignMode === "existing" ? "is-active" : ""}`}
                >
                  Chọn bộ thẻ có sẵn / .apkg
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={assignMode === "dictionary"}
                  onClick={() => setAssignMode("dictionary")}
                  className={`cm-mode-btn ${assignMode === "dictionary" ? "is-active" : ""}`}
                >
                  Soạn từ Từ điển
                </button>
              </div>

              <form onSubmit={handleAssignDeck} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tiêu Đề Bài Tập *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Ôn tập Từ vựng Bài 01 - 03"
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                  />
                </div>

                {assignMode === "existing" ? (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Nguồn thẻ có sẵn · lọc theo quyển/độ khó</label>
                      <div className="mb-2 grid grid-cols-2 gap-2">
                        <select
                          value={assignBookFilter}
                          onChange={(event) => {
                            const nextBook = event.target.value;
                            setAssignBookFilter(nextBook);
                            setAssignTopicFilter("all");
                            const firstDeck = builtinAssignmentDecks.find((deck) => deck.book === Number(nextBook));
                            if (firstDeck) setAssignDeckId(firstDeck.id);
                          }}
                          className="min-w-0 rounded-xl border border-[#1e3a70] bg-[#132247] px-3 py-2.5 text-[11px] font-bold text-white"
                        >
                          {isAdmin && (
                            <>
                              <option value="101">★ Tiếng Hàn Tổng Hợp · Quyển 1 (Admin)</option>
                              <option value="102">★ Tiếng Hàn Tổng Hợp · Quyển 2 (Admin)</option>
                              <option value="103">★ Tiếng Hàn Tổng Hợp · Quyển 3 (Admin)</option>
                              <option value="104">★ Tiếng Hàn Tổng Hợp · Quyển 4 (Admin)</option>
                            </>
                          )}
                          <option value="1">TOPIK 1 · Sơ cấp</option>
                          <option value="2">TOPIK 2 · Sơ cấp</option>
                          <option value="3">TOPIK 3 · Trung cấp</option>
                          <option value="4">TOPIK 4 · Trung cấp</option>
                          <option value="5">TOPIK 5 · Cao cấp</option>
                          <option value="6">TOPIK 6 · Cao cấp</option>
                        </select>
                        <select
                          value={assignTopicFilter}
                          onChange={(event) => {
                            const nextTopic = event.target.value;
                            setAssignTopicFilter(nextTopic);
                            const firstDeck = builtinAssignmentDecks.find((deck) => deck.book === Number(assignBookFilter) && (nextTopic === "all" || deck.topic === nextTopic));
                            if (firstDeck) setAssignDeckId(firstDeck.id);
                          }}
                          className="min-w-0 rounded-xl border border-[#1e3a70] bg-[#132247] px-3 py-2.5 text-[11px] font-bold text-white"
                        >
                          <option value="all">Tất cả chủ đề trong quyển</option>
                          {assignmentTopics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                        </select>
                      </div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Chọn chủ đề/bộ thẻ để giao (gồm cả bộ thẻ cá nhân của bạn)</label>
                      <select
                        value={visibleAssignmentDecks.some((deck) => deck.id === assignDeckId) ? assignDeckId : visibleAssignmentDecks[0]?.id || ""}
                        onChange={(e) => setAssignDeckId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                      >
                        {visibleAssignmentDecks.map((deck) => (
                          <option key={deck.id} value={deck.id} disabled={deck.cards.filter((card) => card.korean && card.meaning).length === 0 || deck.cards.filter((card) => card.korean && card.meaning).length > 500}>
                            {deck.book ? `${deck.topic} · ${deck.name.split(" · ").slice(1, 3).join(" · ")} · ${deck.difficulty}` : deck.name} · {deck.cards.filter((card) => card.korean && card.meaning).length} thẻ
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-[10px] leading-4 text-slate-500">Thư viện có sẵn gồm từ, nghĩa, từ loại và ví dụ theo chủ đề. Để chia sẻ ảnh/âm thanh gốc của Anki, tải file .apkg bên dưới. Mỗi bài tối đa 500 thẻ và 60 MB media.</p>
                    </div>

                    <label className="block rounded-xl border border-dashed border-sky-500/40 bg-sky-950/20 p-3 text-center text-xs font-bold text-sky-200 cursor-pointer hover:bg-sky-900/30">
                      <input type="file" accept=".apkg,application/zip" className="hidden" disabled={parsingAssignmentApkg} onChange={(event) => { void handleAssignmentApkgUpload(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                      {parsingAssignmentApkg ? "Đang giải nén .apkg…" : "Tải .apkg lên để chia sẻ kèm hình ảnh và âm thanh"}
                    </label>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Tìm từ trong Từ điển (Hangul / Tiếng Việt / Tiếng Anh)
                      </label>
                      <div className="flex items-center gap-2 rounded-xl bg-[#132247] border border-[#1e3a70] px-3 py-2">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          value={dictQuery}
                          onChange={(e) => setDictQuery(e.target.value)}
                          placeholder="Gõ từ cần thêm vào bài tập lớp..."
                          className="w-full bg-transparent text-xs text-white outline-none"
                        />
                        {dictQuery && (
                          <button type="button" onClick={() => setDictQuery("")} className="text-slate-400 hover:text-white">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Search Results */}
                    {dictQuery.trim() && (
                      <div className="max-h-44 overflow-y-auto divide-y divide-slate-800 rounded-xl border border-[#1e3466] bg-[#0a1329]">
                        {dictLoading && (
                          <p className="p-3 text-xs text-slate-400">Đang tra từ điển…</p>
                        )}
                        {!dictLoading && dictResults.length === 0 && (
                          <p className="p-3 text-xs text-slate-500">Không tìm thấy từ phù hợp.</p>
                        )}
                        {dictResults.map((entry, idx) => {
                          const added = dictSelectedWords.some((w) => w.korean === entry.hangul);
                          const meaning = entry.vietnamese || entry.english || entry.japanese || "";
                          return (
                            <div
                              key={`${entry.hangul}-${idx}`}
                              className="flex items-center justify-between gap-2 p-2.5 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-noto font-bold text-white truncate">
                                  {entry.hangul}
                                  {entry.partOfSpeech && (
                                    <span className="ml-2 text-[10px] text-sky-400">{entry.partOfSpeech}</span>
                                  )}
                                </p>
                                <p className="text-slate-300 truncate">{meaning}</p>
                              </div>
                              <button
                                type="button"
                                disabled={added || dictSelectedWords.length >= 500}
                                onClick={() =>
                                  setDictSelectedWords((prev) => [
                                    ...prev,
                                    {
                                      korean: entry.hangul,
                                      meaning,
                                      example: entry.english && entry.vietnamese ? entry.english : "",
                                      pos: entry.partOfSpeech || "",
                                    },
                                  ])
                                }
                                className="shrink-0 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 px-2.5 py-1 text-[11px] font-bold text-sky-200 disabled:opacity-40 cursor-pointer"
                              >
                                {added ? "Đã chọn" : "+ Chọn"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Selected Words List */}
                    <div className="rounded-xl border border-[#1e3466] bg-[#0a1329] p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-400">
                          Danh sách từ sẽ giao ({dictSelectedWords.length} / 500 từ)
                        </span>
                        {dictSelectedWords.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setDictSelectedWords([])}
                            className="text-[11px] text-rose-400 hover:underline"
                          >
                            Xóa hết
                          </button>
                        )}
                      </div>
                      <div className="max-h-44 overflow-y-auto divide-y divide-slate-800">
                        {dictSelectedWords.map((w, i) => (
                          <div key={`${w.korean}-${i}`} className="flex items-center gap-2 py-2 text-xs">
                            <span className="font-noto font-bold text-white shrink-0 w-28 truncate">
                              {w.korean}
                            </span>
                            <input
                              value={w.meaning}
                              onChange={(e) =>
                                setDictSelectedWords((prev) =>
                                  prev.map((item, idx) =>
                                    idx === i ? { ...item, meaning: e.target.value } : item,
                                  ),
                                )
                              }
                              placeholder="Nghĩa tiếng Việt..."
                              className="flex-1 rounded-lg bg-[#132247] border border-[#1e3a70] px-2.5 py-1 text-xs text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setDictSelectedWords((prev) => prev.filter((_, idx) => idx !== i))
                              }
                              className="text-slate-400 hover:text-rose-400 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {dictSelectedWords.length === 0 && (
                          <p className="py-3 text-center text-xs text-slate-500">
                            Chưa chọn từ nào. Hãy tìm và bấm &quot;+ Chọn&quot; phía trên.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Hạn Nộp (Hạn Ôn)</label>
                  <input
                    type="date"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={
                      assignMode === "dictionary"
                        ? dictSelectedWords.length === 0
                        : parsingAssignmentApkg ||
                          !selectedAssignmentDeck ||
                          selectedAssignmentDeck.cards.filter((card) => card.korean && card.meaning).length === 0 ||
                          selectedAssignmentDeck.cards.filter((card) => card.korean && card.meaning).length > 500
                    }
                    className="cm-btn cm-btn--primary text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Giao Cho Lớp
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const approvedMemberTotal = myClasses.reduce(
    (sum, cls) => sum + cls.members.filter((m) => m.status === "approved").length,
    0
  );
  const openAssignmentCount = myClasses.filter((cls) => {
    const record = cls.members.find((m) => m.id === currentUser?.id || m.email === currentUser?.email);
    const teacher = record?.role === "owner" || record?.role === "admin" || record?.role === "staff";
    return cls.assignments.some((asg) => (teacher ? (asg.progress || []).some((p) => !p.completed) : !asg.completed));
  }).length;
  const userInitials = (currentUser?.name || "?")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  const userRoleLabel = currentUser?.role === "teacher" || currentUser?.role === "admin" ? "Giáo viên" : "Học viên";

  return (
    <div className="classroom-module cm-page rd">
      <div className="rd-nav-shell">
        <nav className="rd-nav" aria-label="Điều hướng lớp học">
          {onBack && (
            <button type="button" onClick={onBack} className="rd-nav-back" aria-label="Trở về">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <span className="rd-nav-divider" aria-hidden="true" />
          <Link className="rd-nav-brand" href="/" aria-label="HaechiVN">
            <Image src="/brand/haechivn-mark.webp" alt="" width={26} height={26} />
            <span>HaechiVN</span>
          </Link>
          <span className="rd-nav-scope">Lớp học</span>
          <div className="rd-nav-user">
            <span className="rd-avatar">{userInitials}</span>
            <span className="rd-user-copy">
              <span className="rd-user-name">{currentUser?.name}</span>
              <span className="rd-user-role">{userRoleLabel}</span>
            </span>
          </div>
        </nav>
      </div>

      <section className="rd-hero" aria-labelledby="classes-title">
        <div>
          <h1 id="classes-title">
            Lớp học của bạn,
            <br />
            <span className="soft">trong một nơi.</span>
          </h1>
          <p className="rd-lede">
            Theo dõi lớp đang học, bài tập còn mở và những người cùng học. Mọi thứ bạn cần, không thêm nhiễu.
          </p>
        </div>
        <aside className="rd-overview" aria-label="Tóm tắt lớp học">
          <div className="rd-overview-top">
            <span>Tổng quan</span>
            <span>{myClasses.length} lớp</span>
          </div>
          <div className="rd-metrics">
            <div className="rd-metric">
              <span className="rd-metric-value">{myClasses.length}</span>
              <span className="rd-metric-label">lớp đang học</span>
            </div>
            <div className="rd-metric">
              <span className="rd-metric-value">{approvedMemberTotal}</span>
              <span className="rd-metric-label">thành viên</span>
            </div>
            <div className="rd-metric">
              <span className="rd-metric-value">{openAssignmentCount}</span>
              <span className="rd-metric-label">bài tập đang mở</span>
            </div>
          </div>
        </aside>
      </section>

      <div className="rd-tabs-wrap">
        <div className="rd-segmented" role="tablist" aria-label="Chế độ xem lớp học">
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "mine"}
            onClick={() => setMainTab("mine")}
            className="rd-tab"
          >
            Lớp học của tôi
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "join"}
            onClick={() => setMainTab("join")}
            className="rd-tab"
          >
            Tham gia lớp học
          </button>
        </div>
      </div>

      {mainTab === "mine" && (
        <div className="rd-view">
          <div className="rd-section-head">
            <h2>Lớp của bạn</h2>
            <p className="rd-section-note">{myClasses.length} lớp đang hoạt động</p>
            <button
              type="button"
              className="rd-orb-btn"
              onClick={() => (currentUser ? setShowCreateModal(true) : handleOpenAuth(false))}
            >
              <span>Tạo lớp học</span>
              <span className="rd-orb" aria-hidden="true">
                <Plus className="h-4 w-4" />
              </span>
            </button>
          </div>

          {msg && (
            <p className={`rd-msg ${msg.type === "error" ? "rd-msg--error" : "rd-msg--ok"}`}>
              {msg.type === "error" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {msg.text}
            </p>
          )}

          {loading ? (
            <div className="rd-panel rd-loading">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải lớp học…
            </div>
          ) : (
            <div className="rd-panel">
              <div className="rd-ledger">
                {myClasses.length === 0 ? (
                  <div className="rd-empty">
                    <span className="rd-empty-icon">
                      <Users className="h-5 w-5" />
                    </span>
                    <h3>Chưa có lớp học nào</h3>
                    <p>Nhập mã lớp từ giáo viên, hoặc tạo lớp mới nếu bạn là người phụ trách.</p>
                    <div className="rd-empty-actions">
                      <button type="button" className="rd-btn rd-btn-primary" onClick={() => setMainTab("join")}>
                        Tham gia bằng mã
                      </button>
                      <button
                        type="button"
                        className="rd-btn"
                        onClick={() => (currentUser ? setShowCreateModal(true) : handleOpenAuth(false))}
                      >
                        Tạo lớp học
                      </button>
                    </div>
                  </div>
                ) : (
                  myClasses.map((cls, idx) => {
                    const record = cls.members.find(
                      (m) => m.id === currentUser?.id || m.email === currentUser?.email
                    );
                    const teacher =
                      record?.role === "owner" || record?.role === "admin" || record?.role === "staff";
                    const approvedCount = cls.members.filter((m) => m.status === "approved").length;
                    const openAsg = cls.assignments.find((asg) =>
                      teacher ? (asg.progress || []).some((p) => !p.completed) : !asg.completed
                    );
                    const asg = openAsg || cls.assignments[0];
                    const progressRows = asg?.progress || [];
                    const avgPercent = progressRows.length
                      ? Math.round(
                          progressRows.reduce(
                            (sum, p) => sum + (p.totalCards > 0 ? (p.reviewedCards / p.totalCards) * 100 : 0),
                            0
                          ) / progressRows.length
                        )
                      : 0;
                    const percent = asg
                      ? teacher
                        ? avgPercent
                        : asg.totalCards
                          ? Math.round(((asg.reviewedCards || 0) / asg.totalCards) * 100)
                          : 0
                      : 0;
                    const reviewed = asg
                      ? teacher
                        ? Math.round(
                            progressRows.reduce((sum, p) => sum + p.reviewedCards, 0) /
                              Math.max(progressRows.length, 1)
                          )
                        : asg.reviewedCards || 0
                      : 0;
                    const due = asg?.dueDate
                      ? new Date(asg.dueDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
                      : "";

                    return (
                      <article
                        key={cls.id}
                        className="rd-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedClassId(cls.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedClassId(cls.id);
                          }
                        }}
                      >
                        <span className="rd-index" aria-hidden="true">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="rd-main">
                          <div className="rd-kicker">
                            <span className={`rd-tag ${teacher ? "rd-tag--strong" : ""}`}>
                              {teacher ? "Bạn phụ trách" : "Học viên"}
                            </span>
                            <span className="rd-tag">{visibilityLabel(cls.visibility)}</span>
                            <button
                              type="button"
                              className="rd-code"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(cls.code);
                              }}
                              aria-label={`Sao chép mã lớp ${cls.code}`}
                            >
                              <span>{cls.code}</span>
                              {copiedCode === cls.code ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                          <h3 className="rd-row-title">{cls.name}</h3>
                          <p className="rd-row-desc">{cls.description || "Chưa có mô tả cho lớp này."}</p>
                          <ul className="rd-row-meta">
                            <li>{approvedCount} thành viên</li>
                            <li>{cls.assignments.length} bài tập</li>
                            <li>Tạo {cls.createdAt}</li>
                          </ul>
                        </div>
                        <div className="rd-side">
                          <p className="rd-side-label">
                            {asg ? (openAsg ? "Bài tập đang mở" : "Bài tập gần nhất") : "Bài tập"}
                          </p>
                          <p className="rd-side-title">{asg ? asg.title : "Chưa giao bài tập"}</p>
                          {asg ? (
                            <>
                              <div className="rd-progress" aria-hidden="true">
                                <span style={{ width: `${percent}%` }} />
                              </div>
                              <div className="rd-progress-meta">
                                <span>
                                  <strong>{reviewed}</strong>/{asg.totalCards || 0} từ
                                </span>
                                <span>{due ? `Hạn ${due}` : `${percent}%`}</span>
                              </div>
                            </>
                          ) : (
                            <p className="rd-side-empty">Giáo viên chưa giao bộ thẻ nào.</p>
                          )}
                          <span className="rd-row-cta">
                            {teacher ? "Quản lý lớp" : "Vào lớp"}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {pendingClasses.length > 0 && (
            <div className="rd-pending">
              <h3>
                <Clock className="h-4 w-4" />
                Đang chờ duyệt ({pendingClasses.length})
              </h3>
              {pendingClasses.map((cls) => (
                <div key={cls.id} className="rd-pending-row">
                  <span>{cls.name}</span>
                  <span className="rd-tag">Chờ chủ lớp duyệt</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mainTab === "join" && (
        <div className="rd-view">
          <div className="rd-section-head">
            <h2>Tham gia lớp học</h2>
            <p className="rd-section-note">Dùng mã giáo viên gửi</p>
          </div>

          <div className="rd-join-card">
            <form className="rd-join-form" onSubmit={handleJoinRequest}>
              <span className="rd-join-icon">
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Nhập mã lớp, ví dụ HAECHI-T1"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-label="Mã lớp"
                className="rd-input"
              />
              <button type="submit" className="rd-btn rd-btn-primary">
                <UserPlus className="h-4 w-4" />
                Gửi yêu cầu
              </button>
            </form>
            <p className="rd-join-help">
              Lớp công khai vào học ngay; lớp riêng tư cần chủ lớp duyệt yêu cầu của bạn.
            </p>
            {msg && (
              <p className={`rd-msg ${msg.type === "error" ? "rd-msg--error" : "rd-msg--ok"}`}>
                {msg.type === "error" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {msg.text}
              </p>
            )}
          </div>

          <div className="rd-section-head rd-section-head--tight">
            <h2>Lớp đang mở</h2>
            <p className="rd-section-note">Khám phá lớp công khai</p>
          </div>

          {discoverLoading ? (
            <div className="rd-panel rd-loading">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải danh sách lớp…
            </div>
          ) : (
            <div className="rd-panel">
              <div className="rd-ledger">
                {[...discoverClasses, ...DEMO_DISCOVER_CLASSES].map((cls, idx) => {
                  const isPublic = cls.visibility === "public";
                  const isDemo = "isDemo" in cls;
                  return (
                    <article key={cls.id} className="rd-row rd-row--discover">
                      <span className="rd-index" aria-hidden="true">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="rd-main">
                        <div className="rd-kicker">
                          <span
                            className={`rd-tag ${isDemo ? "rd-tag--demo" : isPublic ? "rd-tag--public" : ""}`}
                          >
                            {isDemo ? "Lớp mẫu" : isPublic ? "Công khai" : "Riêng tư"}
                          </span>
                          <span className="rd-tag">{cls.memberCount} thành viên</span>
                        </div>
                        <h3 className="rd-row-title">{cls.name}</h3>
                        <p className="rd-row-desc">{cls.description || "Lớp học chưa có mô tả."}</p>
                        <ul className="rd-row-meta">
                          <li>{cls.ownerName}</li>
                          <li>Tạo {cls.createdAt}</li>
                        </ul>
                      </div>
                      <div className="rd-side rd-side--action">
                        <p className="rd-side-label">
                          {isDemo ? "Lớp mẫu" : isPublic ? "Vào học ngay" : "Cần chủ lớp duyệt"}
                        </p>
                        {isDemo ? (
                          <button
                            type="button"
                            className="rd-btn rd-btn-block"
                            onClick={() => setDemoPreview(cls.name)}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Xem trước
                          </button>
                        ) : cls.myStatus === "approved" ? (
                          <button
                            type="button"
                            className="rd-btn rd-btn-primary rd-btn-block"
                            onClick={() => setSelectedClassId(cls.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Vào lớp
                          </button>
                        ) : cls.myStatus === "pending" ? (
                          <span className="rd-tag">Đang chờ duyệt</span>
                        ) : (
                          <button
                            type="button"
                            className="rd-btn rd-btn-primary rd-btn-block"
                            onClick={() => handleJoinDiscoveredClass(cls)}
                          >
                            {isPublic ? <UserPlus className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
                            {isPublic ? "Tham gia" : "Gửi yêu cầu"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {demoPreview && (
            <p className="rd-note">
              <Sparkles className="h-4 w-4" />
              “{demoPreview}” là lớp mẫu để xem trước giao diện. Nhập mã lớp thật do giáo viên cấp ở phía trên để tham gia.
            </p>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="cd-modal fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="cd-modal-card card-duo p-6 bg-[#0f1b38] border-[#1e3466] max-w-md w-full space-y-4 shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>Tạo Lớp Học Mới</span>
            </h3>

            {msg?.type === "error" && <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">{msg.text}</p>}

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Tên Lớp Học *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lớp Hàn Ngữ AnkiVN K101"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Chế độ hiển thị *</label>
                <div className="space-y-2">
                  {CLASS_VISIBILITY_OPTIONS.map((option) => {
                    const selected = newClassVisibility === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setNewClassVisibility(option.value)}
                        className={`w-full text-left rounded-xl border p-3 transition-all cursor-pointer ${
                          selected
                            ? "border-sky-400 bg-sky-500/10"
                            : "border-[#1e3a70] bg-[#132247] hover:border-sky-500/40"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-xs font-black text-white">
                          {option.value === "public" ? <Globe className="w-4 h-4 text-emerald-400" /> : option.value === "private" ? <Lock className="w-4 h-4 text-sky-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                          <span>{option.label}</span>
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-0.5 leading-relaxed">{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Mô tả Lớp Học</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả mục tiêu học tập, lịch ôn luyện..."
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="cm-btn cm-btn--primary text-xs inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {creating ? "Đang tạo…" : "Tạo Lớp & Sinh Mã"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
