"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import { VOCABULARY_DATA } from "../data/koreanData";
import { loadAdminThthCurriculum } from "../lib/privateLearningContent";
import { AnkiDeck, AnkiReviewEvent, AnkiScheduleMetadata } from "../lib/ankiParser";
import { useApp } from "../contexts/AppProvider";
import {
  Volume2,
  Sparkles,
  ChevronRight,
  ChevronDown,
  X,
  ExternalLink,
  ArrowLeft,
  RotateCcw,
  Search,
  Zap,
  Play,
  Lightbulb,
  Layers,
  BookOpen,
  CheckCircle2,
  Compass,
  ArrowRight,
} from "lucide-react";
import { ankiScheduleToFSRSState, calculateFSRS45, formatLocalDate, isFSRSCardDue, FSRSRating, FSRSState } from "../lib/fsrs45";
import { ApiClient } from "../lib/apiClient";
import { DailyLimitsPanel } from "./DailyLimitsPanel";
import { useStudyBackground } from "../lib/studyBackground";
import { addExtraNew, DailyLimits, DEFAULT_LIMITS, effectiveNewLimit, loadLimits, loadProgress, recordCard, remaining, saveLimits } from "../lib/dailyLimits";
import { speakKorean } from "../lib/koreanSpeech";
import { inferTopikLevel, getCourseRank } from "../lib/studyRanks";
import { LockKeyhole, Globe2 } from "lucide-react";
import { VocabularySizeTest } from "./VocabularySizeTest";

interface VocabularySRSModuleProps {
  userDecks?: AnkiDeck[];
  initialViewMode?: "dashboard" | "study";
}

export interface VocabularyCard {
  id: number | string;
  /** Thẻ anh em của cùng một note: "typing" = nhìn nghĩa gõ chữ, có lịch ôn riêng. Không có = thẻ Review (nhìn chữ đoán nghĩa). */
  sibling?: "typing";
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
  ankiSchedule?: AnkiScheduleMetadata;
  reviewHistory?: AnkiReviewEvent[];
}

export interface DeckTreeNode {
  id: string;
  title: string;
  subtitle?: string;
  cards: VocabularyCard[];
  children?: DeckTreeNode[];
}

// Clean image string helper
const stateKeyOf = (c: VocabularyCard) => `${c.deckName || "deck"}_${c.id}${c.sibling ? "_typing" : ""}`;
// Lịch Anki cũ chỉ thuộc thẻ Review; thẻ Typing luôn bắt đầu từ mới.
const cardStateFor = (map: Record<string, FSRSState>, key: string, card: VocabularyCard): FSRSState =>
  map[key] || (card.ankiSchedule && !card.sibling ? ankiScheduleToFSRSState(card.ankiSchedule) : undefined) || {
    interval: 1,
    reps: 0,
    lapses: 0,
    state: "new",
    dueDate: formatLocalDate(new Date()),
    stability: 0,
    difficulty: 5,
    lastReview: null,
    easeFactor: 2.5,
    learningSteps: 0,
  };

/** Anki-style label for the next review gap, e.g. "10 phút", "5 ngày". */
const formatNextReview = (state: FSRSState, now = new Date()): string => {
  const minutes = Math.max(1, Math.round((new Date(state.dueAt || `${state.dueDate}T00:00:00`).getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} phút`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} giờ`;
  const days = Math.max(1, state.interval || Math.round(minutes / 1440));
  if (days < 30) return `${days} ngày`;
  if (days < 365) return `${Math.round(days / 30)} tháng`;
  return `${Math.round(days / 36.5) / 10} năm`;
};

const extractImageSrc = (imgStr?: string): string | null => {
  if (!imgStr) return null;
  const match = imgStr.match(/src=["']([^"']+)["']/i);
  if (match) {
    const src = match[1];
    return src.startsWith("http") || src.startsWith("/") ? src : `/${src}`;
  }
  if (imgStr.startsWith("http") || imgStr.startsWith("/")) return imgStr;
  if (imgStr.includes("<img")) return null;
  return `/${imgStr}`;
};

// Clean HTML text helper
const cleanHtmlText = (htmlContent?: string): string => {
  if (!htmlContent) return "";
  const withoutAudio = htmlContent.replace(/\[sound:.*?\]/gi, "").trim();
  if (typeof window !== "undefined" && DOMPurify && typeof DOMPurify.sanitize === "function") {
    return DOMPurify.sanitize(withoutAudio, { USE_PROFILES: { html: true } });
  }
  return withoutAudio;
};

const cleanTextOnly = (str?: string): string => {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").replace(/\[sound:.*?\]/gi, "").trim();
};

const toSlug = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const VocabularySRSModule: React.FC<VocabularySRSModuleProps> = ({ userDecks = [], initialViewMode = "dashboard" }) => {
  const { currentUser, isAuthReady, setActiveStudySession, removedBuiltInDeckIds, userDecks: ownedDecks, setUserDecks, handleOpenAuth } = useApp();
  const isAdmin = currentUser?.role === "admin";
  const [adminThthDecks, setAdminThthDecks] = useState<any[]>([]);
  // Cây bộ thẻ phụ thuộc người dùng và kho thẻ đọc từ localStorage: chỉ dựng sau khi hydrate để HTML tĩnh khớp bản client.
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const studyBg = useStudyBackground();
  const router = useRouter();
  // Trang đã mở màn học (Trang chủ, chi tiết bộ thẻ...): bấm Trở về thì quay lại đó thay vì ở lại danh sách Từ vựng.
  const returnToRef = useRef<string | null>(null);
  const autoResumedRef = useRef(false);
  // Chế độ tối: nút "Hiện đáp án" màu xám như nút Trở về; nếu đang dùng nền gradient thì nút đi theo màu gradient đó.
  const revealStyle = {
    color: "#fff",
    ...(studyBg.kind === "gradient" ? { "--reveal-bg": `linear-gradient(90deg, ${studyBg.from}, ${studyBg.to})` } : {}),
  } as React.CSSProperties;
  // Bề rộng thanh bên (0 khi ẩn trên điện thoại) để canh thanh Quên/Thuộc vào giữa vùng nội dung.
  const [sidebarWidth, setSidebarWidth] = useState(0);
  useEffect(() => {
    const aside = document.querySelector("aside");
    if (!aside) return;
    const update = () => setSidebarWidth(aside.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(aside);
    return () => observer.disconnect();
  }, []);
  // Navigation View: "dashboard" (Lộ trình cây bài học) | "study" (Màn hình học)
  const [viewMode, setViewMode] = useState<"dashboard" | "study">(initialViewMode);

  // Selected Deck and Lesson
  const [activeDeckTitle, setActiveDeckTitle] = useState<string>("1. Quốc gia (나라)");
  const [activeCardsList, setActiveCardsList] = useState<VocabularyCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [typedInput, setTypedInput] = useState<string>("");

  // Search and tree expansion for the learner's active library.
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDecks, setExpandedDecks] = useState<Record<string, boolean>>({});
  const [visibilityBusyDeckId, setVisibilityBusyDeckId] = useState<string | null>(null);

  // Modal zoom image
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Resume banner state
  const [lastStudiedDeckId, setLastStudiedDeckId] = useState<string | null>(null);
  const [lastStudiedTitle, setLastStudiedTitle] = useState<string | null>(null);

  // FSRS & Local Storage Card Memory
  const [masteredWords, setMasteredWords] = useState<string[]>([]);
  const [reviewList, setReviewList] = useState<string[]>([]);
  const masteredWordSet = useMemo(() => new Set(masteredWords), [masteredWords]);
  const reviewWordSet = useMemo(() => new Set(reviewList), [reviewList]);
  const [cardStateMap, setCardStateMap] = useState<Record<string, FSRSState>>({});
  const [dailyLimits, setDailyLimits] = useState<DailyLimits>(DEFAULT_LIMITS);
  const [dailyProgress, setDailyProgress] = useState(() => ({ newDone: 0, reviewDone: 0, extraNew: 0 }));
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  // Đã chạm giới hạn từ mới mà người học bấm vào một bộ: hỏi muốn học thêm bao nhiêu từ mới.
  const [morePrompt, setMorePrompt] = useState<{ deckId: string; title: string; cards: VocabularyCard[]; available: number } | null>(null);
  const [moreAmount, setMoreAmount] = useState("10");

  useEffect(() => {
    setDailyLimits(loadLimits());
    setDailyProgress(loadProgress());
  }, []);

  useEffect(() => {
    let active = true;
    if (isAdmin) {
      void loadAdminThthCurriculum().then((decks) => { if (active) setAdminThthDecks(decks || []); });
    } else setAdminThthDecks([]);
    return () => { active = false; };
  }, [isAdmin, currentUser?.id]);

  const updateLimits = useCallback((next: DailyLimits) => {
    setDailyLimits(next);
    saveLimits(next);
    setLimitNotice(null);
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const answerShownAtRef = useRef(0);
  const lastRatedCardRef = useRef<string | null>(null);
  const srsActivityRef = useRef({ reviewed: 0, correct: 0, activeSeconds: 0, lastTickAt: 0, lastInteractionAt: 0, submitted: false });

  const tickSrsActivity = useCallback(() => {
    const activity = srsActivityRef.current;
    const now = Date.now();
    const elapsedMs = now - activity.lastTickAt;
    // Discard long timer gaps (backgrounded mobile tabs) and time after 2 min idle.
    if (
      elapsedMs > 0 && elapsedMs <= 15_000 &&
      typeof document !== "undefined" && document.visibilityState === "visible" &&
      now - activity.lastInteractionAt <= 120_000
    ) {
      activity.activeSeconds += elapsedMs / 1000;
    }
    activity.lastTickAt = now;
  }, []);

  useEffect(() => {
    if (viewMode !== "study" || typeof window === "undefined") return;
    const markActivity = () => {
      tickSrsActivity();
      srsActivityRef.current.lastInteractionAt = Date.now();
    };
    const handleVisibility = () => {
      tickSrsActivity();
      const now = Date.now();
      srsActivityRef.current.lastTickAt = now;
      if (document.visibilityState === "visible") srsActivityRef.current.lastInteractionAt = now;
    };
    const timer = window.setInterval(tickSrsActivity, 5_000);
    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("keydown", markActivity);
    window.addEventListener("touchstart", markActivity, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("touchstart", markActivity);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [viewMode, tickSrsActivity]);

  const revealAnswer = useCallback(() => {
    if (!isFlipped) answerShownAtRef.current = Date.now();
    setIsFlipped(true);
  }, [isFlipped]);

  const finishSrsActivity = useCallback(() => {
    const activity = srsActivityRef.current;
    if (!currentUser || activity.submitted || activity.reviewed < 1) return;
    activity.submitted = true;
    tickSrsActivity();
    const durationSeconds = Math.min(1_800, Math.round(activity.activeSeconds));
    if (durationSeconds < 10) return;
    void ApiClient.recordStudySession("srs", activity.reviewed, activity.correct, 1, durationSeconds).catch(() => {});
  }, [currentUser, tickSrsActivity]);

  useEffect(() => {
    answerShownAtRef.current = 0;
    lastRatedCardRef.current = null;
  }, [currentCardIndex, activeDeckTitle]);

  // Initialize storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedMastered = JSON.parse(localStorage.getItem("haechivn_mastered") || "[]");
      const savedReviews = JSON.parse(localStorage.getItem("haechivn_reviews_list") || "[]");
      const savedLastId = localStorage.getItem("haechivn_last_lesson_id");
      const savedLastTitle = localStorage.getItem("haechivn_last_lesson_title");
      setMasteredWords(savedMastered);
      setReviewList(savedReviews);
      setLastStudiedDeckId(savedLastId);
      setLastStudiedTitle(savedLastTitle);

      const srsKey = currentUser ? `haechivn_srs_state_${currentUser.id}` : "haechivn_srs_state_guest";
      const srsData = localStorage.getItem(srsKey);
      if (srsData) {
        setCardStateMap(JSON.parse(srsData));
      }
    } catch (e) {
      console.warn("Storage init warning", e);
    }
  }, [currentUser]);

  // Group THTH Decks into 3 Levels:
  // Level 1: Book (e.g. "Tiếng Hàn Tổng Hợp 1")
  //   Level 2: Lesson (e.g. "Bài 01")
  //     Level 3: Sub-deck (e.g. "1. Quốc gia (나라)")
  const deckTree = useMemo<DeckTreeNode[]>(() => {
    const rootNodes: DeckTreeNode[] = [];
    if (!hydrated) return rootNodes;

    const booksMap = new Map<string, Map<string, { id: string; title: string; cards: VocabularyCard[] }[]>>();

    if (isAdmin) adminThthDecks.forEach((d) => {
      const parts = d.name.split("::");
      // e.g. ["Tiếng Hàn Tổng Hợp", "Quyển 01", "Bài 01", "1. Quốc gia (나라)"]
      const rawBook = parts[1]?.trim() || "Quyển 01";
      const bookNum = rawBook.match(/\d+/)?.[0] || "1";
      const bookNumber = parseInt(bookNum, 10);

      const bookTitle = `Tiếng Hàn Tổng Hợp ${bookNumber}`;
      const lessonTitle = parts[2]?.trim() || "Bài 01";
      const subdeckTitle = parts[3]?.trim() || parts[parts.length - 1];

      if (!booksMap.has(bookTitle)) {
        booksMap.set(bookTitle, new Map());
      }
      const lessonsMap = booksMap.get(bookTitle)!;
      if (!lessonsMap.has(lessonTitle)) {
        lessonsMap.set(lessonTitle, []);
      }
      lessonsMap.get(lessonTitle)!.push({
        id: d.id,
        title: subdeckTitle,
        cards: d.cards as VocabularyCard[],
      });
    });

    // Build Book Nodes -> Lesson Nodes -> Sub-deck Nodes
    booksMap.forEach((lessonsMap, bookTitle) => {
      const rootBookNumber = Number(bookTitle.match(/\d+$/)?.[0] || 1);
      const lessonNodes: DeckTreeNode[] = [];
      const allBookCards: VocabularyCard[] = [];

      lessonsMap.forEach((subdecks, lessonTitle) => {
        const allLessonCards = subdecks.flatMap((s) => s.cards);
        allBookCards.push(...allLessonCards);

        const leafNodes: DeckTreeNode[] = subdecks.map((s) => ({
          id: s.id,
          title: s.title,
          cards: s.cards,
        }));

        const cleanKey = toSlug(`${bookTitle}-${lessonTitle}`);
        lessonNodes.push({
          id: cleanKey,
          title: lessonTitle,
          cards: allLessonCards,
          children: leafNodes,
        });
      });

      const bookId = toSlug(bookTitle);
      rootNodes.push({
        id: bookId,
        title: bookTitle,
        subtitle: rootBookNumber === 1 ? "Sơ cấp 1, TOPIK 1–2" : "Sơ cấp 2, TOPIK 2–3",
        cards: allBookCards,
        children: lessonNodes,
      });
    });

    // Group 2: Từ Vựng Cơ Bản
    if (VOCABULARY_DATA.length > 0) {
      const basicCards: VocabularyCard[] = VOCABULARY_DATA.map((item, idx) => ({
        id: `basic-${idx + 1}`,
        code: item.id,
        word: item.hangul,
        meaning: item.vietnamese,
        pos: item.topic || "Từ vựng",
        transliteration: "",
        explain: "",
        image: "",
        example: item.exampleSentence || "",
        example_translated: "",
        collocation: "",
        synonym: "",
        antonym: "",
        audio_word: "",
        audio_meaning: "",
        audio_example: "",
        tag_1: "Cơ bản",
        tag_2: item.topic || "Giao tiếp",
        deckName: "Từ vựng cơ bản",
      }));

      rootNodes.push({
        id: "korean-basic",
        title: "Từ Vựng Tiếng Hàn Cơ Bản",
        cards: basicCards,
      });
    }

    // User-owned and Explore decks are independent decks, at the same level
    // as the curriculum decks. Do not hide them inside an aggregate parent.
    if (userDecks && userDecks.length > 0) {
      const userNodes: DeckTreeNode[] = userDecks.map((ud) => {
        const isTopicVocabularyDeck = ud.id === "curated-course-topic-vocabulary";
        const detectedTopik = isTopicVocabularyDeck ? undefined : inferTopikLevel(ud.name, ...ud.cards.flatMap((card) => card.tags || []));
        const toVocabularyCard = (c: AnkiDeck["cards"][number], idx: number): VocabularyCard => ({
          id: c.id || `custom-${idx}`,
          word: c.koreanText || c.frontText || "",
          meaning: c.vietnameseMeaning || c.backText || "",
          pos: "Từ vựng",
          transliteration: "",
          explain: "",
          image: c.imageUrls?.[0] ? `<img src="${c.imageUrls[0]}" />` : "",
          example: c.exampleSentence || "",
          example_translated: "",
          tag_1: "Anki Custom",
          tag_2: c.deckName?.split("::").slice(1).join("::") || "",
          deckName: c.deckName || ud.name,
          ankiSchedule: c.ankiSchedule,
          reviewHistory: c.reviewHistory,
        });
        const cards = ud.cards.map(toVocabularyCard);
        type ImportTreeBranch = { title: string; path: string; entries: Array<{ card: AnkiDeck["cards"][number]; idx: number }>; children: Map<string, ImportTreeBranch> };
        const subdeckRoot: ImportTreeBranch = { title: "", path: "", entries: [], children: new Map() };
        ud.cards.forEach((card, idx) => {
          const rawParts = (card.deckName || ud.name).split("::").map((part) => part.trim()).filter(Boolean);
          const parts = rawParts[0] === ud.name ? rawParts.slice(1) : rawParts;
          let branch = subdeckRoot;
          const pathParts: string[] = [];
          for (const part of parts) {
            pathParts.push(part);
            let child = branch.children.get(part);
            if (!child) {
              child = { title: part, path: pathParts.join("::"), entries: [], children: new Map() };
              branch.children.set(part, child);
            }
            branch = child;
            branch.entries.push({ card, idx });
          }
        });
        const buildSubdeckNodes = (branch: ImportTreeBranch): DeckTreeNode[] => [...branch.children.values()]
          .sort((a, b) => a.title.localeCompare(b.title, "ko", { numeric: true }))
          .map((child) => ({
            id: `user-${ud.id}-${toSlug(child.path)}`,
            title: child.title,
            cards: child.entries.map(({ card, idx }) => toVocabularyCard(card, idx)),
            children: buildSubdeckNodes(child),
          }));
        const subdeckChildren = buildSubdeckNodes(subdeckRoot);
        return ({
        id: `user-${ud.id}`,
        title: ud.name,
        subtitle: isTopicVocabularyDeck ? "TOPIK 1–6, chọn chủ đề để học" : detectedTopik ? `${getCourseRank(detectedTopik)}, TOPIK ${detectedTopik}` : "Chưa gán cấp độ",
        cards,
        children: subdeckChildren.length ? subdeckChildren : undefined,
      });
      });

      // Older Anki imports were saved as one user deck per full subdeck name
      // (for example "Tiếng Hàn Tổng Hợp::Quyển 01::Bài 01"). Present them as
      // one curriculum tree instead of flooding the top-level deck list.
      const ththRoots = userNodes.filter((node) => node.title === "Tiếng Hàn Tổng Hợp" || node.title.startsWith("Tiếng Hàn Tổng Hợp::"));
      const otherUserRoots = userNodes.filter((node) => !ththRoots.includes(node));

      if (ththRoots.length > 0) {
        type ThthBranch = {
          title: string;
          path: string;
          cards: VocabularyCard[];
          children: Map<string, ThthBranch>;
          source?: DeckTreeNode;
        };
        const ththRoot: ThthBranch = {
          title: "Tiếng Hàn Tổng Hợp",
          path: "",
          cards: [],
          children: new Map(),
        };

        for (const source of ththRoots) {
          const parts = source.title === "Tiếng Hàn Tổng Hợp"
            ? []
            : source.title.slice("Tiếng Hàn Tổng Hợp::".length).split("::").filter(Boolean);
          let branch = ththRoot;
          const pathParts: string[] = [];
          branch.cards.push(...source.cards);
          for (const part of parts) {
            pathParts.push(part);
            let child = branch.children.get(part);
            if (!child) {
              child = { title: part, path: pathParts.join("::"), cards: [], children: new Map() };
              branch.children.set(part, child);
            }
            branch = child;
            branch.cards.push(...source.cards);
          }
          branch.source = source;
        }

        const buildThthChildren = (branch: ThthBranch): DeckTreeNode[] => [...branch.children.values()]
          .sort((a, b) => a.title.localeCompare(b.title, "ko", { numeric: true }))
          .map((child) => {
            const children = [...(child.source?.children || []), ...buildThthChildren(child)];
            return {
              id: child.source?.id || `user-thth-${toSlug(child.path)}`,
              title: child.title,
              subtitle: child.source?.subtitle,
              cards: child.cards,
              children: children.length > 0 ? children : undefined,
            };
          });

        const ththSource = ththRoots.find((node) => node.title === "Tiếng Hàn Tổng Hợp");
        rootNodes.push({
          id: ththSource?.id || "user-thth-root",
          title: "Tiếng Hàn Tổng Hợp",
          subtitle: "Giáo trình · chọn quyển và bài để học",
          cards: ththRoot.cards,
          children: [
            ...(ththSource?.children || []),
            ...buildThthChildren(ththRoot),
          ],
        });
      }

      rootNodes.push(...otherUserRoots);
    }

    return rootNodes;
  }, [hydrated, userDecks, isAdmin, adminThthDecks, removedBuiltInDeckIds]);

  // Đếm trạng thái theo cùng nguồn FSRS dùng khi mở lượt học, không dùng danh sách legacy theo tên từ.
  const getDeckStats = useCallback((cards: VocabularyCard[]) => {
    const now = new Date();
    const playableCards = cards.filter((card) => card.ankiSchedule?.queue !== -1).flatMap((card) => [card, { ...card, sibling: "typing" as const }]);
    const total = playableCards.length;
    if (total === 0) return { total: 0, mastered: 0, percent: 0, newCount: 0, reviewCount: 0 };
    let mastered = 0;
    let newCount = 0;
    let reviewCount = 0;
    for (const card of playableCards) {
      const state = cardStateMap[stateKeyOf(card)] || (card.ankiSchedule && !card.sibling ? ankiScheduleToFSRSState(card.ankiSchedule) : undefined);
      if (!state || state.state === "new") {
        newCount += 1;
        continue;
      }
      mastered += 1;
      if (isFSRSCardDue(state, now)) reviewCount += 1;
    }
    // This column is today's queue completion, not lifetime familiarity.
    const pending = newCount + reviewCount;
    const percent = pending === 0 ? 100 : Math.min(99, Math.round(((total - pending) / total) * 100));
    return { total, mastered, percent, newCount, reviewCount };
  }, [cardStateMap]);

  // Exit study session
  const exitStudy = useCallback(() => {
    finishSrsActivity();
    setViewMode("dashboard");
    setIsFlipped(false);
    setTypedInput("");
    setActiveStudySession(null);
    const returnTo = returnToRef.current;
    returnToRef.current = null;
    if (returnTo) router.push(returnTo);
  }, [finishSrsActivity, setActiveStudySession, router]);

  // Start study session (Filter only unlearned / review cards via FSRS state)
  const startStudy = useCallback((deckId: string, title: string, cards: VocabularyCard[], options?: { skipMorePrompt?: boolean }) => {
    if (!cards || cards.length === 0) return;

    // Lọc thẻ: chỉ lấy thẻ mới hoặc đến hạn, rồi áp giới hạn mỗi ngày (ôn lại trước, từ mới sau).
    const now = new Date();
    const progress = loadProgress();
    const newLeft = remaining(effectiveNewLimit(dailyLimits, progress), progress.newDone);
    const reviewLeft = remaining(dailyLimits.reviewPerDay, progress.reviewDone);
    const dueCards: VocabularyCard[] = [];
    const newCards: VocabularyCard[] = [];
    // Mỗi từ có 2 thẻ: Review (nhìn chữ đoán nghĩa) rồi Typing (nhìn nghĩa gõ chữ), lịch ôn riêng từng thẻ.
    const queue = (kind?: "typing") => {
      for (const base of cards) {
        // Anki's suspended queue is intentional; keep it out of the review queue.
        if (base.ankiSchedule?.queue === -1) continue;
        const c = kind ? { ...base, sibling: kind } : base;
        const state = cardStateMap[stateKeyOf(c)] || (!kind && c.ankiSchedule ? ankiScheduleToFSRSState(c.ankiSchedule) : undefined);
        if (state && state.state !== "new" && !isFSRSCardDue(state, now)) continue;
        (state && state.state !== "new" ? dueCards : newCards).push(c);
      }
    };
    queue();
    queue("typing");
    const activeList = [...dueCards.slice(0, reviewLeft), ...newCards.slice(0, newLeft)];
    setDailyProgress(progress);
    if (newLeft === 0 && newCards.length > 0 && !options?.skipMorePrompt) {
      setMoreAmount(String(Math.min(5, newCards.length)));
      setMorePrompt({ deckId, title, cards, available: newCards.length });
      return;
    }
    if (activeList.length === 0) {
      setLimitNotice(dueCards.length + newCards.length > 0
        ? "Bạn đã đạt giới hạn học hôm nay. Phần còn lại sẽ chuyển sang ngày mai, hoặc tăng giới hạn ở mục tiêu hôm nay."
        : "Bộ thẻ này đã hết thẻ cần học hôm nay. FSRS sẽ đưa thẻ trở lại khi đến hạn ôn.");
      return;
    }
    setLimitNotice(null);

    setActiveDeckTitle(title);
    setActiveCardsList(activeList);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setTypedInput("");
    setViewMode("study");
    answerShownAtRef.current = 0;
    lastRatedCardRef.current = null;
    const activityStartedAt = Date.now();
    srsActivityRef.current = {
      reviewed: 0,
      correct: 0,
      activeSeconds: 0,
      lastTickAt: activityStartedAt,
      lastInteractionAt: activityStartedAt,
      submitted: false,
    };

    setActiveStudySession({
      title,
      onExit: exitStudy,
      progressText: activeList.length > 0 ? `1 / ${activeList.length}` : "Hoàn thành",
    });

    setLastStudiedDeckId(deckId);
    setLastStudiedTitle(title);
    if (typeof window !== "undefined") {
      localStorage.setItem("haechivn_last_lesson_id", deckId);
      localStorage.setItem("haechivn_last_lesson_title", title);
    }
  }, [cardStateMap, currentUser, dailyLimits, exitStudy, setActiveStudySession]);

  // Recursive search for node by id
  const findNodeById = useCallback((nodes: DeckTreeNode[], id: string): DeckTreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Resume last lesson (fallback to first available subdeck/lesson)
  const resumeLastLesson = useCallback(() => {
    const targetId = lastStudiedDeckId;
    if (targetId) {
      const found = findNodeById(deckTree, targetId);
      if (found) {
        startStudy(found.id, found.title, found.cards);
        return;
      }
    }
    // Never guess a lesson: if the saved lesson was removed or is unavailable,
    // keep the learner on the deck list instead of starting an unrelated deck.
    setViewMode("dashboard");
    setActiveStudySession(null);
  }, [lastStudiedDeckId, deckTree, findNodeById, startStudy]);

  // Số thẻ còn lại trong lượt học: thẻ mới (chưa có lịch ôn) và thẻ ôn lại, tính từ thẻ đang học trở đi.
  const remainingCounts = useMemo(() => {
    let newCount = 0;
    let reviewCount = 0;
    for (const card of activeCardsList.slice(currentCardIndex)) {
      const state = cardStateMap[stateKeyOf(card)];
      if (state && state.state !== "new") reviewCount += 1;
      else newCount += 1;
    }
    return { newCount, reviewCount };
  }, [activeCardsList, currentCardIndex, cardStateMap]);

  // Sync study session with App context for Navbar controls
  useEffect(() => {
    if (viewMode === "study") {
      setActiveStudySession({
        title: activeDeckTitle,
        onExit: exitStudy,
        progressText: activeCardsList.length > 0 ? `${currentCardIndex + 1} / ${activeCardsList.length}` : "Hoàn thành",
        progressPercent: activeCardsList.length > 0 ? Math.round((currentCardIndex / activeCardsList.length) * 100) : 0,
        remainingNew: remainingCounts.newCount,
        remainingReview: remainingCounts.reviewCount,
      });
    }
  }, [viewMode, activeDeckTitle, exitStudy, currentCardIndex, activeCardsList.length, remainingCounts, setActiveStudySession]);

  // Auto-resume if query param ?resume=true or ?study=true is present
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autoResumedRef.current || !isAuthReady) return; // đợi tài khoản và bộ thẻ lưu trên máy nạp xong
    const params = new URLSearchParams(window.location.search);
    // Chờ cây bộ thẻ dựng xong rồi mới vào học; nếu vào sớm quá thì không có bài nào để mở.
    if ((params.get("resume") === "true" || params.get("study") === "true") && deckTree.length > 0) {
      const requestedDeckId = params.get("deckId");
      const requestedDeck = requestedDeckId ? findNodeById(deckTree, requestedDeckId) : null;
      if (requestedDeckId && !requestedDeck) return; // bộ Explore có thể đang được khôi phục từ máy chủ
      autoResumedRef.current = true;
      const from = params.get("from");
      returnToRef.current = from && from.startsWith("/") && !from.startsWith("//") ? from : null;
      window.history.replaceState(null, "", window.location.pathname);
      if (requestedDeck) startStudy(requestedDeck.id, requestedDeck.title, requestedDeck.cards);
      else if (params.get("resume") === "true" || params.get("study") === "true") resumeLastLesson();
    }
  }, [isAuthReady, resumeLastLesson, startStudy, findNodeById, deckTree]);

  // Collect all container ids for toggle all
  const getAllContainerIds = useCallback((nodes: DeckTreeNode[]): string[] => {
    let ids: string[] = [];
    nodes.forEach((n) => {
      if (n.children && n.children.length > 0) {
        ids.push(n.id);
        ids = ids.concat(getAllContainerIds(n.children));
      }
    });
    return ids;
  }, []);

  const toggleGroup = (id: string) => {
    setExpandedDecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter tree recursively for search query
  const filterTree = useCallback((nodes: DeckTreeNode[], q: string): DeckTreeNode[] => {
    return nodes
      .map((node) => {
        const matchSelf =
          node.title.toLowerCase().includes(q) ||
          (!node.children?.length && node.cards.some(
            (c) =>
              c.word.toLowerCase().includes(q) ||
              c.meaning.toLowerCase().includes(q)
          ));

        if (node.children && node.children.length > 0) {
          const filteredChildren = filterTree(node.children, q);
          if (filteredChildren.length > 0 || matchSelf) {
            return { ...node, children: filteredChildren };
          }
          return null;
        }

        return matchSelf ? node : null;
      })
      .filter(Boolean) as DeckTreeNode[];
  }, []);

  const filteredTree = useMemo(() => {
    return searchQuery.trim() ? filterTree(deckTree, searchQuery.toLowerCase()) : deckTree;
  }, [deckTree, searchQuery, filterTree]);

  // Sync active study session to global Navbar
  useEffect(() => {
    if (viewMode === "study") {
      setActiveStudySession({
        title: activeDeckTitle,
        onExit: exitStudy,
        progressText: activeCardsList.length > 0 ? `${currentCardIndex + 1} / ${activeCardsList.length}` : "",
        progressPercent: activeCardsList.length > 0 ? Math.round((currentCardIndex / activeCardsList.length) * 100) : 0,
        remainingNew: remainingCounts.newCount,
        remainingReview: remainingCounts.reviewCount,
      });
    } else {
      setActiveStudySession(null);
    }
    return () => {
      setActiveStudySession(null);
    };
  }, [viewMode, activeDeckTitle, exitStudy, currentCardIndex, activeCardsList.length, remainingCounts, setActiveStudySession]);

  const currentCard = activeCardsList[currentCardIndex] || activeCardsList[0];
  const studyMode = currentCard?.sibling ? "typing" : "flip";
  const nextReviewLabel = (rating: FSRSRating): string => {
    if (!currentCard) return "";
    try {
      return ` (${formatNextReview(calculateFSRS45(rating, cardStateFor(cardStateMap, stateKeyOf(currentCard), currentCard)))})`;
    } catch {
      return "";
    }
  };

  // Sound playback helper
  const playCurrentSound = useCallback(() => {
    if (!currentCard) return;
    const wordText = cleanTextOnly(currentCard.word);
    speakKorean(wordText);
  }, [currentCard]);

  // Speak each card when a study session starts and whenever the learner moves
  // to another card. Depend on its text/index so unrelated renders do not replay it.
  const currentWordForAudio = currentCard ? cleanTextOnly(currentCard.word) : "";
  useEffect(() => {
    // Thẻ Typing: đọc to từ sẽ lộ đáp án, nên không tự phát.
    if (viewMode === "study" && currentWordForAudio && !currentCard?.sibling) speakKorean(currentWordForAudio);
  }, [viewMode, currentCardIndex, currentWordForAudio, currentCard?.sibling]);

  // Handle Response (Quên: false | Thuộc: true)
  const handleResponse = useCallback((isMastered: boolean, customRating?: FSRSRating) => {
    if (!currentCard) return;
    if (studyMode === "typing" && isMastered && typedInput.trim().normalize("NFC") !== cleanTextOnly(currentCard.word).normalize("NFC")) return;
    const wordKey = currentCard.word;
    const activeKey = stateKeyOf(currentCard);
    if (lastRatedCardRef.current === activeKey || Date.now() - answerShownAtRef.current < 450) return;
    lastRatedCardRef.current = activeKey;
    srsActivityRef.current.reviewed += 1;
    if (isMastered) srsActivityRef.current.correct += 1;

    // Update Mastered & Review Lists
    if (isMastered) {
      setMasteredWords((prev) => {
        const next = prev.includes(wordKey) ? prev : [...prev, wordKey];
        localStorage.setItem("haechivn_mastered", JSON.stringify(next));
        return next;
      });
      setReviewList((prev) => {
        const next = prev.filter((w) => w !== wordKey);
        localStorage.setItem("haechivn_reviews_list", JSON.stringify(next));
        return next;
      });
    } else {
      setMasteredWords((prev) => {
        const next = prev.filter((w) => w !== wordKey);
        localStorage.setItem("haechivn_mastered", JSON.stringify(next));
        return next;
      });
      setReviewList((prev) => {
        const next = prev.includes(wordKey) ? prev : [...prev, wordKey];
        localStorage.setItem("haechivn_reviews_list", JSON.stringify(next));
        return next;
      });
    }

    // Ignore key repeats/double clicks on the same card and enforce a short recall window.
    // Official ts-fsrs scheduler; calculateFSRS45 remains as a compatibility adapter name.
    const rating: FSRSRating = customRating || (isMastered ? "good" : "again");
    const curState = cardStateFor(cardStateMap, activeKey, currentCard);
    const newState = calculateFSRS45(rating, curState);
    if (curState.reps === 0 || curState.state === "new") setDailyProgress(recordCard(true));
    else setDailyProgress(recordCard(false));
    setCardStateMap((prev) => {
      const updated = { ...prev, [activeKey]: newState };
      const srsKey = currentUser ? `haechivn_srs_state_${currentUser.id}` : "haechivn_srs_state_guest";
      localStorage.setItem(srsKey, JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      void ApiClient.saveCardState(activeDeckTitle, (currentCard.sibling ? -1 : 1) * (Number(currentCard.id) || 1), newState).catch(() => {});
    }

    // Keep the imported Anki history intact and append future reviews to the
    // card's local deck record so the user's review log remains portable.
    const owningDeck = ownedDecks.find((deck) => deck.cards.some((card) =>
      card.id === Number(currentCard.id) && card.deckName === currentCard.deckName
    ));
    if (owningDeck && !currentCard.sibling) {
      const reviewTime = new Date();
      const reviewEvent: AnkiReviewEvent = {
        id: reviewTime.getTime(), reviewedAt: reviewTime.toISOString(),
        rating: rating === "again" ? 1 : rating === "hard" ? 2 : rating === "good" ? 3 : 4,
        interval: newState.interval, previousInterval: curState.interval || 0,
        factor: Math.round(newState.easeFactor * 1000),
        durationMs: Math.max(0, Date.now() - (answerShownAtRef.current || Date.now())), type: 1,
      };
      const updatedDecks = ownedDecks.map((deck) => deck.id !== owningDeck.id ? deck : {
        ...deck,
        cards: deck.cards.map((card) => card.id === Number(currentCard.id) && card.deckName === currentCard.deckName
          ? { ...card, reviewHistory: [...(card.reviewHistory || []), reviewEvent] }
          : card),
      });
      setUserDecks(updatedDecks);
      void ApiClient.saveDecks(updatedDecks, currentUser?.id).catch(() => {});
    }

    // Move to next card
    setIsFlipped(false);
    setTypedInput("");
    if (currentCardIndex < activeCardsList.length - 1) {
      setCurrentCardIndex((i) => i + 1);
    } else {
      // Finished deck
      finishSrsActivity();
      setViewMode("dashboard");
    }
  }, [currentCard, cardStateMap, currentUser, activeDeckTitle, currentCardIndex, activeCardsList.length, finishSrsActivity, ownedDecks, setUserDecks, studyMode, typedInput]);

  // Give typing hint
  const handleGiveHint = () => {
    if (!currentCard?.word) return;
    const target = cleanTextOnly(currentCard.word);
    if (typedInput.length < target.length) {
      const nextTyped = typedInput + target[typedInput.length];
      setTypedInput(nextTyped);
      if (nextTyped.trim().normalize("NFC") === target.normalize("NFC")) {
        revealAnswer();
        inputRef.current?.blur();
      } else {
        inputRef.current?.focus();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (viewMode !== "study") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        return;
      }
      if (modalImage) {
        if (e.key === "Escape") setModalImage(null);
        return;
      }

      // If typing in input and card is not yet flipped
      if (studyMode === "typing" && document.activeElement === inputRef.current && !isFlipped) {
        if (e.key === "Enter") {
          e.preventDefault();
          revealAnswer();
          inputRef.current?.blur();
        }
        return;
      }

      // Play Sound: R
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        playCurrentSound();
        return;
      }

      // Flip: Space or Enter (when not flipped)
      if (!isFlipped && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        revealAnswer();
        inputRef.current?.blur();
        return;
      }

      // If Flipped: Grade responses (Supports Q/T, 1/2/3/4, Space/Enter/Arrows)
      if (isFlipped) {
        const k = e.key.toLowerCase();
        if (k === "q" || k === "1" || e.key === "ArrowLeft") {
          e.preventDefault();
          handleResponse(false);
        } else if (k === "t" || k === "2" || k === " " || e.key === "Enter" || e.key === "ArrowRight") {
          e.preventDefault();
          handleResponse(true);
        } else if (k === "3") {
          e.preventDefault();
          handleResponse(true, "good");
        } else if (k === "4") {
          e.preventDefault();
          handleResponse(true, "easy");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, isFlipped, studyMode, modalImage, playCurrentSound, handleResponse, revealAnswer]);

  // Auto-focus input when in typing mode and not flipped
  useEffect(() => {
    if (viewMode === "study" && studyMode === "typing" && !isFlipped) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [viewMode, studyMode, currentCardIndex, isFlipped]);

  // Image source for active card
  const activeImageSrc = useMemo(() => {
    return extractImageSrc(currentCard?.image);
  }, [currentCard]);

  // Recursive Tree Node Renderer supporting multi-level subdecks (Book -> Lesson -> Subdeck...)
  const renderTreeNode = (node: DeckTreeNode, level = 0): React.ReactNode => {
    const isExpanded = !!expandedDecks[node.id];
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const stats = getDeckStats(node.cards);
    const sourceUserDeck = level === 0 && node.id.startsWith("user-")
      ? ownedDecks.find((deck) => !deck.id.startsWith("curated-") && node.id === `user-${deck.id}`)
      : undefined;

    const indentClass =
      level === 0
        ? "px-4 sm:px-5 min-h-14 py-2 sm:py-0 sm:h-14 bg-white dark:bg-stone-900/60"
        : level === 1
        ? "pl-8 sm:pl-10 pr-4 sm:pr-5 min-h-12 py-2 sm:py-0 sm:h-12 bg-stone-50/50 dark:bg-stone-900/30"
        : "pl-14 sm:pl-16 pr-4 sm:pr-5 min-h-11 py-2 sm:py-0 sm:h-11 bg-stone-50/80 dark:bg-stone-950/40";

    return (
      <div key={node.id} className="deck-group divide-y divide-stone-100 dark:divide-stone-800/60">
        <div
          onClick={() => startStudy(node.id, node.title, node.cards)}
          className={`group relative overflow-hidden flex items-center justify-between cursor-pointer hover:bg-stone-100/70 dark:hover:bg-stone-800/50 transition-colors ${indentClass}`}
          title={stats.newCount + stats.reviewCount === 0 ? "Không có thẻ đến hạn hôm nay" : `Bấm để học ${node.cards.length} từ trong ${node.title}`}
        >
          {/* Vạch pin tiến độ xanh ngọc */}
          <div
            className={`absolute inset-y-0 left-0 pointer-events-none transition-all duration-700 ${
              stats.percent > 0 ? "bg-emerald-500/10 dark:bg-emerald-500/15" : "bg-transparent"
            }`}
            style={{ width: `${stats.percent}%` }}
          />
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-emerald-500 transition-all duration-700 pointer-events-none"
            style={{ width: `${stats.percent}%` }}
          />

          {/* Cột 1: Chevron / Tree marker + Tên */}
          <div className="relative z-10 flex items-center gap-2 min-w-0 pr-2">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGroup(node.id);
                }}
                className="w-6 h-6 -ml-1 rounded flex items-center justify-center text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-700/60 transition cursor-pointer"
                aria-label="Đóng mở nhánh bài học"
              >
                <ChevronRight
                  className={`w-4 h-4 transform transition-transform duration-200 ${
                    isExpanded ? "rotate-90 text-stone-900 dark:text-white" : ""
                  }`}
                />
              </button>
            ) : (
              <span className="text-stone-300 dark:text-stone-700 select-none text-xs w-4 text-center">
                └
              </span>
            )}

            <div className="min-w-0">
              <h3
                className={`truncate flex items-center gap-2 ${
                  level === 0
                    ? "text-sm sm:text-base font-bold text-stone-900 dark:text-white"
                    : level === 1
                    ? "text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200"
                    : "text-xs font-medium text-stone-600 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-white"
                }`}
              >
                <span>{node.title}</span>
                {node.subtitle && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">{node.subtitle}</span>}
              </h3>
              <p className="sm:hidden mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                <span className="font-bold text-sky-600 dark:text-sky-400">{stats.newCount}</span> mới, <span className="font-bold text-rose-500 dark:text-rose-400">{stats.reviewCount}</span> ôn, <span className={stats.percent > 0 ? "font-bold text-emerald-600 dark:text-emerald-400" : ""}>{stats.percent}%</span>
              </p>
            </div>
          </div>

          {/* Cột 2, 3, 4: Mới | Ôn | % */}
          <div className="relative z-10 flex items-center gap-3 sm:gap-6 shrink-0 font-mono text-xs">
            {sourceUserDeck && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!currentUser) {
                    handleOpenAuth(false);
                    return;
                  }
                  if (visibilityBusyDeckId) return;
                  const visibility: "public" | "private" = sourceUserDeck.visibility === "public" ? "private" : "public";
                  setVisibilityBusyDeckId(sourceUserDeck.id);
                  void (async () => {
                    try {
                      const sharedId = await ApiClient.saveSharedDeck({ ...sourceUserDeck, visibility });
                      const updatedDecks = ownedDecks.map((deck) => deck.id === sourceUserDeck.id ? { ...deck, visibility, sharedId } : deck);
                      setUserDecks(updatedDecks);
                      await ApiClient.saveDecks(updatedDecks, currentUser.id);
                    } catch (error) {
                      window.alert(error instanceof Error ? error.message : "Không cập nhật được quyền bộ thẻ.");
                    } finally {
                      setVisibilityBusyDeckId(null);
                    }
                  })();
                }}
                disabled={visibilityBusyDeckId === sourceUserDeck.id}
                title={sourceUserDeck.visibility === "public" ? "Đổi sang riêng tư" : "Đăng bộ thẻ công khai"}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[9px] font-sans font-bold transition disabled:opacity-60 ${sourceUserDeck.visibility === "public" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"}`}
              >
                {sourceUserDeck.visibility === "public" ? <Globe2 className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}
                {visibilityBusyDeckId === sourceUserDeck.id ? "Đang lưu…" : sourceUserDeck.visibility === "public" ? "Công khai" : "Riêng tư"}
              </button>
            )}
            <div className="hidden sm:block w-10 text-center font-bold text-sky-600 dark:text-sky-400">
              {stats.newCount > 0 ? stats.newCount : <span className="text-stone-300 dark:text-stone-700 font-normal">0</span>}
            </div>
            <div className="hidden sm:block w-10 text-center font-bold text-rose-500 dark:text-rose-400">
              {stats.reviewCount > 0 ? stats.reviewCount : <span className="text-stone-300 dark:text-stone-700 font-normal">0</span>}
            </div>
            <div
              className={`hidden sm:block w-12 text-right font-bold ${
                stats.percent > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-stone-400"
              }`}
            >
              {stats.percent}%
            </div>
          </div>
        </div>

        {/* Render nhánh con nếu đang mở */}
        {hasChildren && isExpanded && (
          <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render typing hint display
  const renderTypingHintDisplay = () => {
    if (!currentCard?.word) return null;
    const target = cleanTextOnly(currentCard.word);
    const typed = typedInput;

    const chars = [];
    for (let i = 0; i < target.length; i++) {
      const targetChar = target[i];
      if (targetChar === " ") {
        chars.push(
          <span key={i} className="inline-block w-3 text-center text-stone-300 dark:text-stone-700">
            &nbsp;
          </span>
        );
        continue;
      }

      const inputChar = typed[i];
      if (inputChar === undefined) {
        const isCursor = i === typed.length;
        chars.push(
          <span key={i} className={`ch blank ${isCursor ? "active-cursor" : ""}`}>
            _
          </span>
        );
      } else if (inputChar.toLowerCase() === targetChar.toLowerCase()) {
        chars.push(
          <span key={i} className="ch correct">
            {targetChar}
          </span>
        );
      } else {
        chars.push(
          <span key={i} className="ch incorrect">
            {inputChar}
          </span>
        );
      }
    }

    return <div className="hint-display justify-center md:justify-start">{chars}</div>;
  };

  // Smart ChatGPT prompt URL
  const chatGptUrl = useMemo(() => {
    if (!currentCard) return "#";
    const promptText = `Giải thích chi tiết cho tôi về từ vựng tiếng Hàn ${cleanTextOnly(currentCard.word)} với nghĩa là ${cleanTextOnly(currentCard.meaning)}. Bao gồm: cách phát âm; phân tích âm Hán-Việt (nếu có); từ loại; 2-3 câu ví dụ tự nhiên kèm dịch nghĩa; collocation đi kèm và mẹo ghi nhớ cho người học.`;
    return `https://chatgpt.com/?prompt=${encodeURIComponent(promptText)}`;
  }, [currentCard]);

  const studyActions = (
    <>
              {!isFlipped ? (
                /* Trạng thái 1: Chưa lật -> Nút Hiện Đáp Án */
                <button
                  onClick={() => {
                    revealAnswer();
                    inputRef.current?.blur();
                  }}
                  style={revealStyle}
                  className="w-full h-12 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-stone-800 dark:hover:bg-stone-700 dark:border dark:border-stone-700 dark:bg-[image:var(--reveal-bg)] dark:hover:brightness-110 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span className="font-extrabold">Hiện đáp án</span>
                  <kbd className="hidden sm:inline font-mono text-[10px] px-2 py-0.5 rounded border border-white/50 font-bold">
                    Space / Enter
                  </kbd>
                </button>
              ) : (
                /* Trạng thái 2: Đã lật -> Thay thế ngay bằng Quên & Thuộc */
                <div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      onClick={() => handleResponse(false)}
                      style={{ color: "#fff" }}
                      className="h-12 rounded-xl bg-rose-500 hover:bg-rose-600 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <span>Quên{nextReviewLabel("again")}</span>
                    </button>

                    <button
                      onClick={() => handleResponse(true)}
                      disabled={studyMode === "typing" && typedInput.trim().normalize("NFC") !== cleanTextOnly(currentCard?.word).normalize("NFC")}
                      style={{ color: "#fff" }}
                      className="h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Thuộc{nextReviewLabel("good")}</span>
                    </button>
                  </div>
                </div>
              )}
    </>
  );

  const confirmMore = () => {
    if (!morePrompt) return;
    const amount = Math.floor(Number(moreAmount));
    if (!Number.isFinite(amount) || amount < 1) return;
    addExtraNew(Math.min(amount, morePrompt.available));
    const { deckId, title, cards } = morePrompt;
    setMorePrompt(null);
    startStudy(deckId, title, cards);
  };
  const moreValid = Number.isInteger(Number(moreAmount)) && Number(moreAmount) >= 1 && moreAmount !== "";

  return (
    <div className="w-full min-h-[calc(100vh-6rem)] pb-12 transition-colors">
      {/* ====================================================================
          NỘI DUNG CHÍNH (CONTAINER)
          ==================================================================== */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* ==========================================
            A. DASHBOARD: BẢNG CÂY ANKI TOÀN TRANG
            ========================================== */}
        {viewMode === "dashboard" && (
          <div className="space-y-6 pt-2">
            {/* Banner tiếp tục học lượt trước */}
            {lastStudiedDeckId && lastStudiedTitle && (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141b2d] border border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between gap-4 shadow-xs animate-reveal">
                <div className="min-w-0">
                  <span className="inline-block text-[10px] font-mono tracking-wider text-emerald-700 dark:text-emerald-400 font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/40">
                    Học tiếp
                  </span>
                  <h3 className="text-sm sm:text-base font-bold truncate mt-1 text-stone-900 dark:text-white">
                    {lastStudiedTitle}
                  </h3>
                </div>
                <button
                  onClick={resumeLastLesson}
                  className="w-10 h-10 rounded-full bg-stone-900 text-white hover:bg-stone-800 dark:bg-emerald-500 dark:text-stone-950 dark:hover:bg-emerald-400 flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-sm"
                  title="Học tiếp ngay"
                >
                  <Play className="w-4 h-4 ml-0.5 fill-current" />
                </button>
              </div>
            )}

            {/* Tiêu đề trang & Nút chuyển sang Khám phá */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight">
                  Lộ trình học
                </h1>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Đã thuộc {masteredWords.length} từ vựng trong hệ thống
                </p>
              </div>

              {/* Thanh công cụ tìm kiếm và thu gọn */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        const allOpen: Record<string, boolean> = {};
                        deckTree.forEach((g) => (allOpen[g.id] = true));
                        setExpandedDecks(allOpen);
                      }
                    }}
                    placeholder="Tìm bài học hoặc từ vựng..."
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-400 transition"
                  />
                </div>

                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition w-fit"
                >
                  <Compass className="w-4 h-4 text-sky-500" />
                  Khám phá
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            </div>

            {limitNotice && (
              <div role="status" className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
                {limitNotice}
              </div>
            )}
            <DailyLimitsPanel limits={dailyLimits} progress={dailyProgress} onChange={updateLimits} />

            <VocabularySizeTest />

            {/* BẢNG ANKI ĐỒNG NHẤT TOÀN TRANG (DECK TREE) */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 overflow-hidden shadow-xs">
              {/* Header 4 Cột Chuẩn */}
              <div className="hidden sm:flex items-center justify-between px-4 sm:px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-800/50 text-[11px] font-mono tracking-wider uppercase text-stone-500 dark:text-stone-400 select-none">
                <span className="font-bold">Tên bộ thẻ / Bài học</span>
                <div className="flex items-center gap-3 sm:gap-6 pr-1 sm:pr-2">
                  <span className="w-8 sm:w-10 text-center text-sky-600 dark:text-sky-400 font-bold" title="Thẻ mới chưa học">
                    Mới
                  </span>
                  <span className="w-8 sm:w-10 text-center text-rose-500 dark:text-rose-400 font-bold" title="Thẻ cần ôn lại">
                    Ôn
                  </span>
                  <span className="w-10 sm:w-12 text-right text-emerald-600 dark:text-emerald-400 font-bold" title="Tỷ lệ nạp pin đã xong">
                    %
                  </span>
                </div>
              </div>

              {/* Danh sách cây bộ thẻ (Tree) */}
              <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
                {filteredTree.map((node) => renderTreeNode(node, 0))}

                {filteredTree.length === 0 && (
                  <div className="text-center py-12 text-stone-400 text-xs sm:text-sm">
                    Không tìm thấy bộ thẻ hoặc từ vựng phù hợp với bộ lọc hiện tại.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            B. STUDY WORKSPACE (APPLE MINIMALIST REVEAL)
            ========================================== */}
        {viewMode === "study" && (
          activeCardsList.length === 0 ? (
            <div className="py-16 text-center animate-reveal max-w-lg mx-auto">
              <div className="p-8 sm:p-10 rounded-[28px] bg-white dark:bg-[#141b2d] border border-stone-200/80 dark:border-stone-800/80 shadow-xs text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">
                  Đã hoàn thành ôn tập hôm nay!
                </h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-8 leading-relaxed">
                  Bạn đã thuộc hết từ vựng trong bộ thẻ này. Thuật toán FSRS sẽ tự động tính toán và nhắc bạn khi có từ đến hạn ôn lại tiếp theo.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={exitStudy}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-stone-900 text-white dark:bg-emerald-500 dark:text-stone-950 font-bold text-xs sm:text-sm hover:opacity-90 transition cursor-pointer shadow-xs"
                  >
                    Trở về danh sách bộ thẻ
                  </button>
                </div>
              </div>
            </div>
          ) : currentCard ? (
            <div className="min-h-[calc(100vh-140px)] flex flex-col justify-between py-2 pb-28 animate-reveal">
              <div className="flex-1 flex flex-col">

            {/* CHẾ ĐỘ 1: THẺ NHẬN DIỆN PHẲNG REVEAL (2 CỘT DESKTOP) */}
            {studyMode === "flip" && (
              <div className="w-full mb-5 select-text">
                <div className="relative w-full min-h-[440px] rounded-[24px] border border-stone-200 dark:border-stone-800/80 bg-white dark:bg-[#141b2d] p-6 sm:p-8 flex flex-col justify-between shadow-xs transition-all">
                  {/* Body 2 Cột Desktop: Trái Ảnh - Phải Chữ */}
                  <div className="my-auto py-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Cột Trái: Ảnh Minh Họa Cỡ Lớn */}
                    {activeImageSrc && (
                      <div
                        className="md:col-span-5 flex flex-col items-center justify-center cursor-zoom-in group"
                        onClick={() => setModalImage(activeImageSrc)}
                      >
                        <div className="w-full rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800/60 p-1.5 border border-stone-200/60 dark:border-stone-800 transition-transform group-hover:scale-[1.01]">
                          <img
                            src={activeImageSrc}
                            alt={currentCard.word}
                            className="w-full h-48 sm:h-56 md:h-64 object-cover rounded-xl shadow-xs"
                            onError={(e) => {
                              // If image fails, hide it gracefully
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Cột Phải: Từ Vựng & Đáp Án Mở Rộng */}
                    <div
                      className={`${
                        activeImageSrc ? "md:col-span-7" : "md:col-span-12"
                      } flex flex-col justify-center space-y-4 text-center`}
                    >
                      {/* Từ Tiếng Hàn Chính Luôn Đứng Cố Định */}
                      <div className="space-y-1">
                        <div className="target-word text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white">
                          {currentCard.word}
                        </div>

                        {/* PHẦN ĐÁP ÁN: MỞ RA TRƯỢT ÊM ÁI KHI BẤM "HIỆN ĐÁP ÁN" */}
                        {isFlipped && (
                          <div className="space-y-3.5 pt-1 animate-fade-only">
                            <div>
                              <div
                                className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight"
                                dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.meaning) }}
                              />
                              {currentCard.explain && (
                                <div
                                  className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 pt-1 leading-relaxed [&_p]:m-0"
                                  dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.explain) }}
                                />
                              )}
                            </div>

                            {/* Cụm từ liên quan, Đồng nghĩa, Trái nghĩa */}
                            {(currentCard.collocation || currentCard.synonym || currentCard.antonym) && (
                              <div className="flex flex-wrap items-center gap-2 pt-0.5 justify-center">
                                {currentCard.collocation && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] border border-stone-200/80 dark:border-stone-700/80">
                                    <span className="text-stone-400 font-mono uppercase text-[9px]">Cụm từ</span>
                                    <span
                                      className="text-sky-600 dark:text-sky-400 font-medium"
                                      dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.collocation) }}
                                    />
                                  </div>
                                )}
                                {currentCard.synonym && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] border border-stone-200/80 dark:border-stone-700/80">
                                    <span className="text-stone-400 font-mono uppercase text-[9px]">Đồng nghĩa</span>
                                    <span
                                      className="text-emerald-600 dark:text-emerald-400 font-medium"
                                      dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.synonym) }}
                                    />
                                  </div>
                                )}
                                {currentCard.antonym && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] border border-stone-200/80 dark:border-stone-700/80">
                                    <span className="text-stone-400 font-mono uppercase text-[9px]">Trái nghĩa</span>
                                    <span
                                      className="text-rose-500 font-medium"
                                      dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.antonym) }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Hộp Ví dụ: Tiếng Hàn luôn hiện, khi lật hiện thêm tiếng Việt */}
                      {currentCard.example && (
                        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-700/70 text-center">
                          <p
                            className="text-sm sm:text-base font-semibold text-stone-800 dark:text-stone-200 leading-relaxed font-noto"
                            dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.example) }}
                          />
                          {isFlipped && currentCard.example_translated && (
                            <p
                              className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 italic border-t border-stone-200/50 dark:border-stone-700/50 pt-1.5 animate-fade-only"
                              dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.example_translated) }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thanh dưới thẻ: Loại từ + Nút Audio + ChatGPT */}
                  <div className="w-full flex items-center justify-between pt-3.5 border-t border-stone-100 dark:border-stone-800">
                    <span className="pos-chip">{currentCard.pos || "Từ vựng"}</span>

                    <div className="flex items-center gap-2">
                      {/* Nút ChatGPT */}
                      <a
                        href={chatGptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40 transition text-xs font-medium shadow-xs"
                        title="Hỏi trợ lý AI về từ này"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        <span>ChatGPT</span>
                      </a>

                      {/* Nút Loa Phát Âm */}
                      <button
                        onClick={playCurrentSound}
                        className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-sky-500/10 text-stone-600 hover:text-sky-600 dark:text-stone-300 dark:hover:text-sky-400 flex items-center justify-center transition shadow-xs cursor-pointer"
                        title="Nghe phát âm (Phím R)"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* CHẾ ĐỘ 2: THẺ GÕ TỪ (TYPING - 2 CỘT DESKTOP) */}
            {studyMode === "typing" && (
              <div className="w-full mb-5 p-6 sm:p-8 rounded-[24px] border border-stone-200 dark:border-stone-800/80 bg-white dark:bg-[#141b2d] shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Cột Trái: Ảnh Gợi Ý */}
                  {activeImageSrc && (
                    <div
                      className="md:col-span-5 flex flex-col items-center justify-center cursor-zoom-in"
                      onClick={() => setModalImage(activeImageSrc)}
                    >
                      <div className="w-full rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800/60 p-1.5 border border-stone-200/60 dark:border-stone-800">
                        <img
                          src={activeImageSrc}
                          alt="Gợi ý"
                          className="w-full h-48 sm:h-56 md:h-64 object-cover rounded-xl shadow-xs"
                        />
                      </div>
                      <span className="text-[10px] text-stone-400 mt-1.5">Ảnh gợi ý trực quan</span>
                    </div>
                  )}

                  {/* Cột Phải: Prompt Gõ Từ */}
                  <div
                    className={`${
                      activeImageSrc ? "md:col-span-7" : "md:col-span-12"
                    } space-y-4 text-center`}
                  >
                    <div>
                      <span className="pos-chip">{currentCard.pos || "Từ vựng"}</span>
                      <div
                        className="text-2xl sm:text-3xl font-extrabold mt-2 text-stone-900 dark:text-white"
                        dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.meaning) }}
                      />
                      {currentCard.explain && (
                        <div
                          className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 [&_p]:m-0"
                          dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.explain) }}
                        />
                      )}
                    </div>

                    {/* Khu Vực Gõ và Gợi Ý Ký Tự Gạch Chân */}
                    <div className="py-2 space-y-3">
                      {renderTypingHintDisplay()}

                      <div className="relative w-full max-w-sm mx-auto md:mx-0">
                        <input
                          ref={inputRef}
                          type="text"
                          value={typedInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTypedInput(val);
                            const target = cleanTextOnly(currentCard.word);
                            if (val.trim().normalize("NFC") === target.normalize("NFC")) {
                              revealAnswer();
                              inputRef.current?.blur();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              revealAnswer();
                              inputRef.current?.blur();
                            }
                          }}
                          placeholder="Gõ từ tiếng Hàn vào đây..."
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          className="w-full h-12 text-center text-lg font-semibold bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-full text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                        />
                      </div>

                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <button
                          type="button"
                          onClick={handleGiveHint}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700/80 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition shadow-xs cursor-pointer"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          <span>Gợi ý 1 ký tự</span>
                        </button>
                      </div>
                      {isFlipped && <div role="status" className={`rounded-xl p-3 text-sm font-bold ${typedInput.trim().normalize("NFC") === cleanTextOnly(currentCard.word).normalize("NFC") ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"}`}>
                        {typedInput.trim().normalize("NFC") === cleanTextOnly(currentCard.word).normalize("NFC") ? "Đúng rồi" : "Chưa đúng"} · {cleanTextOnly(currentCard.word)}
                      </div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                NÚT HÀNH ĐỘNG DƯỚI THẺ (SHOW ANSWER vs GRADE BUTTONS)
                ======================================================== */}
              </div>

              {/* Thanh hành động luôn cố định sát đáy màn hình ở mọi kích cỡ, không đổi vị trí khi thẻ lật hay nội dung dài ngắn khác nhau. */}
              {hydrated && createPortal(
                <div className="fixed right-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 px-3" style={{ left: sidebarWidth }}>
                  <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 dark:border-stone-700 bg-white/95 dark:bg-stone-900/95 backdrop-blur p-1.5 shadow-lg">
                    {studyActions}
                  </div>
                </div>,
                document.body
              )}
            </div>
          ) : null
        )}
      </main>

      {morePrompt && hydrated && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" onClick={() => { setMorePrompt(null); if (viewMode === "study") exitStudy(); }}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="more-new-title"
            className="w-full max-w-xs space-y-4 rounded-2xl border border-stone-200 bg-white p-5 text-stone-900 shadow-2xl dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Escape") { setMorePrompt(null); if (viewMode === "study") exitStudy(); } }}
            onSubmit={(e) => { e.preventDefault(); confirmMore(); }}
          >
            <div>
              <h2 id="more-new-title" className="text-base font-black">Bạn muốn học thêm bao nhiêu từ MỚI vậy dạ?</h2>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Hôm nay bạn đã học đủ từ mới. Bộ này còn {morePrompt.available} từ mới.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMoreAmount(String(Math.max(1, (Number(moreAmount) || 0) - 5)))}
                aria-label="Giảm 5 từ"
                className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-stone-300 text-xl font-black hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
              >
                −
              </button>
              <input
                autoFocus
                type="number"
                inputMode="numeric"
                min={1}
                max={morePrompt.available}
                value={moreAmount}
                onChange={(e) => setMoreAmount(e.target.value)}
                aria-label="Số từ mới muốn học thêm"
                className="h-12 min-w-0 flex-1 rounded-xl border border-stone-300 bg-transparent px-2 text-center text-xl font-black tabular-nums [appearance:textfield] focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-stone-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setMoreAmount(String(Math.min(morePrompt.available, (Number(moreAmount) || 0) + 5)))}
                aria-label="Tăng 5 từ"
                className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-stone-300 text-xl font-black hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
              >
                +
              </button>
            </div>
            <div className="flex gap-2">
              {[10, 20, 30].filter((n) => n <= morePrompt.available).map((n) => (
                <button key={n} type="button" onClick={() => setMoreAmount(String(n))} className="flex-1 cursor-pointer rounded-lg bg-stone-100 py-1.5 text-xs font-bold hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700">{n}</button>
              ))}
            </div>
            <div className="space-y-2">
              <button type="submit" disabled={!moreValid} style={{ color: "#fff" }} className="w-full cursor-pointer rounded-xl bg-sky-500 py-2.5 text-sm font-black transition hover:bg-sky-600 disabled:opacity-40">Thêm</button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* ====================================================================
          3. MODAL PHÓNG TO ẢNH (IMAGE ZOOM OVERLAY)
          ==================================================================== */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 cursor-pointer animate-reveal"
        >
          <div className="relative max-w-4xl max-h-[85vh]">
            <img
              src={modalImage}
              alt="Ảnh phóng to"
              className="max-w-[90vw] max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
