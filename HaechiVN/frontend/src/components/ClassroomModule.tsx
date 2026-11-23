"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Plus,
  KeyRound,
  Trophy,
  CheckCircle2,
  Copy,
  ArrowRight,
  Layers,
  Clock,
  UserPlus,
  Trash2,
  ChevronLeft,
  XCircle,
  Loader2,
  Lock,
  X,
  Globe,
  EyeOff,
  Pencil,
  Search,
} from "lucide-react";
import { ApiClient, UserProfile } from "../lib/apiClient";
import { useApp } from "../contexts/AppProvider";
import { AnkiDeck } from "../lib/ankiParser";

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

export interface AssignmentPreviewCard {
  id: number;
  korean: string;
  meaning: string;
  pronunciation?: string;
  example?: string;
  mediaHtml?: string;
}

export interface ClassAssignment {
  id: string;
  title: string;
  deckName: string;
  dueDate: string;
  dueMode?: "date" | "duration" | "none";
  durationDays?: number;
  assignedBy: string;
  completed?: boolean;
  totalCards?: number;
  reviewedCards?: number;
  correctCards?: number;
  lastStudiedAt?: string | null;
  progress?: StudentAssignmentProgress[];
  deckCards?: AssignmentPreviewCard[];
  /** Danh sách học viên được giao; null/undefined nghĩa là cả lớp. */
  assignedUserIds?: string[] | null;
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

const dueCountdownLabel = (value?: string | null) => {
  if (!value) return "Không hạn";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return "Không hạn";
  const due = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return "Hết hạn hôm nay";
  return `Còn ${days} ngày`;
};

const dueModeLabel = (
  assignment: Pick<ClassAssignment, "dueDate" | "dueMode" | "durationDays">,
  managerView = false,
) => {
  if (assignment.dueMode === "duration" && assignment.durationDays) {
    return managerView
      ? `${assignment.durationDays} ngày kể từ khi vào lớp`
      : dueCountdownLabel(assignment.dueDate);
  }
  return assignment.dueDate ? dueCountdownLabel(assignment.dueDate) : "Không hạn";
};

type AssignmentDeckCard = {
  id: number;
  korean: string;
  meaning: string;
  example: string;
  mediaRefs: string[];
};

type AssignmentDeckOption = {
  id: string;
  name: string;
  book: number;
  topic: string;
  difficulty: string;
  parentId?: string;
  mediaAssets: NonNullable<AnkiDeck["mediaAssets"]>;
  cards: AssignmentDeckCard[];
};

const ASSIGN_BOOK_ORDER = [101, 102, 103, 104, 1, 2, 3, 4, 5, 6, 0];

const ASSIGN_BOOK_LABELS: Record<number, string> = {
  101: "★ Tiếng Hàn Tổng Hợp · Quyển 1 (Admin)",
  102: "★ Tiếng Hàn Tổng Hợp · Quyển 2 (Admin)",
  103: "★ Tiếng Hàn Tổng Hợp · Quyển 3 (Admin)",
  104: "★ Tiếng Hàn Tổng Hợp · Quyển 4 (Admin)",
  1: "TOPIK 1 · Sơ cấp",
  2: "TOPIK 2 · Sơ cấp",
  3: "TOPIK 3 · Trung cấp",
  4: "TOPIK 4 · Trung cấp",
  5: "TOPIK 5 · Cao cấp",
  6: "TOPIK 6 · Cao cấp",
};

const assignmentDeckCardCount = (deck: AssignmentDeckOption) =>
  deck.cards.filter((card) => card.korean && card.meaning).length;

const isAssignableAssignmentDeck = (deck: AssignmentDeckOption) => {
  const count = assignmentDeckCardCount(deck);
  return count > 0 && count <= 500;
};

const normalizeAssignmentSearch = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const assignmentDeckLabel = (deck: AssignmentDeckOption) => {
  if (!deck.book) return deck.name;
  const shortName = deck.name.split(" · ").slice(1, 3).join(" · ") || deck.name;
  return `${deck.topic} · ${shortName}`;
};

const assignmentDeckValue = (deck: AssignmentDeckOption) =>
  `${assignmentDeckLabel(deck)} · ${assignmentDeckCardCount(deck)} thẻ`;

const assignmentDeckCardFromAnki = (card: AnkiDeck["cards"][number]): AssignmentDeckCard => ({
  id: Number(card.id),
  korean: (card.koreanText || card.frontText || "").replace(/<[^>]*>/g, "").trim(),
  meaning: (card.vietnameseMeaning || card.backText || "").replace(/<[^>]*>/g, "").trim(),
  example: (card.exampleSentence || "").replace(/<[^>]*>/g, "").trim(),
  mediaRefs: card.mediaRefs || [],
});

// An imported deck can hold cards from several Anki subdecks ("A::B"). Expose
// the parent deck plus one entry per subdeck so teachers can assign just a part.
const buildAnkiAssignmentDecks = (
  prefix: "anki" | "upload",
  decks: AnkiDeck[],
  topic: string,
): AssignmentDeckOption[] => decks.flatMap((deck) => {
  const parentId = `${prefix}:${deck.id}`;
  const base = {
    book: 0,
    topic,
    difficulty: "Thư viện của tôi",
    mediaAssets: deck.mediaAssets || [],
  };
  const sourceCards = deck.cards || [];
  const parent: AssignmentDeckOption = {
    ...base,
    id: parentId,
    name: deck.name,
    cards: sourceCards.map(assignmentDeckCardFromAnki),
  };
  const groups = new Map<string, AssignmentDeckCard[]>();
  for (const card of sourceCards) {
    const path = (card.deckName || deck.name).trim() || deck.name;
    const list = groups.get(path);
    if (list) list.push(assignmentDeckCardFromAnki(card));
    else groups.set(path, [assignmentDeckCardFromAnki(card)]);
  }
  if (groups.size <= 1) return [parent];
  const children = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "vi"))
    .map(([path, cards], index): AssignmentDeckOption => ({
      ...base,
      id: `${parentId}:sub:${index}`,
      name: path,
      parentId,
      cards,
    }));
  return [parent, ...children];
});

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
  code: string;
  name: string;
  description: string;
  visibility: ClassVisibility;
  ownerName: string;
  memberCount: number;
  myStatus: "approved" | "pending" | null;
  createdAt: string;
}

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
        deckCards: [
          { id: 1, korean: "가족", meaning: "gia đình", pronunciation: "gajok" },
          { id: 2, korean: "학교", meaning: "trường học", pronunciation: "hakgyo" },
          { id: 3, korean: "친구", meaning: "bạn bè", pronunciation: "chingu" },
          { id: 4, korean: "시간", meaning: "thời gian", pronunciation: "sigan" },
          { id: 5, korean: "아침", meaning: "buổi sáng", pronunciation: "achim" },
          { id: 6, korean: "습관", meaning: "thói quen", pronunciation: "seupgwan" },
          { id: 7, korean: "이야기", meaning: "câu chuyện", pronunciation: "iyagi" },
          { id: 8, korean: "준비하다", meaning: "chuẩn bị", pronunciation: "junbihada" },
        ],
      },
      {
        id: "a2",
        title: "Tuần 2 · Ngữ pháp & mẫu câu",
        deckName: "TOPIK I · Bài 2",
        dueDate: "2026-12-02",
        assignedBy: "Cô Hana",
        totalCards: 140,
        assignedUserIds: ["u-student"],
        progress: [
          { studentId: "u-student", studentName: "Minh Anh", reviewedCards: 42, totalCards: 140, correctCards: 33, lastStudiedAt: "2026-11-19", completed: false },
          { studentId: "u-s2", studentName: "Jiwoo Park", reviewedCards: 120, totalCards: 140, correctCards: 104, lastStudiedAt: "2026-11-18", completed: false },
          { studentId: "u-s3", studentName: "Bảo Trân", reviewedCards: 12, totalCards: 140, correctCards: 9, lastStudiedAt: "2026-11-16", completed: false },
        ],
        deckCards: [
          { id: 1, korean: "만나다", meaning: "gặp gỡ", pronunciation: "mannada" },
          { id: 2, korean: "기다리다", meaning: "chờ đợi", pronunciation: "gidarida" },
          { id: 3, korean: "좋아하다", meaning: "thích", pronunciation: "joahada" },
          { id: 4, korean: "배우다", meaning: "học", pronunciation: "baeuda" },
          { id: 5, korean: "연습하다", meaning: "luyện tập", pronunciation: "yeonseuphada" },
          { id: 6, korean: "천천히", meaning: "chậm rãi", pronunciation: "cheoncheonhi" },
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
      { id: "a4", title: "Mua sắm & gọi món", deckName: "Giao tiếp · Bài 2", dueDate: "2026-12-05", assignedBy: "Cô Hana", totalCards: 120, assignedUserIds: ["u-student", "u-s2"], completed: false, reviewedCards: 48, correctCards: 39, lastStudiedAt: "2026-11-19", progress: [] },
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
  /** Mở sẵn lớp theo mã lớp (dùng cho route /classes/<mã lớp>). */
  initialClassCode?: string | null;
  /** Báo mã lớp đang mở để trang cập nhật URL (/classes hoặc /classes/<mã>). */
  onSelectedClassChange?: (code: string | null) => void;
  /** Nút "Trở về" hiển thị cùng hàng với hai tab chính. */
  onBack?: () => void;
}

export const ClassroomModule: React.FC<ClassroomModuleProps> = ({ currentUser, demo = false, onClassesChange, initialClassId = null, initialClassCode = null, onSelectedClassChange, onBack }) => {
  const { handleOpenAuth, userDecks } = useApp();
  const isAdmin = currentUser?.role === "admin";

  const [classes, setClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(initialClassId);
  useEffect(() => { onClassesChange?.(classes.map((item) => item.id)); }, [classes, onClassesChange]);

  // Tab điều hướng giữa danh sách lớp và form tham gia bằng mã
  const [mainTab, setMainTab] = useState<"mine" | "join">("mine");
  // Thanh nav chuyển thành rail dọc khi cuộn xuống ở màn hình ngang rộng
  const [navRail, setNavRail] = useState(false);
  const [wideLandscape, setWideLandscape] = useState(false);
  const navShellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const shell = navShellRef.current;
    if (!shell) return;
    const media = window.matchMedia("(orientation: landscape) and (min-width: 900px)");
    let scrollEl: HTMLElement | null = shell.parentElement;
    while (scrollEl && scrollEl !== document.body) {
      const style = window.getComputedStyle(scrollEl);
      if (/(auto|scroll)/.test(style.overflowY)) break;
      scrollEl = scrollEl.parentElement;
    }
    const target: HTMLElement | Window = scrollEl ?? window;
    const update = () => {
      const top = scrollEl ? scrollEl.scrollTop : window.scrollY;
      setWideLandscape(media.matches);
      setNavRail(media.matches && top > 80);
    };
    const raf = window.requestAnimationFrame(update);
    target.addEventListener("scroll", update, { passive: true });
    media.addEventListener("change", update);
    return () => {
      window.cancelAnimationFrame(raf);
      target.removeEventListener("scroll", update);
      media.removeEventListener("change", update);
    };
  }, [selectedClassId]);
  // Mở lớp / quay về danh sách luôn bắt đầu từ đầu trang
  useEffect(() => {
    const shell = navShellRef.current;
    if (!shell) return;
    let scrollEl: HTMLElement | null = shell.parentElement;
    while (scrollEl && scrollEl !== document.body) {
      const style = window.getComputedStyle(scrollEl);
      if (/(auto|scroll)/.test(style.overflowY)) break;
      scrollEl = scrollEl.parentElement;
    }
    if (scrollEl) scrollEl.scrollTop = 0;
    else window.scrollTo(0, 0);
  }, [selectedClassId]);
  // Danh sách lớp công khai / riêng tư để khám phá ở tab Tham gia
  const [discoverClasses, setDiscoverClasses] = useState<DiscoverClass[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
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
  const [assignTitle, setAssignTitle] = useState("");
  const [assignRecipients, setAssignRecipients] = useState<string[] | null>(null);
  const [assignDeckId, setAssignDeckId] = useState("");
  const [assignDeckQuery, setAssignDeckQuery] = useState("");
  const [assignDeckOpen, setAssignDeckOpen] = useState(false);
  const [assignDeckActive, setAssignDeckActive] = useState(-1);
  const deckPickerRef = useRef<HTMLDivElement>(null);
  const deckOptionRefs = useRef(new Map<string, HTMLButtonElement>());
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignDueMode, setAssignDueMode] = useState<"date" | "duration" | "none">("date");
  const [assignDurationDays, setAssignDurationDays] = useState("7");
  const [editAssignmentId, setEditAssignmentId] = useState<string | null>(null);
  const [editAssignmentTitle, setEditAssignmentTitle] = useState("");
  const [editAssignmentDueDate, setEditAssignmentDueDate] = useState("");
  const [editAssignmentDueMode, setEditAssignmentDueMode] = useState<"date" | "duration" | "none">("date");
  const [editAssignmentDurationDays, setEditAssignmentDurationDays] = useState("7");
  const [savingAssignmentEdit, setSavingAssignmentEdit] = useState(false);
  const [editAssignmentDeckName, setEditAssignmentDeckName] = useState("");
  const [editAssignmentCards, setEditAssignmentCards] = useState<AssignmentPreviewCard[] | null>(null);
  const [editAssignmentCardsLoading, setEditAssignmentCardsLoading] = useState(false);
  const [editAssignmentCardsError, setEditAssignmentCardsError] = useState<string | null>(null);
  const [editAssignmentRecipients, setEditAssignmentRecipients] = useState<string[] | null>(null);
  const editAssignmentCardsRequest = useRef(0);

  // Detail View Active Tab
  const [activeTab, setActiveTab] = useState<"assignments" | "leaderboard" | "members" | "settings">("assignments");

  // Per-assignment student progress modal
  const [progressAssignmentId, setProgressAssignmentId] = useState<string | null>(null);

  // Confirm remove member dialog
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{
    id: string;
    name: string;
    pending: boolean;
  } | null>(null);

  // Confirm role change dialog
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    id: string;
    name: string;
    currentRole: "admin" | "staff" | "student";
    nextRole: "admin" | "staff" | "student";
  } | null>(null);

  // Confirm delete class dialog
  const [showDeleteClassModal, setShowDeleteClassModal] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const assignmentDecks = buildAnkiAssignmentDecks("anki", userDecks, "Thư viện của tôi").filter(
    (deck) => deck.cards.length > 0,
  );
  const assignmentDeckGroups = ASSIGN_BOOK_ORDER.map((book) => {
    const decks = assignmentDecks.filter((deck) => deck.book === book);
    if (!decks.length) return null;
    return {
      book,
      label: book === 0 ? "Bộ thẻ cá nhân" : ASSIGN_BOOK_LABELS[book] || `Quyển ${book}`,
      decks,
    };
  }).filter((group): group is { book: number; label: string; decks: AssignmentDeckOption[] } => Boolean(group));
  const assignDeckTerm = normalizeAssignmentSearch(assignDeckQuery).trim();
  const assignmentDeckGroupsFiltered = assignmentDeckGroups.map((group) => ({
    ...group,
    decks: group.decks.filter((deck) => !assignDeckTerm || normalizeAssignmentSearch(`${group.label} ${deck.topic} ${deck.name} ${deck.difficulty}`).includes(assignDeckTerm)),
  })).filter((group) => group.decks.length > 0);
  const assignmentDeckFlat = assignmentDeckGroupsFiltered.flatMap((group) => group.decks);
  const defaultAssignmentDeck =
    assignmentDecks.find((deck) => deck.book >= 1 && deck.book <= 6 && isAssignableAssignmentDeck(deck)) ||
    assignmentDecks.find(isAssignableAssignmentDeck) ||
    null;
  const selectedAssignmentDeck = assignmentDecks.find((deck) => deck.id === assignDeckId) || defaultAssignmentDeck;
  const assignDeckInputValue = assignDeckOpen
    ? assignDeckQuery
    : selectedAssignmentDeck
      ? assignmentDeckValue(selectedAssignmentDeck)
      : "";

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

  // 1d. Delete this class (owner or site admin only)
  const handleDeleteClass = async () => {
    if (!selectedClassId) return;
    const className = selectedClass?.name || "";
    setDeletingClass(true);
    setMsg(null);
    try {
      setClasses(await ApiClient.classAction({ action: "delete", classId: selectedClassId }));
      setShowDeleteClassModal(false);
      setSelectedClassId(null);
      setMsg({ type: "success", text: className ? `Đã xóa lớp “${className}”.` : "Đã xóa lớp học." });
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Không thể xóa lớp." });
    } finally {
      setDeletingClass(false);
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

  const handleConfirmRemoveMember = () => {
    if (!removeMemberTarget || !selectedClassId) return;
    handleRemoveMember(selectedClassId, removeMemberTarget.id);
    setRemoveMemberTarget(null);
  };

  // 5. Change Role (Student <-> Admin)
  const handleChangeRole = (classId: string, memberId: string, newRole: "admin" | "staff" | "student") => {
    void runClassAction({ action: "role", classId, memberId, role: newRole });
  };

  const handleConfirmRoleChange = () => {
    if (!roleChangeTarget || !selectedClassId) return;
    handleChangeRole(selectedClassId, roleChangeTarget.id, roleChangeTarget.nextRole);
    setRoleChangeTarget(null);
  };

  const closeAssignDeckPicker = () => {
    setAssignDeckOpen(false);
    setAssignDeckQuery("");
    setAssignDeckActive(-1);
  };

  const openAssignModal = () => {
    setEditAssignmentId(null);
    setAssignDeckQuery("");
    setAssignDeckActive(-1);
    setAssignDeckOpen(false);
    setAssignTitle("");
    setAssignRecipients(null);
    setShowAssignModal(true);
  };

  const selectAssignmentDeck = (deck: AssignmentDeckOption) => {
    if (!isAssignableAssignmentDeck(deck)) return;
    setAssignDeckId(deck.id);
    closeAssignDeckPicker();
  };

  const moveAssignmentDeckActive = (step: number) => {
    if (!assignmentDeckFlat.length) return;
    let next = assignDeckActive;
    if (next < 0) next = step > 0 ? 0 : assignmentDeckFlat.length - 1;
    else next = (next + step + assignmentDeckFlat.length) % assignmentDeckFlat.length;
    let guard = 0;
    while (!isAssignableAssignmentDeck(assignmentDeckFlat[next]) && guard < assignmentDeckFlat.length) {
      next = (next + step + assignmentDeckFlat.length) % assignmentDeckFlat.length;
      guard += 1;
    }
    if (!isAssignableAssignmentDeck(assignmentDeckFlat[next])) return;
    setAssignDeckActive(next);
    requestAnimationFrame(() => {
      deckOptionRefs.current.get(assignmentDeckFlat[next].id)?.scrollIntoView({ block: "nearest" });
    });
  };

  const handleAssignDeckKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!assignDeckOpen) {
        setAssignDeckOpen(true);
        setAssignDeckQuery("");
      }
      moveAssignmentDeckActive(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && assignDeckOpen) {
      event.preventDefault();
      const candidate = assignmentDeckFlat[assignDeckActive] || assignmentDeckFlat.find(isAssignableAssignmentDeck);
      if (candidate) selectAssignmentDeck(candidate);
    } else if (event.key === "Escape" && assignDeckOpen) {
      event.preventDefault();
      closeAssignDeckPicker();
      event.currentTarget.blur();
    }
  };

  const handleAssignDeckBlur = () => {
    window.setTimeout(() => {
      if (!deckPickerRef.current?.contains(document.activeElement)) closeAssignDeckPicker();
    }, 120);
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
    const durationDays = Number(assignDurationDays);
    if (assignDueMode === "duration" && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365)) {
      setMsg({ type: "error", text: "Số ngày hoàn thành phải từ 1 đến 365." });
      return;
    }
    const duePayload = assignDueMode === "none"
      ? { dueMode: "none" as const, durationDays: 0, dueDate: "" }
      : assignDueMode === "duration"
        ? { dueMode: "duration" as const, durationDays, dueDate: "" }
        : { dueMode: "date" as const, durationDays: 0, dueDate };
    const assignmentId = `asg_${crypto.randomUUID().replace(/-/g, "")}`;

    if (assignRecipients !== null && assignRecipients.length === 0) {
      setMsg({ type: "error", text: "Chọn ít nhất một học viên hoặc giao cho cả lớp." });
      return;
    }

    if (!selectedAssignmentDeck || !isAssignableAssignmentDeck(selectedAssignmentDeck)) {
      setMsg({ type: "error", text: "Bộ thẻ này không có thẻ hợp lệ để giao." });
      return;
    }
    const cards = selectedAssignmentDeck.cards.filter((card) => card.korean && card.meaning).slice(0, 500);
    const referencedFilenames = new Set(cards.flatMap((card) => card.mediaRefs || []));
    const sourceAssets = [...new Map((selectedAssignmentDeck.mediaAssets || [])
      .filter((asset) => referencedFilenames.has(asset.filename))
      .map((asset) => [asset.filename, asset])).values()];
    if (referencedFilenames.size && sourceAssets.length !== referencedFilenames.size) {
      setMsg({ type: "error", text: "Bộ thẻ có ảnh/âm thanh cục bộ không còn khả dụng. Hãy nhập lại bộ thẻ rồi thử lại." });
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
    const saved = await runClassAction({ action: "assignment", classId: selectedClassId, assignmentId, title: assignTitle, deckName: selectedAssignmentDeck.name, ...duePayload, deckCards, mediaAssets, assignedUserIds: assignRecipients });
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
    setAssignRecipients(null);
    setAssignDueMode("date");
    setAssignDurationDays("7");
  };

  const openEditAssignment = (assignment: ClassAssignment) => {
    setShowAssignModal(false);
    setEditAssignmentId(assignment.id);
    setEditAssignmentTitle(assignment.title);
    setEditAssignmentDueDate(assignment.dueDate || "");
    setEditAssignmentDueMode(assignment.dueMode === "none" ? "none" : assignment.dueMode === "duration" ? "duration" : "date");
    setEditAssignmentDurationDays(String(assignment.durationDays || 7));
    setEditAssignmentDeckName(assignment.deckName || "");
    setEditAssignmentRecipients(assignment.assignedUserIds?.length ? assignment.assignedUserIds : null);
    setEditAssignmentCards(null);
    setEditAssignmentCardsError(null);
    const requestId = ++editAssignmentCardsRequest.current;
    if (assignment.deckCards?.length) {
      setEditAssignmentCards(assignment.deckCards);
      setEditAssignmentCardsLoading(false);
      return;
    }
    if (!selectedClassId) {
      setEditAssignmentCardsLoading(false);
      return;
    }
    setEditAssignmentCardsLoading(true);
    void ApiClient.getClassAssignment(selectedClassId, assignment.id)
      .then((detail) => {
        if (requestId !== editAssignmentCardsRequest.current) return;
        setEditAssignmentDeckName(detail.deckName || assignment.deckName || "");
        setEditAssignmentCards(detail.deckCards || []);
      })
      .catch((error) => {
        if (requestId !== editAssignmentCardsRequest.current) return;
        setEditAssignmentCardsError(
          error instanceof Error ? error.message : "Không tải được bộ thẻ của bài tập."
        );
      })
      .finally(() => {
        if (requestId !== editAssignmentCardsRequest.current) return;
        setEditAssignmentCardsLoading(false);
      });
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !editAssignmentId) return;
    const title = editAssignmentTitle.trim();
    if (title.length < 3 || title.length > 120) {
      setMsg({ type: "error", text: "Tên bài tập phải từ 3 đến 120 ký tự." });
      return;
    }
    const durationDays = Number(editAssignmentDurationDays);
    if (editAssignmentDueMode === "duration" && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365)) {
      setMsg({ type: "error", text: "Số ngày hoàn thành phải từ 1 đến 365." });
      return;
    }
    if (editAssignmentRecipients !== null && editAssignmentRecipients.length === 0) {
      setMsg({ type: "error", text: "Chọn ít nhất một học viên hoặc giao cho cả lớp." });
      return;
    }
    setSavingAssignmentEdit(true);
    const saved = await runClassAction({
      action: "update_assignment",
      classId: selectedClassId,
      assignmentId: editAssignmentId,
      title,
      dueDate: editAssignmentDueMode === "date" ? editAssignmentDueDate : "",
      dueMode: editAssignmentDueMode,
      durationDays: editAssignmentDueMode === "duration" ? durationDays : 0,
      assignedUserIds: editAssignmentRecipients,
    });
    setSavingAssignmentEdit(false);
    if (!saved) return;
    setEditAssignmentId(null);
  };

  const toggleAssignmentRecipient = (studentId: string) => {
    setEditAssignmentRecipients((previous) => {
      const current = previous ?? [];
      return current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId];
    });
  };

  const toggleAssignRecipient = (studentId: string) => {
    setAssignRecipients((previous) => {
      const current = previous ?? [];
      return current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId];
    });
  };

  const closeAssignmentForm = () => {
    setShowAssignModal(false);
    setEditAssignmentId(null);
  };

  // Một khung duy nhất cho 2 chế độ: tạo mới dùng state assign*, sửa dùng state editAssignment*.
  const assignmentFormIsCreate = showAssignModal;
  const assignmentForm = assignmentFormIsCreate
    ? {
        title: assignTitle, setTitle: setAssignTitle,
        dueMode: assignDueMode, setDueMode: setAssignDueMode,
        dueDate: assignDueDate, setDueDate: setAssignDueDate,
        durationDays: assignDurationDays, setDurationDays: setAssignDurationDays,
        recipients: assignRecipients, setRecipients: setAssignRecipients,
        toggleRecipient: toggleAssignRecipient,
      }
    : {
        title: editAssignmentTitle, setTitle: setEditAssignmentTitle,
        dueMode: editAssignmentDueMode, setDueMode: setEditAssignmentDueMode,
        dueDate: editAssignmentDueDate, setDueDate: setEditAssignmentDueDate,
        durationDays: editAssignmentDurationDays, setDurationDays: setEditAssignmentDurationDays,
        recipients: editAssignmentRecipients, setRecipients: setEditAssignmentRecipients,
        toggleRecipient: toggleAssignmentRecipient,
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

  // Deep link /classes/<mã lớp>: mở đúng lớp sau khi danh sách tải xong (một lần).
  const appliedInitialCodeRef = useRef(false);
  useEffect(() => {
    if (appliedInitialCodeRef.current || !initialClassCode || classes.length === 0) return;
    appliedInitialCodeRef.current = true;
    const wanted = initialClassCode.trim().toLowerCase();
    const match = classes.find((cls) => cls.code.toLowerCase() === wanted || cls.id.toLowerCase() === wanted);
    if (match) setSelectedClassId(match.id);
  }, [classes, initialClassCode]);

  // Đồng bộ URL theo lớp đang mở: chỉ báo khi người dùng thật sự đổi lớp
  // (bỏ qua render đầu, nếu không sẽ đẩy /classes/<mã> về /classes).
  const prevSelectedIdRef = useRef<string | null>(selectedClassId);
  useEffect(() => {
    if (selectedClassId === prevSelectedIdRef.current) return;
    prevSelectedIdRef.current = selectedClassId;
    onSelectedClassChange?.(selectedClass?.code ?? null);
  }, [selectedClassId, selectedClass, onSelectedClassChange]);
  const assignableStudents = (selectedClass?.members || []).filter(
    (member) => member.role === "student" && member.status === "approved"
  );
  const myMemberRecord = selectedClass?.members.find(
    (m) => m.id === currentUser?.id || m.email === currentUser?.email
  );
  const canManageClass = myMemberRecord?.role === "owner" || myMemberRecord?.role === "admin" || myMemberRecord?.role === "staff";
  const isClassOwner = myMemberRecord?.role === "owner";
  const canDeleteClass = isClassOwner || isAdmin;

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
    const memberRoleName = (role: string) =>
      role === "admin" ? "Quản trị viên" : role === "staff" ? "Giáo vụ" : "Học sinh";
    const percentOf = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0);
    const memoryOf = (correct: number, reviewed: number) =>
      reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0;

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

    const progressAssignment = progressAssignmentId
      ? selectedClass.assignments.find((asg) => asg.id === progressAssignmentId)
      : null;
    const progressRows = progressAssignment
      ? studentMembers
          .map((member) => {
            const point = (progressAssignment.progress || []).find((p) => p.studentId === member.id);
            const total = point?.totalCards || progressAssignment.totalCards || 0;
            const reviewed = point?.reviewedCards || 0;
            const correctCards = point?.correctCards || 0;
            return {
              id: member.id,
              name: member.name,
              reviewed,
              total,
              correctCards,
              memory: reviewed > 0 ? memoryOf(correctCards, reviewed) : null,
              lastStudiedAt: point?.lastStudiedAt || null,
              completed: Boolean(point?.completed),
              percent: percentOf(reviewed, total),
            };
          })
          .sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name, "vi"))
      : [];
    const progressDone = progressRows.filter((row) => row.completed).length;
    const progressAvg = progressRows.length
      ? Math.round(progressRows.reduce((sum, row) => sum + row.percent, 0) / progressRows.length)
      : 0;
    const progressMemorySamples = progressRows
      .map((row) => row.memory)
      .filter((value): value is number => value !== null);
    const progressMemory = progressMemorySamples.length
      ? Math.round(
          progressMemorySamples.reduce((sum, value) => sum + value, 0) / progressMemorySamples.length
        )
      : 0;
    const memberMemoryByStudent = new Map<string, number | null>();
    for (const member of studentMembers) {
      let reviewed = 0;
      let correct = 0;
      for (const asg of selectedClass.assignments) {
        const point = (asg.progress || []).find((p) => p.studentId === member.id);
        reviewed += point?.reviewedCards || 0;
        correct += point?.correctCards || 0;
      }
      memberMemoryByStudent.set(member.id, reviewed > 0 ? memoryOf(correct, reviewed) : null);
    }

    return (
      <div className="classroom-module cm-page rd cd">
        <div className="mx-auto mb-4 w-full max-w-3xl space-y-3">
          <div className="flex w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-[#1e3466] dark:bg-[#0f1b38]">
            <div className="flex flex-1 justify-start">
            <button
              type="button"
              onClick={() => setSelectedClassId(null)}
              aria-label="Về danh sách lớp"
              className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Trở về</span>
            </button>
            </div>
            <div
              className={`grid shrink-0 gap-1.5 ${canManageClass ? "grid-cols-4" : "grid-cols-3"}`}
              role="tablist"
              aria-label="Nội dung lớp học"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "assignments"}
                onClick={() => setActiveTab("assignments")}
                className={`flex cursor-pointer items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-black transition-all ${activeTab === "assignments" ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"}`}
              >
                Bài tập
                <span className="text-[10px] font-bold opacity-70">{selectedClass.assignments.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "leaderboard"}
                onClick={() => setActiveTab("leaderboard")}
                className={`flex cursor-pointer items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-black transition-all ${activeTab === "leaderboard" ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"}`}
              >
                Xếp hạng
                <span className="text-[10px] font-bold opacity-70">{rankedStudents.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "members"}
                onClick={() => setActiveTab("members")}
                className={`flex cursor-pointer items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-black transition-all ${activeTab === "members" ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"}`}
              >
                Thành viên
                <span className="text-[10px] font-bold opacity-70">{approvedMembers.length}</span>
              </button>
              {canManageClass && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
                className={`flex cursor-pointer items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-black transition-all ${activeTab === "settings" ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"}`}
              >
                Cài đặt
              </button>
              )}
            </div>
            <div className="flex-1" aria-hidden="true" />
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

        <section
          className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center dark:border-[#1e3466] dark:bg-[#0f1b38]"
          aria-labelledby="cd-class-title"
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            {canManageClass && (
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black text-sky-800">Bạn phụ trách</span>
            )}
            {isClassOwner ? (
              <select
                value={selectedClass.visibility}
                onChange={(e) => handleVisibilityChange(e.target.value as ClassVisibility)}
                title="Quyền truy cập của lớp"
                className="cd-select cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-700 dark:border-white/10 dark:bg-[#132247] dark:text-slate-200"
              >
                {CLASS_VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700">
                {visibilityLabel(selectedClass.visibility)}
              </span>
            )}
            <button
              type="button"
              onClick={() => copyToClipboard(selectedClass.code)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-700 dark:border-white/10 dark:bg-[#132247] dark:text-slate-200"
              title="Sao chép mã lớp"
              aria-label={`Sao chép mã lớp ${selectedClass.code}`}
            >
              {selectedClass.code}
              {copiedCode === selectedClass.code ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

          <h1 className="mt-2 text-base font-black text-white sm:text-lg" id="cd-class-title">
            {selectedClass.name}
          </h1>
          {selectedClass.description && (
            <p className="mx-auto mt-1 max-w-xl text-xs font-semibold text-slate-700">{selectedClass.description}</p>
          )}
          <p className="mt-1 text-[11px] font-bold text-slate-700">
            {selectedClass.ownerName}, tạo {shortDate(selectedClass.createdAt)}
          </p>

          <dl className="mt-3 grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/10">
            <div className="px-5 text-center">
              <dd className="text-base font-black text-white">{approvedMembers.length}</dd>
              <dt className="text-[11px] font-bold leading-tight text-slate-700">thành viên</dt>
            </div>
            <div className="px-5 text-center">
              <dd className="text-base font-black text-white">{selectedClass.assignments.length}</dd>
              <dt className="text-[11px] font-bold leading-tight text-slate-700">bài tập</dt>
            </div>
            <div className="px-5 text-center">
              <dd className="text-base font-black text-white">
                {canManageClass ? `${classPercent}%` : `${myProgressPercent}%`}
              </dd>
              <dt className="text-[11px] font-bold leading-tight text-slate-700">hoàn thành</dt>
            </div>
          </dl>

          {nextAssignment && (
            <p className="mt-3 text-[11px] font-bold text-slate-700">
              Đang mở: {nextAssignment.title}
              <span className="ml-2 font-black text-slate-900 dark:text-white">
                {nextAgg.reviewed}/{nextAgg.total} thẻ
              </span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {canManageClass ? (
              <>
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-sky-700 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-sky-600"
                  onClick={openAssignModal}
                >
                  <Plus className="h-4 w-4" />
                  Giao bài tập
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#1e3466] dark:bg-[#0f1b38] dark:text-slate-200"
                  onClick={() => setActiveTab("members")}
                >
                  Mời thành viên
                </button>
              </>
            ) : (
              <>
                <a
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-700 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-sky-600"
                  href={studyHref}
                >
                  {nextAssignment?.completed ? "Ôn lại bài học" : "Vào học"}
                  <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#1e3466] dark:bg-[#0f1b38] dark:text-slate-200"
                  onClick={() => setActiveTab("assignments")}
                >
                  Xem bài tập
                </button>
              </>
            )}
          </div>

          {pendingMembers.length > 0 && (
            <p className="mt-2 text-[11px] font-bold text-slate-700">
              <button type="button" className="cursor-pointer underline" onClick={() => setActiveTab("members")}>
                {pendingMembers.length} yêu cầu tham gia đang chờ duyệt
              </button>
            </p>
          )}
        </section>
        </div>

        <div className="cd-room mx-auto w-full max-w-3xl">
          <div className="cd-main">
            {activeTab === "assignments" && (
              <section
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-[#1e3466] dark:bg-[#0f1b38]"
                aria-label="Bài tập của lớp"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-black text-white">Bài tập của lớp</h2>
                  <p className="text-[11px] font-bold text-slate-700">
                    {selectedClass.assignments.length} bài, {totalCardCount} thẻ
                  </p>
                </div>

                {selectedClass.assignments.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-white/15">
                    <Layers className="mx-auto h-6 w-6 text-slate-400" />
                    <h3 className="mt-2 text-sm font-black text-white">Chưa có bài tập nào được giao</h3>
                    <p className="mx-auto mt-1 max-w-md text-xs font-semibold leading-5 text-slate-700">
                      {canManageClass
                        ? "Giao một bộ thẻ Anki hoặc bài học có sẵn để học viên bắt đầu ôn luyện trong mục Từ vựng."
                        : "Khi giáo viên giao bộ thẻ, bạn sẽ học và theo dõi tiến độ ngay trong mục Từ vựng."}
                    </p>
                    {canManageClass && (
                      <button
                        type="button"
                        className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-sky-700 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-sky-600"
                        onClick={openAssignModal}
                      >
                        <Plus className="h-4 w-4" />
                        Giao bộ thẻ đầu tiên
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {selectedClass.assignments.map((asg) => {
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
                        <article key={asg.id} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                isDone ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
                              }`}
                            >
                              {isDone ? "Hoàn thành" : "Đang mở"}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700 dark:bg-white/10 dark:text-slate-200">
                              {asg.totalCards ?? 0} thẻ
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700 dark:bg-white/10 dark:text-slate-200">
                              {dueModeLabel(asg, canManageClass)}
                            </span>
                          </div>

                          <h3 className="mt-2 text-sm font-black text-white">{asg.title}</h3>
                          <p className="mt-0.5 text-xs font-semibold text-slate-700">{asg.deckName}</p>

                          {canManageClass ? (
                            <>
                              <div
                                className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
                                aria-hidden="true"
                              >
                                <span className="block h-full rounded-full bg-sky-600" style={{ width: `${avg}%` }} />
                              </div>
                              <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-[11px] font-bold text-slate-700">
                                <span>
                                  <strong className="text-white">{doneCount}</strong>/{rows.length} học viên hoàn thành
                                </span>
                                <span>TB tiến độ {avg}%</span>
                              </div>

                              {rows.length === 0 && (
                                <p className="mt-2 text-[11px] font-semibold text-slate-700">
                                  Chưa có dữ liệu tiến độ, học viên cần mở bộ thẻ trong mục Từ vựng.
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
                                <span className="text-[11px] font-semibold text-slate-700">
                                  {asg.assignedBy ? `Giao bởi ${asg.assignedBy}` : `${asg.totalCards ?? 0} thẻ`}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#1e3466] dark:bg-[#0f1b38] dark:text-slate-200"
                                    onClick={() => openEditAssignment(asg)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#1e3466] dark:bg-[#0f1b38] dark:text-slate-200"
                                    onClick={() => setProgressAssignmentId(asg.id)}
                                  >
                                    Xem tiến độ
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div
                                className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
                                aria-hidden="true"
                              >
                                <span className="block h-full rounded-full bg-sky-600" style={{ width: `${myPct}%` }} />
                              </div>
                              <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-[11px] font-bold text-slate-700">
                                <span>
                                  <strong className="text-white">{asg.reviewedCards || 0}</strong>/{asg.totalCards || 0} thẻ
                                </span>
                                <span>{myPct}%</span>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
                                <span
                                  className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                                    isDone ? "text-emerald-700" : "text-slate-700"
                                  }`}
                                >
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
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#1e3466] dark:bg-[#0f1b38] dark:text-slate-200"
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
                    })}
                  </div>
                )}
              </section>
            )}

            {activeTab === "leaderboard" && (
              <section
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-[#1e3466] dark:bg-[#0f1b38]"
                aria-label="Bảng xếp hạng"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-black text-white">Bảng xếp hạng</h2>
                  <p className="text-[11px] font-bold text-slate-700">{rankedStudents.length} học viên</p>
                </div>

                {rankedStudents.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-white/15">
                    <Trophy className="mx-auto h-6 w-6 text-slate-400" />
                    <p className="mt-2 text-xs font-semibold text-slate-700">Chưa có học viên nào trong bảng xếp hạng.</p>
                  </div>
                ) : (
                  <>
                    <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700 dark:bg-white/5">
                      <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>
                        {myRankIndex === 0
                          ? `Bạn đang đứng đầu lớp với ${myCompletedCount}/${totalAssignments} bài tập.`
                          : `${rankedStudents[0].name} đang dẫn đầu lớp với ${
                              rankedStudents[0].completedAssignments?.length || 0
                            }/${totalAssignments} bài tập.`}
                      </span>
                    </p>

                    <div className="mt-3 divide-y divide-slate-200 dark:divide-white/10">
                      {rankedStudents.map((member, index) => {
                        const done = member.completedAssignments?.length || 0;
                        const pct = percentOf(done, totalAssignments);
                        const isYou = member.id === currentUser?.id;
                        return (
                          <div
                            key={member.id}
                            className={`flex items-center gap-3 py-2.5 ${isYou ? "rounded-xl bg-sky-50 px-2 dark:bg-sky-500/10" : ""}`}
                          >
                            <span className="w-6 shrink-0 text-xs font-black text-slate-500">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-700 dark:bg-white/10 dark:text-slate-200">
                              {initialsOf(member.name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-1.5 text-xs font-black text-white">
                                <Link href={`/member?id=${encodeURIComponent(member.id)}`} className="truncate hover:underline">
                                  {member.name}
                                </Link>
                                {isYou && (
                                  <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-black text-sky-800">
                                    Bạn
                                  </span>
                                )}
                              </span>
                              <span className="mt-0.5 block text-[11px] font-semibold text-slate-700">
                                Học viên, {member.xp} XP, {member.streak} ngày
                              </span>
                            </div>
                            <div className="shrink-0 text-right">
                              <strong className="block text-xs font-black text-white">
                                {done}/{totalAssignments}
                              </strong>
                              <span className="text-[11px] font-bold text-slate-700">{pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                      {myMemberRecord && myMemberRecord.role !== "student" && (
                        <div className="flex items-center gap-3 py-2.5">
                          <span className="w-6 shrink-0 text-xs font-black text-slate-500">—</span>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-700 dark:bg-white/10 dark:text-slate-200">
                            {initialsOf(myMemberRecord.name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="block text-xs font-black text-white">{myMemberRecord.name}</span>
                            <span className="mt-0.5 block text-[11px] font-semibold text-slate-700">{roleLabel}</span>
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700 dark:bg-white/10 dark:text-slate-200">
                            Phụ trách
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-[11px] font-semibold text-slate-700">
                      Giáo viên không tham gia xếp hạng, bảng chỉ tính học viên trong lớp.
                    </p>
                  </>
                )}
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
                              onClick={() =>
                                setRemoveMemberTarget({ id: member.id, name: member.name, pending: true })
                              }
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
                      const memberMemory = memberMemoryByStudent.get(member.id) ?? null;
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
                                {(canManageClass || isYou) && (
                                  <span
                                    className={`cd-memory-inline ${memberMemory !== null && memberMemory >= 85 ? "is-strong" : ""}`}
                                    title="Tỷ lệ trả lời đúng trên các thẻ đã ôn trong bài tập của lớp"
                                  >
                                    Ghi nhớ{" "}
                                    <strong>{memberMemory === null ? "—" : `${memberMemory}%`}</strong>
                                  </span>
                                )}
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
                                      setRoleChangeTarget({
                                        id: member.id,
                                        name: member.name,
                                        currentRole: member.role as "admin" | "staff" | "student",
                                        nextRole: e.target.value as "admin" | "staff" | "student",
                                      })
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
                                  onClick={() =>
                                    setRemoveMemberTarget({ id: member.id, name: member.name, pending: false })
                                  }
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
              <section
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-[#1e3466] dark:bg-[#0f1b38]"
                aria-label="Cài đặt lớp"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-black text-white">Cài đặt lớp</h2>
                  <p className="text-[11px] font-bold text-slate-700">Chỉ giáo viên</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-bold text-slate-700">Tên lớp</span>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                      {selectedClass.name}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700" htmlFor="cd-visibility">
                      Quyền truy cập
                    </label>
                    <select
                      id="cd-visibility"
                      value={selectedClass.visibility}
                      onChange={(e) => handleVisibilityChange(e.target.value as ClassVisibility)}
                      className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-sky-600 dark:border-white/10 dark:bg-[#132247] dark:text-slate-200"
                    >
                      {CLASS_VISIBILITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedClass.description && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <span className="block text-[11px] font-bold text-slate-700">Mô tả</span>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                        {selectedClass.description}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-bold text-slate-700">Mã lớp</span>
                    <div className="flex items-center gap-2">
                      <code className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                        {selectedClass.code}
                      </code>
                      <button
                        type="button"
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#1e3466] dark:bg-[#0f1b38] dark:text-slate-200"
                        onClick={() => copyToClipboard(selectedClass.code)}
                      >
                        {copiedCode === selectedClass.code ? "Đã chép" : "Sao chép"}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-bold text-slate-700">Thành viên</span>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                      {approvedMembers.length} thành viên đã duyệt
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-[11px] font-semibold text-slate-700">
                  Quyền truy cập áp dụng ngay cho toàn bộ thành viên. Tên lớp và mô tả hiện do quản trị viên quản lý.
                </p>

                {canDeleteClass && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
                    <div>
                      <h3 className="text-xs font-black text-rose-800 dark:text-rose-300">Xóa lớp học</h3>
                      <p className="mt-1 text-[11px] font-semibold leading-5 text-rose-700 dark:text-rose-200/80">
                        Toàn bộ thành viên, bài tập và tiến độ của lớp sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-rose-600"
                      onClick={() => setShowDeleteClassModal(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa lớp
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        {progressAssignment && (
          <div
            className="cd-modal fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Tiến độ ${progressAssignment.title}`}
            onClick={(event) => {
              if (event.target === event.currentTarget) setProgressAssignmentId(null);
            }}
          >
            <div className="cd-modal-card cd-progress-modal card-duo p-6 bg-[#0f1b38] border-[#1e3466] max-w-2xl w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="cd-progress-kicker">Tiến độ &amp; ghi nhớ</p>
                  <h3 className="cd-progress-title">{progressAssignment.title}</h3>
                  <p className="cd-progress-meta">
                    {progressAssignment.deckName} · {progressAssignment.totalCards ?? 0} thẻ · {dueModeLabel(progressAssignment, true)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProgressAssignmentId(null)}
                  className="cd-modal-close"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="cd-progress-stats">
                <span>
                  <strong>{progressDone}</strong>/{progressRows.length} hoàn thành
                </span>
                <span>
                  TB tiến độ <strong>{progressAvg}%</strong>
                </span>
                <span>
                  Ghi nhớ TB{" "}
                  <strong>{progressMemorySamples.length ? `${progressMemory}%` : "—"}</strong>
                </span>
              </div>
              <div className="rd-progress cd-progress-memorybar" aria-hidden="true">
                <span style={{ width: `${progressMemory}%` }} />
              </div>

              {progressRows.length === 0 ? (
                <p className="cd-muted">Chưa có học viên nào trong lớp.</p>
              ) : (
                <div className="cd-students cd-progress-list">
                  {progressRows.map((row) => (
                    <div key={row.id} className="cd-studentrow">
                      <span className="rd-avatar cd-avatar-xs">{initialsOf(row.name)}</span>
                      <div className="cd-student-main">
                        <div className="cd-student-name">
                          <span>{row.name}</span>
                          <small>
                            {row.reviewed}/{row.total} từ
                            {row.lastStudiedAt ? ` · ${shortDate(row.lastStudiedAt)}` : ""}
                          </small>
                        </div>
                        <div className="rd-progress cd-progress-thin cd-progress-memorybar" aria-hidden="true">
                          <span style={{ width: `${row.memory ?? 0}%` }} />
                        </div>
                      </div>
                      <span
                        className={`cd-memory ${
                          row.memory !== null && row.memory >= 85 ? "is-strong" : ""
                        }`}
                        title={
                          row.memory === null
                            ? "Chưa có dữ liệu ghi nhớ"
                            : `Tỷ lệ ghi nhớ: ${row.correctCards}/${row.reviewed} thẻ trả lời đúng`
                        }
                      >
                        <strong>{row.memory === null ? "—" : `${row.memory}%`}</strong>
                        <small>{row.memory === null ? "chưa học" : "ghi nhớ"}</small>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="cd-muted">
                50/50 từ = số từ học viên đã học trên tổng số từ của bài. % ghi nhớ = số thẻ trả lời
                đúng trên số thẻ đã học.
              </p>
            </div>
          </div>
        )}

        {(editAssignmentId || showAssignModal) && (
          <div
            className="cd-modal fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeAssignmentForm();
            }}
          >
            <div className="cd-modal-card card-duo p-6 bg-[#0f1b38] border-[#1e3466] max-w-xl w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-amber-400" />
                  <span>{assignmentFormIsCreate ? "Giao bài tập & bộ thẻ" : "Sửa bài tập"}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => closeAssignmentForm()}
                  className="text-slate-400 hover:text-white p-1"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={assignmentFormIsCreate ? handleAssignDeck : handleUpdateAssignment} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tiêu đề bài tập</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={120}
                    placeholder={assignmentFormIsCreate ? "Ví dụ: Ôn tập Từ vựng Bài 01 - 03" : undefined}
                    value={assignmentForm.title}
                    onChange={(e) => assignmentForm.setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                  />
                </div>

                {assignmentFormIsCreate && (
                <div>
                  <label htmlFor="assignDeckSearch" className="text-xs font-bold text-slate-300 block mb-1">Bộ Thẻ *</label>
                  <div className="cd-deck-picker" ref={deckPickerRef}>
                    <div className="cd-deck-field">
                      <Search className="h-4 w-4" aria-hidden="true" />
                      <input
                        id="assignDeckSearch"
                        type="text"
                        role="combobox"
                        aria-expanded={assignDeckOpen}
                        aria-controls="assignDeckList"
                        aria-autocomplete="list"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Gõ tên bài, chủ đề hoặc quyển…"
                        value={assignDeckInputValue}
                        onFocus={() => {
                          setAssignDeckOpen(true);
                          setAssignDeckQuery("");
                          setAssignDeckActive(-1);
                        }}
                        onChange={(event) => {
                          setAssignDeckOpen(true);
                          setAssignDeckQuery(event.target.value);
                          setAssignDeckActive(-1);
                        }}
                        onKeyDown={handleAssignDeckKeyDown}
                        onBlur={handleAssignDeckBlur}
                      />
                      <span className="cd-deck-count">
                        {assignDeckOpen ? `${assignmentDeckFlat.length} kết quả` : `${assignmentDecks.length} bộ thẻ`}
                      </span>
                    </div>
                    {assignDeckOpen && (
                      <div className="cd-deck-panel" id="assignDeckList" role="listbox" aria-label="Danh sách bộ thẻ">
                        {assignmentDecks.length === 0 ? (
                          <p className="cd-deck-empty">
                            Thư viện của bạn chưa có bộ thẻ nào.{" "}
                            <a href="/vocabulary" target="_blank" rel="noreferrer" style={{ color: "var(--c-accent)", fontWeight: 700 }}>
                              Thêm bộ thẻ
                            </a>{" "}
                            rồi quay lại giao bài.
                          </p>
                        ) : assignmentDeckFlat.length === 0 ? (
                          <p className="cd-deck-empty">Không tìm thấy bộ thẻ phù hợp.</p>
                        ) : (
                          assignmentDeckGroupsFiltered.map((group) => (
                            <div key={group.book} className="cd-deck-group" role="group" aria-label={group.label}>
                              <p className="cd-deck-group-label">{group.label}</p>
                              {group.decks.map((deck) => {
                                const index = assignmentDeckFlat.indexOf(deck);
                                const count = assignmentDeckCardCount(deck);
                                const disabled = !isAssignableAssignmentDeck(deck);
                                return (
                                  <button
                                    key={deck.id}
                                    ref={(node) => {
                                      if (node) deckOptionRefs.current.set(deck.id, node);
                                      else deckOptionRefs.current.delete(deck.id);
                                    }}
                                    type="button"
                                    role="option"
                                    aria-selected={selectedAssignmentDeck?.id === deck.id}
                                    disabled={disabled}
                                    className={`cd-deck-option ${index === assignDeckActive ? "is-active" : ""}`}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => selectAssignmentDeck(deck)}
                                  >
                                    <span className="cd-deck-option-copy">
                                      <strong>{(deck.parentId || (!deck.book && deck.name.includes("::"))) ? "↳ " : ""}{assignmentDeckLabel(deck)}</strong>
                                      <small>{deck.book ? deck.difficulty : "Bộ thẻ cá nhân"}</small>
                                    </span>
                                    <span className="cd-deck-option-count">{count} thẻ</span>
                                  </button>
                                );
                              })}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[10px] leading-4 text-slate-500">Tìm theo tên bài, chủ đề, quyển hoặc bộ thẻ. Mỗi bài tối đa 500 thẻ.</p>
                </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Hạn nộp</label>
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => assignmentForm.setDueMode("date")}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${assignmentForm.dueMode === "date" ? "border-sky-500/60 bg-sky-500/20" : "border-[#1e3a70] bg-[#132247] text-slate-300"}`} style={assignmentForm.dueMode === "date" ? { color: "var(--c-ink)" } : undefined}
                    >
                      Chọn ngày cụ thể
                    </button>
                    <button
                      type="button"
                      onClick={() => assignmentForm.setDueMode("duration")}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${assignmentForm.dueMode === "duration" ? "border-sky-500/60 bg-sky-500/20" : "border-[#1e3a70] bg-[#132247] text-slate-300"}`} style={assignmentForm.dueMode === "duration" ? { color: "var(--c-ink)" } : undefined}
                    >
                      Số ngày hoàn thành
                    </button>
                    <button
                      type="button"
                      onClick={() => assignmentForm.setDueMode("none")}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${assignmentForm.dueMode === "none" ? "border-sky-500/60 bg-sky-500/20" : "border-[#1e3a70] bg-[#132247] text-slate-300"}`} style={assignmentForm.dueMode === "none" ? { color: "var(--c-ink)" } : undefined}
                    >
                      Không hạn
                    </button>
                  </div>
                  {assignmentForm.dueMode === "none" ? (
                    <p className="text-[11px] text-slate-400">Học viên học lúc nào cũng được, không tính hạn.</p>
                  ) : assignmentForm.dueMode === "date" ? (
                    <>
                      <input
                        type="date"
                        value={assignmentForm.dueDate}
                        onChange={(e) => assignmentForm.setDueDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Để trống nếu bài tập không đặt hạn.</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={assignmentForm.durationDays}
                          onChange={(e) => assignmentForm.setDurationDays(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                        />
                        <span className="text-xs font-bold text-slate-300">ngày</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Học viên vào lớp sau sẽ có đủ {Number(assignmentForm.durationDays) || 7} ngày kể từ ngày tham gia.
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-2xl border border-[#1e3a70] bg-[#132247]/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200">Giao cho</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {assignmentForm.recipients === null
                          ? `Cả lớp · ${assignableStudents.length} học viên`
                          : assignmentForm.recipients.length === 0
                            ? "Chưa chọn học viên nào"
                            : `${assignmentForm.recipients.length} học viên được chọn`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => assignmentForm.setRecipients(null)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition ${assignmentForm.recipients === null ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300 hover:text-white"}`}
                    >
                      Cả lớp
                    </button>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {assignableStudents.length === 0 && (
                      <p className="text-[11px] text-slate-400">Lớp chưa có học viên nào được duyệt.</p>
                    )}
                    {assignableStudents.map((student) => {
                      const checked = assignmentForm.recipients?.includes(student.id) ?? false;
                      return (
                        <label
                          key={student.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition ${checked ? "border-sky-400/60 bg-sky-500/10" : "border-[#1e3a70] bg-[#132247] hover:border-slate-600"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => assignmentForm.toggleRecipient(student.id)}
                            className="h-4 w-4 shrink-0 accent-sky-500"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold text-white">{student.name}</span>
                            <span className="block truncate text-[10px] text-slate-400">{student.email}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                    Chọn “Cả lớp” để học viên vào sau cũng nhận bài. Chọn từng bạn nếu chỉ giao cho một nhóm.
                  </p>
                </div>

                {!assignmentFormIsCreate && (
                <div className="rounded-2xl border border-[#1e3a70] bg-[#132247]/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200">Bộ thẻ đã giao</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">
                        {editAssignmentDeckName || "Chưa có tên bộ thẻ"}
                        {editAssignmentCards ? ` · ${editAssignmentCards.length} thẻ` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-sky-500/15 px-2 py-1 text-[10px] font-bold text-sky-200">
                      Chỉ xem
                    </span>
                  </div>

                  {editAssignmentCardsLoading && (
                    <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Đang tải bộ thẻ…
                    </p>
                  )}
                  {!editAssignmentCardsLoading && editAssignmentCardsError && (
                    <p className="mt-3 text-[11px] text-amber-300">{editAssignmentCardsError}</p>
                  )}
                  {!editAssignmentCardsLoading && editAssignmentCards && editAssignmentCards.length === 0 && (
                    <p className="mt-3 text-[11px] text-slate-400">Bài tập này chưa có thẻ.</p>
                  )}
                  {!editAssignmentCardsLoading && editAssignmentCards && editAssignmentCards.length > 0 && (
                    <div className="mt-3 max-h-60 divide-y divide-[#1e3a70] overflow-y-auto rounded-xl border border-[#1e3a70] bg-[#0f1b38]">
                      {editAssignmentCards.map((card, index) => (
                        <div key={`${card.id}-${index}`} className="flex items-start gap-3 px-3 py-2.5">
                          <span className="w-6 shrink-0 pt-0.5 font-mono text-[10px] text-slate-500">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white">{card.korean}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {card.pronunciation ? `${card.pronunciation} · ` : ""}
                              {card.meaning}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => closeAssignmentForm()}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={
                      savingAssignmentEdit ||
                      (assignmentFormIsCreate && (!selectedAssignmentDeck || !isAssignableAssignmentDeck(selectedAssignmentDeck))) ||
                      assignmentForm.title.trim().length < 3 ||
                      (assignmentForm.recipients !== null && assignmentForm.recipients.length === 0) ||
                      (assignmentForm.dueMode === "duration" &&
                        (!Number.isInteger(Number(assignmentForm.durationDays)) ||
                          Number(assignmentForm.durationDays) < 1 ||
                          Number(assignmentForm.durationDays) > 365))
                    }
                    className="cm-btn cm-btn--primary text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingAssignmentEdit ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Đang lưu
                      </>
                    ) : (
                      assignmentFormIsCreate ? "Giao Cho Lớp" : "Lưu thay đổi"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {removeMemberTarget && (
          <div
            className="cd-modal fixed inset-0 z-50 flex items-center justify-center p-4"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) setRemoveMemberTarget(null);
            }}
          >
            <div className="cd-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="cd-confirm-title">
              <span className="cd-confirm-icon">
                <Trash2 className="h-5 w-5" />
              </span>
              <h3 id="cd-confirm-title">
                {removeMemberTarget.pending ? "Từ chối yêu cầu?" : "Xóa thành viên?"}
              </h3>
              <p>
                {removeMemberTarget.pending
                  ? `Bạn có chắc muốn từ chối yêu cầu tham gia lớp của ${removeMemberTarget.name}?`
                  : `Bạn có chắc muốn xóa ${removeMemberTarget.name} khỏi lớp? Hành động này không thể hoàn tác.`}
              </p>
              <div className="cd-confirm-actions">
                <button
                  type="button"
                  className="rd-btn cd-btn-ghost"
                  onClick={() => setRemoveMemberTarget(null)}
                >
                  Hủy
                </button>
                <button type="button" className="rd-btn cd-btn-danger" onClick={handleConfirmRemoveMember}>
                  {removeMemberTarget.pending ? "Từ chối" : "Xóa thành viên"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteClassModal && (
          <div
            className="cd-modal fixed inset-0 z-50 flex items-center justify-center p-4"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget && !deletingClass) setShowDeleteClassModal(false);
            }}
          >
            <div className="cd-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="cd-delete-class-title">
              <span className="cd-confirm-icon">
                <Trash2 className="h-5 w-5" />
              </span>
              <h3 id="cd-delete-class-title">Xóa lớp học?</h3>
              <p>
                Bạn có chắc muốn xóa lớp <strong>{selectedClass?.name}</strong>? Toàn bộ thành viên, bài tập và
                tiến độ sẽ bị xóa vĩnh viễn và không thể khôi phục.
              </p>
              <div className="cd-confirm-actions">
                <button
                  type="button"
                  className="rd-btn cd-btn-ghost"
                  onClick={() => setShowDeleteClassModal(false)}
                  disabled={deletingClass}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="rd-btn cd-btn-danger"
                  onClick={handleDeleteClass}
                  disabled={deletingClass}
                >
                  {deletingClass ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang xóa
                    </>
                  ) : (
                    "Xóa lớp"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {roleChangeTarget && (
          <div
            className="cd-modal fixed inset-0 z-50 flex items-center justify-center p-4"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) setRoleChangeTarget(null);
            }}
          >
            <div className="cd-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="cd-role-title">
              <span className="cd-confirm-icon cd-confirm-icon--info">
                <Users className="h-5 w-5" />
              </span>
              <h3 id="cd-role-title">Đổi vai trò thành viên?</h3>
              <p>
                Bạn có chắc muốn đổi vai trò của <strong>{roleChangeTarget.name}</strong> từ{" "}
                <strong>{memberRoleName(roleChangeTarget.currentRole)}</strong> sang{" "}
                <strong>{memberRoleName(roleChangeTarget.nextRole)}</strong>? Quyền truy cập của thành viên sẽ
                thay đổi ngay.
              </p>
              <div className="cd-confirm-actions">
                <button
                  type="button"
                  className="rd-btn cd-btn-ghost"
                  onClick={() => setRoleChangeTarget(null)}
                >
                  Hủy
                </button>
                <button type="button" className="rd-btn rd-btn-primary" onClick={handleConfirmRoleChange}>
                  Đổi vai trò
                </button>
              </div>
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
  // Tab "Tham gia lớp học" đếm theo danh mục lớp tìm được, không dùng số liệu lớp của mình.
  const statTitle = mainTab === "mine" ? "Lớp học của tôi" : "Khám phá lớp học";
  const stats =
    mainTab === "mine"
      ? [
          { value: myClasses.length, label: "lớp" },
          { value: approvedMemberTotal, label: "thành viên" },
          { value: openAssignmentCount, label: "bài tập đang mở" },
        ]
      : [
          { value: discoverClasses.length, label: "lớp tìm thấy" },
          { value: discoverClasses.filter((c) => c.myStatus === "approved").length, label: "đã tham gia" },
          { value: discoverClasses.filter((c) => c.myStatus === "pending").length, label: "chờ duyệt" },
        ];

  return (
    <div className="classroom-module cm-page rd">
      <div className="mx-auto mb-4 w-full max-w-3xl space-y-3">
        <div className="flex w-full items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-[#1e3466] dark:bg-[#0f1b38]">
          <div className="flex flex-1 justify-start">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Trở về"
              className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Trở về</span>
            </button>
          )}
          </div>
          <div
            className="grid shrink-0 grid-cols-2 gap-1.5"
            role="tablist"
            aria-label="Chế độ xem lớp học"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === "mine"}
              onClick={() => setMainTab("mine")}
              className={`flex cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-xs font-black transition-all ${
                mainTab === "mine"
                  ? "bg-sky-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              <span>Lớp học</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === "join"}
              onClick={() => setMainTab("join")}
              className={`flex cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-xs font-black transition-all ${
                mainTab === "join"
                  ? "bg-sky-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              <span>Tham gia lớp học</span>
            </button>
          </div>
          <div className="flex-1" aria-hidden="true" />
        </div>
        <div className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center dark:border-[#1e3466] dark:bg-[#0f1b38]">
          <h1 className="text-sm font-black text-white sm:text-base">{statTitle}</h1>
          <dl className="mt-3 grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/10">
            {stats.map((s) => (
              <div key={s.label} className="px-5 text-center">
                <dd className="text-base font-black text-white">{s.value}</dd>
                <dt className="text-[11px] font-bold leading-tight text-slate-700">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {mainTab === "mine" && (
        <div className="space-y-4">
          {msg && (
            <p
              className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${
                msg.type === "error"
                  ? "border border-rose-200 bg-rose-100 text-rose-800"
                  : "border border-emerald-200 bg-emerald-100 text-emerald-800"
              }`}
            >
              {msg.type === "error" ? (
                <XCircle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              <span>{msg.text}</span>
            </p>
          )}

          {loading ? (
            <div className="card-duo flex items-center justify-center gap-2 p-6 text-sm text-slate-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải lớp học…
            </div>
          ) : myClasses.length === 0 ? (
            <div className="card-duo space-y-3 p-8 text-center">
              <p className="text-sm font-black text-white">Chưa có lớp học nào</p>
              <p className="text-xs text-slate-700">
                Nhập mã lớp từ giáo viên, hoặc tạo lớp mới nếu bạn là người phụ trách.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setMainTab("join")}
                  className="cursor-pointer rounded-2xl bg-sky-600 px-5 py-2.5 text-xs font-black text-white transition-colors hover:bg-sky-500"
                >
                  Tham gia bằng mã
                </button>
                <button
                  type="button"
                  onClick={() => (currentUser ? setShowCreateModal(true) : handleOpenAuth(false))}
                  className="cursor-pointer rounded-2xl border border-[#1e3a70] bg-[#132247] px-5 py-2.5 text-xs font-black text-slate-200 transition-colors hover:border-sky-500/40"
                >
                  Tạo lớp học
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {myClasses.map((cls) => {
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
                const due = asg ? dueModeLabel(asg, teacher) : "";

                return (
                  <article
                    key={cls.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedClassId(cls.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedClassId(cls.id);
                      }
                    }}
                    className="cursor-pointer space-y-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-sky-600 dark:border-[#1e3466] dark:bg-[#0f1b38]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                            teacher ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {teacher ? "Bạn phụ trách" : "Học viên"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700">
                          {visibilityLabel(cls.visibility)}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                        <Users className="h-3.5 w-3.5" /> {approvedCount} thành viên
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-white">{cls.name}</h3>
                      <p className="line-clamp-2 text-xs text-slate-700">
                        {cls.description || "Chưa có mô tả."}
                      </p>
                    </div>
                    {asg ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                          <span className="truncate text-slate-700">
                            {openAsg ? "Đang mở: " : ""}
                            {asg.title}
                          </span>
                          <span className="shrink-0 text-slate-700">{due || `${percent}%`}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <span
                            className="block h-full rounded-full bg-sky-600"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="text-[11px] font-bold text-slate-700">
                          <strong className="text-white">{reviewed}</strong>/{asg.totalCards || 0} từ
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] font-bold text-slate-500">Chưa giao bộ thẻ.</p>
                    )}
                    <div className="flex items-center justify-between gap-2 border-t border-[#e2e8f0] pt-3 dark:border-white/10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(cls.code);
                        }}
                        aria-label={`Sao chép mã lớp ${cls.code}`}
                        className="flex cursor-pointer items-center gap-1 font-mono text-[10px] font-bold uppercase text-slate-700 transition-colors hover:text-sky-600"
                      >
                        <span>{cls.code}</span>
                        {copiedCode === cls.code ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      <span className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-[11px] font-black text-white">
                        {teacher ? "Quản lý lớp" : "Vào lớp"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {pendingClasses.length > 0 && (
            <div className="space-y-2 border-t border-[#1e3466] pt-3">
              <h3 className="flex items-center gap-2 text-xs font-black text-white">
                <Clock className="h-4 w-4 text-amber-600" />
                Đang chờ duyệt ({pendingClasses.length})
              </h3>
              {pendingClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#1e3466] bg-[#132247]/50 px-3 py-2"
                >
                  <span className="text-xs font-bold text-white">{cls.name}</span>
                  <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">
                    Chờ chủ lớp duyệt
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mainTab === "join" && (
        <div className="space-y-4">
          <div className="card-duo space-y-4 border-[#1e3466] bg-[#0f1b38] p-6">
            <form
              onSubmit={handleJoinRequest}
              className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <KeyRound className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Nhập mã kích hoạt lớp"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  aria-label="Mã lớp"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-2xl border border-[#1e3a70] bg-[#132247] py-3 pl-11 pr-4 font-mono text-sm font-bold uppercase text-white transition-colors placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-xs font-black text-white transition-colors hover:bg-sky-500"
              >
                <UserPlus className="h-4 w-4" />
                <span>Gửi</span>
              </button>
              <button
                type="button"
                onClick={() => (currentUser ? setShowCreateModal(true) : handleOpenAuth(false))}
                className="shrink-0 cursor-pointer rounded-2xl border border-[#1e3a70] bg-[#132247] px-5 py-3 text-xs font-black text-slate-200 transition-colors hover:border-sky-500/40"
              >
                Tạo lớp học
              </button>
            </form>
            {msg && (
              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${
                  msg.type === "error"
                    ? "border border-rose-200 bg-rose-100 text-rose-800"
                    : "border border-emerald-200 bg-emerald-100 text-emerald-800"
                }`}
              >
                {msg.type === "error" ? (
                  <XCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                )}
                <span>{msg.text}</span>
              </div>
            )}
          </div>

          <>
            {discoverLoading ? (
              <p className="py-6 text-center text-sm text-slate-700">Đang tải danh sách lớp…</p>
            ) : discoverClasses.length === 0 ? (
              <p className="text-xs font-bold text-slate-700">
                Chưa có lớp công khai nào. Nhập mã lớp ở trên để tham gia lớp của giáo viên.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {discoverClasses.map((cls) => {
                  const isPublic = cls.visibility === "public";
                  return (
                    <article
                      key={cls.id}
                      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1e3466] dark:bg-[#0f1b38]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                            isPublic ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          <span>{isPublic ? "Công khai" : "Riêng tư"}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                          <Users className="h-3.5 w-3.5" /> {cls.memberCount} thành viên
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">{cls.name}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-700">
                          {cls.description || "Lớp học chưa có mô tả."}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                          <UserPlus className="h-4 w-4" /> {cls.ownerName}
                        </span>
                        {cls.myStatus === "approved" ? (
                          <button
                            type="button"
                            onClick={() => setSelectedClassId(cls.id)}
                            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-[11px] font-black text-white transition-colors hover:bg-sky-500"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Vào lớp</span>
                          </button>
                        ) : cls.myStatus === "pending" ? (
                          <span className="rounded-xl border border-amber-200 bg-amber-100 px-3 py-2 text-[11px] font-black text-amber-800">
                            Đang chờ duyệt
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleJoinDiscoveredClass(cls)}
                            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#1e3a70] bg-[#132247] px-3.5 py-2 text-[11px] font-black text-slate-200 transition-colors hover:border-sky-500/40"
                          >
                            {isPublic ? <UserPlus className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
                            {isPublic ? "Tham gia" : "Xin tham gia"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        </div>
      )}

      {showCreateModal && (
        <div className="cd-modal fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="cd-modal-card card-duo p-6 bg-[#0f1b38] border-[#1e3466] max-w-md w-full space-y-4 shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
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
