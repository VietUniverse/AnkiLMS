"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { calculateFSRS45, formatLocalDate, FSRSRating, FSRSState } from "../lib/fsrs45";
import { ApiClient } from "../lib/apiClient";
import { speakKorean } from "../lib/koreanSpeech";

interface VocabularySRSModuleProps {
  userDecks?: AnkiDeck[];
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

export const VocabularySRSModule: React.FC<VocabularySRSModuleProps> = ({ userDecks = [] }) => {
  const { currentUser, setActiveStudySession } = useApp();

  // Navigation View: "dashboard" (Lộ trình cây bài học) | "study" (Màn hình học)
  const [viewMode, setViewMode] = useState<"dashboard" | "study">("dashboard");
  const [studyMode, setStudyMode] = useState<"flip" | "typing">("flip");

  // Selected Deck and Lesson
  const [activeDeckTitle, setActiveDeckTitle] = useState<string>("1. Quốc gia (나라)");
  const [activeCardsList, setActiveCardsList] = useState<VocabularyCard[]>(
    (THTH_DECKS[0]?.cards as VocabularyCard[]) || []
  );
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [typedInput, setTypedInput] = useState<string>("");

  // Search & Tree expansion
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deckLevelFilter, setDeckLevelFilter] = useState("Tất cả cấp độ");
  const [deckTopicFilter, setDeckTopicFilter] = useState("Tất cả chủ đề");
  const [expandedDecks, setExpandedDecks] = useState<Record<string, boolean>>({
    "tieng-han-tong-hop-1": true,
    "tieng-han-tong-hop-1-bai-01": true,
  });

  // Modal zoom image
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Resume banner state
  const [lastStudiedDeckId, setLastStudiedDeckId] = useState<string | null>(null);
  const [lastStudiedTitle, setLastStudiedTitle] = useState<string | null>(null);

  // FSRS & Local Storage Card Memory
  const [masteredWords, setMasteredWords] = useState<string[]>([]);
  const [reviewList, setReviewList] = useState<string[]>([]);
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

    THTH_CURRICULUM_DECKS.forEach((d) => {
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
        transliteration: item.romaja,
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

    // Group 3: User imported decks (if any)
    if (userDecks && userDecks.length > 0) {
      const userNodes: DeckTreeNode[] = userDecks.map((ud) => ({
        id: `user-${ud.id}`,
        title: ud.name,
        cards: ud.cards.map((c, idx) => ({
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
          deckName: ud.name,
        })),
      }));

      rootNodes.push({
        id: "user-imported",
        title: "Bộ Thẻ Anki Cá Nhân (.apkg)",
        cards: userNodes.flatMap((n) => n.cards),
        children: userNodes,
      });
    }

    return rootNodes;
  }, [userDecks]);

  // Calculate Anki Stats (% battery, new, review)
  const getDeckStats = useCallback((cards: VocabularyCard[]) => {
    const total = cards.length;
    if (total === 0) return { total: 0, mastered: 0, percent: 0, newCount: 0, reviewCount: 0 };

    const mastered = cards.filter((c) => masteredWords.includes(c.word)).length;
    const percent = Math.min(100, Math.round((mastered / total) * 100));
    const unlearned = total - mastered;
    const reviewed = cards.filter((c) => reviewList.includes(c.word)).length;
    const reviewCount = Math.min(reviewed, unlearned);
    const newCount = Math.max(0, unlearned - reviewCount);

    return { total, mastered, percent, newCount, reviewCount };
  }, [masteredWords, reviewList]);

  // Exit study session
  const exitStudy = useCallback(() => {
    finishSrsActivity();
    setViewMode("dashboard");
    setIsFlipped(false);
    setTypedInput("");
    setActiveStudySession(null);
  }, [finishSrsActivity, setActiveStudySession]);

  // Start study session
  const startStudy = useCallback((deckId: string, title: string, cards: VocabularyCard[]) => {
    if (!cards || cards.length === 0) return;
    setActiveDeckTitle(title);
    setActiveCardsList(cards);
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
      progressText: `1 / ${cards.length}`,
    });

    setLastStudiedDeckId(deckId);
    setLastStudiedTitle(title);
    if (typeof window !== "undefined") {
      localStorage.setItem("haechivn_last_lesson_id", deckId);
      localStorage.setItem("haechivn_last_lesson_title", title);
    }
  }, [exitStudy, studyMode, setActiveStudySession]);

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
          node.cards.some(
            (c) =>
              c.word.toLowerCase().includes(q) ||
              c.meaning.toLowerCase().includes(q)
          );

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

  const deckTopics = useMemo(() => {
    const topics = new Set<string>();
    const visit = (nodes: DeckTreeNode[]) => nodes.forEach((node) => node.children?.length ? visit(node.children) : topics.add(node.title));
    visit(deckTree);
    return [...topics].sort((a, b) => a.localeCompare(b, "vi"));
  }, [deckTree]);

  const filteredTree = useMemo(() => {
    const rankRoots: Record<string, string[]> = {
      "Sơ cấp 1": ["tieng-han-tong-hop-1", "korean-basic"],
      "Sơ cấp 2": ["tieng-han-tong-hop-2"],
      "Bộ Anki cá nhân · chưa gán cấp độ": ["user-imported"],
    };
    let nodes = deckLevelFilter === "Tất cả cấp độ" ? deckTree : deckTree.filter((node) => (rankRoots[deckLevelFilter] || []).includes(node.id));
    if (deckTopicFilter !== "Tất cả chủ đề") {
      const selectTopic = (items: DeckTreeNode[]): DeckTreeNode[] => items.map((node) => {
        if (node.children?.length) {
          const children = selectTopic(node.children);
          return children.length ? { ...node, children } : null;
        }
        const match = node.title === deckTopicFilter || node.cards.some((card) => card.pos === deckTopicFilter || card.tag_2 === deckTopicFilter);
        return match ? node : null;
      }).filter(Boolean) as DeckTreeNode[];
      nodes = selectTopic(nodes);
    }
    return searchQuery.trim() ? filterTree(nodes, searchQuery.toLowerCase()) : nodes;
  }, [deckTree, deckLevelFilter, deckTopicFilter, searchQuery, filterTree]);

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
    // FSRS 4.5 calculation
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
              <div className="p-4 rounded-2xl bg-stone-900 text-white dark:bg-stone-800/90 border border-stone-800 dark:border-stone-700/80 flex items-center justify-between gap-4 shadow-sm animate-reveal">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono tracking-wider text-emerald-400 font-bold uppercase">
                    Học tiếp lượt trước
                  </span>
                  <h3 className="text-sm sm:text-base font-bold truncate mt-0.5 text-stone-100">
                    {lastStudiedTitle}
                  </h3>
                </div>
                <button
                  onClick={resumeLastLesson}
                  className="w-9 h-9 rounded-full bg-white text-stone-900 hover:bg-stone-200 dark:bg-emerald-500 dark:text-stone-950 dark:hover:bg-emerald-400 flex items-center justify-center shrink-0 transition cursor-pointer shadow-sm"
                  title="Học tiếp ngay"
                >
                  <Play className="w-4 h-4 ml-0.5 fill-current" />
                </button>
              </div>
            )}

            {/* Tiêu đề trang & Thanh công cụ thao tác */}
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

                <select aria-label="Lọc bộ thẻ theo độ khó" value={deckLevelFilter} onChange={(event) => setDeckLevelFilter(event.target.value)} className="rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
                  {["Tất cả cấp độ", "Sơ cấp 1", "Sơ cấp 2", "Bộ Anki cá nhân · chưa gán cấp độ"].map((rank) => <option key={rank}>{rank}</option>)}
                </select>
                <select aria-label="Lọc bộ thẻ theo chủ đề" value={deckTopicFilter} onChange={(event) => setDeckTopicFilter(event.target.value)} className="max-w-48 rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
                  {["Tất cả chủ đề", ...deckTopics].map((topic) => <option key={topic}>{topic}</option>)}
                </select>

                <button
                  onClick={toggleAllGroups}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
                >
                  {deckTree.every((g) => expandedDecks[g.id]) ? "Thu gọn" : "Mở rộng"}
                </button>
              </div>
            </div>

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
        {viewMode === "study" && currentCard && (
          <div className="py-2 animate-reveal">
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
                <div className="relative w-full min-h-[420px] rounded-[24px] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 flex flex-col justify-between shadow-xs transition-all">
                  {/* Top Bar: Loại từ + Nút Audio + ChatGPT */}
                  <div className="w-full flex items-center justify-between pb-3.5 border-b border-stone-100 dark:border-stone-800/80">
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

                        {currentCard.transliteration && (
                          <div className="text-xs font-mono text-amber-500 font-bold">
                            /{currentCard.transliteration}/
                          </div>
                        )}

                        {/* PHẦN ĐÁP ÁN: MỞ RA TRƯỢT ÊM ÁI KHI BẤM "HIỆN ĐÁP ÁN" */}
                        {isFlipped && (
                          <div className="space-y-3.5 pt-1 animate-reveal">
                            <div>
                              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                                {cleanHtmlText(currentCard.meaning)}
                              </div>
                              {currentCard.explain && (
                                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 pt-1 leading-relaxed">
                                  {cleanHtmlText(currentCard.explain)}
                                </p>
                              )}
                            </div>

                            {/* Cụm từ liên quan, Đồng nghĩa, Trái nghĩa */}
                            {(currentCard.collocation || currentCard.synonym || currentCard.antonym) && (
                              <div className="flex flex-wrap items-center gap-2 pt-0.5 justify-center md:justify-start">
                                {currentCard.collocation && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] border border-stone-200/80 dark:border-stone-700/80">
                                    <span className="text-stone-400 font-mono uppercase text-[9px]">Cụm từ</span>
                                    <span className="text-sky-600 dark:text-sky-400 font-medium">
                                      {cleanHtmlText(currentCard.collocation)}
                                    </span>
                                  </div>
                                )}
                                {currentCard.synonym && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] border border-stone-200/80 dark:border-stone-700/80">
                                    <span className="text-stone-400 font-mono uppercase text-[9px]">Đồng nghĩa</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                      {cleanHtmlText(currentCard.synonym)}
                                    </span>
                                  </div>
                                )}
                                {currentCard.antonym && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] border border-stone-200/80 dark:border-stone-700/80">
                                    <span className="text-stone-400 font-mono uppercase text-[9px]">Trái nghĩa</span>
                                    <span className="text-rose-500 font-medium">
                                      {cleanHtmlText(currentCard.antonym)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Hộp Ví dụ: Tiếng Hàn luôn hiện, khi lật hiện thêm tiếng Việt */}
                      {currentCard.example && (
                        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 text-left">
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
                  <div className="w-full flex items-center justify-between pt-3.5 border-t border-stone-100 dark:border-stone-800/80 text-[11px]">
                    <span className="flex items-center gap-1 font-medium text-stone-400">
                      {!isFlipped ? (
                        <>
                          Nhấn{" "}
                          <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                            Space
                          </kbd>{" "}
                          hoặc{" "}
                          <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                            Enter
                          </kbd>{" "}
                          để xem đáp án
                        </>
                      ) : (
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
                      )}
                    </span>

                    {/* Tags */}
                    {currentCard.tag_2 && (
                      <span className="text-[10px] font-mono text-stone-400">
                        #{currentCard.tag_2}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CHẾ ĐỘ 2: THẺ GÕ TỪ (TYPING - 2 CỘT DESKTOP) */}
            {studyMode === "typing" && (
              <div className="w-full mb-5 p-6 sm:p-8 rounded-[24px] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
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
                      <div className="text-2xl sm:text-3xl font-extrabold mt-2 text-stone-900 dark:text-white">
                        {cleanHtmlText(currentCard.meaning)}
                      </div>
                      {currentCard.explain && (
                        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
                          {cleanHtmlText(currentCard.explain)}
                        </p>
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
            <div className="space-y-3">
              {!isFlipped ? (
                /* Trạng thái 1: Chưa lật -> Nút Hiện Đáp Án */
                <button
                  onClick={() => {
                    revealAnswer();
                    inputRef.current?.blur();
                  }}
                  className="w-full h-12 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
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
