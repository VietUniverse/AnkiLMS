"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadAdminThthCurriculum, loadAdminWritingCurriculum } from "../lib/privateLearningContent";
import { AnkiDeck, AnkiReviewEvent } from "../lib/ankiParser";
import { useApp } from "../contexts/AppProvider";
import {
  Volume2,
  Sparkles,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Search,
  Zap,
  Play,
  Lightbulb,
  Layers,
  BookOpen,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { ankiScheduleToFSRSState, calculateFSRS45, isFSRSCardDue, FSRSRating, FSRSState, FSRS45_DEFAULTS } from "../lib/fsrs45";
import { activateProps } from "../lib/a11y";
import { ApiClient } from "../lib/apiClient";
import { DailyLimitsPanel } from "./DailyLimitsPanel";
import { GRADIENT_PRESETS, saveStudyBackground, STUDY_BACKGROUND_GALLERY, useStudyBackground } from "../lib/studyBackground";
import { addExtraNew, DailyLimits, effectiveNewLimit, loadProgress, recordCard, recordNewWord, remaining, saveLimits, useDailyLimits, useDailyProgress } from "../lib/dailyLimits";
import { parseJson, useLocalState } from "../lib/localStore";
import { speakKorean } from "../lib/koreanSpeech";
import { buildStudyQueue, LEARN_AHEAD_MINUTES, learnAheadCards, sessionProgress } from "../lib/studyQueue";
import { useStudyCardOpacity, useDisableAutoPronounce, useHideChatGpt, useHideDictionary, useMuteAndHideAudio, useMuteExampleAudio, useMuteWordAudio, useRandomStudyBgEvery10, useTinderMode } from "../lib/studyPreferences";
import { LockKeyhole, Globe2 } from "lucide-react";
import { detectDictionarySearchLanguage, naverLookupUrl, searchLearningDictionary, type DictionaryEntry } from "../lib/dictionarySearch";

type AdminCurriculumDeck = { id: string; name: string; cards?: VocabularyCard[] };

// Bộ đọc localStorage khai báo ngoài component để ổn định (xem useLocalState).
const parseWordList = parseJson<string[]>([]);
const parseCardStateMap = parseJson<Record<string, FSRSState>>({});
const parseText = (raw: string | null) => raw;
const serializeText = (value: string | null) => value ?? "";

interface VocabularySRSModuleProps {
  userDecks?: AnkiDeck[];
  initialViewMode?: "dashboard" | "study";
}

import type { AssignedDeckClassJson, AssignedDeckItem, AssignmentPayload, DeckTreeNode, VocabularyCard } from "../lib/vocabCards";
import { findNodeById, filterTree, assignmentCardsOf, buildAssignedTree, deckPathOf, stateKeyOf, checkWritingVariantMatch, isCardAWritingCard, cardStateFor, formatNextReview, extractImageSrc, extractAudioSrc, cleanHtmlText, TYPING_PUNCTUATION, stripTypingPunctuation, cleanTextOnly, toSlug } from "../lib/vocabCards";
export type { VocabularyCard, DeckTreeNode } from "../lib/vocabCards";

const DICT_PANEL_WIDTH_KEY = "haechi.dictionaryPanelWidth";
const DICT_PANEL_DEFAULT_WIDTH = 420;
const DICT_PANEL_MIN_WIDTH = 320;
const DICT_PANEL_MAX_WIDTH = 720;
// Nhớ kích thước panel từ điển người học đã kéo.
const parseDictPanelWidth = (raw: string | null) => {
  const saved = Number(raw);
  return raw && Number.isFinite(saved) && saved >= DICT_PANEL_MIN_WIDTH && saved <= DICT_PANEL_MAX_WIDTH ? saved : DICT_PANEL_DEFAULT_WIDTH;
};
const serializeDictPanelWidth = (value: number) => String(Math.round(value));

export const VocabularySRSModule: React.FC<VocabularySRSModuleProps> = ({ userDecks = [], initialViewMode = "dashboard" }) => {
  const { currentUser, isAuthReady, setActiveStudySession, removedBuiltInDeckIds, userDecks: ownedDecks, setUserDecks, handleOpenAuth } = useApp();
  const isAdmin = currentUser?.role === "admin";
  // Bộ thẻ admin tải từ R2 (THTH, TOPIK Writing): chỉ dùng name và cards.
  // Gắn userId để đổi tài khoản thì bỏ dữ liệu cũ ngay lúc render, không cần effect reset.
  const [adminDecks, setAdminDecks] = useState<{ userId: string; thth: AdminCurriculumDeck[]; writing: AdminCurriculumDeck[] } | null>(null);
  const ownAdminDecks = currentUser && adminDecks?.userId === currentUser.id ? adminDecks : null;
  const adminThthDecks = useMemo(() => ownAdminDecks?.thth ?? [], [ownAdminDecks]);
  const adminWritingDecks = useMemo(() => (isAdmin && ownAdminDecks?.writing) || [], [isAdmin, ownAdminDecks]);
  const [writingInputA, setWritingInputA] = useState<string>("");
  const [writingInputB, setWritingInputB] = useState<string>("");
  const [writingEssay, setWritingEssay] = useState<string>("");
  const [writingChoice, setWritingChoice] = useState<number | null>(null);
  const [writingCloze, setWritingCloze] = useState<string>("");
  const [loadedFsrsConfig, setLoadedFsrsConfig] = useState<{ userId: string; weights: number[] | null; desiredRetention: number } | null>(null);
  // Cấu hình FSRS chỉ dùng khi đúng người đang đăng nhập; đăng xuất thì tự thành null.
  const userFsrsConfig = currentUser && loadedFsrsConfig?.userId === currentUser.id ? loadedFsrsConfig : null;
  const currentUserId = currentUser?.id;

  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    void ApiClient.getFsrsSettings().then((settings) => {
      if (active && settings) {
        setLoadedFsrsConfig({ userId: currentUserId, weights: settings.weights, desiredRetention: settings.desiredRetention });
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [currentUserId]);
  // Cây bộ thẻ phụ thuộc người dùng và kho thẻ đọc từ localStorage: chỉ dựng sau khi hydrate để HTML tĩnh khớp bản client.
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const studyBg = useStudyBackground();
  const router = useRouter();
  // Trang đã mở màn học (Trang chủ, chi tiết bộ thẻ...): bấm Trở về thì quay lại đó thay vì ở lại danh sách Từ vựng.
  const returnToRef = useRef<string | null>(null);
  const autoResumedRef = useRef(false);
  // Nút "Hiện đáp án": khi có nền gradient thì dùng chính gradient đó nhưng pha tối để chữ trắng đạt tương phản ≥ 4.5:1.
  const revealHasGradient = studyBg.kind === "gradient" || studyBg.kind === "animated";
  const cardStyle = { "--study-card-alpha": `${useStudyCardOpacity()}%` } as React.CSSProperties;
  const revealStyle = {
    color: "#fff",
    ...(revealHasGradient
      ? {
          "--reveal-bg-light": `linear-gradient(90deg, color-mix(in srgb, ${studyBg.from} 45%, #000), color-mix(in srgb, ${studyBg.to} 45%, #000))`,
          "--reveal-bg-dark": `linear-gradient(90deg, color-mix(in srgb, ${studyBg.from} 35%, #000), color-mix(in srgb, ${studyBg.to} 35%, #000))`,
        }
      : {}),
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
  const [progressSegment, setProgressSegment] = useState({ index: 0, percent: 0 });
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [typedInput, setTypedInput] = useState<string>("");

  // Search and tree expansion for the learner's active library.
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDecks, setExpandedDecks] = useState<Record<string, boolean>>({});
  const [visibilityBusyDeckId, setVisibilityBusyDeckId] = useState<string | null>(null);

  // Modal zoom image
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [dictPanelOpen, setDictPanelOpen] = useState(false);
  const [dictPanelWidth, setDictPanelWidth] = useLocalState(DICT_PANEL_WIDTH_KEY, parseDictPanelWidth, serializeDictPanelWidth);
  const hideChatGpt = useHideChatGpt();
  const hideDictionary = useHideDictionary();
  const tinderMode = useTinderMode();
  // Kéo thẻ ở chế độ Tinder: độ lệch ngang (px) của thẻ đang kéo.
  const [dragX, setDragX] = useState(0);
  const dragRef = useRef<{ startX: number; pointerId: number } | null>(null);
  const muteWordAudio = useMuteWordAudio();
  const muteExampleAudio = useMuteExampleAudio();
  const muteAndHideAudio = useMuteAndHideAudio();
  const disableAutoPronounce = useDisableAutoPronounce();
  const randomBgEvery10 = useRandomStudyBgEvery10();
  const answeredCountRef = useRef(0);
  // Mỗi 10 lượt trả lời: đổi sang một nền khác trong preset gradient hoặc thư viện ảnh.
  const rotateRandomBackground = useCallback(() => {
    const preferImage = Math.random() < 0.5 && STUDY_BACKGROUND_GALLERY.length > 0;
    if (preferImage) {
      const pool = STUDY_BACKGROUND_GALLERY.filter((src) => !(studyBg.kind === "image" && studyBg.image === src));
      const image = pool[Math.floor(Math.random() * pool.length)] ?? STUDY_BACKGROUND_GALLERY[0];
      saveStudyBackground({ ...studyBg, kind: "image", image });
      return;
    }
    const pool = GRADIENT_PRESETS.filter((preset) => preset.from !== studyBg.from || preset.to !== studyBg.to);
    const preset = pool[Math.floor(Math.random() * pool.length)] ?? GRADIENT_PRESETS[0];
    saveStudyBackground({ ...studyBg, kind: studyBg.kind === "animated" ? "animated" : "gradient", from: preset.from, to: preset.to });
  }, [studyBg]);
  const muteWordRef = useRef(muteWordAudio);
  const muteExampleRef = useRef(muteExampleAudio);
  const [dictQuery, setDictQuery] = useState("");
  const [dictResults, setDictResults] = useState<DictionaryEntry[]>([]);
  const [dictLoading, setDictLoading] = useState(false);
  const dictHasQuery = dictQuery.trim().length > 0;
  const dictShownResults = dictHasQuery ? dictResults : [];
  const dictShownLoading = dictHasQuery && dictLoading;

  // Resume banner state
  const [lastStudiedDeckId, setLastStudiedDeckId] = useLocalState("haechivn_last_lesson_id", parseText, serializeText);
  const [lastStudiedTitle, setLastStudiedTitle] = useLocalState("haechivn_last_lesson_title", parseText, serializeText);

  // FSRS & Local Storage Card Memory
  const [masteredWords, setMasteredWords] = useLocalState("haechivn_mastered", parseWordList);
  const [reviewList, setReviewList] = useLocalState("haechivn_reviews_list", parseWordList);
  const masteredWordSet = useMemo(() => new Set(masteredWords), [masteredWords]);
  const reviewWordSet = useMemo(() => new Set(reviewList), [reviewList]);
  const [cardStateMap, setCardStateMap] = useLocalState(currentUser ? `haechivn_srs_state_${currentUser.id}` : "haechivn_srs_state_guest", parseCardStateMap);
  const dailyLimits = useDailyLimits();
  const dailyProgress = useDailyProgress();
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [goalPromptSeq, setGoalPromptSeq] = useState(0);
  const [goalPromptLeft, setGoalPromptLeft] = useState<{ words: number; cards: number } | null>(null);
  // Đã chạm giới hạn từ mới mà người học bấm vào một bộ: hỏi muốn học thêm bao nhiêu từ mới.
  const [morePrompt, setMorePrompt] = useState<{ deckId: string; title: string; cards: VocabularyCard[]; available: number; availableCards: number } | null>(null);
  const [moreAmount, setMoreAmount] = useState("10");
  const [activeAssignmentMeta, setActiveAssignmentMeta] = useState<{ id: string; classId: string; title: string } | null>(null);
  const [assignedDecks, setAssignedDecks] = useState<AssignedDeckItem[]>([]);
  const [openingAssignedId, setOpeningAssignedId] = useState<string>("");
  // Mới/Ôn/% cho bộ thẻ lớp giao, tính bằng chính getDeckStats như các bộ khác (nạp thẻ 1 lần).
  // Thẻ của từng bài tập, tải một lần rồi dùng lại cho số liệu Mới/Ôn/% và lúc mở bài.
  // shortcut: không tải lại trong lúc trang còn mở, giáo viên sửa bộ thẻ thì học sinh tải lại trang mới thấy.
  const [assignedPayloads, setAssignedPayloads] = useState<Record<string, AssignmentPayload>>({});
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    void Promise.all([
      loadAdminThthCurriculum(),
      isAdmin ? loadAdminWritingCurriculum() : Promise.resolve(null),
    ]).then(([thth, writing]) => {
      if (active) setAdminDecks({ userId: currentUserId, thth: thth || [], writing: writing || [] });
    });
    return () => { active = false; };
  }, [currentUserId, isAdmin]);

  // Sang thẻ khác thì xoá ô nhập Writing ngay trong lúc render (không cần effect).
  const [writingCardIndex, setWritingCardIndex] = useState(currentCardIndex);
  if (writingCardIndex !== currentCardIndex) {
    setWritingCardIndex(currentCardIndex);
    setDragX(0);
    setWritingInputA("");
    setWritingInputB("");
    setWritingEssay("");
    setWritingChoice(null);
    setWritingCloze("");
  }

  const updateLimits = useCallback((next: DailyLimits) => {
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
        cards: allBookCards,
        children: lessonNodes,
      });
    });

    // User-owned and Explore decks are independent decks, at the same level
    // as the curriculum decks. Do not hide them inside an aggregate parent.
    if (userDecks && userDecks.length > 0) {
      const userNodes: DeckTreeNode[] = userDecks.map((ud) => {
        const toVocabularyCard = (c: AnkiDeck["cards"][number], idx: number): VocabularyCard => ({
          id: c.id || `custom-${idx}`,
          word: c.koreanText || c.frontText || "",
          meaning: c.vietnameseMeaning || c.backText || "",
          pos: "Từ vựng",
          audio_word: c.audioUrls?.[0] || "",
          audio_meaning: c.audioUrls?.[1] || "",
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
        // Older copies of this shared deck contained both Anki directions.
        // The study queue already creates a separate typing sibling per note.
        const seenNotes = new Set<number>();
        const sourceCards = ud.sharedId === "haechivn-cong-giao" || ud.id === "haechivn-cong-giao" || ud.cards.some(c => c.audioUrls?.some(url => url.includes("/deck-media/cong-giao/")))
          ? ud.cards.filter(c => { if (seenNotes.has(c.noteId)) return false; seenNotes.add(c.noteId); return true; })
          : ud.cards;
        const cards = sourceCards.map(toVocabularyCard);
        type ImportTreeBranch = { title: string; path: string; entries: Array<{ card: AnkiDeck["cards"][number]; idx: number }>; children: Map<string, ImportTreeBranch> };
        const subdeckRoot: ImportTreeBranch = { title: "", path: "", entries: [], children: new Map() };
        sourceCards.forEach((card, idx) => {
          const rawParts = (card.subdeck ? `${ud.name}::${card.subdeck}` : card.deckName || ud.name).split("::").map((part) => part.trim()).filter(Boolean);
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
              cards: child.cards,
              children: children.length > 0 ? children : undefined,
            };
          });

        const ththSource = ththRoots.find((node) => node.title === "Tiếng Hàn Tổng Hợp");
        rootNodes.push({
          id: ththSource?.id || "user-thth-root",
          title: "Tiếng Hàn Tổng Hợp",
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
        cards: writingRoot.cards,
        children: buildWritingChildren(writingRoot),
      });
    }
    }

    return rootNodes;
  }, [hydrated, userDecks, isAdmin, adminThthDecks, adminWritingDecks, removedBuiltInDeckIds]);

  // Đếm trạng thái theo cùng nguồn FSRS dùng khi mở lượt học, không dùng danh sách legacy theo tên từ.
  const getDeckStats = useCallback((rawCards: VocabularyCard[]) => {
    // Nhóm bài tập gộp thẻ của nhiều bài cùng bộ: bỏ thẻ trùng để không đếm hai lần.
    const cards = Array.from(new Map(rawCards.map((card) => [stateKeyOf(card), card])).values());
    const now = new Date();
    
const playableCards = cards.filter((card) => card.ankiSchedule?.queue !== -1).flatMap((card) => {
  if (isCardAWritingCard(card)) return [card];
  return [card, { ...card, sibling: "typing" as const }];
});
    const total = playableCards.length;
    if (total === 0) return { total: 0, mastered: 0, percent: 0, newCount: 0, reviewCount: 0 };
    let mastered = 0;
    let newCount = 0;
    for (const card of playableCards) {
      const state = cardStateMap[stateKeyOf(card)] || (card.ankiSchedule && !card.sibling ? ankiScheduleToFSRSState(card.ankiSchedule) : undefined);
      if (!state || state.state === "new") {
        newCount += 1;
        continue;
      }
      mastered += 1;
    }
    // Số Ôn lấy từ chính hàng đợi (đã bury thẻ anh em) để khớp số thẻ khi bấm Ôn tập.
    const reviewCount = buildStudyQueue(cards, cardStateMap, { now, newLeft: 0, reviewLeft: Infinity, reviewOnly: true }).dueCount;
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
  const startStudy = useCallback((deckId: string, title: string, cards: VocabularyCard[], options?: { skipMorePrompt?: boolean; reviewOnly?: boolean }) => {
    if (!cards || cards.length === 0) return;

    // Lọc thẻ: chỉ lấy thẻ mới hoặc đến hạn, rồi áp giới hạn mỗi ngày (ôn lại trước, từ mới sau).
    const now = new Date();
    const progress = loadProgress();
    const newLeft = remaining(effectiveNewLimit(dailyLimits, progress), progress.newDone);
    const reviewLeft = remaining(dailyLimits.reviewPerDay, progress.reviewDone);
    const { activeList, newWords, newWordCards, dueCount } = buildStudyQueue(cards, cardStateMap, {
      now, newLeft, reviewLeft, reviewOnly: options?.reviewOnly, countedToday: new Set(progress.newWordIds),
    });
    // Hết hạn mức từ mới: chỉ hỏi học thêm khi không còn thẻ ôn đến hạn, để thẻ ôn không bị chặn.
    if (!options?.reviewOnly && newLeft === 0 && newWords > 0 && activeList.length === 0 && !options?.skipMorePrompt) {
      setMoreAmount(String(Math.min(5, newWords)));
      setMorePrompt({ deckId, title, cards, available: newWords, availableCards: newWordCards });
      return;
    }
    if (activeList.length === 0) {
      // Hết hạn mức mà bộ vẫn còn thẻ: mở luôn hộp "Từ mới mỗi ngày" để người học tăng mục tiêu.
      if (!options?.reviewOnly && dueCount + newWords > 0) {
        setLimitNotice(null);
        setGoalPromptLeft({ words: newWords, cards: newWordCards });
        setGoalPromptSeq((n) => n + 1);
        return;
      }
      setLimitNotice(options?.reviewOnly
        ? "Không còn thẻ nào đến hạn ôn hôm nay. FSRS sẽ đưa thẻ trở lại khi tới hạn."
        : "Bộ thẻ này đã hết thẻ cần học hôm nay. FSRS sẽ đưa thẻ trở lại khi đến hạn ôn.");
      return;
    }
    setLimitNotice(null);

    setActiveDeckTitle(title);
    setActiveCardsList(activeList);
    setProgressSegment({ index: 0, percent: 0 });
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

    // Phiên ôn tập không phải "bài đang học" nên không ghi đè thẻ Học tiếp.
    if (!options?.reviewOnly) {
      setLastStudiedDeckId(deckId);
      setLastStudiedTitle(title);
    }
  }, [cardStateMap, currentUser, dailyLimits, exitStudy, setActiveStudySession, setLastStudiedDeckId, setLastStudiedTitle]);


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
  }, [lastStudiedDeckId, deckTree, startStudy]);

  // Số thẻ còn lại trong lượt học: thẻ mới (chưa có lịch ôn) và thẻ ôn lại, tính từ thẻ đang học trở đi.
  // Giống Anki: thẻ đã học trong lượt mà còn bước học trong 20 phút (sẽ được học trước) cũng tính vào "ôn",
  // nên học 1 thẻ mới xong thì 5 mới / 0 ôn thành 4 mới / 1 ôn.
  const remainingCounts = useMemo(() => {
    let newCount = 0;
    let reviewCount = 0;
    const rest = activeCardsList.slice(currentCardIndex);
    const restKeys = new Set(rest.map(stateKeyOf));
    for (const card of rest) {
      const state = cardStateMap[stateKeyOf(card)];
      if (state && state.state !== "new") reviewCount += 1;
      else newCount += 1;
    }
    // shortcut: "bây giờ" chỉ tính lại khi chuyển thẻ, đủ cho giới hạn 20 phút.
    const pending = learnAheadCards(activeCardsList.slice(0, currentCardIndex), cardStateMap, new Date());
    reviewCount += pending.filter((card) => !restKeys.has(stateKeyOf(card))).length;
    return { newCount, reviewCount };
  }, [activeCardsList, currentCardIndex, cardStateMap]);

  // Sync study session with App context for Navbar controls
  useEffect(() => {
    if (viewMode === "study") {
      setActiveStudySession({
        title: activeDeckTitle,
        onExit: exitStudy,
        progressText: activeCardsList.length > 0 ? `${currentCardIndex + 1} / ${activeCardsList.length}` : "Hoàn thành",
        progressPercent: activeCardsList.length > 0 ? sessionProgress(currentCardIndex, activeCardsList.length, progressSegment) : 0,
        remainingNew: remainingCounts.newCount,
        remainingReview: remainingCounts.reviewCount,
      });
    }
  }, [viewMode, activeDeckTitle, exitStudy, currentCardIndex, activeCardsList.length, progressSegment, remainingCounts, setActiveStudySession]);

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
          const cards = assignmentCardsOf(asg);
          if (cards.length > 0) {
            setActiveAssignmentMeta({ id: asg.id, classId: asg.classId, title: asg.title });
            startStudy(`assignment-${asg.id}`, deckPathOf(asg.deckName || asg.title).at(-1)!, cards, { skipMorePrompt: true });
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
      // Mở lượt học một lần theo link URL, sau khi cây bộ thẻ nạp xong: không có sự kiện người dùng nào để chuyển sang.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (requestedDeck) startStudy(requestedDeck.id, requestedDeck.title, requestedDeck.cards);
      else if (params.get("resume") === "true" || params.get("study") === "true") resumeLastLesson();
    }
  }, [isAuthReady, currentUser, resumeLastLesson, startStudy, deckTree]);
  // Bộ thẻ giáo viên giao qua lớp: hiện ngay trong /flashcards để học sinh học.
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;
    let active = true;
    void ApiClient.getClasses()
      .then((classes: AssignedDeckClassJson[]) => {
        if (!active) return;
        const now = Date.now();
        setAssignedDecks(
          classes.flatMap((cls) =>
            (cls.assignments || []).map((a) => {
              const dueDate = a.dueDate || "";
              const days = dueDate ? Math.ceil((new Date(`${dueDate}T23:59:59`).getTime() - now) / 86_400_000) : null;
              const completed = Boolean(a.completed);
              return {
                id: a.id,
                classId: cls.id,
                className: cls.name || "Lớp học",
                title: a.title,
                deckName: a.deckName || a.title,
                totalCards: a.totalCards || 0,
                reviewedCards: a.reviewedCards || 0,
                completed,
                dueLabel: completed
                  ? "Đã xong"
                  : days === null
                    ? "Không hạn"
                    : days < 0
                      ? "Đã quá hạn"
                      : days === 0
                        ? "Hạn hôm nay"
                        : `Còn ${days} ngày`,
              };
            }),
          ),
        );
      })
      .catch(() => {
        if (active) setAssignedDecks([]);
      });
    return () => {
      active = false;
    };
  }, [isAuthReady, currentUser, viewMode]);

  const openAssignedDeck = useCallback(
    // node: deck con trong cây bài tập (chỉ học thẻ của deck đó); không có thì học cả bài.
    async (item: AssignedDeckItem, node?: DeckTreeNode) => {
      setOpeningAssignedId(item.id);
      try {
        const asg = assignedPayloads[item.id] || await ApiClient.getClassAssignment(item.classId, item.id);
        const all = assignmentCardsOf(asg);
        const cards = node?.cards.length ? node.cards : all;
        if (cards.length === 0) return;
        setActiveAssignmentMeta({ id: asg.id, classId: asg.classId, title: asg.title });
        startStudy(node?.id ?? `assignment-${asg.id}`, node?.title ?? deckPathOf(asg.deckName || asg.title).at(-1)!, cards, { skipMorePrompt: true });
      } catch {
        // im lặng: lỗi mạng thì để học sinh bấm lại
      } finally {
        setOpeningAssignedId("");
      }
    },
    [startStudy, assignedPayloads],
  );


  // Mới/Ôn/% của bộ thẻ lớp giao: chỉ tải thẻ của bài chưa có trong cache, rồi tính bằng getDeckStats giống bộ thẻ thường.
  useEffect(() => {
    if (!currentUser) return;
    const missing = assignedDecks.filter((item) => !assignedPayloads[item.id]);
    if (missing.length === 0) return;
    let active = true;
    void Promise.all(
      missing.map(async (item) => {
        try {
          return [item.id, await ApiClient.getClassAssignment(item.classId, item.id)] as const;
        } catch {
          return null;
        }
      }),
    ).then((rows) => {
      if (!active) return;
      const loaded = rows.filter((row): row is NonNullable<typeof row> => row !== null);
      if (loaded.length) setAssignedPayloads((prev) => ({ ...prev, ...Object.fromEntries(loaded) }));
    });
    return () => {
      active = false;
    };
  }, [assignedDecks, currentUser, assignedPayloads]);

  const assignedStats = useMemo(() => {
    const next: Record<string, { newCount: number; reviewCount: number; percent: number }> = {};
    for (const [id, asg] of Object.entries(assignedPayloads)) next[id] = getDeckStats(assignmentCardsOf(asg));
    return next;
  }, [assignedPayloads, getDeckStats]);

  // Bài tập lớp dựng theo cấu trúc bộ thẻ gốc (deck mẹ → deck được giao → deck con).
  const assignedTree = useMemo(() => buildAssignedTree(assignedDecks, assignedPayloads), [assignedDecks, assignedPayloads]);


  const toggleGroup = (id: string) => {
    setExpandedDecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };


  const filteredTree = useMemo(() => {
    return searchQuery.trim() ? filterTree(deckTree, searchQuery.toLowerCase()) : deckTree;
  }, [deckTree, searchQuery]);

  // Sync active study session to global Navbar
  useEffect(() => {
    if (viewMode === "study") {
      setActiveStudySession({
        title: activeDeckTitle,
        onExit: exitStudy,
        progressText: activeCardsList.length > 0 ? `${currentCardIndex + 1} / ${activeCardsList.length}` : "",
        progressPercent: activeCardsList.length > 0 ? sessionProgress(currentCardIndex, activeCardsList.length, progressSegment) : 0,
        remainingNew: remainingCounts.newCount,
        remainingReview: remainingCounts.reviewCount,
      });
    } else {
      setActiveStudySession(null);
    }
    return () => {
      setActiveStudySession(null);
    };
  }, [viewMode, activeDeckTitle, exitStudy, currentCardIndex, activeCardsList.length, progressSegment, remainingCounts, setActiveStudySession]);

  const currentCard = activeCardsList[currentCardIndex] || activeCardsList[0];

  useEffect(() => {
    muteWordRef.current = muteWordAudio || muteAndHideAudio;
    if (muteWordAudio || muteAndHideAudio) {
      audioPlayerRef.current?.pause();
      audioPlayerRef.current = null;
    }
  }, [muteWordAudio, muteAndHideAudio]);

  useEffect(() => {
    muteExampleRef.current = muteExampleAudio || muteAndHideAudio;
    if (muteExampleAudio || muteAndHideAudio) {
      audioPlayerRef.current?.pause();
      audioPlayerRef.current = null;
    }
  }, [muteExampleAudio, muteAndHideAudio]);
  const studyMode = currentCard?.sibling ? "typing" : "flip";
  const nextReviewLabel = (rating: FSRSRating): string => {
    if (!currentCard) return "";
    try {
      const curState = cardStateFor(cardStateMap, stateKeyOf(currentCard), currentCard);
      const effectiveState = userFsrsConfig?.weights && !curState.schedulerConfig?.w
        ? { ...curState, schedulerConfig: { ...curState.schedulerConfig, w: userFsrsConfig.weights } }
        : curState;
      const effectiveRetention = userFsrsConfig?.desiredRetention || FSRS45_DEFAULTS.desiredRetention;
      return ` (${formatNextReview(calculateFSRS45(rating, effectiveState, new Date(), effectiveRetention))})`;
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
    if (!currentCard || muteWordRef.current) return;
    playAudioWithFallback(currentCard.audio_word, currentCard.word);
  }, [currentCard, playAudioWithFallback]);

  const playExampleSound = useCallback(() => {
    if (!currentCard?.example || muteExampleRef.current) return;
    playAudioWithFallback(currentCard.audio_example, currentCard.example);
  }, [currentCard, playAudioWithFallback]);

  // Speak each card when a study session starts and whenever the learner moves
  // to another card. Depend on its text/index so unrelated renders do not replay it.
  const currentWordForAudio = currentCard ? cleanTextOnly(currentCard.word) : "";
  // Chế độ gõ: dấu câu (. ? ! , …) hiện sẵn, người học chỉ gõ phần chữ.
  const typingAnswer = currentCard ? stripTypingPunctuation(cleanTextOnly(currentCard.word)) : "";
  const isTypedCorrect = (typed: string) => stripTypingPunctuation(typed) === typingAnswer;
  const currentAudioWordField = currentCard?.audio_word || "";
  const currentAudioMeaningField = currentCard?.audio_meaning || "";
  useEffect(() => {
    // Thẻ Typing: đọc to từ sẽ lộ đáp án, nên mặt trước chỉ phát âm thanh của nghĩa (nếu có file).
    // "Tắt phát âm thanh tự động" chỉ chặn tự phát; bấm nút loa vẫn nghe được.
    if (viewMode !== "study" || muteWordRef.current || disableAutoPronounce) return;
    if (currentCard?.sibling) {
      if (extractAudioSrc(currentAudioMeaningField)) playAudioWithFallback(currentAudioMeaningField, "");
    } else if (currentWordForAudio) {
      playAudioWithFallback(currentAudioWordField, currentWordForAudio);
    }
  }, [viewMode, currentCardIndex, currentWordForAudio, currentAudioWordField, currentAudioMeaningField, currentCard?.sibling, playAudioWithFallback, disableAutoPronounce]);

  // Thẻ Typing: lật sang mặt sau thì phát âm từ vựng.
  useEffect(() => {
    if (viewMode === "study" && isFlipped && currentCard?.sibling && currentWordForAudio && !muteWordRef.current && !disableAutoPronounce) {
      playAudioWithFallback(currentAudioWordField, currentWordForAudio);
    }
  }, [viewMode, isFlipped, currentCardIndex, currentCard?.sibling, currentWordForAudio, currentAudioWordField, playAudioWithFallback, disableAutoPronounce]);

  // Handle Response (Quên: false | Thuộc: true)
  const handleResponse = useCallback((isMastered: boolean, customRating?: FSRSRating) => {
    if (!currentCard) return;
    if (studyMode === "typing" && isMastered && !isTypedCorrect(typedInput)) return;
    const wordKey = currentCard.word;
    const activeKey = stateKeyOf(currentCard);
    if (lastRatedCardRef.current === activeKey || Date.now() - answerShownAtRef.current < 450) return;
    lastRatedCardRef.current = activeKey;
    if (randomBgEvery10) {
      answeredCountRef.current += 1;
      if (answeredCountRef.current % 10 === 0) rotateRandomBackground();
    }
    srsActivityRef.current.reviewed += 1;
    if (isMastered) srsActivityRef.current.correct += 1;

    // Update Mastered & Review Lists
    if (isMastered) {
      setMasteredWords((prev) => {
        const next = prev.includes(wordKey) ? prev : [...prev, wordKey];
        return next;
      });
      setReviewList((prev) => {
        const next = prev.filter((w) => w !== wordKey);
        return next;
      });
    } else {
      setMasteredWords((prev) => {
        const next = prev.filter((w) => w !== wordKey);
        return next;
      });
      setReviewList((prev) => {
        const next = prev.includes(wordKey) ? prev : [...prev, wordKey];
        return next;
      });
    }

    // Ignore key repeats/double clicks on the same card and enforce a short recall window.
    // Official ts-fsrs scheduler; calculateFSRS45 remains as a compatibility adapter name.
    const rating: FSRSRating = customRating || (isMastered ? "good" : "again");
    const curState = cardStateFor(cardStateMap, activeKey, currentCard);
    const effectiveState = userFsrsConfig?.weights && !curState.schedulerConfig?.w
      ? { ...curState, schedulerConfig: { ...curState.schedulerConfig, w: userFsrsConfig.weights } }
      : curState;
    const effectiveRetention = userFsrsConfig?.desiredRetention || FSRS45_DEFAULTS.desiredRetention;
    const newState = calculateFSRS45(rating, effectiveState, new Date(), effectiveRetention);
    // Hạn mức từ mới đếm theo từ: thẻ Review và Typing của cùng một từ chỉ tính 1 lần trong ngày.
    if (curState.reps === 0 || curState.state === "new") recordNewWord(stateKeyOf({ ...currentCard, sibling: undefined }));
    else recordCard(false);
    setCardStateMap((prev) => ({ ...prev, [activeKey]: newState }));

    if (currentUser) {
      // Lưu theo bộ thật của thẻ (không theo tên lượt học, vd "Ôn tập thư viện") để khớp khóa stateKeyOf.
      void ApiClient.saveCardState(currentCard.deckName || activeDeckTitle, (currentCard.sibling ? -1 : 1) * (Number(currentCard.id) || 1), newState).catch(() => {});
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
      return;
    }
    // Hết thẻ: thẻ học dở đến hạn trong 20 phút nữa thì học luôn, không bắt đợi (learn ahead của Anki).
    const ahead = learnAheadCards(activeCardsList, { ...cardStateMap, [activeKey]: newState }, new Date(), LEARN_AHEAD_MINUTES, activeKey);
    if (ahead.length > 0) {
      setProgressSegment({ index: currentCardIndex + 1, percent: sessionProgress(currentCardIndex, activeCardsList.length, progressSegment) });
      setActiveCardsList((list) => [...list, ...ahead]);
      setCurrentCardIndex((i) => i + 1);
      return;
    }
    // Finished deck
    finishSrsActivity();
    setViewMode("dashboard");
  }, [activeCardsList, progressSegment, currentCard, cardStateMap, currentUser, activeDeckTitle, currentCardIndex, activeCardsList.length, finishSrsActivity, ownedDecks, setUserDecks, studyMode, typedInput, randomBgEvery10, rotateRandomBackground, setCardStateMap, setMasteredWords, setReviewList]);

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

      if (dictPanelOpen) return;

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
  }, [viewMode, isFlipped, studyMode, modalImage, playCurrentSound, handleResponse, revealAnswer, dictPanelOpen]);

  // Tra từ điển trong panel bên phải
  useEffect(() => {
    if (!dictPanelOpen) return;
    const q = dictQuery.trim();
    if (!q) return; // ô tìm rỗng: kết quả hiển thị được tính rỗng lúc render (dictShownResults)
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setDictLoading(true);
      void searchLearningDictionary(q, 24, controller.signal, detectDictionarySearchLanguage(q))
        .then((res) => {
          if (!controller.signal.aborted) setDictResults(res);
        })
        .catch(() => {
          if (!controller.signal.aborted) setDictResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setDictLoading(false);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [dictPanelOpen, dictQuery]);

  useEffect(() => {
    if (!dictPanelOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDictPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dictPanelOpen]);


  const clampDictPanelWidth = (value: number) => {
    const maxWidth = Math.min(DICT_PANEL_MAX_WIDTH, Math.max(DICT_PANEL_MIN_WIDTH, window.innerWidth * 0.62));
    return Math.max(DICT_PANEL_MIN_WIDTH, Math.min(maxWidth, value));
  };

  const startDictPanelResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const onMove = (moveEvent: PointerEvent) => {
      setDictPanelWidth(clampDictPanelWidth(window.innerWidth - moveEvent.clientX));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

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

    // Nút trong cây bài tập lớp: deck mẹ chỉ mở/đóng, deck được giao/deck con thì học dưới bài tập đó.
    const assignment = node.assignment;
    const isAssignmentRoot = Boolean(assignment) && node.id === `assignment-${assignment!.id}`;
    const openNode = () => {
      if (node.groupOnly) toggleGroup(node.id);
      else if (assignment) void openAssignedDeck(assignment, node);
      else startStudy(node.id, node.title, node.cards);
    };

    const indentClass =
      level === 0
        ? "px-4 sm:px-5 min-h-14 py-2 sm:py-0 sm:h-14 bg-white dark:bg-stone-900/60"
        : level === 1
        ? "pl-8 sm:pl-10 pr-4 sm:pr-5 min-h-12 py-2 sm:py-0 sm:h-12 bg-stone-50/50 dark:bg-stone-900/30"
        : "pl-14 sm:pl-16 pr-4 sm:pr-5 min-h-11 py-2 sm:py-0 sm:h-11 bg-stone-50/80 dark:bg-stone-950/40";

    return (
      <div key={node.id} className="deck-group divide-y divide-stone-100 dark:divide-stone-800/60">
        <div
          role="button"
          tabIndex={0}
          onClick={openNode}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openNode();
            }
          }}
          className={`group relative overflow-hidden flex items-center justify-between cursor-pointer hover:bg-stone-100/70 dark:hover:bg-stone-800/50 transition-colors ${indentClass}`}
          title={isAssignmentRoot ? `Bài tập: ${assignment!.title}` : node.groupOnly ? undefined : stats.newCount + stats.reviewCount === 0 ? "Không có thẻ đến hạn hôm nay" : `Bấm để học ${node.cards.length} từ trong ${node.title}`}
        >
          {/* Vạch pin tiến độ xanh ngọc */}
          <div
            className={`absolute inset-y-0 left-0 pointer-events-none transition duration-300 ${
              stats.percent > 0 ? "bg-emerald-500/10 dark:bg-emerald-500/15" : "bg-transparent"
            }`}
            style={{ width: `${stats.percent}%` }}
          />
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-emerald-500 transition duration-300 pointer-events-none"
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
                <span className="truncate">{node.title}</span>
                {(isAssignmentRoot || (node.groupOnly && level === 0)) && (
                  <span className="shrink-0 rounded-full bg-sky-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                    Bài tập
                  </span>
                )}
                {assignment && openingAssignedId === assignment.id && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-stone-400" />}
              </h3>
              {isAssignmentRoot && (
                <p className="mt-0.5 truncate text-[11px] font-normal text-stone-500 dark:text-stone-400">
                  Lớp {assignment!.className} · {assignment!.reviewedCards}/{assignment!.totalCards} thẻ · {assignment!.dueLabel}
                </p>
              )}
              <p className="sm:hidden mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                <span className="font-bold text-sky-600 dark:text-sky-400">{stats.newCount}</span> mới, <span className="font-bold text-rose-500 dark:text-rose-400">{stats.reviewCount}</span> ôn, <span className={stats.percent > 0 ? "font-bold text-emerald-600 dark:text-emerald-400" : ""}>{stats.percent}%</span>
              </p>
            </div>
          </div>

          {/* Cột 2, 3, 4: Mới | Ôn | % */}
          <div className="relative z-10 flex items-center gap-3 sm:gap-6 shrink-0 tabular-nums text-xs">
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

  const openDictionary = () => {
    if (hideDictionary) return;
    setDictQuery(cleanTextOnly(currentCard?.word || "").trim());
    setDictPanelOpen(true);
  };

  // Chế độ Tinder chỉ cho thẻ lật (Review), không áp cho thẻ gõ và thẻ Writing.
  const tinderActive = tinderMode && studyMode === "flip" && !isCardAWritingCard(currentCard);
  const SWIPE_THRESHOLD = 100;
  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest("button, a, input, textarea, select, [role='button'], [data-no-swipe]"));
  const tinderHandlers = tinderActive ? {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (isInteractiveTarget(e.target) || e.button !== 0) return;
      dragRef.current = { startX: e.clientX, pointerId: e.pointerId };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      // Chỉ kéo được sau khi đã lật (đã thấy đáp án).
      if (!drag || drag.pointerId !== e.pointerId || !isFlipped) return;
      setDragX(e.clientX - drag.startX);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const dx = e.clientX - drag.startX;
      setDragX(0);
      if (!isFlipped) {
        if (Math.abs(dx) < 10) revealAnswer();
        return;
      }
      if (Math.abs(dx) >= SWIPE_THRESHOLD) {
        handleResponse(dx > 0);
      } else if (Math.abs(dx) < 10) {
        // Chạm (không kéo): nửa phải là Thuộc, nửa trái là Quên.
        const rect = e.currentTarget.getBoundingClientRect();
        handleResponse(e.clientX - rect.left > rect.width / 2);
      }
    },
    onPointerCancel: () => {
      dragRef.current = null;
      setDragX(0);
    },
  } : {};

  const studyActions = (
    <>
              {!isFlipped && tinderActive ? (
                <p className="h-12 flex items-center justify-center text-sm font-bold text-stone-500 dark:text-stone-400 select-none">
                  Chạm vào thẻ để lật
                </p>
              ) : !isFlipped ? (
                /* Trạng thái 1: Chưa lật -> Nút Hiện Đáp Án */
                <button
                  onClick={() => {
                    revealAnswer();
                    inputRef.current?.blur();
                  }}
                  style={revealStyle}
                  className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    revealHasGradient
                      ? "bg-[image:var(--reveal-bg-light)] hover:brightness-95 dark:bg-[image:var(--reveal-bg-dark)]"
                      : "bg-sky-700 hover:bg-sky-800 dark:bg-stone-800 dark:hover:bg-stone-700 dark:border dark:border-stone-700"
                  }`}
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
                      disabled={studyMode === "typing" && !isTypedCorrect(typedInput)}
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

  // Ôn tập: thẻ đã học và đang đến hạn trong thư viện của user và các bài tập lớp đã tải (không thẻ mới).
  const reviewAllCards = useMemo(() => {
    const unique = new Map<string, VocabularyCard>();
    for (const node of deckTree) for (const card of node.cards) unique.set(stateKeyOf(card), card);
    for (const asg of Object.values(assignedPayloads)) for (const card of assignmentCardsOf(asg)) unique.set(stateKeyOf(card), card);
    return Array.from(unique.values());
  }, [deckTree, assignedPayloads]);

  const startReviewAll = useCallback(() => {
    if (reviewAllCards.length === 0) {
      setLimitNotice("Thư viện của bạn chưa có thẻ nào. Hãy thêm bộ thẻ hoặc học bài mới trước.");
      return;
    }
    startStudy("review-all", "Ôn tập thư viện", reviewAllCards, { reviewOnly: true, skipMorePrompt: true });
  }, [reviewAllCards, startStudy]);

  // Cùng nguồn với startReviewAll để số khớp phiên ôn.
  const libraryDue = useMemo(
    () => buildStudyQueue(reviewAllCards, cardStateMap, { now: new Date(), newLeft: 0, reviewLeft: Infinity, reviewOnly: true }).dueCount,
    [reviewAllCards, cardStateMap],
  );

  // Vào /flashcards?review=true (nút Ôn tập ở trang chủ): chờ thẻ đến hạn nạp xong rồi mở phiên ôn,
  // sau đó xoá param để reload không mở lại.
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;
    if (new URLSearchParams(window.location.search).get("review") !== "true") return;
    if (libraryDue === 0) return;
    // Mở phiên ôn một lần theo link ?review=true, sau khi thẻ đến hạn nạp xong.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startReviewAll();
    const url = new URL(window.location.href);
    url.searchParams.delete("review");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [isAuthReady, currentUser, libraryDue, startReviewAll]);

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

  const reviewButton = (
    <button
      onClick={startReviewAll}
      title="Chỉ ôn lại những thẻ đã học trong thư viện của bạn"
      className="flex h-full min-h-[74px] w-full flex-col justify-center rounded-2xl border border-stone-200 bg-white px-4 text-left transition-colors hover:border-sky-400 dark:border-stone-800 dark:bg-stone-900/60 cursor-pointer"
    >
      <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">Ôn tập</span>
      <span className="mt-0.5 text-lg font-black text-stone-900 dark:text-white">
        {libraryDue} thẻ đến hạn
      </span>
    </button>
  );

  return (
    <div className="flex w-full min-h-[calc(100vh-6rem)] pb-12 transition-colors lg:items-start lg:gap-4">
      {/* ====================================================================
          NỘI DUNG CHÍNH (CONTAINER)
          ==================================================================== */}
      <main className="mx-auto w-full min-w-0 max-w-4xl flex-1 px-4 sm:px-6">
        {/* ==========================================
            A. DASHBOARD: BẢNG CÂY ANKI TOÀN TRANG
            ========================================== */}
        {viewMode === "dashboard" && (
          <div className="space-y-6 pt-2">
            {/* Thanh công cụ tìm kiếm và chuyển sang Khám phá */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex w-full items-center gap-2">
                <div className="relative flex-1">
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
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-800 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:bg-stone-800/80"
                >
                  Khám phá
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Banner tiếp tục học lượt trước + Ôn tập + Từ mới gộp chung một hàng trên desktop */}
            <div className={`grid gap-3 sm:items-stretch ${lastStudiedDeckId && lastStudiedTitle ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" : "sm:grid-cols-[minmax(0,1fr)_auto]"}`}>
            {lastStudiedDeckId && lastStudiedTitle ? (
              <>
                <button
                  onClick={resumeLastLesson}
                  title="Học tiếp ngay"
                  className="group flex h-full w-full items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left transition-colors hover:border-sky-400 dark:border-stone-800 dark:bg-stone-900/60 cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold text-stone-500 dark:text-stone-400">Học tiếp</span>
                    <span className="mt-0.5 block truncate text-base font-black text-stone-900 dark:text-white">
                      {lastStudiedTitle}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-600 dark:group-hover:text-sky-400" />
                </button>
                {reviewButton}
                <div className="flex h-full items-stretch">
                  <DailyLimitsPanel limits={dailyLimits} progress={dailyProgress} onChange={updateLimits} openRequest={goalPromptSeq} remainingNew={goalPromptLeft} />
                </div>
              </>
            ) : (
              <>
                {reviewButton}
                <DailyLimitsPanel limits={dailyLimits} progress={dailyProgress} onChange={updateLimits} openRequest={goalPromptSeq} remainingNew={goalPromptLeft} />
              </>
            )}
            </div>

            {limitNotice && (
              <div role="status" className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
                {limitNotice}
              </div>
            )}


            {/* BẢNG ANKI ĐỒNG NHẤT TOÀN TRANG (DECK TREE) */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 overflow-hidden shadow-xs">
              {/* Header 4 Cột Chuẩn */}
              <div className="hidden sm:flex items-center justify-between px-4 sm:px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-800/50 text-[11px] font-bold tracking-wider uppercase text-stone-500 dark:text-stone-400 select-none">
                <span className="font-bold">Nội dung</span>
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
              {/* Bộ thẻ giáo viên giao qua lớp: nằm chung bảng, gắn nhãn Lớp học */}
              {currentUser && assignedTree.map((node) => renderTreeNode(node, 0))}

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
            <div
              className="min-h-[calc(100vh-140px)] flex flex-col justify-between py-2 pb-28 animate-reveal"
              // Tinder: chạm bất cứ đâu trên màn học (ngoài nút/ô nhập) để lật thẻ.
              onClick={tinderActive && !isFlipped ? (e) => { if (!isInteractiveTarget(e.target)) revealAnswer(); } : undefined}
            >
              <div className="flex-1 flex flex-col">

            {/* CHẾ ĐỘ 1: THẺ NHẬN DIỆN PHẲNG REVEAL (2 CỘT DESKTOP) */}
            
            {/* CHẾ ĐỘ THẺ LUYỆN VIẾT TOPIK II (CÂU 51~54) VỚI Ô GÕ TỰ ĐỘNG CHẤM */}
            {studyMode === "flip" && isCardAWritingCard(currentCard) && (
              <div className="mx-auto w-full max-w-3xl mb-5 select-text">
                <div style={cardStyle} className="relative w-full rounded-3xl study-card border border-stone-200/80 dark:border-stone-800/80 p-5 sm:p-8 shadow-sm">
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
              <div
                {...tinderHandlers}
                className={`relative mx-auto w-full mb-5 ${tinderActive ? "select-none cursor-pointer touch-pan-y" : "select-text"} ${activeImageSrc ? "max-w-4xl" : "max-w-2xl"}`}
                style={tinderActive && dragX !== 0 ? { transform: `translateX(${dragX}px) rotate(${dragX / 25}deg)` } : undefined}
              >
                {tinderActive && isFlipped && dragX !== 0 && (
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-4 z-20 rounded-xl px-4 py-1.5 text-sm font-black text-white ${dragX > 0 ? "right-4 bg-emerald-600" : "left-4 bg-rose-600"}`}
                    style={{ opacity: Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD) }}
                  >
                    {dragX > 0 ? "Thuộc" : "Quên"}
                  </div>
                )}
                <div style={cardStyle} className="relative w-full min-h-[22rem] rounded-2xl study-card dark:border dark:border-stone-800/80 px-6 pt-10 pb-5 sm:px-10 sm:pt-14 flex flex-col justify-between shadow-[0_1px_2px_rgba(28,25,23,0.05),0_12px_32px_-16px_rgba(28,25,23,0.18)] dark:shadow-none">
                  {/* Body 2 Cột Desktop: Trái Ảnh - Phải Chữ */}
                  <div className="my-auto pb-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    {/* Cột Trái: Ảnh Minh Họa Cỡ Lớn */}
                    {activeImageSrc && (
                      <div
                        className="md:col-span-5 flex flex-col items-center justify-center cursor-zoom-in group"
                        {...activateProps(() => setModalImage(activeImageSrc))}
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
                        <div className="relative mx-auto max-w-prose pt-2 text-center">
                          <p
                            className="text-base sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed font-noto text-pretty"
                            dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.example) }}
                          />
                          {/* Nút nghe nằm dưới câu để không đẩy câu ví dụ lệch khỏi tâm thẻ. */}
                          {!muteAndHideAudio && (
                            <div className="mt-1 flex justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playExampleSound();
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
                                title="Nghe câu ví dụ"
                                aria-label="Nghe câu ví dụ"
                              >
                                <Volume2 aria-hidden="true" className="w-4 h-4" />
                              </button>
                            </div>
                          )}
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
                      {!hideDictionary && (
                        <button
                          type="button"
                          onClick={openDictionary}
                          className="inline-flex h-9 items-center gap-1.5 px-3 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-400 transition text-sm font-medium cursor-pointer"
                          title="Tra từ này trong từ điển"
                        >
                          <BookOpen aria-hidden="true" className="w-4 h-4" />
                          <span>Từ điển</span>
                        </button>
                      )}
                      {!hideChatGpt && (
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
                      )}

                      {/* Nút Loa Phát Âm */}
                      {!muteAndHideAudio && (
                        <button
                          onClick={playCurrentSound}
                          className="w-9 h-9 rounded-full text-stone-500 dark:text-stone-400 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center transition cursor-pointer"
                          title="Nghe phát âm (phím R)"
                          aria-label="Nghe phát âm từ"
                        >
                          <Volume2 aria-hidden="true" className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* CHẾ ĐỘ 2: THẺ GÕ TỪ (TYPING - 2 CỘT DESKTOP) */}
            {studyMode === "typing" && (
              <div style={cardStyle} className={`mx-auto w-full mb-5 rounded-2xl study-card dark:border dark:border-stone-800/80 px-6 py-10 sm:px-10 sm:py-12 shadow-[0_1px_2px_rgba(28,25,23,0.05),0_12px_32px_-16px_rgba(28,25,23,0.18)] dark:shadow-none ${activeImageSrc ? "max-w-4xl" : "max-w-2xl"}`}>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  {/* Cột Trái: Ảnh Gợi Ý */}
                  {activeImageSrc && (
                    <div
                      className="md:col-span-5 flex flex-col items-center justify-center cursor-zoom-in"
                      {...activateProps(() => setModalImage(activeImageSrc))}
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
                          className="study-input w-full h-12 text-center text-lg font-semibold font-noto border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white placeholder:font-sans placeholder:font-medium placeholder:text-stone-400 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15 transition"
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
                      {!hideDictionary && (
                        <button
                          type="button"
                          onClick={openDictionary}
                          className="inline-flex h-9 items-center gap-1.5 px-3 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-400 transition text-sm font-medium cursor-pointer"
                          title="Tra từ này trong từ điển"
                        >
                          <BookOpen aria-hidden="true" className="w-4 h-4" />
                          <span>Từ điển</span>
                        </button>
                      )}
                      {!hideChatGpt && (
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
                      )}
                      {!muteAndHideAudio && (
                        <button
                          type="button"
                          onClick={playCurrentSound}
                          className="w-9 h-9 rounded-full text-stone-500 dark:text-stone-400 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center transition cursor-pointer"
                          title="Nghe phát âm (phím R)"
                          aria-label="Nghe phát âm từ"
                        >
                          <Volume2 aria-hidden="true" className="w-5 h-5" />
                        </button>
                      )}
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
              <h2 id="more-new-title" className="text-base font-black">Nhập số từ mới</h2>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Hôm nay bạn đã học đủ từ mới.<br />Số từ mới còn lại: {morePrompt.available} ({morePrompt.availableCards} thẻ)</p>
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
          PANEL TRA TỪ ĐIỂN (SIDEBAR PHẢI)
          ==================================================================== */}
      {dictPanelOpen && !hideDictionary && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[1px] lg:hidden"
            onClick={() => setDictPanelOpen(false)}
          />
          <aside
            role="dialog"
            aria-label="Tra từ điển"
            style={{ "--dict-panel-width": `${dictPanelWidth}px` } as React.CSSProperties}
            className="fixed inset-y-0 right-0 z-[70] flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-2xl animate-reveal dark:border-stone-800 dark:bg-[#0b1329] lg:sticky lg:top-0 lg:z-30 lg:h-[calc(100dvh-2rem)] lg:w-[var(--dict-panel-width)] lg:max-w-none lg:shrink-0 lg:animate-none lg:rounded-2xl lg:border"
          >
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Kéo để chỉnh kích thước từ điển"
              tabIndex={0}
              onPointerDown={startDictPanelResize}
              onDoubleClick={() => setDictPanelWidth(DICT_PANEL_DEFAULT_WIDTH)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const delta = event.key === "ArrowLeft" ? 16 : -16;
                setDictPanelWidth((prev) => clampDictPanelWidth(prev + delta));
              }}
              className="group absolute inset-y-0 left-0 hidden w-2 -translate-x-1/2 cursor-col-resize items-center justify-center lg:flex"
            >
              <span className="h-10 w-1 rounded-full bg-stone-300 transition-colors group-hover:bg-sky-400 dark:bg-stone-600 dark:group-hover:bg-sky-500" />
            </div>
            <header className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 dark:border-stone-800">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="rounded-lg bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-stone-900 dark:text-white">Từ điển</h2>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">Tra nhanh Hàn · Việt · Anh · Nhật</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDictPanelOpen(false)}
                aria-label="Đóng từ điển"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="border-b border-stone-200 px-4 py-3 dark:border-stone-800">
              <label className="flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 dark:border-stone-700 dark:bg-[#132247]">
                <Search className="h-4 w-4 shrink-0 text-stone-400" />
                <input
                  autoFocus
                  value={dictQuery}
                  onChange={(event) => setDictQuery(event.target.value)}
                  placeholder="Nhập từ cần tra..."
                  lang="ko"
                  autoComplete="off"
                  className="admin-field-input w-full min-w-0 bg-transparent py-0.5 text-xs text-stone-900 outline-none placeholder:text-stone-400 dark:text-white"
                />
                {dictShownLoading ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-500" />
                ) : dictQuery ? (
                  <button
                    type="button"
                    onClick={() => setDictQuery("")}
                    aria-label="Xóa từ khóa"
                    className="shrink-0 text-stone-400 transition hover:text-stone-600 dark:hover:text-stone-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </label>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
              {!dictQuery.trim() ? (
                <p className="py-10 text-center text-xs text-stone-400 dark:text-stone-500">
                  Nhập một từ tiếng Hàn hoặc nghĩa tiếng Việt để tra.
                </p>
              ) : !dictShownLoading && dictShownResults.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-xs font-bold text-stone-600 dark:text-stone-300">Không tìm thấy kết quả</p>
                  <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">
                    Thử tra “{dictQuery.trim()}” trên Naver bên dưới.
                  </p>
                  <a
                    href={naverLookupUrl(dictQuery.trim())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-[11px] font-bold text-stone-600 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Tra trên Naver
                  </a>
                </div>
              ) : (
                dictShownResults.map((entry) => (
                  <article
                    key={`${entry.hangul}-${entry.source}-${entry.vietnamese}`}
                    className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-[#101d3d]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-baseline gap-1.5">
                          <span className="text-base font-black text-stone-900 dark:text-white">{entry.hangul}</span>
                          {(entry.romanization || entry.pronunciation) && (
                            <span className="text-[11px] text-stone-400 dark:text-stone-500">
                              {entry.romanization || entry.pronunciation}
                            </span>
                          )}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {entry.partOfSpeech && (
                            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                              {entry.partOfSpeech}
                            </span>
                          )}
                          {(entry.topik || entry.level) && (
                            <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                              {entry.topik || entry.level}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          {entry.vietnamese || "Chưa có nghĩa tiếng Việt."}
                        </p>
                        {entry.english && (
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-stone-500 dark:text-stone-400">
                            {entry.english}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { if (!muteWordAudio) speakKorean(entry.hangul); }}
                          aria-label={`Nghe ${entry.hangul}`}
                          title="Nghe phát âm"
                          className="rounded-lg p-1.5 text-sky-600 transition hover:bg-sky-500/10 dark:text-sky-400 cursor-pointer"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                        <a
                          href={entry.url || naverLookupUrl(entry.hangul)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Tra ${entry.hangul} trên Naver`}
                          title="Tra Naver"
                          className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <footer className="border-t border-stone-200 px-4 py-3 dark:border-stone-800">
              <Link
                href="/dictionary"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-stone-100 py-2.5 text-xs font-extrabold text-stone-700 transition hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
              >
                Mở trang Từ điển đầy đủ
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </footer>
          </aside>
        </>
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
