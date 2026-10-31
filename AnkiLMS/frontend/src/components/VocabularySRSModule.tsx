"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import DOMPurify from "dompurify";
import { VOCABULARY_DATA } from "../data/koreanData";
import { THTH_CURRICULUM_DECKS } from "../data/ththCurriculum";
import { AnkiDeck } from "../lib/ankiParser";
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
  Maximize2,
  Layers,
  BookOpen,
  CheckCircle2,
  Compass,
  ArrowRight,
} from "lucide-react";
import { calculateFSRS45, formatLocalDate, FSRSRating, FSRSState } from "../lib/fsrs45";
import { ApiClient } from "../lib/apiClient";
import { speakKorean } from "../lib/koreanSpeech";
import { inferTopikLevel, getCourseRank } from "../lib/studyRanks";
import { LockKeyhole, Globe2 } from "lucide-react";
import { VocabularySizeTest } from "./VocabularySizeTest";

interface VocabularySRSModuleProps {
  userDecks?: AnkiDeck[];
  initialViewMode?: "dashboard" | "study";
  initialEmptyCards?: boolean;
}

export interface VocabularyCard {
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
}

export interface DeckTreeNode {
  id: string;
  title: string;
  subtitle?: string;
  cards: VocabularyCard[];
  children?: DeckTreeNode[];
}

// Clean image string helper
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

export const VocabularySRSModule: React.FC<VocabularySRSModuleProps> = ({ userDecks = [], initialViewMode = "dashboard", initialEmptyCards = false }) => {
  const { currentUser, setActiveStudySession, removedBuiltInDeckIds, userDecks: ownedDecks, setUserDecks, handleOpenAuth } = useApp();
  const isAdmin = currentUser?.role === "admin";
  // Navigation View: "dashboard" (Lộ trình cây bài học) | "study" (Màn hình học)
  const [viewMode, setViewMode] = useState<"dashboard" | "study">(initialViewMode);
  const [studyMode, setStudyMode] = useState<"flip" | "typing">("flip");

  // Selected Deck and Lesson
  const [activeDeckTitle, setActiveDeckTitle] = useState<string>("1. Quốc gia (나라)");
  const [activeCardsList, setActiveCardsList] = useState<VocabularyCard[]>(
    initialEmptyCards ? [] : ((THTH_CURRICULUM_DECKS[0]?.cards as VocabularyCard[]) || [])
  );
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
  const [lastStudiedDeckId, setLastStudiedDeckId] = useState<string | null>("thth-1-b1-1");
  const [lastStudiedTitle, setLastStudiedTitle] = useState<string | null>("1. Quốc gia (나라)");

  // FSRS & Local Storage Card Memory
  const [masteredWords, setMasteredWords] = useState<string[]>([]);
  const [reviewList, setReviewList] = useState<string[]>([]);
  const masteredWordSet = useMemo(() => new Set(masteredWords), [masteredWords]);
  const reviewWordSet = useMemo(() => new Set(reviewList), [reviewList]);
  const [cardStateMap, setCardStateMap] = useState<Record<string, FSRSState>>({});
  const [showFsrsDetailed, setShowFsrsDetailed] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const answerShownAtRef = useRef(0);
  const lastRatedCardRef = useRef<string | null>(null);
  const srsActivityRef = useRef({ reviewed: 0, correct: 0, startedAt: 0, submitted: false });

  const revealAnswer = useCallback(() => {
    if (!isFlipped) answerShownAtRef.current = Date.now();
    setIsFlipped(true);
  }, [isFlipped]);

  const finishSrsActivity = useCallback(() => {
    const activity = srsActivityRef.current;
    if (!currentUser || activity.submitted || activity.reviewed < 1) return;
    activity.submitted = true;
    const durationSeconds = Math.min(14_400, Math.max(1, Math.round((Date.now() - activity.startedAt) / 1000)));
    void ApiClient.recordStudySession("srs", activity.reviewed, activity.correct, 1, durationSeconds).catch(() => {});
  }, [currentUser]);

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

    const booksMap = new Map<string, Map<string, { id: string; title: string; cards: VocabularyCard[] }[]>>();

    if (isAdmin) THTH_CURRICULUM_DECKS.forEach((d) => {
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
        subtitle: rootBookNumber === 1 ? "Sơ cấp 1 · TOPIK 1–2" : "Sơ cấp 2 · TOPIK 2–3",
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
        subtitle: isTopicVocabularyDeck ? "TOPIK 1–6 · Chọn chủ đề để học" : detectedTopik ? `${getCourseRank(detectedTopik)} · TOPIK ${detectedTopik}` : "Chưa gán cấp độ",
        cards,
        children: subdeckChildren.length ? subdeckChildren : undefined,
      });
      });

      rootNodes.push(...userNodes);
    }

    return rootNodes;
  }, [userDecks, isAdmin, removedBuiltInDeckIds]);

  // Calculate Anki Stats (% battery, new, review)
  const getDeckStats = useCallback((cards: VocabularyCard[]) => {
    const total = cards.length;
    if (total === 0) return { total: 0, mastered: 0, percent: 0, newCount: 0, reviewCount: 0 };

    const mastered = cards.filter((c) => masteredWordSet.has(c.word)).length;
    const percent = Math.min(100, Math.round((mastered / total) * 100));
    const unlearned = total - mastered;
    const reviewed = cards.filter((c) => reviewWordSet.has(c.word)).length;
    const reviewCount = Math.min(reviewed, unlearned);
    const newCount = Math.max(0, unlearned - reviewCount);

    return { total, mastered, percent, newCount, reviewCount };
  }, [masteredWordSet, reviewWordSet]);

  // Exit study session
  const exitStudy = useCallback(() => {
    finishSrsActivity();
    setViewMode("dashboard");
    setIsFlipped(false);
    setTypedInput("");
    setActiveStudySession(null);
  }, [finishSrsActivity, setActiveStudySession]);

  // Start study session (Filter only unlearned / review cards via FSRS state)
  const startStudy = useCallback((deckId: string, title: string, cards: VocabularyCard[]) => {
    if (!cards || cards.length === 0) return;

    // Filter cards: show unlearned cards or cards due for review
    const todayStr = formatLocalDate(new Date());
    const cardsToStudy = cards.filter((c) => {
      const activeKey = `${c.deckName || "deck"}_${c.id}`;
      const state = cardStateMap[activeKey];
      // If card has SRS state and is not due today and is mastered, skip
      if (state && state.dueDate > todayStr && masteredWords.includes(c.word)) {
        return false;
      }
      return true;
    });

    // If all cards mastered and none due today, cardsToStudy is empty
    const activeList = cardsToStudy;

    setActiveDeckTitle(title);
    setActiveCardsList(activeList);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setTypedInput("");
    setViewMode("study");
    answerShownAtRef.current = 0;
    lastRatedCardRef.current = null;
    srsActivityRef.current = { reviewed: 0, correct: 0, startedAt: Date.now(), submitted: false };

    setActiveStudySession({
      title,
      onExit: exitStudy,
      studyMode,
      setStudyMode,
      progressText: activeList.length > 0 ? `1 / ${activeList.length}` : "Hoàn thành",
    });

    setLastStudiedDeckId(deckId);
    setLastStudiedTitle(title);
    if (typeof window !== "undefined") {
      localStorage.setItem("haechivn_last_lesson_id", deckId);
      localStorage.setItem("haechivn_last_lesson_title", title);
    }
  }, [cardStateMap, masteredWords, exitStudy, studyMode, setActiveStudySession]);

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

    const firstBook = deckTree[0];
    const firstLesson = firstBook?.children?.[0] || firstBook;
    const target = firstLesson?.children?.[0] || firstLesson;
    if (target) {
      startStudy(target.id, target.title, target.cards);
    }
  }, [lastStudiedDeckId, deckTree, findNodeById, startStudy]);

  // Sync study session with App context for Navbar controls
  useEffect(() => {
    if (viewMode === "study") {
      setActiveStudySession({
        title: activeDeckTitle,
        onExit: exitStudy,
        studyMode,
        setStudyMode,
        progressText: activeCardsList.length > 0 ? `${currentCardIndex + 1} / ${activeCardsList.length}` : "Hoàn thành",
      });
    }
  }, [viewMode, activeDeckTitle, exitStudy, studyMode, setStudyMode, currentCardIndex, activeCardsList.length, setActiveStudySession]);

  // Auto-resume if query param ?resume=true or ?study=true is present
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if ((params.get("resume") === "true" || params.get("study") === "true") && viewMode === "dashboard") {
      resumeLastLesson();
    }
  }, [viewMode, resumeLastLesson]);

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

  const toggleAllGroups = () => {
    const allIds = getAllContainerIds(deckTree);
    const anyOpen = allIds.some((id) => expandedDecks[id]);
    const next: Record<string, boolean> = {};
    allIds.forEach((id) => {
      next[id] = !anyOpen;
    });
    setExpandedDecks(next);
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
        studyMode,
        setStudyMode,
        progressText: activeCardsList.length > 0 ? `${currentCardIndex + 1} / ${activeCardsList.length}` : "",
      });
    } else {
      setActiveStudySession(null);
    }
    return () => {
      setActiveStudySession(null);
    };
  }, [viewMode, activeDeckTitle, exitStudy, studyMode, setStudyMode, currentCardIndex, activeCardsList.length, setActiveStudySession]);

  const currentCard = activeCardsList[currentCardIndex] || activeCardsList[0];

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
    if (viewMode === "study" && currentWordForAudio) speakKorean(currentWordForAudio);
  }, [viewMode, currentCardIndex, currentWordForAudio]);

  // Handle Response (Quên: false | Thuộc: true)
  const handleResponse = useCallback((isMastered: boolean, customRating?: FSRSRating) => {
    if (!currentCard) return;
    const wordKey = currentCard.word;
    const activeKey = `${currentCard.deckName || "deck"}_${currentCard.id}`;
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
    const curState = cardStateMap[activeKey] || {
      interval: 1,
      reps: 0,
      lapses: 0,
      state: "new",
      dueDate: formatLocalDate(new Date()),
      stability: 0,
      difficulty: 5,
      lastReview: null,
      easeFactor: 2.5,
    };
    const newState = calculateFSRS45(rating, curState);
    setCardStateMap((prev) => {
      const updated = { ...prev, [activeKey]: newState };
      const srsKey = currentUser ? `haechivn_srs_state_${currentUser.id}` : "haechivn_srs_state_guest";
      localStorage.setItem(srsKey, JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      void ApiClient.saveCardState(activeDeckTitle, Number(currentCard.id) || 1, newState).catch(() => {});
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
  }, [currentCard, cardStateMap, currentUser, activeDeckTitle, currentCardIndex, activeCardsList.length, finishSrsActivity]);

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
        ? "px-4 sm:px-5 h-14 bg-white dark:bg-stone-900/60"
        : level === 1
        ? "pl-8 sm:pl-10 pr-4 sm:pr-5 h-12 bg-stone-50/50 dark:bg-stone-900/30"
        : "pl-14 sm:pl-16 pr-4 sm:pr-5 h-11 bg-stone-50/80 dark:bg-stone-950/40";

    return (
      <div key={node.id} className="deck-group divide-y divide-stone-100 dark:divide-stone-800/60">
        <div
          onClick={() => startStudy(node.id, node.title, node.cards)}
          className={`group relative overflow-hidden flex items-center justify-between cursor-pointer hover:bg-stone-100/70 dark:hover:bg-stone-800/50 transition-colors ${indentClass}`}
          title={`Bấm để học ${node.cards.length} từ trong ${node.title}`}
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
              {hasChildren && (
                <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  Học cả mục ({stats.total})
                </span>
              )}
            </h3>
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
            <div className="w-8 sm:w-10 text-center font-bold text-sky-600 dark:text-sky-400">
              {stats.newCount > 0 ? stats.newCount : <span className="text-stone-300 dark:text-stone-700 font-normal">0</span>}
            </div>
            <div className="w-8 sm:w-10 text-center font-bold text-rose-500 dark:text-rose-400">
              {stats.reviewCount > 0 ? stats.reviewCount : <span className="text-stone-300 dark:text-stone-700 font-normal">0</span>}
            </div>
            <div
              className={`w-10 sm:w-12 text-right font-bold ${
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

  // Progress percentage in current session
  const sessionProgress = activeCardsList.length > 0
    ? Math.round(((currentCardIndex + 1) / activeCardsList.length) * 100)
    : 0;

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
                    Học tiếp lượt trước
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

                <button
                  onClick={toggleAllGroups}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
                >
                  {deckTree.every((g) => expandedDecks[g.id]) ? "Thu gọn" : "Mở rộng"}
                </button>
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition w-fit"
                >
                  <Compass className="w-4 h-4 text-sky-500" />
                  Khám phá thêm bộ thẻ
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            </div>

            <VocabularySizeTest />

            {/* BẢNG ANKI ĐỒNG NHẤT TOÀN TRANG (DECK TREE) */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 overflow-hidden shadow-xs">
              {/* Header 4 Cột Chuẩn */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-800/50 text-[11px] font-mono tracking-wider uppercase text-stone-500 dark:text-stone-400 select-none">
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
                  <button
                    onClick={() => {
                      const found = findNodeById(deckTree, lastStudiedDeckId || "");
                      const all = found?.cards || [];
                      if (all.length > 0) {
                        setActiveCardsList(all);
                        setCurrentCardIndex(0);
                        setActiveStudySession({
                          title: activeDeckTitle,
                          onExit: exitStudy,
                          studyMode,
                          setStudyMode,
                          progressText: `1 / ${all.length}`,
                        });
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-semibold text-xs sm:text-sm hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                  >
                    Ôn lại tự do
                  </button>
                </div>
              </div>
            </div>
          ) : currentCard ? (
            <div className="min-h-[calc(100vh-140px)] flex flex-col justify-between py-2 animate-reveal">
              <div className="flex-1 flex flex-col">
                {/* Thanh tiến độ bài học xanh ngọc mảnh phía trên */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex-1 h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${sessionProgress}%` }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setCurrentCardIndex(0);
                      setIsFlipped(false);
                      setTypedInput("");
                    }}
                    className="text-[11px] font-medium text-stone-400 hover:text-rose-500 transition flex items-center gap-1 cursor-pointer shrink-0"
                    title="Học lại bài này từ đầu"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="hidden sm:inline">Học lại</span>
                  </button>
                </div>

            {/* CHẾ ĐỘ 1: THẺ NHẬN DIỆN PHẲNG REVEAL (2 CỘT DESKTOP) */}
            {studyMode === "flip" && (
              <div className="w-full mb-5 select-text">
                <div className="relative w-full min-h-[440px] rounded-[24px] border border-stone-200 dark:border-stone-800/80 bg-white dark:bg-[#141b2d] p-6 sm:p-8 flex flex-col justify-between shadow-xs transition-all">
                  {/* Top Bar: Loại từ + Nút Audio + ChatGPT */}
                  <div className="w-full flex items-center justify-between pb-3.5 border-b border-stone-100 dark:border-stone-800">
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
                        <span>Hỏi ChatGPT</span>
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
                        <span className="text-[10px] text-stone-400 mt-1.5 flex items-center gap-1 group-hover:text-sky-500 transition-colors">
                          <Maximize2 className="w-3 h-3" />
                          Phóng to ảnh
                        </span>
                      </div>
                    )}

                    {/* Cột Phải: Từ Vựng & Đáp Án Mở Rộng */}
                    <div
                      className={`${
                        activeImageSrc ? "md:col-span-7" : "md:col-span-12"
                      } flex flex-col justify-center space-y-4 text-center md:text-left`}
                    >
                      {/* Từ Tiếng Hàn Chính Luôn Đứng Cố Định */}
                      <div className="space-y-1">
                        <div className="target-word text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white">
                          {currentCard.word}
                        </div>

                        {/* PHẦN ĐÁP ÁN: MỞ RA TRƯỢT ÊM ÁI KHI BẤM "HIỆN ĐÁP ÁN" */}
                        {isFlipped && (
                          <div className="space-y-3.5 pt-1 animate-reveal">
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
                              <div className="flex flex-wrap items-center gap-2 pt-0.5 justify-center md:justify-start">
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
                        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-700/70 text-left">
                          <p
                            className="text-sm sm:text-base font-semibold text-stone-800 dark:text-stone-200 leading-relaxed font-noto"
                            dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.example) }}
                          />
                          {isFlipped && currentCard.example_translated && (
                            <p
                              className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 italic border-t border-stone-200/50 dark:border-stone-700/50 pt-1.5 animate-reveal"
                              dangerouslySetInnerHTML={{ __html: cleanHtmlText(currentCard.example_translated) }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Footer Hint */}
                  <div className="w-full flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800/80 text-[11px]">
                    <span className="flex items-center gap-1 font-medium text-stone-400">
                      {isFlipped ? (
                        <>
                          <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                            1
                          </kbd>{" "}
                          Quên &bull;{" "}
                          <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                            2
                          </kbd>{" "}
                          Thuộc &bull;{" "}
                          <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                            R
                          </kbd>{" "}
                          Nghe lại
                        </>
                      ) : (
                        <span>Thẻ nhận diện từ vựng</span>
                      )}
                    </span>
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
                    } space-y-4 text-center md:text-left`}
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
                          className="w-full h-12 text-center md:text-left md:px-5 text-lg font-semibold bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-full text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
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
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                NÚT HÀNH ĐỘNG DƯỚI THẺ (SHOW ANSWER vs GRADE BUTTONS)
                ======================================================== */}
              </div>

              <div className="sticky bottom-3 z-20 pt-3 pb-1 mt-4">
              {!isFlipped ? (
                /* Trạng thái 1: Chưa lật -> Nút Hiện Đáp Án */
                <button
                  onClick={() => {
                    revealAnswer();
                    inputRef.current?.blur();
                  }}
                  className="srs-btn-dark w-full h-12 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                >
                  <span className="font-extrabold text-white dark:text-stone-900">Hiện đáp án</span>
                  <kbd className="hidden sm:inline font-mono text-[10px] text-white dark:text-stone-900 px-2 py-0.5 rounded border border-white/40 dark:border-stone-400 font-bold">
                    Space / Enter
                  </kbd>
                </button>
              ) : (
                /* Trạng thái 2: Đã lật -> Thay thế ngay bằng Quên & Thuộc */
                <div className="space-y-2 animate-reveal">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      onClick={() => handleResponse(false)}
                      className="h-12 rounded-xl bg-stone-100 hover:bg-rose-50 dark:bg-stone-800 dark:hover:bg-rose-950/30 text-stone-700 dark:text-stone-300 hover:text-rose-600 dark:hover:text-rose-400 border border-stone-200 dark:border-stone-700/60 hover:border-rose-300 dark:hover:border-rose-900 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Quên</span>
                      <kbd className="hidden sm:inline font-mono text-[10px] text-stone-500 dark:text-stone-400 ml-1">
                        Q / 1 (←)
                      </kbd>
                    </button>

                    <button
                      onClick={() => handleResponse(true)}
                      className="h-12 rounded-xl bg-stone-900 hover:bg-emerald-600 dark:bg-white dark:hover:bg-emerald-500 text-white dark:text-stone-900 dark:hover:text-stone-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 dark:bg-emerald-600" />
                      <span>Thuộc</span>
                      <kbd className="hidden sm:inline font-mono text-[10px] text-white/90 dark:text-stone-900/90 ml-1">
                        T / 2 / Space (→)
                      </kbd>
                    </button>
                  </div>

                  {/* Nút mở rộng 4 mức FSRS chi tiết (Again/Hard/Good/Easy) nếu muốn */}
                  <div className="text-center pt-1">
                    <button
                      onClick={() => setShowFsrsDetailed(!showFsrsDetailed)}
                      className="text-[11px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition cursor-pointer"
                    >
                      {showFsrsDetailed ? "Ẩn mức đánh giá FSRS chi tiết" : "Hiện 4 mức đánh giá FSRS chi tiết"}
                    </button>

                    {showFsrsDetailed && (
                      <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-stone-200 dark:border-stone-800 animate-reveal">
                        <button
                          onClick={() => handleResponse(false, "again")}
                          className="p-2 rounded-lg bg-rose-500/10 text-rose-500 text-xs font-bold hover:bg-rose-500/20 transition cursor-pointer"
                        >
                          1. Học lại
                        </button>
                        <button
                          onClick={() => handleResponse(false, "hard")}
                          className="p-2 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold hover:bg-amber-500/20 transition cursor-pointer"
                        >
                          2. Khó
                        </button>
                        <button
                          onClick={() => handleResponse(true, "good")}
                          className="p-2 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-bold hover:bg-blue-500/20 transition cursor-pointer"
                        >
                          3. Tốt
                        </button>
                        <button
                          onClick={() => handleResponse(true, "easy")}
                          className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-bold hover:bg-emerald-500/20 transition cursor-pointer"
                        >
                          4. Dễ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          ) : null
        )}
      </main>

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
