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
  /** Nút "Trở về" hiển thị cùng hàng với hai tab chính. */
  onBack?: () => void;
}

export const ClassroomModule: React.FC<ClassroomModuleProps> = ({ currentUser, demo = false, onClassesChange, initialClassId = null, onBack }) => {
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
    setAssignDeckQuery("");
    setAssignDeckActive(-1);
    setAssignDeckOpen(false);
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
    const saved = await runClassAction({ action: "assignment", classId: selectedClassId, assignmentId, title: assignTitle, deckName: selectedAssignmentDeck.name, ...duePayload, deckCards, mediaAssets });
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
    setAssignDueMode("date");
    setAssignDurationDays("7");
  };

  const openEditAssignment = (assignment: ClassAssignment) => {
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
        <div
          ref={navShellRef}
          className={`rd-nav-shell${navRail ? " rd-nav-shell--rail" : ""}`}
        >
          <nav
            className="rd-nav"
            aria-label="Điều hướng lớp học"
            style={
              canManageClass && !navRail
                ? { transform: wideLandscape ? "translate(-3px, -12px)" : "translate(0px, 1px)" }
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => setSelectedClassId(null)}
              className="rd-nav-back cd-nav-back"
              aria-label="Về danh sách lớp"
            >
              <ChevronLeft className="h-4 w-4" />
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
                    onClick={openAssignModal}
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
                        <span>{dueModeLabel(nextAssignment, true)}</span>
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
                          onClick={openAssignModal}
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
                              {dueModeLabel(asg, canManageClass)}
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
                                <span>TB tiến độ {avg}%</span>
                              </div>

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
                                    onClick={() => openEditAssignment(asg)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    className="rd-btn cd-btn-secondary cd-btn-sm"
                                    onClick={() => setProgressAssignmentId(asg.id)}
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

                  {canDeleteClass && (
                    <div className="cd-danger-zone">
                      <div>
                        <h3>Xóa lớp học</h3>
                        <p>
                          Toàn bộ thành viên, bài tập và tiến độ của lớp sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rd-btn cd-btn-danger"
                        onClick={() => setShowDeleteClassModal(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa lớp
                      </button>
                    </div>
                  )}
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
                        onClick={openAssignModal}
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

        {editAssignmentId && (
          <div
            className="cd-modal fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) setEditAssignmentId(null);
            }}
          >
            <div className="cd-modal-card card-duo p-6 bg-[#0f1b38] border-[#1e3466] max-w-xl w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-amber-400" />
                  <span>Sửa bài tập</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditAssignmentId(null)}
                  className="text-slate-400 hover:text-white p-1"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateAssignment} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tiêu đề bài tập</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={120}
                    value={editAssignmentTitle}
                    onChange={(e) => setEditAssignmentTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Hạn nộp</label>
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditAssignmentDueMode("date")}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${editAssignmentDueMode === "date" ? "border-sky-500/60 bg-sky-500/20" : "border-[#1e3a70] bg-[#132247] text-slate-300"}`} style={editAssignmentDueMode === "date" ? { color: "var(--c-ink)" } : undefined}
                    >
                      Chọn ngày cụ thể
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditAssignmentDueMode("duration")}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${editAssignmentDueMode === "duration" ? "border-sky-500/60 bg-sky-500/20" : "border-[#1e3a70] bg-[#132247] text-slate-300"}`} style={editAssignmentDueMode === "duration" ? { color: "var(--c-ink)" } : undefined}
                    >
                      Số ngày hoàn thành
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditAssignmentDueMode("none")}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${editAssignmentDueMode === "none" ? "border-sky-500/60 bg-sky-500/20" : "border-[#1e3a70] bg-[#132247] text-slate-300"}`} style={editAssignmentDueMode === "none" ? { color: "var(--c-ink)" } : undefined}
                    >
                      Không hạn
                    </button>
                  </div>
                  {editAssignmentDueMode === "none" ? (
                    <p className="text-[11px] text-slate-400">Học viên học lúc nào cũng được, không tính hạn.</p>
                  ) : editAssignmentDueMode === "date" ? (
                    <>
                      <input
                        type="date"
                        value={editAssignmentDueDate}
                        onChange={(e) => setEditAssignmentDueDate(e.target.value)}
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
                          value={editAssignmentDurationDays}
                          onChange={(e) => setEditAssignmentDurationDays(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                        />
                        <span className="text-xs font-bold text-slate-300">ngày</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Học viên vào lớp sau sẽ có đủ {Number(editAssignmentDurationDays) || 7} ngày kể từ ngày tham gia.
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-2xl border border-[#1e3a70] bg-[#132247]/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200">Giao cho</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {editAssignmentRecipients === null
                          ? `Cả lớp · ${assignableStudents.length} học viên`
                          : editAssignmentRecipients.length === 0
                            ? "Chưa chọn học viên nào"
                            : `${editAssignmentRecipients.length} học viên được chọn`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditAssignmentRecipients(null)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition ${editAssignmentRecipients === null ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300 hover:text-white"}`}
                    >
                      Cả lớp
                    </button>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {assignableStudents.length === 0 && (
                      <p className="text-[11px] text-slate-400">Lớp chưa có học viên nào được duyệt.</p>
                    )}
                    {assignableStudents.map((student) => {
                      const checked = editAssignmentRecipients?.includes(student.id) ?? false;
                      return (
                        <label
                          key={student.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition ${checked ? "border-sky-400/60 bg-sky-500/10" : "border-[#1e3a70] bg-[#132247] hover:border-slate-600"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAssignmentRecipient(student.id)}
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

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditAssignmentId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={
                      savingAssignmentEdit ||
                      editAssignmentTitle.trim().length < 3 ||
                      (editAssignmentRecipients !== null && editAssignmentRecipients.length === 0) ||
                      (editAssignmentDueMode === "duration" &&
                        (!Number.isInteger(Number(editAssignmentDurationDays)) ||
                          Number(editAssignmentDurationDays) < 1 ||
                          Number(editAssignmentDurationDays) > 365))
                    }
                    className="cm-btn cm-btn--primary text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingAssignmentEdit ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Đang lưu
                      </>
                    ) : (
                      "Lưu thay đổi"
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

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Hạn Nộp (Hạn Ôn)</label>
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignDueMode("date")}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${assignDueMode === "date" ? "border-sky-500/60 bg-sky-500/20" : "border-[#1e3a70] bg-[#132247] text-slate-300"}`} style={assignDueMode === "date" ? { color: "var(--c-ink)" } : undefined}
                    >
                      Chọn ngày cụ thể
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignDueMode("duration")}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${assignDueMode === "duration" ? "border-sky-500/60 bg-sky-500/20" : "border-[#1e3a70] bg-[#132247] text-slate-300"}`} style={assignDueMode === "duration" ? { color: "var(--c-ink)" } : undefined}
                    >
                      Số ngày hoàn thành
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignDueMode("none")}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${assignDueMode === "none" ? "border-sky-500/60 bg-sky-500/20" : "border-[#1e3a70] bg-[#132247] text-slate-300"}`} style={assignDueMode === "none" ? { color: "var(--c-ink)" } : undefined}
                    >
                      Không hạn
                    </button>
                  </div>
                  {assignDueMode === "none" ? (
                    <p className="text-[11px] text-slate-400">Học viên học lúc nào cũng được, không tính hạn.</p>
                  ) : assignDueMode === "date" ? (
                    <input
                      type="date"
                      value={assignDueDate}
                      onChange={(e) => setAssignDueDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={assignDurationDays}
                          onChange={(e) => setAssignDurationDays(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                        />
                        <span className="text-xs font-bold text-slate-300">ngày</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Học viên vào lớp sau sẽ có đủ {Number(assignDurationDays) || 7} ngày kể từ ngày tham gia.
                      </p>
                    </>
                  )}
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
                      (assignDueMode === "duration" &&
                        (!Number.isInteger(Number(assignDurationDays)) ||
                          Number(assignDurationDays) < 1 ||
                          Number(assignDurationDays) > 365)) ||
                      !selectedAssignmentDeck ||
                      !isAssignableAssignmentDeck(selectedAssignmentDeck)
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
      <div
        ref={navShellRef}
        className={`rd-nav-shell${navRail ? " rd-nav-shell--rail" : ""}`}
      >
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
          <div className="rd-segmented rd-nav-segmented" role="tablist" aria-label="Chế độ xem lớp học">
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === "mine"}
              onClick={() => setMainTab("mine")}
              className="rd-tab"
              title="Lớp học của tôi"
            >
              <Layers className="rd-tab-icon" />
              <span className="rd-tab-label">Lớp học của tôi</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === "join"}
              onClick={() => setMainTab("join")}
              className="rd-tab"
              title="Tham gia lớp học"
            >
              <UserPlus className="rd-tab-icon" />
              <span className="rd-tab-label">Tham gia lớp học</span>
            </button>
          </div>
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
                    const due = asg ? dueModeLabel(asg, teacher) : "";

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
                                <span>{due || `${percent}%`}</span>
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
          <div className="rd-join-layout">
            <section className="rd-join-card" aria-labelledby="join-class-heading">
              <h2 id="join-class-heading" className="rd-join-title">
                Tham gia lớp học
              </h2>
              <p className="rd-join-lead">
                Nhập mã lớp do giáo viên gửi. Lớp công khai sẽ mở ngay, lớp riêng tư cần được duyệt.
              </p>
              <form className="rd-join-form" onSubmit={handleJoinRequest}>
                <label className="rd-join-label" htmlFor="join-code">
                  Mã lớp
                </label>
                <input
                  id="join-code"
                  type="text"
                  placeholder="VD: HAECHI-T1"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Mã lớp"
                  className="rd-join-input"
                />
                <p className="rd-join-help">Bạn có thể dán mã từ tin nhắn của giáo viên.</p>
                {msg && (
                  <p className={`rd-msg ${msg.type === "error" ? "rd-msg--error" : "rd-msg--ok"}`}>
                    {msg.type === "error" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {msg.text}
                  </p>
                )}
                <button type="submit" className="rd-btn rd-btn-primary rd-btn-block rd-join-submit">
                  <span>Gửi yêu cầu</span>
                  <span className="rd-orb" aria-hidden="true">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </form>
              <div className="rd-join-note">
                <Lock className="h-3.5 w-3.5" />
                <p>Yêu cầu tham gia lớp riêng tư sẽ xuất hiện trong thông báo của giáo viên phụ trách.</p>
              </div>
            </section>

            <section className="rd-discover" aria-labelledby="discover-heading">
              <div className="rd-discover-head">
                <h2 id="discover-heading">Lớp đang mở</h2>
                <p className="rd-section-note">{discoverClasses.length} lớp</p>
              </div>

              {discoverLoading ? (
                <div className="rd-panel rd-loading">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải danh sách lớp…
                </div>
              ) : discoverClasses.length === 0 ? (
                <p className="rd-section-note">
                  Chưa có lớp công khai nào. Nhập mã lớp ở trên để tham gia lớp của giáo viên.
                </p>
              ) : (
                <div className="rd-discover-grid">
                  {discoverClasses.map((cls) => {
                    const isPublic = cls.visibility === "public";
                    return (
                      <article key={cls.id} className="rd-discover-card">
                        <div className="rd-discover-core">
                          <div className="rd-discover-top">
                            <span className={`rd-tag ${isPublic ? "rd-tag--public" : ""}`}>
                              {isPublic ? "Công khai" : "Riêng tư"}
                            </span>
                            <button
                              type="button"
                              className="rd-discover-code"
                              onClick={() => copyToClipboard(cls.code)}
                              aria-label={`Sao chép mã lớp ${cls.code}`}
                            >
                              <span>{cls.code}</span>
                              {copiedCode === cls.code ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <h3 className="rd-discover-title">{cls.name}</h3>
                          <p className="rd-discover-desc">{cls.description || "Lớp học chưa có mô tả."}</p>
                          <div className="rd-discover-foot">
                            <span className="rd-discover-teacher">
                              <span>{cls.ownerName}</span>
                              <span>{cls.memberCount} thành viên</span>
                            </span>
                            {cls.myStatus === "approved" ? (
                              <button
                                type="button"
                                className="rd-btn rd-btn-primary rd-btn-sm"
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
                                className="rd-btn rd-btn-sm"
                                onClick={() => handleJoinDiscoveredClass(cls)}
                              >
                                {isPublic ? <UserPlus className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
                                {isPublic ? "Tham gia" : "Xin tham gia"}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
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
