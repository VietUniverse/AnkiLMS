"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import { VOCABULARY_DATA } from "../data/koreanData";
import { loadAdminThthCurriculum, loadAdminWritingCurriculum } from "../lib/privateLearningContent";
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
  writingData?: {
    cardType: "fill_blank" | "essay" | "choice" | "cloze" | "generic";
    questionNo: number;
    qid?: string;
    source?: string;
    category?: string;
    levelStyle?: string;
    promptHtml?: string;
    blankA_answer?: string;
    blankB_answer?: string;
    blankA_variants?: string[];
    blankB_variants?: string[];
    translationHtml?: string;
    explainA_Html?: string;
    explainB_Html?: string;
    grammarHtml?: string;
    vocabHtml?: string;
    pitfallsHtml?: string;
    notesHtml?: string;
    figureSvg?: string;
    modelEssay?: string;
    minChars?: number;
    maxChars?: number;
    choiceOpts?: string[];
    choiceCorrect?: number;
    keyPhrasesHtml?: string;
    explainHtml?: string;
    backHtml?: string;
    extraDe?: string;
  };
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

const normalizeKoreanText = (str?: string): string => {
  if (!str) return "";
  return str
    .normalize("NFC")
    .replace(/[.,?!~'"·\s]/g, "")
    .trim()
    .toLowerCase();
};

const checkWritingVariantMatch = (typed: string, variants: string[]): boolean => {
  const normTyped = normalizeKoreanText(typed);
  if (!normTyped) return false;
  return variants.some((v) => {
    const normV = normalizeKoreanText(v);
    return normV === normTyped || (normTyped.length >= 4 && (normV.includes(normTyped) || normTyped.includes(normV)));
  });
};

const isCardAWritingCard = (c?: VocabularyCard | null) => Boolean(
  c && (
    c.writingData ||
    c.deckName?.toLowerCase().includes("writing") ||
    c.pos?.toLowerCase().includes("viết") ||
    c.word?.startsWith("Câu 51") ||
    c.word?.startsWith("Câu 52") ||
    c.word?.startsWith("Câu 53") ||
    c.word?.startsWith("Câu 54")
  )
);
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

const toThthMediaUrl = (rawPath: string): string => {
  const trimmed = rawPath.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/api/")) return trimmed;
  const cleanName = trimmed.replace(/^\/+/, "");
  if (!cleanName.includes("/")) {
    return `/api/thth-media?file=${encodeURIComponent(cleanName)}`;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const extractImageSrc = (imgStr?: string): string | null => {
  if (!imgStr) return null;
  const match = imgStr.match(/src=["']([^"']+)["']/i);
  if (match) {
    return toThthMediaUrl(match[1]) || null;
  }
  if (imgStr.includes("<img")) return null;
  return toThthMediaUrl(imgStr) || null;
};

const extractAudioSrc = (audioField?: string): string | null => {
  if (!audioField) return null;
  const soundMatch = audioField.match(/\[sound:([^\]]+)\]/i);
  if (soundMatch?.[1]) {
    return toThthMediaUrl(soundMatch[1]) || null;
  }
  const srcMatch = audioField.match(/src=["']([^"']+)["']/i);
  if (srcMatch?.[1]) {
    return toThthMediaUrl(srcMatch[1]) || null;
  }
  const trimmed = audioField.trim();
  if (/\.(mp3|ogg|wav|m4a)(\?|$)/i.test(trimmed) || trimmed.startsWith("/api/thth-media")) {
    return toThthMediaUrl(trimmed) || null;
  }
  return null;
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

// Dấu câu trong đáp án chế độ gõ: hiện sẵn trên dải gợi ý, không bắt người học gõ.
const TYPING_PUNCTUATION = /[\p{P}~]/u;
const stripTypingPunctuation = (str: string): string =>
  str.normalize("NFC").replace(/[\p{P}~]/gu, "").replace(/\s+/g, " ").trim();

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
  const [adminWritingDecks, setAdminWritingDecks] = useState<any[]>([]);
  const [writingInputA, setWritingInputA] = useState<string>("");
  const [writingInputB, setWritingInputB] = useState<string>("");
  const [writingEssay, setWritingEssay] = useState<string>("");
  const [writingChoice, setWritingChoice] = useState<number | null>(null);
  const [writingCloze, setWritingCloze] = useState<string>("");
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
  const [activeAssignmentMeta, setActiveAssignmentMeta] = useState<{ id: string; classId: string; title: string } | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setDailyLimits(loadLimits());
    setDailyProgress(loadProgress());
  }, []);

  useEffect(() => {
    let active = true;
    if (currentUser && currentUser.role === "admin") {
      void loadAdminThthCurriculum().then((decks) => { if (active) setAdminThthDecks(decks || []); });
      void loadAdminWritingCurriculum().then((decks) => { if (active) setAdminWritingDecks(decks || []); });
    } else if (currentUser) {
      void loadAdminThthCurriculum().then((decks) => { if (active) setAdminThthDecks(decks || []); });
      setAdminWritingDecks([]);
    } else {
      setAdminThthDecks([]);
      setAdminWritingDecks([]);
    }
    return () => { active = false; };
  }, [currentUser?.id, currentUser?.role]);

  // Reset writing input state on card switch
  useEffect(() => {
    setWritingInputA("");
    setWritingInputB("");
    setWritingEssay("");
    setWritingChoice(null);
    setWritingCloze("");
  }, [currentCardIndex]);

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

    adminThthDecks.forEach((d) => {
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
      const subtitleByBook: Record<number, string> = {
        1: "Sơ cấp 1 · TOPIK 1 · Âm thanh gốc",
        2: "Sơ cấp 2 · TOPIK 2 · Âm thanh gốc",
        3: "Trung cấp 3 · TOPIK 3 · Âm thanh gốc",
        4: "Trung cấp 4 · TOPIK 4 · Âm thanh gốc",
      };
      rootNodes.push({
        id: bookId,
        title: bookTitle,
        subtitle: subtitleByBook[rootBookNumber] || `Quyển ${rootBookNumber} · Âm thanh gốc`,
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

    // Xây dựng cây bộ thẻ TOPIK II Writing bảo mật (Chỉ hiển thị cho Quản trị viên)
    if (isAdmin && adminWritingDecks && adminWritingDecks.length > 0) {
      type WritingBranch = {
        title: string;
        path: string;
        cards: VocabularyCard[];
        children: Map<string, WritingBranch>;
      };
      const writingRoot: WritingBranch = {
        title: "Cracking the TOPIK II Writing",
        path: "",
        cards: [],
        children: new Map(),
      };

      for (const d of adminWritingDecks) {
        const rawParts = (d.name || "").split("::").map((p: string) => p.trim()).filter(Boolean);
        const parts = rawParts[0]?.toLowerCase().includes("cracking") ? rawParts.slice(1) : rawParts;
        let branch = writingRoot;
        const dCards = (d.cards || []) as VocabularyCard[];
        writingRoot.cards.push(...dCards);
        const pathParts: string[] = [];

        for (const part of parts) {
          pathParts.push(part);
          let child = branch.children.get(part);
          if (!child) {
            child = { title: part, path: pathParts.join("::"), cards: [], children: new Map() };
            branch.children.set(part, child);
          }
          branch = child;
          branch.cards.push(...dCards);
        }
      }

      const buildWritingChildren = (branch: WritingBranch): DeckTreeNode[] => [...branch.children.values()]
        .sort((a, b) => a.title.localeCompare(b.title, "vi", { numeric: true }))
        .map((child) => ({
          id: `admin-writing-${toSlug(child.path || child.title)}`,
          title: child.title,
          cards: child.cards,
          children: buildWritingChildren(child).length ? buildWritingChildren(child) : undefined,
        }));

      rootNodes.push({
        id: "admin-cracking-topik-writing",
        title: "✍️ Cracking the TOPIK II Writing (Admin)",
        subtitle: `${writingRoot.cards.length} thẻ · Luyện viết Câu 51, 53, 54 & Mẫu đề chuẩn`,
        cards: writingRoot.cards,
        children: buildWritingChildren(writingRoot),
      });
    }
    }

    return rootNodes;
  }, [hydrated, userDecks, isAdmin, adminThthDecks, adminWritingDecks, removedBuiltInDeckIds]);

  // Đếm trạng thái theo cùng nguồn FSRS dùng khi mở lượt học, không dùng danh sách legacy theo tên từ.
  const getDeckStats = useCallback((cards: VocabularyCard[]) => {
    const now = new Date();
    
const playableCards = cards.filter((card) => card.ankiSchedule?.queue !== -1).flatMap((card) => {
  if (isCardAWritingCard(card)) return [card];
  return [card, { ...card, sibling: "typing" as const }];
});
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
    setActiveAssignmentMeta(null);
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
    if (!cards.some(isCardAWritingCard)) {
      queue("typing");
    }
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

  // Auto-resume if query param ?resume=true or ?study=true or ?assignment=... is present
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autoResumedRef.current || !isAuthReady) return; // đợi tài khoản và bộ thẻ lưu trên máy nạp xong
    const params = new URLSearchParams(window.location.search);
    const assignmentId = params.get("assignment")?.trim();
    const classId = params.get("classId")?.trim() || "";
    if (assignmentId && currentUser) {
      autoResumedRef.current = true;
      returnToRef.current = "/classes";
      window.history.replaceState(null, "", window.location.pathname);
      void ApiClient.getClassAssignment(classId, assignmentId)
        .then((asg) => {
          const cards: VocabularyCard[] = (asg.deckCards || []).map((c: any, idx: number) => ({
            id: c.id ?? idx + 1,
            word: c.word || c.korean || "",
            meaning: c.meaning || "",
            pos: c.pos || "Bài tập lớp",
            transliteration: c.transliteration || c.pronunciation || "",
            explain: c.explain || "",
            image: c.image || (c.mediaHtml && c.mediaHtml.includes("<img") ? c.mediaHtml : ""),
            example: c.example || "",
            example_translated: c.example_translated || "",
            collocation: c.collocation || "",
            synonym: c.synonym || "",
            antonym: c.antonym || "",
            audio_word: c.audio_word || (c.mediaHtml && c.mediaHtml.includes("<audio") ? c.mediaHtml : ""),
            audio_meaning: c.audio_meaning || "",
            audio_example: c.audio_example || "",
            deckName: asg.deckName || asg.title,
          }));
          if (cards.length > 0) {
            setActiveAssignmentMeta({ id: asg.id, classId: asg.classId, title: asg.title });
            startStudy(`assignment-${asg.id}`, asg.title, cards, { skipMorePrompt: true });
          }
        })
        .catch(() => {});
      return;
    }

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
  }, [isAuthReady, currentUser, resumeLastLesson, startStudy, findNodeById, deckTree]);

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

  const playAudioWithFallback = useCallback((audioField: string | undefined, fallbackText: string) => {
    const cleanFallback = cleanTextOnly(fallbackText);
    const audioUrl = extractAudioSrc(audioField);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (audioUrl && typeof window !== "undefined") {
      try {
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;
        audio.play().catch(() => {
          if (cleanFallback) speakKorean(cleanFallback);
        });
        return;
      } catch {
        // Fallback to Web Speech below
      }
    }
    if (cleanFallback) {
      speakKorean(cleanFallback);
    }
  }, []);

  // Sound playback helper (plays original .apkg audio_word first, falls back to TTS)
  const playCurrentSound = useCallback(() => {
    if (!currentCard) return;
    playAudioWithFallback(currentCard.audio_word, currentCard.word);
  }, [currentCard, playAudioWithFallback]);

  const playExampleSound = useCallback(() => {
    if (!currentCard?.example) return;
    playAudioWithFallback(currentCard.audio_example, currentCard.example);
  }, [currentCard, playAudioWithFallback]);

  // Speak each card when a study session starts and whenever the learner moves
  // to another card. Depend on its text/index so unrelated renders do not replay it.
  const currentWordForAudio = currentCard ? cleanTextOnly(currentCard.word) : "";
  // Chế độ gõ: dấu câu (. ? ! , …) hiện sẵn, người học chỉ gõ phần chữ.
  const typingAnswer = currentCard ? stripTypingPunctuation(cleanTextOnly(currentCard.word)) : "";
  const isTypedCorrect = (typed: string) => stripTypingPunctuation(typed) === typingAnswer;
  const currentAudioWordField = currentCard?.audio_word || "";
  useEffect(() => {
    // Thẻ Typing: đọc to từ sẽ lộ đáp án, nên không tự phát.
    if (viewMode === "study" && currentWordForAudio && !currentCard?.sibling) {
      playAudioWithFallback(currentAudioWordField, currentWordForAudio);
    }
  }, [viewMode, currentCardIndex, currentWordForAudio, currentAudioWordField, currentCard?.sibling, playAudioWithFallback]);

  // Handle Response (Quên: false | Thuộc: true)
  const handleResponse = useCallback((isMastered: boolean, customRating?: FSRSRating) => {
    if (!currentCard) return;
    if (studyMode === "typing" && isMastered && !isTypedCorrect(typedInput)) return;
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
      if (activeAssignmentMeta && !currentCard.sibling && Number.isSafeInteger(Number(currentCard.id))) {
        void ApiClient.recordClassAssignmentReview(
          activeAssignmentMeta.classId,
          activeAssignmentMeta.id,
          Number(currentCard.id),
          isMastered,
        ).catch(() => {});
      }
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
    if (typedInput.length < typingAnswer.length) {
      const nextTyped = typedInput + typingAnswer[typedInput.length];
      setTypedInput(nextTyped);
      if (isTypedCorrect(nextTyped)) {
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

      // Prevent Space or normal Enter inside input or textarea from flipping the card
      const isInputFocused =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA";

      if (isInputFocused && !isFlipped) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          revealAnswer();
          (document.activeElement as HTMLElement)?.blur();
        }
        return;
      }

      // Flip: Space or Enter (when not flipped and not typing in text field)
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
    const target = cleanTextOnly(currentCard.word).normalize("NFC");
    const typed = typedInput.normalize("NFC");

    const chars = [];
    let t = 0; // vị trí trong chuỗi người học gõ (không tính dấu câu)
    for (let i = 0; i < target.length; i++) {
      const targetChar = target[i];
      if (TYPING_PUNCTUATION.test(targetChar)) {
        chars.push(
          <span key={i} className="ch text-stone-400 dark:text-stone-500">
            {targetChar}
          </span>
        );
        continue;
      }
      const ti = t++;
      if (targetChar === " ") {
        chars.push(
          <span key={i} className="inline-block w-3 text-center text-stone-300 dark:text-stone-700">
            &nbsp;
          </span>
        );
        continue;
      }

      const inputChar = typed[ti];
      if (inputChar === undefined && isFlipped) {
        chars.push(
          <span key={i} className="ch incorrect">
            {targetChar}
          </span>
        );
      } else if (inputChar === undefined) {
        const isCursor = ti === typed.length;
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
            {isFlipped ? targetChar : inputChar}
          </span>
        );
      }
    }

    return <div className={`hint-display justify-center ${activeImageSrc ? "md:justify-start" : ""}`}>{chars}</div>;
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
                  <kbd className="hidden sm:inline font-sans text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-white/20">
                    Space
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
            
            {/* CHẾ ĐỘ THẺ LUYỆN VIẾT TOPIK II (CÂU 51~54) VỚI Ô GÕ TỰ ĐỘNG CHẤM */}
            {studyMode === "flip" && isCardAWritingCard(currentCard) && (
              <div className="mx-auto w-full max-w-3xl mb-5 select-text">
                <div className="relative w-full rounded-3xl bg-white dark:bg-[#141b2d] border border-stone-200/80 dark:border-stone-800/80 p-5 sm:p-8 shadow-sm">
                  {/* Top Meta Chips */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs border border-rose-500/20">
                        {currentCard.writingData?.questionNo ? `Câu ${currentCard.writingData.questionNo}` : (currentCard.word.match(/Câu\s*\d+/i)?.[0] || "TOPIK II Viết")}
                      </span>
                      {(currentCard.writingData?.category || currentCard.word) && (
                        <span className="px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs">
                          {currentCard.writingData?.category || currentCard.word}
                        </span>
                      )}
                      {currentCard.writingData?.levelStyle && (
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium text-xs border border-sky-500/20">
                          {currentCard.writingData.levelStyle}
                        </span>
                      )}
                    </div>
                    {currentCard.writingData?.source && (
                      <span className="text-[11px] font-mono text-stone-400">
                        {currentCard.writingData.source}
                      </span>
                    )}
                  </div>

                  {/* TH1: DẠNG ĐIỀN ㉠ ㉡ (CÂU 51 & 52) */}
                  {(currentCard.writingData?.cardType === "fill_blank" || (!currentCard.writingData?.cardType && (currentCard.word.includes("51") || currentCard.word.includes("52") || /㉠|㉡|\[\[A\]\]|\[\[B\]\]|\(\s*ㄱ\s*\)|\(\s*ㄴ\s*\)/i.test(currentCard.example || "")))) && (() => {
                    const promptRaw = currentCard.writingData?.promptHtml || currentCard.example || currentCard.word;
                    const cleanPrompt = promptRaw
                      .replace(/\[\[A\]\]/g, " <span class='inline-flex items-center px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/40 text-sm'>㉠</span> ")
                      .replace(/\[\[B\]\]/g, " <span class='inline-flex items-center px-2 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/40 text-sm'>㉡</span> ")
                      .replace(/\(\s*ㄱ\s*\)|\[\s*ㄱ\s*\]/g, " <span class='inline-flex items-center px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/40 text-sm'>ㄱ</span> ")
                      .replace(/\(\s*ㄴ\s*\)|\[\s*ㄴ\s*\]/g, " <span class='inline-flex items-center px-2 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/40 text-sm'>ㄴ</span> ");

                    // Lấy biến thể đáp án A và B
                    let varA: string[] = currentCard.writingData?.blankA_variants || [];
                    let varB: string[] = currentCard.writingData?.blankB_variants || [];
                    if (varA.length === 0 && currentCard.meaning) {
                      const m = currentCard.meaning;
                      const idxA = m.search(/[ㄱ㉠]\s*[:.]/);
                      const idxB = m.search(/[ㄴ㉡]\s*[:.]/);
                      if (idxA !== -1 && idxB !== -1 && idxA < idxB) {
                        const rawA = m.slice(idxA, idxB).replace(/^[ㄱ㉠]\s*[:.]\s*/, "").trim();
                        const rawB = m.slice(idxB).replace(/^[ㄴ㉡]\s*[:.]\s*/, "").trim();
                        varA = rawA.split(/[/|\n]+/).map(s => s.trim()).filter(Boolean);
                        varB = rawB.split(/[/|\n]+/).map(s => s.trim()).filter(Boolean);
                      }
                    }

                    const isMatchA = checkWritingVariantMatch(writingInputA, varA);
                    const isMatchB = checkWritingVariantMatch(writingInputB, varB);

                    return (
                      <div className="space-y-6 pt-5">
                        {/* Đoạn văn đề bài tiếng Hàn */}
                        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 p-4 sm:p-6 font-noto text-base sm:text-lg leading-relaxed text-stone-900 dark:text-stone-100 shadow-inner">
                          <div dangerouslySetInnerHTML={{ __html: cleanPrompt }} />
                        </div>

                        {/* 2 Ô gõ đáp án tiếng Hàn */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <span className="inline-flex w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 items-center justify-center text-[10px]">㉠</span>
                                <span>Đáp án cho vị trí ㉠ (A):</span>
                              </span>
                              {isFlipped && (
                                writingInputA.trim() ? (
                                  isMatchA ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">✓ Khớp mẫu</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium text-[10px]">≈ Khác mẫu</span>
                                  )
                                ) : (
                                  <span className="text-stone-400 text-[10px]">(chưa điền)</span>
                                )
                              )}
                            </label>
                            <input
                              type="text"
                              value={writingInputA}
                              onChange={(e) => setWritingInputA(e.target.value)}
                              placeholder="Gõ đáp án tiếng Hàn cho ㉠..."
                              className="w-full h-11 px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-noto text-sm sm:text-base text-stone-900 dark:text-stone-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                            />
                            {isFlipped && varA.length > 0 && (
                              <div className="pt-1 text-xs text-stone-600 dark:text-stone-300 font-noto">
                                <span className="text-stone-400 text-[11px] font-sans">Mẫu chuẩn: </span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{varA.join(" · ")}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <span className="inline-flex w-4 h-4 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 items-center justify-center text-[10px]">㉡</span>
                                <span>Đáp án cho vị trí ㉡ (B):</span>
                              </span>
                              {isFlipped && (
                                writingInputB.trim() ? (
                                  isMatchB ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">✓ Khớp mẫu</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium text-[10px]">≈ Khác mẫu</span>
                                  )
                                ) : (
                                  <span className="text-stone-400 text-[10px]">(chưa điền)</span>
                                )
                              )}
                            </label>
                            <input
                              type="text"
                              value={writingInputB}
                              onChange={(e) => setWritingInputB(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                  e.preventDefault();
                                  revealAnswer();
                                }
                              }}
                              placeholder="Gõ đáp án tiếng Hàn cho ㉡..."
                              className="w-full h-11 px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-noto text-sm sm:text-base text-stone-900 dark:text-stone-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition"
                            />
                            {isFlipped && varB.length > 0 && (
                              <div className="pt-1 text-xs text-stone-600 dark:text-stone-300 font-noto">
                                <span className="text-stone-400 text-[11px] font-sans">Mẫu chuẩn: </span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{varB.join(" · ")}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Nút bấm Hiện đáp án khi chưa lật */}
                        {!isFlipped && (
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <button
                              type="button"
                              onClick={revealAnswer}
                              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-xs transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Hiện đáp án & Chấm đối chiếu</span>
                            </button>
                            <span className="text-[11px] text-stone-400">
                              Phím tắt: Nhấn Enter tại ô ㉡ hoặc Ctrl+Enter để chấm ngay
                            </span>
                          </div>
                        )}

                        {/* Chi tiết phân tích bài thi sau khi lật */}
                        {isFlipped && (
                          <div className="space-y-3.5 pt-3 border-t border-stone-200/80 dark:border-stone-800 animate-fade-only">
                            {/* Dịch nghĩa */}
                            {currentCard.writingData?.translationHtml && (
                              <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                                <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">📖 Bản dịch tiếng Việt:</span>
                                <div dangerouslySetInnerHTML={{ __html: currentCard.writingData.translationHtml }} />
                              </div>
                            )}

                            {/* Phân tích đáp án ㉠ & ㉡ */}
                            {(currentCard.writingData?.explainA_Html || currentCard.writingData?.explainB_Html) && (
                              <div className="p-3.5 rounded-xl bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/20 text-xs sm:text-sm leading-relaxed text-stone-700 dark:text-stone-300 space-y-2">
                                <span className="font-bold text-sky-600 dark:text-sky-400 block">💡 Phân tích chiến thuật & Logic điền:</span>
                                {currentCard.writingData?.explainA_Html && (
                                  <div>
                                    <span className="font-bold text-amber-500 mr-1.5">Vị trí ㉠:</span>
                                    <span dangerouslySetInnerHTML={{ __html: currentCard.writingData.explainA_Html }} />
                                  </div>
                                )}
                                {currentCard.writingData?.explainB_Html && (
                                  <div>
                                    <span className="font-bold text-sky-500 mr-1.5">Vị trí ㉡:</span>
                                    <span dangerouslySetInnerHTML={{ __html: currentCard.writingData.explainB_Html }} />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Ngữ pháp & Từ vựng */}
                            {(currentCard.writingData?.grammarHtml || currentCard.writingData?.vocabHtml) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                                {currentCard.writingData?.grammarHtml && (
                                  <div className="p-3.5 rounded-xl bg-stone-100/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800">
                                    <span className="font-bold text-stone-900 dark:text-stone-100 block mb-1.5">⚡ Ngữ pháp trọng tâm:</span>
                                    <div className="text-stone-600 dark:text-stone-400 [&_ul]:pl-4 [&_ul]:list-disc space-y-1" dangerouslySetInnerHTML={{ __html: currentCard.writingData.grammarHtml }} />
                                  </div>
                                )}
                                {currentCard.writingData?.vocabHtml && (
                                  <div className="p-3.5 rounded-xl bg-stone-100/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800">
                                    <span className="font-bold text-stone-900 dark:text-stone-100 block mb-1.5">📝 Từ vựng then chốt:</span>
                                    <div className="text-stone-600 dark:text-stone-400 [&_ul]:pl-4 [&_ul]:list-disc space-y-1" dangerouslySetInnerHTML={{ __html: currentCard.writingData.vocabHtml }} />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Bẫy & Lỗi thường gặp */}
                            {currentCard.writingData?.pitfallsHtml && (
                              <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-xs sm:text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                                <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">⚠️ Lỗi sai thường gặp & Bẫy thí sinh:</span>
                                <div className="[&_ul]:pl-4 [&_ul]:list-disc space-y-1" dangerouslySetInnerHTML={{ __html: currentCard.writingData.pitfallsHtml }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* TH2: DẠNG VIẾT BÀI LUẬN (CÂU 53 & 54) */}
                  {(currentCard.writingData?.cardType === "essay" || (!currentCard.writingData?.cardType && (currentCard.word.includes("53") || currentCard.word.includes("54")))) && (() => {
                    const qno = currentCard.writingData?.questionNo || (currentCard.word.includes("54") ? 54 : 53);
                    const minChars = currentCard.writingData?.minChars || (qno === 53 ? 200 : 600);
                    const maxChars = currentCard.writingData?.maxChars || (qno === 53 ? 300 : 700);
                    const prompt = currentCard.writingData?.promptHtml || currentCard.example || currentCard.word;
                    const model = currentCard.writingData?.modelEssay || currentCard.meaning;
                    const charCount = writingEssay.trim().length;

                    return (
                      <div className="space-y-5 pt-5">
                        {/* Đề bài */}
                        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 p-4 sm:p-5 text-sm sm:text-base leading-relaxed text-stone-900 dark:text-stone-100">
                          <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1.5">YÊU CẦU ĐỀ BÀI</p>
                          <div className="font-noto whitespace-pre-line" dangerouslySetInnerHTML={{ __html: prompt }} />
                        </div>

                        {/* Hình ảnh biểu đồ SVG (nếu có) */}
                        {currentCard.writingData?.figureSvg && (
                          <div className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 overflow-x-auto flex justify-center">
                            <div className="max-w-full" dangerouslySetInnerHTML={{ __html: currentCard.writingData.figureSvg }} />
                          </div>
                        )}

                        {/* Khung gõ tiếng Hàn */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                              <span>✍️ Bài làm của bạn (gõ tiếng Hàn):</span>
                            </span>
                            <span className={`font-mono font-bold ${
                              charCount >= minChars && charCount <= maxChars
                                ? "text-emerald-500"
                                : "text-amber-500"
                            }`}>
                              Số chữ: {charCount} / {minChars}~{maxChars}자 {charCount >= minChars && charCount <= maxChars ? "✓ Đạt chuẩn" : ""}
                            </span>
                          </div>
                          <textarea
                            value={writingEssay}
                            onChange={(e) => setWritingEssay(e.target.value)}
                            rows={8}
                            placeholder="Nhập bài viết bằng tiếng Hàn tại đây (hệ thống tự động đếm số chữ chuẩn 원고지)..."
                            className="w-full p-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-noto text-sm sm:text-base leading-relaxed text-stone-900 dark:text-stone-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                          />
                        </div>

                        {!isFlipped && (
                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={revealAnswer}
                              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-xs transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Hiện bài mẫu chuẩn NIIED & Chấm đối chiếu</span>
                            </button>
                          </div>
                        )}

                        {isFlipped && (
                          <div className="space-y-4 pt-4 border-t border-stone-200/80 dark:border-stone-800 animate-fade-only">
                            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                                Bài mẫu chuẩn NIIED (Điểm tối đa)
                              </span>
                              <div className="font-noto text-sm sm:text-base leading-relaxed whitespace-pre-line text-emerald-950 dark:text-emerald-100 font-medium">
                                {model}
                              </div>
                            </div>
                            {currentCard.writingData?.notesHtml && (
                              <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs sm:text-sm text-stone-600 dark:text-stone-400">
                                <span className="font-bold text-stone-900 dark:text-stone-200 block mb-1">💡 Ghi chú cấu trúc:</span>
                                <div dangerouslySetInnerHTML={{ __html: currentCard.writingData.notesHtml }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* TH3: DẠNG TRẮC NGHIỆM TỪ KHÓA */}
                  {currentCard.writingData?.cardType === "choice" && (() => {
                    const opts = currentCard.writingData.choiceOpts || [];
                    const correctIdx = currentCard.writingData.choiceCorrect || 1;
                    return (
                      <div className="space-y-5 pt-5">
                        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 p-4 sm:p-5 font-noto text-base sm:text-lg leading-relaxed text-stone-900 dark:text-stone-100">
                          <div dangerouslySetInnerHTML={{ __html: currentCard.writingData.promptHtml || currentCard.example || "" }} />
                        </div>
                        <p className="text-xs font-bold text-stone-500">Đọc lướt và chọn từ khóa chủ đề chính xác:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {opts.map((opt, idx) => {
                            const optNum = idx + 1;
                            const isChosen = writingChoice === optNum;
                            const isAnswer = optNum === correctIdx;
                            let btnStyle = "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-amber-400";
                            if (isFlipped) {
                              if (isAnswer) btnStyle = "border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold";
                              else if (isChosen) btnStyle = "border-rose-500 bg-rose-500/20 text-rose-600 dark:text-rose-400";
                            }
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (!isFlipped) {
                                    setWritingChoice(optNum);
                                    revealAnswer();
                                  }
                                }}
                                className={`p-3.5 rounded-xl border text-left font-noto text-sm transition cursor-pointer flex items-center gap-3 ${btnStyle}`}
                              >
                                <span className="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-xs font-bold shrink-0">
                                  {["①", "②", "③", "④"][idx] || idx + 1}
                                </span>
                                <span dangerouslySetInnerHTML={{ __html: opt }} />
                              </button>
                            );
                          })}
                        </div>
                        {isFlipped && (
                          <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-stone-800 animate-fade-only text-xs sm:text-sm">
                            {currentCard.writingData.keyPhrasesHtml && (
                              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                <span className="font-bold text-amber-500 block mb-1">🔑 Từ khóa then chốt:</span>
                                <div dangerouslySetInnerHTML={{ __html: currentCard.writingData.keyPhrasesHtml }} />
                              </div>
                            )}
                            {currentCard.writingData.explainHtml && (
                              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30">
                                <span className="font-bold text-sky-500 block mb-1">💡 Giải thích:</span>
                                <div dangerouslySetInnerHTML={{ __html: currentCard.writingData.explainHtml }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* TH4: DẠNG ĐIỀN CLOZE (ANKIVN CLOZE) */}
                  {currentCard.writingData?.cardType === "cloze" && (() => {
                    const prompt = currentCard.writingData.promptHtml || currentCard.example || "";
                    const back = currentCard.writingData.backHtml || currentCard.meaning || "";
                    return (
                      <div className="space-y-5 pt-5">
                        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 p-5 font-noto text-base sm:text-lg leading-relaxed text-stone-900 dark:text-stone-100">
                          <div dangerouslySetInnerHTML={{ __html: isFlipped ? prompt.replace(/\{\{c\d+::(.*?)\}\}/g, "<b class='text-emerald-500 underline'>$1</b>") : prompt.replace(/\{\{c\d+::.*?\}\}/g, "<span class='px-3 py-1 rounded bg-amber-500/20 text-amber-600 font-bold'>[...]</span>") }} />
                        </div>
                        {!isFlipped && (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={writingCloze}
                              onChange={(e) => setWritingCloze(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                  e.preventDefault();
                                  revealAnswer();
                                }
                              }}
                              placeholder="Gõ từ/cụm từ còn thiếu..."
                              className="w-full h-11 px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-noto text-sm sm:text-base text-stone-900 dark:text-stone-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={revealAnswer}
                                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Hiện đáp án</span>
                              </button>
                            </div>
                          </div>
                        )}
                        {isFlipped && back && (
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs sm:text-sm text-stone-800 dark:text-stone-200 font-noto">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">Ghi chú & Đáp án:</span>
                            <div dangerouslySetInnerHTML={{ __html: back }} />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {studyMode === "flip" && !isCardAWritingCard(currentCard) && (
              <div className={`mx-auto w-full mb-5 select-text ${activeImageSrc ? "max-w-4xl" : "max-w-2xl"}`}>
                <div className="relative w-full min-h-[22rem] rounded-2xl bg-white dark:bg-[#141b2d] dark:border dark:border-stone-800/80 px-6 pt-10 pb-5 sm:px-10 sm:pt-14 flex flex-col justify-between shadow-[0_1px_2px_rgba(28,25,23,0.05),0_12px_32px_-16px_rgba(28,25,23,0.18)] dark:shadow-none">
                  {/* Body 2 Cột Desktop: Trái Ảnh - Phải Chữ */}
                  <div className="my-auto pb-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
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
                        <div className="mx-auto max-w-prose pt-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <p
                              className="text-base sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed font-noto text-pretty"
                              dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.example) }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playExampleSound();
                              }}
                              className="w-8 h-8 rounded-full text-stone-400 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center shrink-0 transition cursor-pointer"
                              title="Nghe câu ví dụ"
                              aria-label="Nghe câu ví dụ"
                            >
                              <Volume2 aria-hidden="true" className="w-4 h-4" />
                            </button>
                          </div>
                          {isFlipped && currentCard.example_translated && (
                            <p
                              className="text-sm text-stone-500 dark:text-stone-400 mt-1 animate-fade-only"
                              dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.example_translated) }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thanh dưới thẻ: Loại từ + Nút Audio + ChatGPT */}
                  <div className="w-full flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800">
                    <span className="text-sm font-medium text-stone-500 dark:text-stone-400">{currentCard.pos || "Từ vựng"}</span>

                    <div className="flex items-center gap-2">
                      {/* Nút ChatGPT */}
                      <a
                        href={chatGptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 px-3 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400 transition text-sm font-medium"
                        title="Hỏi ChatGPT về từ này (mở tab mới)"
                      >
                        <Sparkles aria-hidden="true" className="w-4 h-4" />
                        <span>Hỏi ChatGPT</span>
                      </a>

                      {/* Nút Loa Phát Âm */}
                      <button
                        onClick={playCurrentSound}
                        className="w-9 h-9 rounded-full text-stone-500 dark:text-stone-400 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center transition cursor-pointer"
                        title="Nghe phát âm (phím R)"
                        aria-label="Nghe phát âm từ"
                      >
                        <Volume2 aria-hidden="true" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* CHẾ ĐỘ 2: THẺ GÕ TỪ (TYPING - 2 CỘT DESKTOP) */}
            {studyMode === "typing" && (
              <div className={`mx-auto w-full mb-5 rounded-2xl bg-white dark:bg-[#141b2d] dark:border dark:border-stone-800/80 px-6 py-10 sm:px-10 sm:py-12 shadow-[0_1px_2px_rgba(28,25,23,0.05),0_12px_32px_-16px_rgba(28,25,23,0.18)] dark:shadow-none ${activeImageSrc ? "max-w-4xl" : "max-w-2xl"}`}>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
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
                      <span className="text-xs text-stone-500 dark:text-stone-400 mt-2">Ảnh gợi ý</span>
                    </div>
                  )}

                  {/* Cột Phải: Prompt Gõ Từ */}
                  <div
                    className={`${
                      activeImageSrc ? "md:col-span-7" : "md:col-span-12"
                    } space-y-4 text-center`}
                  >
                    <div>
                      <div
                        className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-white text-balance"
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
                    <div className="pt-4 space-y-3">
                      {renderTypingHintDisplay()}

                      {!(isFlipped && isTypedCorrect(typedInput)) && <div className={`relative w-full max-w-sm mx-auto ${activeImageSrc ? "md:mx-0" : ""}`}>
                        <input
                          ref={inputRef}
                          type="text"
                          value={typedInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTypedInput(val);
                            if (isTypedCorrect(val)) {
                              revealAnswer();
                              inputRef.current?.blur();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                              e.preventDefault();
                              revealAnswer();
                              inputRef.current?.blur();
                            }
                          }}
                          placeholder="Gõ từ tiếng Hàn…"
                          aria-label="Gõ từ tiếng Hàn"
                          lang="ko"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          className="w-full h-12 text-center text-lg font-semibold font-noto bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white placeholder:font-sans placeholder:font-medium placeholder:text-stone-400 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15 transition"
                        />
                      </div>}

                      {!isFlipped && <div className={`flex items-center justify-center gap-2 ${activeImageSrc ? "md:justify-start" : ""}`}>
                        <button
                          type="button"
                          onClick={handleGiveHint}
                          className="inline-flex h-9 items-center gap-1.5 px-3 rounded-lg text-sm font-medium text-stone-500 dark:text-stone-400 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 transition cursor-pointer"
                        >
                          <Lightbulb aria-hidden="true" className="w-4 h-4" />
                          <span>Gợi ý 1 ký tự</span>
                        </button>
                      </div>}
                    </div>
                  </div>
                </div>
                {/* Chủ đề ít khi cần nhìn nên đặt cuối thẻ. */}
                <div className="mt-8 flex min-h-9 items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-4">
                  <span className="text-sm font-medium text-stone-500 dark:text-stone-400">{currentCard.pos || "Từ vựng"}</span>
                  {isFlipped && (
                    <div className="flex items-center gap-2 animate-fade-only">
                      <a
                        href={chatGptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 px-3 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400 transition text-sm font-medium"
                        title="Hỏi ChatGPT về từ này (mở tab mới)"
                      >
                        <Sparkles aria-hidden="true" className="w-4 h-4" />
                        <span>Hỏi ChatGPT</span>
                      </a>
                      <button
                        type="button"
                        onClick={playCurrentSound}
                        className="w-9 h-9 rounded-full text-stone-500 dark:text-stone-400 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center transition cursor-pointer"
                        title="Nghe phát âm (phím R)"
                        aria-label="Nghe phát âm từ"
                      >
                        <Volume2 aria-hidden="true" className="w-5 h-5" />
                      </button>
                    </div>
                  )}
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
                  <div className="mx-auto max-w-md [&_button]:shadow-[0_8px_20px_-10px_rgba(28,25,23,0.45)]">
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
