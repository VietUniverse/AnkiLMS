"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import DOMPurify from "dompurify";
import { VOCABULARY_DATA } from "../data/koreanData";
import { THTH_DECKS } from "../data/ththDecks";
import { AnkiDeck } from "../lib/ankiParser";
import { useApp } from "../contexts/AppProvider";
import Link from "next/link";
import {
  Volume2,
  RotateCw,
  Sparkles,
  Layers,
  Zap,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Settings,
  HelpCircle,
  X,
  ExternalLink,
  Menu,
  Check,
  ArrowLeft,
  ArrowRight,
  Brain,
  Trophy,
  Filter,
  Tag,
  Play,
  Calendar,
  CheckCircle2,
  Flame,
  Users,
  Clock,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { calculateFSRS45, formatLocalDate, FSRSRating, FSRSState } from "../lib/fsrs45";
import { ApiClient } from "../lib/apiClient";
import { speakKorean } from "../lib/koreanSpeech";


interface VocabularySRSModuleProps {
  userDecks?: AnkiDeck[];
}

interface ClassAssignmentItem {
  classId: string;
  className: string;
  assignmentId: string;
  title: string;
  deckName: string;
  dueDate: string;
  assignedBy: string;
  isCompleted?: boolean;
  totalCards: number;
  reviewedCards: number;
  correctCards: number;
  lastStudiedAt?: string | null;
}

interface SharedAssignmentCard {
  id: number;
  korean: string;
  meaning: string;
  example?: string;
  pronunciation?: string;
  mediaHtml?: string;
}

// Helper to sanitize raw HTML strings while keeping bold/formatting
const renderCleanHtml = (htmlContent: string) => {
  if (!htmlContent) return "";
    const withoutAudioTags = htmlContent.replace(/\[sound:.*?\]/gi, "").trim();
    return DOMPurify.sanitize(withoutAudioTags, {
      USE_PROFILES: { html: true },
    });
};

export const VocabularySRSModule: React.FC<VocabularySRSModuleProps> = ({ userDecks = [] }) => {
  const { currentUser } = useApp();

  // Mode: "catalog" (Parroto Base Page) vs "study" (Active Learning Workspace)
  const [viewMode, setViewMode] = useState<"catalog" | "study">("catalog");

  // Filter & Selection State
  const [selectedCategory, setSelectedCategory] = useState<"thth" | "basic" | "imported" | "class">("thth");
  const [selectedLesson, setSelectedLesson] = useState<string>("Bài 01");
  const [selectedSubTopic, setSelectedSubTopic] = useState<string>("all");
  const [selectedUserDeckId, setSelectedUserDeckId] = useState<string>(userDecks[0]?.id || "");
  const [selectedClassAssignmentId, setSelectedClassAssignmentId] = useState<string | null>(null);

  const [expandedLesson, setExpandedLesson] = useState<string | null>("Bài 01");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [tagFilter, setTagFilter] = useState<string>("all");

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Private Class Assignments List
  const [classAssignments, setClassAssignments] = useState<ClassAssignmentItem[]>([]);
  const [selectedAssignmentCards, setSelectedAssignmentCards] = useState<SharedAssignmentCard[] | null>(null);
  const [liveAssignmentProgress, setLiveAssignmentProgress] = useState<{ reviewedCards: number; totalCards: number; correctCards: number; lastStudiedAt: string | null; completed: boolean } | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentLoadError, setAssignmentLoadError] = useState("");

  // Card Study State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyCardQueue, setStudyCardQueue] = useState<any[] | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [cardStateMap, setCardStateMap] = useState<Record<string, FSRSState>>({});

  // Settings Menu State
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const [config, setConfig] = useState({
    nightMode: false,
    showTrans: true,
    showExample: true,
    showExplain: true,
    showExpand: true,
    showImage: true,
    showTags: true,
    showFb: true,
    showChatGPT: true,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Keep guest progress locally, while signed-in progress syncs through D1.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const srsKey = currentUser ? `haechivn_srs_state_${currentUser.id}` : "haechivn_srs_state_guest";
    const data = localStorage.getItem(srsKey);
    if (data) {
      try {
        setCardStateMap(JSON.parse(data));
      } catch (e) {
        setCardStateMap({});
      }
    } else {
      setCardStateMap({});
    }
    if (currentUser) {
      ApiClient.getCardStates().then((serverState) => {
        setCardStateMap((previous) => {
          const merged = { ...previous, ...serverState };
          localStorage.setItem(srsKey, JSON.stringify(merged));
          return merged;
        });
      }).catch((error) => console.warn("Không đồng bộ được tiến độ SRS.", error));
    }
  }, [currentUser]);

  // Load private class assignments for logged in user
  useEffect(() => {
    if (typeof window === "undefined" || !currentUser) {
      setClassAssignments([]);
      return;
    }
    ApiClient.getClasses().then((classes) => {
      const userAssignments: ClassAssignmentItem[] = classes.flatMap((cls: any) =>
        cls.members?.some((member: any) => member.id === currentUser.id && member.status === "approved")
          ? (cls.assignments || []).map((assignment: any) => ({
              classId: cls.id, className: cls.name, assignmentId: assignment.id,
              title: assignment.title, deckName: assignment.deckName, dueDate: assignment.dueDate,
              assignedBy: assignment.assignedBy, isCompleted: assignment.completed,
              totalCards: assignment.totalCards || 0, reviewedCards: assignment.reviewedCards || 0,
              correctCards: assignment.correctCards || 0, lastStudiedAt: assignment.lastStudiedAt,
            }))
          : [],
      );
      setClassAssignments(userAssignments);
    }).catch(() => setClassAssignments([]));
  }, [currentUser, viewMode]);

  // List of unique lessons in Tiếng Hàn Tổng Hợp
  const ththLessons = useMemo(() => {
    const lessonsMap: Record<string, string[]> = {};
    THTH_DECKS.forEach((d) => {
      const match = d.name.match(/Bài\s+\d+/i);
      const lessonName = match ? match[0] : "Khác";
      if (!lessonsMap[lessonName]) lessonsMap[lessonName] = [];
      const parts = d.name.split("::");
      const subTopic = parts[parts.length - 1];
      if (!lessonsMap[lessonName].includes(subTopic)) {
        lessonsMap[lessonName].push(subTopic);
      }
    });
    return lessonsMap;
  }, []);

  const activeDeckId = [selectedCategory, selectedLesson, selectedSubTopic, selectedUserDeckId, selectedClassAssignmentId || ""].join(":");

  // Filtered Cards for current selection (automatically deduplicated)
  const activeCards = useMemo(() => {
    let rawCards: any[] = [];
    if (selectedCategory === "thth") {
      const filtered = THTH_DECKS.filter((d) => {
        const lessonMatch = selectedLesson === "all" || d.name.includes(selectedLesson);
        const subTopicMatch = selectedSubTopic === "all" || d.name.includes(selectedSubTopic);
        return lessonMatch && subTopicMatch;
      });
      rawCards = filtered.flatMap((d) => d.cards);
    } else if (selectedCategory === "basic") {
      rawCards = VOCABULARY_DATA.map((item, idx) => ({
        id: idx + 1,
        code: item.id,
        word: item.hangul,
        meaning: item.vietnamese,
        pos: item.topic || "Danh từ",
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
        tag_1: "Anki",
        tag_2: "TiếngHàn",
        tag_3: item.topic || "CơBản",
        tag_4: "TựHọc",
        deckName: "Bộ từ vựng tiếng Hàn cơ bản",
      }));
    } else if (selectedCategory === "class") {
      const asg = classAssignments.find((a) => a.assignmentId === selectedClassAssignmentId) || classAssignments[0];
      if (selectedAssignmentCards?.length) {
        rawCards = selectedAssignmentCards.map((card) => ({
          id: card.id, code: `assignment-${selectedClassAssignmentId}-${card.id}`,
          word: card.korean, meaning: card.meaning, pos: "Thẻ Anki của lớp",
          transliteration: card.pronunciation || "", explain: "", image: card.mediaHtml || "",
          example: card.example || "", example_translated: "", collocation: "", synonym: "", antonym: "",
          audio_word: "", audio_meaning: "", audio_example: "", tag_1: "Lớp học", tag_2: asg?.className || "", tag_3: "",
          tag_4: "", deckName: asg?.deckName || "Bài tập lớp",
        }));
      } else if (!asg) rawCards = [];
      else {
        // Legacy assignments created before shared Anki snapshots used the bundled THTH deck.
        const legacyLesson = asg.deckName.match(/Bài\s*0?\d+/i)?.[0];
        const matchDeck = THTH_DECKS.find((d) => d.name === asg.deckName || d.name.includes(asg.deckName) || (!!legacyLesson && d.name.includes(legacyLesson)));
        rawCards = matchDeck ? matchDeck.cards : [];
      }
    } else {
      const deck = userDecks.find((d) => d.id === selectedUserDeckId) || userDecks[0];
      if (!deck) rawCards = [];
      else {
        rawCards = deck.cards.map((c, idx) => ({
          id: c.id || idx + 1,
          code: `ANKI-${idx + 1}`,
          word: c.koreanText || c.frontText || c.frontHtml || "",
          meaning: c.vietnameseMeaning || c.backText || c.backHtml || "",
          pos: "Từ vựng",
          transliteration: "",
          explain: "",
          image: c.imageUrls?.[0] ? `<img src="${c.imageUrls[0]}" />` : "",
          example: c.exampleSentence || "",
          example_translated: "",
          collocation: "",
          synonym: "",
          antonym: "",
          audio_word: c.audioUrls?.[0] ? `[sound:${c.audioUrls[0]}]` : "",
          audio_meaning: "",
          audio_example: "",
          tag_1: c.tags?.[0] || "Anki",
          tag_2: c.tags?.[1] || "Import",
          tag_3: "",
          tag_4: "",
          deckName: deck.name,
        }));
      }
    }

    // Deduplicate cards by code or word+meaning
    const seen = new Set<string>();
    const deduplicated = rawCards.filter((c) => {
      const key = c.code || `${c.word}_${c.meaning}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const todayStr = formatLocalDate(new Date());

    // Sort by Anki SRS Priority: Due/Overdue cards first -> New cards -> Future cards
    return deduplicated.sort((a, b) => {
      const keyA = `${activeDeckId}_${a.id}`;
      const keyB = `${activeDeckId}_${b.id}`;
      const stateA = cardStateMap[keyA];
      const stateB = cardStateMap[keyB];

      const isDueA = stateA ? stateA.dueDate <= todayStr && stateA.reps > 0 : false;
      const isDueB = stateB ? stateB.dueDate <= todayStr && stateB.reps > 0 : false;

      const isNewA = !stateA || stateA.reps === 0;
      const isNewB = !stateB || stateB.reps === 0;

      if (isDueA && !isDueB) return -1;
      if (!isDueA && isDueB) return 1;

      if (isNewA && !isNewB) return -1;
      if (!isNewA && isNewB) return 1;

      if (stateA && stateB) {
        return stateA.dueDate.localeCompare(stateB.dueDate);
      }
      return 0;
    });
  }, [selectedCategory, selectedLesson, selectedSubTopic, selectedUserDeckId, selectedClassAssignmentId, classAssignments, userDecks, activeDeckId, selectedAssignmentCards]);

  useEffect(() => {
    setStudyCardQueue(null);
  }, [selectedCategory, selectedLesson, selectedSubTopic, selectedUserDeckId, selectedClassAssignmentId, selectedAssignmentCards]);

  useEffect(() => {
    if (viewMode === "study" && studyCardQueue === null) {
      setStudyCardQueue(activeCards);
    }
  }, [viewMode, studyCardQueue, activeCards]);

  const cardsInCurrentSession = studyCardQueue ?? activeCards;
  const currentCard = cardsInCurrentSession[currentIndex] || cardsInCurrentSession[0];
  const cardKey = `${activeDeckId}_${currentCard?.id}`;
  const currentCardState = cardStateMap[cardKey] || {
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

  useEffect(() => {
    if (viewMode !== "study" || !studyCardQueue) return;
    const maxIndex = Math.max(0, studyCardQueue.length - 1);
    if (currentIndex > maxIndex) setCurrentIndex(maxIndex);
  }, [viewMode, studyCardQueue, currentIndex]);

  // Reset typed input ONLY when card or topic changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setTypedInput("");
      setIsFlipped(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentIndex, selectedLesson, selectedSubTopic, selectedCategory, selectedUserDeckId, selectedClassAssignmentId]);

  // Refocus input when returning to front card
  useEffect(() => {
    if (viewMode === "study" && !isFlipped && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isFlipped, viewMode]);

  const playSound = useCallback((text?: string) => {
    if (!currentCard) return;

    const targetText = text || currentCard.word || "";
    const fullSearch = `${targetText} ${currentCard.audio_word || ""} ${currentCard.audio_meaning || ""} ${currentCard.audio_example || ""}`;
    const soundMatch = fullSearch.match(/\[sound:(.*?)\]/i);

    if (soundMatch && soundMatch[1]) {
      const audioFileName = soundMatch[1];
      const audioUrl = /^(blob:|data:|https?:\/\/)/i.test(audioFileName)
        ? audioFileName
        : `/${audioFileName.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")}`;
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
        const cleanText = targetText.replace(/<[^>]+>/g, "").replace(/\[sound:.*?\]/gi, "").trim();
        if (cleanText) speakKorean(cleanText);
      });
      return;
    }

    const cleanText = targetText.replace(/<[^>]+>/g, "").replace(/\[sound:.*?\]/gi, "").trim();
    if (cleanText) speakKorean(cleanText);
  }, [currentCard]);

  // Autoplay audio on card flip (Back card) or when front card loads
  useEffect(() => {
    if (viewMode !== "study" || !currentCard) return;

    const timer = setTimeout(() => {
      if (isFlipped) {
        playSound(currentCard.word || currentCard.example);
      } else {
        if (currentCard.audio_word || currentCard.word) {
          playSound(currentCard.word || currentCard.audio_word);
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isFlipped, currentIndex, viewMode, currentCard, playSound]);

  const handleNext = (rating: FSRSRating) => {
    const newState = calculateFSRS45(rating, currentCardState);
    setCardStateMap((prev) => {
      const updated = { ...prev, [cardKey]: newState };
      if (typeof window !== "undefined") {
        const srsKey = currentUser ? `haechivn_srs_state_${currentUser.id}` : "haechivn_srs_state_guest";
        localStorage.setItem(srsKey, JSON.stringify(updated));
      }
      if (currentUser && currentCard) {
        void ApiClient.saveCardState(activeDeckId, Number(currentCard.id), newState).catch((error) => console.warn(error));
      }
      return updated;
    });

    const gained = rating === "easy" ? 15 : rating === "good" ? 10 : rating === "hard" ? 5 : 2;
    setSessionXp((prev) => prev + gained);
    setReviewedCount((prev) => prev + 1);

    ApiClient.recordStudySession("srs", 1, rating !== "again" ? 1 : 0, gained, 10);

    // A class assignment is complete only after each assigned card has been reviewed.
    if (selectedCategory === "class" && selectedClassAssignmentId && currentCard && selectedAssignmentCards?.length) {
      const assignment = classAssignments.find((item) => item.assignmentId === selectedClassAssignmentId);
      if (assignment) {
        void ApiClient.recordClassAssignmentReview(assignment.classId, selectedClassAssignmentId, Number(currentCard.id), rating !== "again")
          .then(setLiveAssignmentProgress)
          .catch((error) => console.warn("Không đồng bộ được tiến độ bài Anki của lớp.", error));
      }
    }

    setIsFlipped(false);
    setTypedInput("");
    const nextIdx = currentIndex < cardsInCurrentSession.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(nextIdx);

    if (typeof window !== "undefined") {
      const uId = currentUser?.id || "guest";
      const savedKey = `haechivn_deck_index_${uId}_${activeDeckId}`;
      localStorage.setItem(savedKey, nextIdx.toString());
    }
  };

  // Hotkey Listeners: Ctrl + ` for Replay sound, 1-4 for Ratings
  useEffect(() => {
    if (viewMode !== "study") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA") return;

      if (e.ctrlKey && (e.key === "`" || e.code === "Backquote")) {
        e.preventDefault();
        if (currentCard) {
          playSound(currentCard.word || currentCard.example);
        }
        return;
      }

      if (isFlipped) {
        if (e.key === "1") {
          e.preventDefault();
          handleNext("again");
        } else if (e.key === "2") {
          e.preventDefault();
          handleNext("hard");
        } else if (e.key === "3" || e.key === " ") {
          e.preventDefault();
          handleNext("good");
        } else if (e.key === "4") {
          e.preventDefault();
          handleNext("easy");
        }
      } else {
        if (e.key === "Enter" && document.activeElement !== inputRef.current) {
          e.preventDefault();
          setIsFlipped(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, isFlipped, currentCard, currentIndex]);

  const handleGiveHint = () => {
    if (!currentCard?.word) return;
    const targetWord = currentCard.word.trim();
    if (typedInput.length < targetWord.length) {
      setTypedInput(targetWord.substring(0, typedInput.length + 1));
      inputRef.current?.focus();
    }
  };

  const cleanTextOnly = (str: string) => {
    if (!str) return "";
    return str.replace(/<[^>]*>/g, "").trim();
  };

  const renderTypingOverlay = () => {
    if (!currentCard) return null;
    const targetWord = cleanTextOnly(currentCard.word || "");
    const typed = typedInput;
    const maxLen = Math.max(targetWord.length, typed.length);

    if (maxLen === 0) {
      return <span className="type-placeholder active-cursor">_</span>;
    }

    const elements = [];
    for (let i = 0; i < maxLen; i++) {
      const cTarget = targetWord[i];
      const cTyped = typed[i];
      const isCursor = i === typed.length;
      const cursorClass = isCursor ? " active-cursor" : "";

      if (cTyped === undefined) {
        if (cTarget === " ") {
          elements.push(
            <span key={i} className={`text-slate-600 ${cursorClass}`}>
              -
            </span>
          );
        } else {
          elements.push(
            <span key={i} className={`type-placeholder${cursorClass}`}>
              _
            </span>
          );
        }
      } else if (cTarget === undefined) {
        elements.push(
          <span key={i} className="typeExtra">
            {cTyped}
          </span>
        );
      } else if (cTyped === cTarget) {
        elements.push(
          <span key={i} className="typeGood">
            {cTyped}
          </span>
        );
      } else {
        elements.push(
          <span key={i} className="typeBad">
            {cTyped}
          </span>
        );
      }
    }

    return elements;
  };

  const targetWordClean = cleanTextOnly(currentCard?.word || "");
  const targetLen = targetWordClean.replace(/\s/g, "").length;
  let correctCount = 0;
  for (let i = 0; i < Math.min(typedInput.length, targetWordClean.length); i++) {
    if (typedInput[i] === targetWordClean[i]) correctCount++;
  }
  const typingPercent = targetLen > 0 ? Math.min(100, Math.round((correctCount / targetLen) * 100)) : 0;

  // Helper to start studying a specific deck
  const startStudying = (category: "thth" | "basic" | "imported" | "class", lesson = "Bài 01", userDeckId = "", classAssignmentId = "") => {
    setSelectedCategory(category);
    setSelectedLesson(lesson);
    setSelectedSubTopic("all");
    setSelectedUserDeckId(userDeckId);
    setSelectedClassAssignmentId(classAssignmentId || null);
    setAssignmentLoadError("");
    const openWorkspace = () => {
      const uId = currentUser?.id || "guest";
      const deckKey = [category, lesson, "all", userDeckId, classAssignmentId].join(":");
      const savedKey = `haechivn_deck_index_${uId}_${deckKey}`;
      const parsed = typeof window !== "undefined" ? Number.parseInt(localStorage.getItem(savedKey) || "0", 10) : 0;
      setCurrentIndex(Number.isInteger(parsed) && parsed >= 0 ? parsed : 0);
      setStudyCardQueue(null);
      setIsFlipped(false);
      setTypedInput("");
      setViewMode("study");
      setAssignmentLoading(false);
    };

    if (category === "class" && classAssignmentId) {
      const assignment = classAssignments.find((item) => item.assignmentId === classAssignmentId);
      if (!assignment) {
        setAssignmentLoadError("Không tìm thấy bài tập này trong lớp của bạn.");
        return;
      }
      setAssignmentLoading(true);
      void ApiClient.getClassAssignment(assignment.classId, classAssignmentId).then((data) => {
        setSelectedAssignmentCards(data.deckCards.length ? data.deckCards : null);
        setLiveAssignmentProgress({ reviewedCards: data.reviewedCards, totalCards: data.totalCards, correctCards: data.correctCards, lastStudiedAt: data.lastStudiedAt, completed: data.completed });
        openWorkspace();
      }).catch((error) => {
        setAssignmentLoading(false);
        setAssignmentLoadError(error instanceof Error ? error.message : "Không tải được bộ thẻ của lớp.");
      });
      return;
    }

    setSelectedAssignmentCards(null);
    setLiveAssignmentProgress(null);
    openWorkspace();
  };

  const autoOpenedAssignmentRef = useRef<string | null>(null);
  useEffect(() => {
    if (viewMode !== "catalog" || classAssignments.length === 0 || typeof window === "undefined") return;
    const assignmentId = new URLSearchParams(window.location.search).get("assignment");
    if (!assignmentId || autoOpenedAssignmentRef.current === assignmentId) return;
    const assignment = classAssignments.find((item) => item.assignmentId === assignmentId);
    if (!assignment) return;
    autoOpenedAssignmentRef.current = assignmentId;
    startStudying("class", "Bài 01", "", assignmentId);
  }, [classAssignments, viewMode]);

  // =========================================================================
  // VIEW MODE 1: PARROTO-STYLE FLASHCARD BASE CATALOG PAGE
  // =========================================================================
  if (viewMode === "catalog") {
    return (
      <div className="space-y-8 animate-fadeIn pb-24 max-w-[1800px] mx-auto select-none">
        {assignmentLoading && <div role="status" className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm font-bold text-sky-200">Đang tải bộ thẻ Anki giáo viên giao…</div>}
        {assignmentLoadError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{assignmentLoadError}</div>}

        {/* =========================================================================
            SECTION 1: BỘ THẺ CỦA LỚP HỌC (PRIVATE CLASS ASSIGNED DECKS)
           ========================================================================= */}
        {classAssignments.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-black">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Bài Tập & Bộ Thẻ Của Lớp Học</h2>
                  <span className="text-xs text-slate-400 font-medium">
                    Các bài tập & bộ thẻ Anki do Giáo viên/Quản trị viên lớp học riêng tư giao cho bạn · {classAssignments.length} bài tập
                  </span>
                </div>
              </div>

              <Link
                href="/classes"
                className="px-4 py-2 rounded-xl bg-sky-600/30 border border-sky-500/50 hover:bg-sky-600/50 text-sky-300 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <span>Xem Lớp Học Của Tôi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classAssignments.map((asg) => (
                <div
                  key={asg.assignmentId}
                  className={`card-duo card-duo-hover p-6 bg-[#0f1b38] border-[#1e3466] flex flex-col justify-between space-y-4 group cursor-pointer ${
                    asg.isCompleted ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-amber-400"
                  }`}
                  onClick={() => startStudying("class", "Bài 01", "", asg.assignmentId)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-sky-950 border border-sky-500/40 text-sky-300 text-[10px] font-black truncate max-w-[180px]">
                        🏫 {asg.className}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-black flex items-center gap-1">
                        <Lock className="w-3 h-3 text-rose-400" />
                        <span>Bộ thẻ được giao</span>
                      </span>
                    </div>

                    <h3 className="text-base font-black text-white group-hover:text-sky-300 transition-colors line-clamp-2">
                      {asg.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Bộ thẻ: <strong className="text-slate-200">{asg.deckName}</strong>
                    </p>

                    <div className="text-[11px] text-slate-400 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{asg.totalCards ? `Tiến độ: ${asg.reviewedCards}/${asg.totalCards} thẻ đã ôn.` : "Bài tập cũ chưa có bộ Anki được liên kết. Hãy nhờ giáo viên giao lại bài để hệ thống theo dõi đầy đủ."}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-amber-400 font-semibold">Hạn: {asg.dueDate}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startStudying("class", "Bài 01", "", asg.assignmentId);
                      }}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Học Bài Tập Lớp</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 3: BỘ THẺ TIẾNG HÀN CÓ SẴN (SYSTEM BUILT-IN DECKS)
           ========================================================================= */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Bộ Thẻ Tiếng Hàn Có Sẵn</h2>
                <span className="text-xs text-slate-400 font-medium">
                  Các bộ từ vựng giáo trình Tiếng Hàn Tổng Hợp Quyển 01 & Bộ từ vựng giao tiếp cơ bản
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {["all", "THTH", "Quyển_01", "Bài_01", "CơBản"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tagFilter === tag
                      ? "bg-amber-500 text-slate-950 shadow-md font-black"
                      : "bg-[#132247] text-slate-400 hover:text-white"
                  }`}
                >
                  #{tag === "all" ? "Tất cả" : tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-black text-white">Tiếng Hàn Tổng Hợp - Quyển 01</h3>
                <span className="text-xs text-slate-400 font-bold ml-1">(15 bài học · 1,584 thẻ từ vựng)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.keys(ththLessons).map((lessonName) => {
                const lessonDecks = THTH_DECKS.filter((d) => d.name.includes(lessonName));
                const totalCardsInLesson = lessonDecks.reduce((sum, d) => sum + d.cardCount, 0);
                const subTopicsList = ththLessons[lessonName] || [];

                return (
                  <div
                    key={lessonName}
                    className="card-duo card-duo-hover p-6 bg-[#0f1b38] border-[#1e3466] flex flex-col justify-between space-y-4 group cursor-pointer"
                    onClick={() => startStudying("thth", lessonName)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                          {lessonName.replace("Bài ", "")}
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[10px] font-black">
                          {totalCardsInLesson} thẻ
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-white group-hover:text-amber-400 transition-colors">
                          Tiếng Hàn Tổng Hợp · {lessonName}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          Chủ điểm: {subTopicsList.slice(0, 3).join(", ")} {subTopicsList.length > 3 ? "..." : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-1">
                        <span className="tag-badge">#THTH</span>
                        <span className="tag-badge">#Quyển_01</span>
                        <span className="tag-badge">#{lessonName.replace(/\s+/g, "_")}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-semibold">{subTopicsList.length} chủ đề con</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startStudying("thth", lessonName);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Bắt đầu Học</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Bộ Tiếng Hàn Giao Tiếp Cơ Bản ({VOCABULARY_DATA.length} Thẻ)</span>
            </h3>

            <div className="card-duo card-duo-hover p-6 bg-[#0f1b38] border-[#1e3466] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xl shrink-0">
                  📙
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">Bộ Từ Vựng Tiếng Hàn Giao Tiếp Cơ Bản</h4>
                  <p className="text-xs text-slate-300 max-w-xl mt-1">
                    {VOCABULARY_DATA.length} từ vựng tiếng Hàn cơ bản kèm ví dụ minh họa và nghĩa tiếng Việt.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="tag-badge">#Anki</span>
                    <span className="tag-badge">#CơBản</span>
                    <span className="tag-badge">#{VOCABULARY_DATA.length}_Từ</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => startStudying("basic")}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 shadow-lg transition-all shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Bắt đầu Học Bộ Cơ Bản</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE 2: ACTIVE ANKI SRS CARD STUDY WORKSPACE
  // =========================================================================
  return (
    <div className="space-y-4 animate-fadeIn pb-24 max-w-[1800px] mx-auto select-none">
      {/* Top Header Navigation: Back to Catalog Button */}
      <div className="flex flex-wrap items-center gap-3 bg-[#0f1b38] border border-[#1e3466] p-3 rounded-2xl">
        <button
          onClick={() => setViewMode("catalog")}
          className="shrink-0 px-4 py-2 rounded-xl bg-[#132247] hover:bg-[#1a2d5c] text-sky-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-sky-500/30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Quay về Danh Sách Bộ Thẻ</span>
        </button>

        <div className="min-w-0 flex-1 flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
          <div className="min-w-0 flex items-center gap-3">
            <span className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300"><BookOpen className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-black text-white">
                {selectedCategory === "thth"
                  ? `Tiếng Hàn Tổng Hợp · ${selectedLesson}`
                  : selectedCategory === "basic"
                  ? "Bộ Tiếng Hàn Cơ Bản"
                  : selectedCategory === "class"
                  ? "Bài Tập Lớp Học Riêng Tư"
                  : "Bộ Thẻ Cá Nhân"}
              </h2>
              <p className="text-[11px] text-slate-400">Đang học {activeCards.length > 0 ? currentIndex + 1 : 0}/{activeCards.length} thẻ <span className="hidden md:inline">· Ctrl + ` nghe lại · 1–4 chấm độ khó</span></p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1 font-black text-blue-300"><Zap className="h-4 w-4 fill-blue-400" />+{sessionXp} XP</span>
            <span className="text-emerald-300">Đã ôn {reviewedCount} thẻ</span>
          </div>
        </div>
      </div>

      {selectedCategory === "class" && selectedClassAssignmentId && (() => {
        const assignment = classAssignments.find((item) => item.assignmentId === selectedClassAssignmentId);
        const total = liveAssignmentProgress?.totalCards || assignment?.totalCards || selectedAssignmentCards?.length || activeCards.length;
        const reviewed = liveAssignmentProgress?.reviewedCards ?? assignment?.reviewedCards ?? 0;
        return assignment ? <div className="card-duo flex flex-wrap items-center justify-between gap-3 border border-sky-500/30 p-4">
          <div><p className="text-xs font-bold text-sky-200">{assignment.title}</p><p className="mt-1 text-[11px] text-slate-400">Đã ôn {reviewed}/{total} thẻ · {liveAssignmentProgress?.correctCards ?? assignment.correctCards ?? 0} thẻ đã trả lời đúng ít nhất một lần</p></div>
          {(liveAssignmentProgress?.completed || assignment.isCompleted) && <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">Đã hoàn thành</span>}
        </div> : null;
      })()}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT SIDEBAR MENU */}
        <div
          className={`card-duo p-4 bg-[#0f1b38] border-[#1e3466] flex flex-col gap-4 transition-all duration-300 ${
            isSidebarOpen ? "w-full lg:w-80 shrink-0" : "w-full lg:w-16 shrink-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            {isSidebarOpen && (
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white">Danh Mục Bài Học</h3>
              </div>
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors mx-auto lg:mx-0 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {isSidebarOpen && (
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedCategory("thth");
                    setSelectedLesson("all");
                    setSelectedSubTopic("all");
                    setCurrentIndex(0);
                    setIsFlipped(false);
                  }}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between text-xs font-black transition-all cursor-pointer ${
                    selectedCategory === "thth"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-950/40"
                      : "bg-[#132247] text-slate-200 hover:bg-[#1a2d5c]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Tiếng Hàn Tổng Hợp Q.1</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-950/30 text-[10px] font-mono font-bold">
                    3,168 thẻ
                  </span>
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedCategory("basic");
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={`w-full p-3 rounded-2xl flex items-center justify-between text-xs font-black transition-all cursor-pointer ${
                  selectedCategory === "basic"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/40"
                    : "bg-[#132247] text-slate-200 hover:bg-[#1a2d5c]"
                }`}
              >
                <span>📙 Bộ Cơ Bản ({VOCABULARY_DATA.length} từ)</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-950/30 text-[10px] font-mono font-bold">
                  {VOCABULARY_DATA.length} thẻ
                </span>
              </button>
            </div>
          )}
        </div>

        {/* MAIN WORKSPACE */}
        <div className="flex-1 space-y-6">
          {currentCard ? (
            <div className="card-container p-6 sm:p-8 min-h-[460px] flex flex-col justify-between relative shadow-2xl">
              {/* FSRS-4.5 Spaced Repetition Live Status Badge */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
                  <Brain className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-bold">FSRS 4.5:</span>
                  <span>Lần thuộc: <strong className="text-white">{currentCardState.reps}</strong></span>
                  <span>•</span>
                  <span>Hẹn ôn lại: <strong className="text-sky-300">{currentCardState.dueDate}</strong> ({currentCardState.interval} ngày)</span>
                  <span>•</span>
                  <span>Ổn định: <strong className="text-emerald-300">{currentCardState.stability || currentCardState.interval} ngày</strong></span>
                  <span>•</span>
                  <span>Độ khó: <strong className="text-emerald-300">{currentCardState.difficulty || 5}/10</strong></span>
                </div>

                <button
                  id="btnSettings"
                  className="btn-settings cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettingsMenu(!showSettingsMenu);
                  }}
                  title="Cài đặt hiển thị thẻ"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              {!isFlipped ? (
                <main className="card-content space-y-6">
                  <div className="prompt-section">
                    <div className="prompt-label">Dịch sang tiếng Hàn</div>
                    <div
                      className="prompt-content"
                      dangerouslySetInnerHTML={{ __html: renderCleanHtml(currentCard.meaning) }}
                    />
                  </div>

                  {config.showImage && currentCard.image && (
                    <div className="flex justify-center my-4">
                      <div
                        className="max-h-48 max-w-xs overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-1 cursor-pointer [&_img]:max-h-44 [&_img]:w-auto [&_img]:mx-auto [&_img]:rounded-xl"
                          dangerouslySetInnerHTML={{ __html: renderCleanHtml(currentCard.image) }}
                      />
                    </div>
                  )}

                  <div className="typing-area space-y-2">
                    <div className="type-input-wrapper">
                      <input
                        ref={inputRef}
                        id="typeans"
                        type="text"
                        value={typedInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTypedInput(value);
                          const normalizeAnswer = (answer: string) => answer.normalize("NFC").replace(/\s+/g, " ").trim();
                          if (normalizeAnswer(value) === normalizeAnswer(cleanTextOnly(currentCard.word || ""))) {
                            setIsFlipped(true);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setIsFlipped(true);
                          }
                        }}
                        className="real-type-input"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoFocus
                      />
                      <div id="typeans-overlay" className="typeans-overlay">
                        {renderTypingOverlay()}
                      </div>
                    </div>

                    <div className="type-progress-container">
                      <div
                        id="type-progress-bar"
                        className={`type-progress-bar ${typingPercent >= 100 ? "progress-complete" : ""}`}
                        style={{ width: `${typingPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="meta-row flex items-center justify-between">
                    <span className="loaitu">{currentCard.pos || "Từ vựng"}</span>
                    <button id="type-hint-button" className="type-hint-button cursor-pointer" onClick={handleGiveHint}>
                      <HelpCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      onClick={() => setIsFlipped(true)}
                      className="px-6 py-2.5 rounded-xl bg-blue-600/30 border border-blue-500/50 hover:bg-blue-600/50 text-blue-300 text-xs font-bold cursor-pointer"
                    >
                      Hiển thị Đáp Án (Enter)
                    </button>
                  </div>
                </main>
              ) : (
                <main className="card-content space-y-6 animate-fadeIn">
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-bold block mb-1">Kết quả nhập:</span>
                    <div className="text-lg font-bold font-mono">{renderTypingOverlay()}</div>
                  </div>

                  <div className="answer-header flex flex-col items-center justify-center text-center space-y-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="tuvung text-3xl sm:text-4xl font-black text-white"
                        dangerouslySetInnerHTML={{ __html: renderCleanHtml(currentCard.word) }}
                      />
                      <button
                        onClick={() => playSound(currentCard.word)}
                        className="p-2 rounded-xl bg-blue-500/20 text-blue-400 cursor-pointer"
                      >
                        <Volume2 className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="loaitu inline-block">{currentCard.pos || "Từ vựng"}</div>
                  </div>

                  <div className="answer-body space-y-4">
                    <div className="nghia text-xl font-bold text-emerald-400 text-center">
                      {renderCleanHtml(currentCard.meaning)}
                    </div>
                  </div>

                  <div className="srs-rating-row pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      onClick={() => handleNext("again")}
                      className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs cursor-pointer"
                    >
                      1. Học Lại
                    </button>
                    <button
                      onClick={() => handleNext("hard")}
                      className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-pointer"
                    >
                      2. Khó
                    </button>
                    <button
                      onClick={() => handleNext("good")}
                      className="p-3 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold text-xs cursor-pointer"
                    >
                      3. Tốt
                    </button>
                    <button
                      onClick={() => handleNext("easy")}
                      className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs cursor-pointer"
                    >
                      4. Dễ
                    </button>
                  </div>
                </main>
              )}
            </div>
          ) : (
            <div className="card-container p-12 text-center text-slate-400">Không có thẻ nào.</div>
          )}
        </div>
      </div>
    </div>
  );
};

