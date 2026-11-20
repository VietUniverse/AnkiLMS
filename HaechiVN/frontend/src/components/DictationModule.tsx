"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Headphones, Volume2, CheckCircle2, Play, Square, RefreshCw, HelpCircle, Sparkles, Filter, ChevronLeft, ChevronRight, Eye, Mic, RotateCcw, Keyboard, ArrowLeft, Star, PlayCircle, Lock, AlertTriangle } from "lucide-react";
import { ApiClient } from "../lib/apiClient";
import { calculateKoreanSimilarity, normalizeKoreanText } from "../lib/koreanText";
import { loadLessonProgress, saveLessonProgress } from "../lib/lessonProgress";
import { loadYouTubeIframeApi } from "../lib/youtubeIframe";
import { KOREAN_LESSON_TOPICS, matchesLessonTopic } from "../lib/lessonTopics";

import { SCRIPT_LESSON_GROUPS, getScriptLessonGroupId } from "../data/scriptLessonGroups";
import { loadPrivateLearningContent, type PrivateLearningContent } from "../lib/privateLearningContent";
import { TranslationLanguageSetup } from "./TranslationLanguageSetup";
import { useTranslationLanguage } from "../lib/translationPreference";

const DEFAULT_VIDEO_ID = "TLgAJgYqIZk";
// Validate YouTube video ID format
const isValidVideoId = (id: string): boolean => /^[A-Za-z0-9_-]{11}$/.test(id);

export const DictationModule: React.FC = () => {
  const [privateContent, setPrivateContent] = useState<PrivateLearningContent | null>(null);
  const [viewMode, setViewMode] = useState<"catalog" | "workspace">("catalog");
  const [selectedUserLevel, setSelectedUserLevel] = useState<"all" | "beginner" | "experienced">("all");
  const [selectedHashtag, setSelectedHashtag] = useState<string>("#all");
  const [showEmbeddedSubtitles, setShowEmbeddedSubtitles] = useState(false);
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);

  const [selectedTopik, setSelectedTopik] = useState<string>("all");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("lesson_1");
  const [currentSubIndex, setCurrentSubIndex] = useState<number>(0);
  const [dictationInput, setDictationInput] = useState<string>("");
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [translationLanguage, setTranslationLanguage] = useTranslationLanguage();
  const [generatedTranslation, setGeneratedTranslation] = useState("");
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const [generatedWordGlosses, setGeneratedWordGlosses] = useState<Record<string, string>>({});
  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [isGuidedPlayback, setIsGuidedPlayback] = useState(false);
  const [guidedWaiting, setGuidedWaiting] = useState(false);
  const [revealedWordIndices, setRevealedWordIndices] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number | null>(null);
  const [completedSubIds, setCompletedSubIds] = useState<number[]>([]);
  const [ytError, setYtError] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [managedLessons, setManagedLessons] = useState<any[]>([]);
  const [hiddenLessonIds, setHiddenLessonIds] = useState<string[]>([]);
  useEffect(() => { let cancelled = false; void loadPrivateLearningContent().then((content) => { if (!cancelled) setPrivateContent(content); }); return () => { cancelled = true; }; }, []);
  const scriptFolderLessons = useMemo(() => (privateContent?.scriptFolderLessons || []).map((lesson: any, index: number) => ({
    ...lesson,
    lessonNum: index + 1,
    sourceLabel: lesson.sourceLabel || "Video YouTube gốc · script và timeline từ thư mục Script",
    sourceType: "video",
    freeDictation: lesson.freeDictation === true,
    scriptDurationSec: Math.round((lesson.segments || []).reduce((total: number, segment: any) => total + Math.max(0, segment.end - segment.start), 0)),
  })), [privateContent]);
  const allLessons = useMemo(() => [...scriptFolderLessons, ...managedLessons.filter((lesson: any) => lesson.collectionId === "script-folder" && isValidVideoId(String(lesson.videoId || "")) && lesson.sourceType !== "original")].filter((lesson: any) => !hiddenLessonIds.includes(lesson.id)), [scriptFolderLessons, managedLessons, hiddenLessonIds]);
  const rawCourseSections = useMemo<any[]>(() => [{
    id: "sec-talk-to-me-in-korean", title: "Hội thoại tiếng Hàn có phụ đề · Talk To Me In Korean", videoId: "TLgAJgYqIZk",
    lessons: (privateContent?.topikLessons || []).filter((lesson: any) => lesson.videoId === "TLgAJgYqIZk"),
  }, {
    id: "sec-ttmik-restaurant", title: "Gọi món & ăn uống · Talk To Me In Korean", videoId: "5n7HFxyE4ZI",
    lessons: (privateContent?.topikLessons || []).filter((lesson: any) => lesson.videoId === "5n7HFxyE4ZI"),
  }, { id: "sec-video-dictation", title: "Dictation bằng video gốc · script theo từng câu", collectionId: "video-dictation", lessons: [] },
  ...SCRIPT_LESSON_GROUPS.map((group) => ({ id: `sec-script-${group.id}`, title: group.title, description: group.description, icon: group.icon, catalogGroupId: group.id, lessons: [] }))], [privateContent]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/lessons").then((response) => response.ok ? response.json() : null).then((data) => {
      if (cancelled || !data) return;
      setHiddenLessonIds(Array.isArray(data.hiddenLessonIds) ? data.hiddenLessonIds : []);
      if (!Array.isArray(data.lessons)) return;
      const rows = data.lessons.filter((row: any) => row.lessonType === "both" || row.lessonType === "dictation");
      setManagedLessons(rows.map((row: any, index: number) => {
        const lines = String(row.koreanText || "").split(/\r?\n/).filter(Boolean);
        const translations = String(row.vietnameseText || "").split(/\r?\n/);
        const level = Number(String(row.level || "").match(/\d+/)?.[0]) || 1;
        return { id: row.id, lessonNum: index + 1, title: row.title, topikLevel: level, topikName: row.level || `TOPIK ${level}`, durationSec: lines.length * 5, segmentCount: lines.length, collectionId: "admin-custom", sourceType: "original", sourceLabel: row.description || "Bài học do trung tâm biên soạn", sourceUrl: row.sourceUrl, segments: lines.map((text: string, lineIndex: number) => ({ id: lineIndex + 1, start: lineIndex * 5, end: (lineIndex + 1) * 5, text, translation: translations[lineIndex] || "" })) };
      }));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const seekTargetStartRef = useRef<number | null>(null);
  const seekTargetEndRef = useRef<number | null>(null);
  const isSeekingRef = useRef<boolean>(false);
  const seekTimeRef = useRef<number>(0);
  const ttsRunIdRef = useRef(0);
  const ttsGapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guidedAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guidedModeRef = useRef(false);

  const cancelTtsPlayback = useCallback(() => {
    ttsRunIdRef.current += 1;
    if (ttsGapTimerRef.current) clearTimeout(ttsGapTimerRef.current);
    ttsGapTimerRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsPlayingFull(false);
  }, []);

  useEffect(() => () => {
    ttsRunIdRef.current += 1;
    if (ttsGapTimerRef.current) clearTimeout(ttsGapTimerRef.current);
    if (guidedAdvanceTimerRef.current) clearTimeout(guidedAdvanceTimerRef.current);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  // Filter lessons by level & TOPIK
  const filteredLessons = useMemo(() => {
    let lessons: any[] = allLessons;

    // Filter by beginner (TOPIK 1-2) or experienced (TOPIK 3-6)
    if (selectedUserLevel === "beginner") {
      lessons = lessons.filter((l: any) => l.topikLevel <= 2);
    } else if (selectedUserLevel === "experienced") {
      lessons = lessons.filter((l: any) => l.topikLevel >= 3);
    }

    // Filter by specific TOPIK level tab
    if (selectedTopik !== "all") {
      const level = parseInt(selectedTopik, 10);
      if (!isNaN(level)) {
        lessons = lessons.filter((l: any) => l.topikLevel === level);
      }
    }

    lessons = lessons.filter((lesson: any) => matchesLessonTopic(lesson.title, selectedHashtag));

    return lessons;
  }, [selectedUserLevel, selectedTopik, selectedHashtag, allLessons]);

  // Filter Course Sections by selected level
  const filteredCourseSections = useMemo(() => {
    return rawCourseSections.map((section) => ({
      ...section,
      lessons: filteredLessons.filter((lesson: any) => section.catalogGroupId
        ? getScriptLessonGroupId(lesson) === section.catalogGroupId
        : section.collectionId ? lesson.collectionId === section.collectionId : lesson.videoId === section.videoId),
      totalLessons: filteredLessons.filter((lesson: any) => section.catalogGroupId
        ? getScriptLessonGroupId(lesson) === section.catalogGroupId
        : section.collectionId ? lesson.collectionId === section.collectionId : lesson.videoId === section.videoId).length,
    })).filter((section) => section.lessons.length > 0);
  }, [filteredLessons, rawCourseSections]);

  // Safe access to current lesson and segment by selectedLessonId
  const currentLesson = useMemo(() => {
    return allLessons.find((l: any) => l.id === selectedLessonId) || allLessons[0];
  }, [selectedLessonId, allLessons]);

  const currentSub = currentLesson?.segments?.[currentSubIndex] || currentLesson?.segments?.[0] || null;
  const isFreeVideoDictation = currentLesson?.freeDictation === true;
  const currentTranslation = translationLanguage === "vi" ? currentSub?.translation : translationLanguage === "en" ? currentSub?.translationEn : undefined;

  useEffect(() => {
    let cancelled = false;
    setGeneratedTranslation("");
    setTranslationError("");
    if (!currentSub?.text || currentTranslation?.trim()) {
      setTranslationLoading(false);
      return;
    }

    const cacheKey = `haechivn-translation:${translationLanguage}:${currentSub.text}`;
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        setGeneratedTranslation(cached);
        setTranslationLoading(false);
        return;
      }
    } catch { /* Translation still works when browser storage is unavailable. */ }

    setTranslationLoading(true);
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "ko");
    url.searchParams.set("tl", translationLanguage);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", currentSub.text);
    void fetch(url.toString()).then(async (response) => {
      if (!response.ok) throw new Error("Dịch vụ dịch đang bận. Hãy thử lại sau.");
      const payload = await response.json() as unknown;
      const chunks = Array.isArray(payload) && Array.isArray(payload[0]) ? payload[0] : [];
      const translation = chunks.map((chunk) => Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : "").join("").trim();
      if (!translation) throw new Error("Chưa lấy được nghĩa cho câu này.");
      if (cancelled) return;
      setGeneratedTranslation(translation);
      try { window.localStorage.setItem(cacheKey, translation); } catch { /* Ignore full/private storage. */ }
    }).catch((error: unknown) => {
      if (!cancelled) setTranslationError(error instanceof Error ? error.message : "Không dịch được câu này.");
    }).finally(() => {
      if (!cancelled) setTranslationLoading(false);
    });

    return () => { cancelled = true; };
  }, [currentSub?.id, currentSub?.text, currentTranslation, translationLanguage]);

  const displayedTranslation = currentTranslation?.trim() || generatedTranslation;

  useEffect(() => {
    setShowEmbeddedSubtitles(false);
  }, [selectedLessonId]);

  // Memoize targetWords based on currentSub
  const targetWords = useMemo(() => {
    if (!currentSub) return [];
    return cleanText(currentSub.text).split(/\s+/).filter(Boolean);
  }, [currentSub]);

  // Reveal tiles should always show a meaning, including inflected words and
  // words absent from the hand-written glossary. Fetch only requested hints.
  useEffect(() => {
    let cancelled = false;
    const revealedWords = [...new Set(revealedWordIndices.map((index) => targetWords[index]).filter(Boolean))];
    const missingWords = revealedWords.filter((word) => {
      const wordKey = cleanText(word);
      return !privateContent?.wordGlossary[wordKey]?.[translationLanguage]
        && !generatedWordGlosses[`${translationLanguage}:${wordKey}`];
    });
    if (!missingWords.length) return;

    for (const word of missingWords) {
      const wordKey = cleanText(word);
      setGeneratedWordGlosses((previous) => ({ ...previous, [`${translationLanguage}:${wordKey}`]: "Đang tải nghĩa…" }));
    }

    void Promise.all(missingWords.map(async (word) => {
      const wordKey = cleanText(word);
      const stateKey = `${translationLanguage}:${wordKey}`;
      const cacheKey = `haechivn-word-translation:${stateKey}`;
      try {
        const cached = window.localStorage.getItem(cacheKey);
        if (cached) {
          if (!cancelled) setGeneratedWordGlosses((previous) => ({ ...previous, [stateKey]: cached }));
          return;
        }

        const url = new URL("https://translate.googleapis.com/translate_a/single");
        url.searchParams.set("client", "gtx");
        url.searchParams.set("sl", "ko");
        url.searchParams.set("tl", translationLanguage);
        url.searchParams.set("dt", "t");
        url.searchParams.set("q", wordKey);
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Translation request failed");
        const payload = await response.json() as unknown;
        const chunks = Array.isArray(payload) && Array.isArray(payload[0]) ? payload[0] : [];
        const meaning = chunks.map((chunk) => Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : "").join("").trim();
        if (!meaning) throw new Error("Empty translation");
        if (cancelled) return;
        setGeneratedWordGlosses((previous) => ({ ...previous, [stateKey]: meaning }));
        try { window.localStorage.setItem(cacheKey, meaning); } catch { /* Ignore unavailable storage. */ }
      } catch {
        if (!cancelled) setGeneratedWordGlosses((previous) => ({ ...previous, [stateKey]: "Chưa tải được nghĩa" }));
      }
    }));

    return () => { cancelled = true; };
  }, [revealedWordIndices, targetWords, translationLanguage, privateContent, generatedWordGlosses]);

  // YouTube API Init
  useEffect(() => {
    if (viewMode !== "workspace" || !currentLesson) return;

    if (currentLesson.sourceType === "original" && !currentLesson.videoId) {
      if (playerRef.current?.destroy) playerRef.current.destroy();
      playerRef.current = null; playerReadyRef.current = false; setYtError(null);
      return;
    }
    const videoId = currentLesson.videoId || DEFAULT_VIDEO_ID;
    if (!isValidVideoId(videoId)) {
      setYtError("Video ID không hợp lệ.");
      return;
    }

    const startSec = currentSub?.start || currentLesson?.startSec || 0;

    let cancelled = false;
    void loadYouTubeIframeApi()
      .then(() => { if (!cancelled) initYTPlayer(videoId, startSec); })
      .catch(() => { if (!cancelled) setYtError("Không thể tải YouTube Player. Kiểm tra kết nối mạng hoặc thử phát âm bằng nút phát lại câu."); });

    return () => {
      cancelled = true;
      playerReadyRef.current = false;
      isSeekingRef.current = false;
      seekTargetStartRef.current = null;
      seekTargetEndRef.current = null;
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try { playerRef.current.destroy(); } catch (_e) { /* ignore */ }
      }
      playerRef.current = null;
    };
  }, [viewMode, selectedLessonId]);

  // Continuous YouTube Player Monitor: auto-pause at script/segment end for ALL playback triggers
  useEffect(() => {
    if (viewMode !== "workspace") return;

    const interval = setInterval(() => {
      if (!playerRef.current || !playerReadyRef.current || typeof playerRef.current.getCurrentTime !== "function") {
        return;
      }

      try {
        const playerState = playerRef.current.getPlayerState ? playerRef.current.getPlayerState() : -1;
        if (playerState !== 1 && playerState !== 3) return;

        const currentTime = playerRef.current.getCurrentTime();

        const targetStart = seekTargetStartRef.current !== null ? seekTargetStartRef.current : (currentSub ? currentSub.start : 0);
        const targetEnd = seekTargetEndRef.current !== null ? seekTargetEndRef.current : (currentSub ? currentSub.end : (currentLesson ? currentLesson.endSec : 999999));

        if (isSeekingRef.current) {
          const timeSinceSeek = Date.now() - seekTimeRef.current;
          const diff = Math.abs(currentTime - targetStart);

          if (diff < 2.0 || timeSinceSeek > 2500) {
            isSeekingRef.current = false;
          }
        } else {
          if (currentTime >= targetEnd) {
            pausePlayer();
            seekTargetStartRef.current = null;
            seekTargetEndRef.current = null;
            if (guidedModeRef.current) setGuidedWaiting(true);
          }
        }
      } catch (_e) {
        /* ignore transient player errors */
      }
    }, 50);

    return () => clearInterval(interval);
  }, [viewMode, currentSub, currentLesson]);

  const initYTPlayer = (videoId: string, startSec: number = 0) => {
    if (playerRef.current && typeof playerRef.current.destroy === "function") {
      try { playerRef.current.destroy(); } catch (_e) { /* ignore */ }
    }
    playerRef.current = null;
    playerReadyRef.current = false;
    isSeekingRef.current = false;
    seekTargetStartRef.current = null;
    seekTargetEndRef.current = null;
    setYtError(null);

    const initialStart = Math.floor(startSec);

    try {
      playerRef.current = new (window as any).YT.Player("yt-dictation-player", {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          playsinline: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
          start: initialStart,
        },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            if (startSec > 0 && playerRef.current && typeof playerRef.current.seekTo === "function") {
              try {
                playerRef.current.seekTo(startSec, true);
              } catch (_e) {}
            }
          },
          onError: (e: any) => {
            setYtError(`YouTube Player Error: ${e.data}`);
          },
        },
      });
    } catch (e) {
      console.error("YouTube Player Init error:", e);
      setYtError("Không thể khởi tạo YouTube Player.");
    }
  };

  const isPlayerReady = (): boolean => {
    return !!(playerRef.current && playerReadyRef.current && typeof playerRef.current.seekTo === "function");
  };

  const pausePlayer = () => {
    if (isPlayerReady()) {
      try { playerRef.current.pauseVideo(); } catch (_e) { /* ignore */ }
    }
  };

  const stopGuidedPlayback = () => {
    guidedModeRef.current = false;
    if (guidedAdvanceTimerRef.current) clearTimeout(guidedAdvanceTimerRef.current);
    guidedAdvanceTimerRef.current = null;
    setIsGuidedPlayback(false);
    setGuidedWaiting(false);
    cancelTtsPlayback();
    pausePlayer();
  };

  // Play a specific segment and automatically pause at sub.end
  const playSegment = useCallback((sub: any, onEnded?: () => void) => {
    if (!sub) return;
    cancelTtsPlayback();

    if (isPlayerReady()) {
      try {
        seekTargetStartRef.current = sub.start;
        seekTargetEndRef.current = sub.end;
        isSeekingRef.current = true;
        seekTimeRef.current = Date.now();

        playerRef.current.setPlaybackRate(playbackSpeed);
        playerRef.current.seekTo(sub.start, true);
        playerRef.current.playVideo();
      } catch (e) {
        console.error("playSegment error:", e);
        if (currentLesson?.sourceType === "original" && !currentLesson?.videoId) playTTSFallback(sub.text, onEnded);
        else setYtError("Không thể phát câu này trong video. Hãy thử tải lại video rồi phát lại.");
      }
    } else {
      if (currentLesson?.sourceType === "original" && !currentLesson?.videoId) playTTSFallback(sub.text, onEnded);
      else setYtError("Video đang tải. Hãy đợi video sẵn sàng rồi phát lại câu.");
    }
  }, [playbackSpeed, cancelTtsPlayback, currentLesson]);

  const playTTSFallback = (text: string, onEnded?: () => void) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = playbackSpeed;
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find(v => v.lang.startsWith("ko"));
      if (koVoice) utterance.voice = koVoice;
      if (onEnded) utterance.onend = onEnded;
      window.speechSynthesis.speak(utterance);
    }
  };

  const playFullLesson = () => {
    if (!currentLesson) return;
    if (currentLesson.sourceType === "original" && !currentLesson.videoId) {
      if (!("speechSynthesis" in window)) return;
      if (isPlayingFull) { cancelTtsPlayback(); return; }
      const runId = ++ttsRunIdRef.current;
      if (ttsGapTimerRef.current) clearTimeout(ttsGapTimerRef.current);
      window.speechSynthesis.cancel();
      setIsPlayingFull(true);
      const speakAt = (index: number) => {
        if (runId !== ttsRunIdRef.current) return;
        if (index >= currentLesson.segments.length) { setIsPlayingFull(false); ttsGapTimerRef.current = null; return; }
        const segment = currentLesson.segments[index];
        setCurrentSubIndex(index);
        const utterance = new SpeechSynthesisUtterance(segment.text);
        utterance.lang = "ko-KR"; utterance.rate = playbackSpeed;
        const koVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ko"));
        if (koVoice) utterance.voice = koVoice;
        utterance.onend = () => {
          if (runId !== ttsRunIdRef.current) return;
          // Leave a clear pause between sentences and keep the transcript aligned with the spoken line.
          ttsGapTimerRef.current = setTimeout(() => speakAt(index + 1), 700);
        };
        utterance.onerror = () => { if (runId === ttsRunIdRef.current) setIsPlayingFull(false); };
        window.speechSynthesis.speak(utterance);
      };
      speakAt(0);
      return;
    }
    cancelTtsPlayback();
    if (!isPlayerReady()) {
      setYtError("Video đang tải. Hãy thử lại sau ít giây.");
      return;
    }

    try {
      seekTargetStartRef.current = currentLesson.startSec;
      seekTargetEndRef.current = currentLesson.endSec;
      isSeekingRef.current = true;
      seekTimeRef.current = Date.now();

      playerRef.current.setPlaybackRate(playbackSpeed);
      playerRef.current.seekTo(currentLesson.startSec, true);
      playerRef.current.playVideo();
    } catch (e) {
      console.error("playFullLesson error:", e);
    }
  };

  const startGuidedPlayback = () => {
    if (!currentLesson || !currentSub) return;
    if (guidedModeRef.current) { stopGuidedPlayback(); return; }
    cancelTtsPlayback();
    guidedModeRef.current = true;
    setIsGuidedPlayback(true);
    setGuidedWaiting(false);
    setDictationInput("");
    setRevealedWordIndices([]);
    setIsSubmitted(false);
    setScore(null);
    playSegment(currentSub, () => { if (guidedModeRef.current) setGuidedWaiting(true); });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    if (viewMode !== "workspace") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.target instanceof HTMLTextAreaElement && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isSubmitted) handleCheckAnswer();
        return;
      }
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA"].includes(e.target.tagName))) return;

      // Replay current sentence: Ctrl + ` (Backquote)
      if (e.ctrlKey && (e.key === "`" || e.code === "Backquote")) {
        e.preventDefault();
        playSegment(currentSub, guidedModeRef.current ? () => { if (guidedModeRef.current) setGuidedWaiting(true); } : undefined);
      } else if (e.ctrlKey && e.key === "ArrowRight") {
        e.preventDefault();
        if (!guidedModeRef.current) handleNextSub();
      } else if (e.ctrlKey && e.key === "ArrowLeft") {
        e.preventDefault();
        if (!guidedModeRef.current) handlePrevSub();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, currentSub, dictationInput, isSubmitted, currentSubIndex, selectedLessonId, playSegment]);

  // Normalize and clean Korean text for comparison
  function cleanText(str: string): string {
    return normalizeKoreanText(str);
  }

  // Character-level similarity comparison
  function calculateSimilarity(target: string, input: string): number {
    return calculateKoreanSimilarity(target, input);
  }

  const handleCheckAnswer = () => {
    if (!dictationInput.trim() || !currentSub) return;

    if (isFreeVideoDictation) {
      setScore(null);
      setIsSubmitted(true);
      if (!completedSubIds.includes(currentSub.id)) {
        const nextCompleted = [...completedSubIds, currentSub.id];
        setCompletedSubIds(nextCompleted);
        saveLessonProgress("dictation", selectedLessonId, nextCompleted);
      }
      return;
    }

    const matchScore = calculateSimilarity(currentSub.text, dictationInput);
    const hintPenalty = targetWords.length
      ? Math.round((revealedWordIndices.length / targetWords.length) * 100)
      : 0;
    const calcScore = Math.max(0, matchScore - hintPenalty);
    setScore(calcScore);
    setIsSubmitted(true);

    if (guidedModeRef.current && currentLesson) {
      setGuidedWaiting(false);
      if (guidedAdvanceTimerRef.current) clearTimeout(guidedAdvanceTimerRef.current);
      guidedAdvanceTimerRef.current = setTimeout(() => {
        guidedAdvanceTimerRef.current = null;
        if (!guidedModeRef.current) return;
        const nextIndex = currentSubIndex + 1;
        if (nextIndex >= currentLesson.segments.length) { stopGuidedPlayback(); return; }
        const nextSegment = currentLesson.segments[nextIndex];
        setCurrentSubIndex(nextIndex);
        setDictationInput("");
        setRevealedWordIndices([]);
        setIsSubmitted(false);
        setScore(null);
        playSegment(nextSegment, () => { if (guidedModeRef.current) setGuidedWaiting(true); });
      }, 1100);
    }

    if (calcScore >= 70) {
      if (!completedSubIds.includes(currentSub.id)) {
        const nextCompleted = [...completedSubIds, currentSub.id];
        setCompletedSubIds(nextCompleted);
        saveLessonProgress("dictation", selectedLessonId, nextCompleted);
        const realDuration = Math.round((Date.now() - sessionStartTime) / 1000);
        const xpEarned = Math.min(20, Math.round(calcScore / 10));
        ApiClient.recordStudySession("dictation", 1, 1, xpEarned, Math.min(realDuration, 300));
      }
    }
  };

  const handleSelectSub = (subIdx: number) => {
    if (guidedModeRef.current) stopGuidedPlayback();
    cancelTtsPlayback();
    pausePlayer();
    setCurrentSubIndex(subIdx);
    setDictationInput("");
    setRevealedWordIndices([]);
    setIsSubmitted(false);
    setScore(null);
    setSessionStartTime(Date.now());

    const sub = currentLesson?.segments?.[subIdx];
    if (sub) {
      setTimeout(() => playSegment(sub), 100);
    }
  };

  const handleNextSub = () => {
    if (!currentLesson) return;
    pausePlayer();

    if (currentSubIndex < currentLesson.segments.length - 1) {
      handleSelectSub(currentSubIndex + 1);
    } else {
      const currentIdx = allLessons.findIndex((l: any) => l.id === selectedLessonId);
      if (currentIdx >= 0 && currentIdx < allLessons.length - 1) {
        openLessonWorkspace(allLessons[currentIdx + 1]);
      }
    }
  };

  const handlePrevSub = () => {
    if (currentSubIndex > 0) {
      handleSelectSub(currentSubIndex - 1);
    }
  };

  const toggleRevealWord = (wIdx: number) => {
    if (revealedWordIndices.includes(wIdx)) {
      setRevealedWordIndices(revealedWordIndices.filter(i => i !== wIdx));
    } else {
      setRevealedWordIndices([...revealedWordIndices, wIdx]);
    }
  };

  const revealAllWords = () => {
    setRevealedWordIndices(targetWords.map((_, idx) => idx));
  };

  const openLessonWorkspace = (lesson: any) => {
    if (!lesson) return;
    if (guidedModeRef.current) stopGuidedPlayback();
    cancelTtsPlayback();
    setSelectedLessonId(lesson.id);
    setCurrentSubIndex(0);
    setDictationInput("");
    setRevealedWordIndices([]);
    setIsSubmitted(false);
    setScore(null);
    setCompletedSubIds(loadLessonProgress("dictation", lesson.id));
    setSessionStartTime(Date.now());
    setYtError(null);
    setViewMode("workspace");
  };

  const backToCatalog = () => {
    if (guidedModeRef.current) stopGuidedPlayback();
    cancelTtsPlayback();
    pausePlayer();
    setViewMode("catalog");
    setSelectedTopik("all");
  };

  // Helper for Topik Level Badge styling
  const getTopikBadgeColor = (level: number) => {
    switch (level) {
      case 1: return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case 2: return "bg-sky-500/20 text-sky-400 border-sky-500/30";
      case 3: return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case 4: return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
      case 5: return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case 6: return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      default: return "bg-slate-800 text-slate-300";
    }
  };

  const getTopikLevelName = (level: number) => {
    return `TOPIK ${level}`;
  };

  // ================= VIEW 1: CATALOG LANDING PAGE =================
  if (viewMode === "catalog") {
    return (
      <div className="space-y-8 animate-fadeIn pb-24 w-full max-w-[1800px] mx-auto text-slate-100 px-2 sm:px-4">
        <div className="flex justify-end"><TranslationLanguageSetup language={translationLanguage} onChange={setTranslationLanguage} /></div>

        {/* Banner 1: Header Explanation */}
        <div className="text-center space-y-2 py-4">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Giải thích Phương pháp Nghe chép chính tả
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            Khám phá cách <span className="text-purple-400 font-bold">hiệu quả nhất</span> để học và tinh chỉnh <span className="text-sky-400 font-bold">kỹ năng nghe tiếng Hàn thực tế</span>
          </p>
        </div>

        {/* Banner 2: Level Selection Big Cards (Interactive Level Filtering) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedUserLevel(prev => prev === "beginner" ? "all" : "beginner")}
            className={`p-5 rounded-2xl border text-center transition-all cursor-pointer ${
              selectedUserLevel === "beginner"
                ? "bg-purple-950/80 border-purple-500 shadow-xl shadow-purple-900/40 ring-2 ring-purple-500/50 scale-[1.02]"
                : "bg-slate-950/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 opacity-80"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">Dành cho người mới bắt đầu (TOPIK 1 - 2)</h3>
              {selectedUserLevel === "beginner" && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-black">Đang chọn</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Tập trung vào phát âm cơ bản và luyện nghe từng từ, câu đơn giản</p>
          </button>

          <button
            onClick={() => setSelectedUserLevel(prev => prev === "experienced" ? "all" : "experienced")}
            className={`p-5 rounded-2xl border text-center transition-all cursor-pointer ${
              selectedUserLevel === "experienced"
                ? "bg-purple-950/80 border-purple-500 shadow-xl shadow-purple-900/40 ring-2 ring-purple-500/50 scale-[1.02]"
                : "bg-slate-950/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 opacity-80"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-sm font-bold text-purple-400">Dành cho người đã có kinh nghiệm (TOPIK 3 - 6)</h3>
              {selectedUserLevel === "experienced" && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-black">Đang chọn</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Nâng cao kỹ năng với tốc độ nói thực tế và các chủ đề phức tạp hơn</p>
          </button>
        </div>

        {/* Level filter status bar if active */}
        {selectedUserLevel !== "all" && (
          <div className="flex items-center justify-between bg-purple-950/40 border border-purple-500/30 p-3 rounded-2xl max-w-4xl mx-auto text-xs text-purple-300">
            <span>
              Đang lọc bài học cho: <strong>{selectedUserLevel === "beginner" ? "Người mới bắt đầu (TOPIK 1 - 2)" : "Người có kinh nghiệm (TOPIK 3 - 6)"}</strong>
            </span>
            <button
              onClick={() => setSelectedUserLevel("all")}
              className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px]"
            >
              Xem tất cả bài học
            </button>
          </div>
        )}

        {/* Section 3: Topic Hashtags List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Chọn chủ đề để lọc các đoạn hội thoại trong khóa học
          </h3>
          <div className="flex flex-wrap gap-2">
            {KOREAN_LESSON_TOPICS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedHashtag(tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-mono transition-all ${
                  selectedHashtag === tag
                    ? "bg-sky-500 text-white shadow-md shadow-sky-900/40"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {filteredLessons.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-400">
            Không có bài học phù hợp với bộ lọc này. Hãy chọn chủ đề khác.
          </div>
        )}

        {/* Section 4: Course Video Cards Sections Grid */}
        {filteredCourseSections.map((sec) => {
          const isSectionExpanded = expandedSectionIds.includes(sec.id);
          return (
          <section key={sec.id} className="space-y-4 pt-2">
            {/* Section Header Bar */}
            <div className="flex items-center justify-between border-l-4 border-purple-500 pl-3">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-black text-white">{sec.icon ? `${sec.icon} ` : ""}{sec.title}</h2>
                  <span className="text-xs text-slate-400 font-bold font-mono">({sec.totalLessons} bài học)</span>
                </div>
                {sec.description && <p className="mt-1 text-xs text-slate-400">{sec.description}</p>}
              </div>

              {sec.sourceUrl && <a href={sec.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-purple-300 hover:text-white underline underline-offset-4">Nguồn xem thêm: {sec.sourceLabel} ↗</a>}

              <button
                onClick={() => setExpandedSectionIds((ids) => isSectionExpanded ? ids.filter((id) => id !== sec.id) : [...ids, sec.id])}
                className="px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-purple-500 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1"
                aria-label={isSectionExpanded ? "Thu gọn bài học" : "Xem tất cả bài học"}
              >
                <span>{isSectionExpanded ? "THU GỌN" : "XEM TẤT CẢ"}</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Video Cards 4-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {(isSectionExpanded ? sec.lessons : sec.lessons.slice(0, 4)).map((lesson: any) => {
                const levelTag = getTopikLevelName(lesson.topikLevel);
                const badgeColor = getTopikBadgeColor(lesson.topikLevel);

                return (
                  <div
                    key={`${sec.id}-${lesson.id}`}
                    onClick={() => openLessonWorkspace(lesson)}
                    className="group bg-slate-900 border border-slate-800 hover:border-purple-500 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-purple-900/20 flex flex-col justify-between"
                  >
                    {/* Card Thumbnail Area */}
                    <div className="relative w-full pt-[56.25%] bg-slate-950 overflow-hidden">
                      {lesson.videoId ? <img
                        src={`https://img.youtube.com/vi/${lesson.videoId}/hqdefault.jpg`}
                        alt={`Thumbnail: ${lesson.title}`}
                        className="absolute top-0 left-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                        loading="lazy"
                      /> : <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-fuchsia-950 via-slate-900 to-indigo-950 text-center p-4"><span className="text-4xl">{lesson.collectionId === "original-blackpink" ? "💖" : "🎬"}</span><span className="mt-2 text-xs font-black text-white">대화 연습 · 한국어</span><span className="text-[10px] text-slate-300">HaechiVN 창작 대화</span></div>}

                      {/* Top Badges overlay */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-slate-300 text-[10px] font-bold font-mono">
                            Tập {lesson.lessonNum}
                          </span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-md border font-mono text-xs font-black backdrop-blur-md shadow-md ${badgeColor}`}>
                          {levelTag}
                        </span>
                      </div>

                      {/* Bottom Duration & Youtube Badge overlay */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-rose-600/90 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-md">
                          {lesson.videoId ? "▶ Video" : "🔊 Giọng đọc tiếng Hàn"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-slate-300 text-[10px] font-mono font-bold">
                          ▶ Video {Math.round(lesson.durationSec)}s
                        </span>
                      </div>
                    </div>

                    {/* Card Content & Title */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <h4 className="text-xs font-bold text-slate-100 group-hover:text-purple-400 transition-colors line-clamp-2 leading-relaxed font-noto">
                        {lesson.title}
                      </h4>
                      {lesson.sourceTitle && <p className="text-[10px] leading-4 text-slate-500 line-clamp-2">Nguồn video: {lesson.sourceTitle}</p>}

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-slate-400">Dictation</span>
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-black font-mono">
                          {lesson.segmentCount} câu · script {lesson.scriptDurationSec}s
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );})}

      </div>
    );
  }

  // ================= GUARD: No lesson data =================
  if (!currentLesson || !currentSub) {
    return (
      <div className="card-duo p-12 text-center max-w-xl mx-auto my-12 space-y-4 animate-fadeIn">
        <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto" />
        <h2 className="text-xl font-black text-white">Không tìm thấy bài học</h2>
        <p className="text-xs text-slate-400">Bộ lọc hiện tại không có bài học nào phù hợp. Hãy thử chọn cấp độ TOPIK khác.</p>
        <button onClick={backToCatalog} className="btn-duo btn-duo-primary px-6 py-2.5 text-xs">Quay Về Danh Sách</button>
      </div>
    );
  }

  // ================= VIEW 2: 3-COLUMN DICTATION WORKSPACE =================
  return (
    <div className="space-y-4 animate-fadeIn pb-24 w-full max-w-[1800px] mx-auto text-slate-100 px-2 sm:px-4">

      {/* Top Header Bar with Back Button */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
        <button
          onClick={backToCatalog}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all"
          aria-label="Quay lại danh sách bài học"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Quay lại Danh Sách Bài Học (Catalog)</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Bài đang học:</span>
          <span className="text-xs font-black text-purple-400 font-noto">{currentLesson.title}</span>
        </div>
        <TranslationLanguageSetup language={translationLanguage} onChange={setTranslationLanguage} />
      </div>

      {/* YouTube Error Toast */}
      {ytError && (
        <div className="p-3.5 bg-rose-500/20 border border-rose-500 rounded-2xl text-xs text-rose-300 font-bold flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          <span>{ytError}</span>
        </div>
      )}

      {/* Keyboard Shortcut Banner */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2 text-sky-400 font-bold">
          <Keyboard className="w-4 h-4" aria-hidden="true" />
          <span>Hướng dẫn phím tắt:</span>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-slate-300">
          <span><kbd className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-sky-400 font-bold">Ctrl + `</kbd>: <strong>Phát lại câu (Replay)</strong></span>
          <span><kbd className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-sky-400 font-bold">Ctrl + →</kbd>: <strong>Qua câu mới</strong></span>
          <span><kbd className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-sky-400 font-bold">Ctrl + ←</kbd>: <strong>Quay lui câu trước</strong></span>
          <span><kbd className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-sky-400 font-bold">Enter</kbd>: <strong>Kiểm tra câu gõ</strong></span>
        </div>
      </div>

      {/* Main Spacious Dashboard Layout (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT COLUMN: LESSONS MENU & TOPIK FILTER (Col 1-3) */}
        <aside className="order-2 lg:order-1 lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 max-h-[420px] lg:max-h-[820px] overflow-y-auto shadow-lg">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Headphones className="w-4 h-4 text-purple-400" aria-hidden="true" />
              <span>DANH MỤC BÀI HỌC</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{filteredLessons.length} Bài học ngắn (1-2 phút)</p>
          </div>

          {/* TOPIK Filter List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">🎯 CẤP ĐỘ TOPIK:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {["all", "1", "2", "3", "4", "5", "6"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setSelectedTopik(lvl);
                    setCurrentSubIndex(0);
                    const nextLesson = allLessons.find((lesson: any) => lvl === "all" || lesson.topikLevel === Number(lvl));
                    if (nextLesson) {
                      setSelectedLessonId(nextLesson.id);
                      setCompletedSubIds(loadLessonProgress("dictation", nextLesson.id));
                    }
                    setDictationInput("");
                    setRevealedWordIndices([]);
                    setIsSubmitted(false);
                    setScore(null);
                    setCompletedSubIds([]);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all ${
                    selectedTopik === lvl
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                      : "bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {lvl === "all" ? `Tất Cả (${allLessons.length} Bài)` : `TOPIK ${lvl}`}
                </button>
              ))}
            </div>
          </div>

          {/* Lessons Cards List */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">🎬 DANH SÁCH BÀI HỌC:</span>
            {filteredLessons.length === 0 && (
              <p className="text-xs text-slate-500 italic p-3">Không có bài học nào cho cấp độ này.</p>
            )}
            {filteredLessons.map((l: any) => {
              const isSelected = l.id === selectedLessonId;
              return (
                <button
                  key={`lesson-${l.id}`}
                  onClick={() => openLessonWorkspace(l)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all space-y-1.5 ${
                    isSelected
                      ? "bg-purple-600/20 border-purple-500 text-white font-bold shadow-md shadow-purple-900/30"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-400 font-extrabold font-mono">BÀI #{l.lessonNum}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold text-[11px]">{l.topikName}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{l.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{l.freeDictation ? "🎬 Video gốc · chép tự do" : l.sourceType === "video" ? `▶ Video ${Math.round(l.durationSec)}s · script ${l.segmentCount} câu / ${l.scriptDurationSec}s` : `⏱️ ${Math.round(l.durationSec)}s • ${l.segmentCount} câu`}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* CENTER COLUMN: MAIN WORKSPACE (Col 4-9) */}
        <main className="order-1 min-w-0 lg:order-2 lg:col-span-6 space-y-5">

          {/* Top Video Player Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h2 className="font-extrabold text-white text-base font-noto">{currentLesson.title}</h2>
                <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 font-bold text-xs">{currentLesson.topikName}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">{isFreeVideoDictation ? "🎬 Video gốc · chép tự do" : currentLesson.sourceType === "video" ? `▶ Video ${Math.round(currentLesson.durationSec)} giây · script ${currentLesson.segments.length} câu / ${currentLesson.scriptDurationSec} giây` : `⏱️ ${Math.round(currentLesson.durationSec)} giây (${currentLesson.segments.length} câu)`}</span>
            </div>

            {/* Video Player */}
            <div className={`relative w-full ${currentLesson.sourceType === "original" && !currentLesson.videoId ? "min-h-40" : "pt-[56.25%]"} bg-black rounded-xl overflow-hidden border border-slate-800 shadow-md`}>
              {currentLesson.sourceType === "original" && !currentLesson.videoId ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-950 to-slate-950 p-4 text-center"><span className="text-3xl">🎧</span><p className="text-sm font-bold text-white">Nghe câu tiếng Hàn qua giọng đọc trên thiết bị rồi chép lại</p><p className="text-xs text-slate-300">{currentLesson.sourceLabel}</p><a href={currentLesson.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-purple-300 underline underline-offset-4">Mở nguồn tham khảo bên ngoài · không khớp lời luyện ↗</a></div> : <><div id="yt-dictation-player" className="absolute inset-0 h-full w-full"></div>{currentLesson.videoId && !isFreeVideoDictation && !showEmbeddedSubtitles && <div aria-hidden="true" className="absolute left-[5%] right-[5%] bottom-[6%] z-20 h-[18%] rounded-md bg-black pointer-events-none" />}</>}
            </div>

            {/* Control Buttons & Speed bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={playFullLesson}
                  className={`py-2.5 px-5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${isPlayingFull ? "bg-rose-700 hover:bg-rose-600 shadow-rose-900/40" : "bg-purple-600 hover:bg-purple-500 shadow-purple-900/40"}`}
                  aria-label={isPlayingFull ? "Dừng phát toàn bộ bài học" : "Phát toàn bộ bài học"}
                >
                  {isPlayingFull ? <Square className="w-4 h-4 fill-white" aria-hidden="true" /> : <Play className="w-4 h-4 fill-white" aria-hidden="true" />}
                  <span>{isFreeVideoDictation ? "PHÁT VIDEO GỐC" : isPlayingFull ? "DỪNG NGHE" : "NGHE CẢ BÀI LIÊN TỤC"}</span>
                </button>

                {!isFreeVideoDictation && <button
                  onClick={startGuidedPlayback}
                  className={`py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${isGuidedPlayback ? "bg-rose-700 hover:bg-rose-600 shadow-rose-900/40" : "bg-emerald-700 hover:bg-emerald-600 shadow-emerald-900/30"}`}
                  aria-label={isGuidedPlayback ? "Dừng luyện từng câu" : "Bắt đầu luyện từng câu"}
                >
                  {isGuidedPlayback ? <Square className="w-4 h-4 fill-white" aria-hidden="true" /> : <Mic className="w-4 h-4" aria-hidden="true" />}
                  <span>{isGuidedPlayback ? "DỪNG LUYỆN" : "LUYỆN TỪNG CÂU"}</span>
                </button>}

                <button
                  onClick={() => playSegment(currentSub, guidedModeRef.current ? () => { if (guidedModeRef.current) setGuidedWaiting(true); } : undefined)}
                  className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all"
                  aria-label="Phát lại câu hiện tại"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>PHÁT LẠI CÂU</span>
                </button>

                {currentLesson.videoId && !isFreeVideoDictation && <button
                  type="button"
                  onClick={() => setShowEmbeddedSubtitles((visible) => !visible)}
                  aria-pressed={showEmbeddedSubtitles}
                  className={`py-2.5 px-4 rounded-xl border font-bold text-xs transition-colors ${showEmbeddedSubtitles ? "bg-amber-500/15 border-amber-400/40 text-amber-200" : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"}`}
                >
                  {showEmbeddedSubtitles ? "ẨN PHỤ ĐỀ GỐC" : "HIỆN PHỤ ĐỀ GỐC"}
                </button>}
              </div>

              {/* Speed Selector */}
              <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 px-1">Tốc độ:</span>
                {[0.5, 0.75, 1.0, 1.25, 1.5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(Math.min(2, Math.max(0.5, s)))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                      playbackSpeed === s
                        ? "bg-purple-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {isGuidedPlayback && <div role="status" aria-live="polite" className={`rounded-xl border px-4 py-3 text-xs font-semibold ${guidedWaiting ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-sky-500/30 bg-sky-500/10 text-sky-200"}`}>
              {guidedWaiting ? `Đã phát xong câu #${currentSubIndex + 1}. Gõ câu trả lời rồi nhấn Enter để chấm và nghe câu kế tiếp.` : `Đang phát câu #${currentSubIndex + 1}. Sau khi nghe xong, hãy gõ lại câu và nhấn Enter.`}
            </div>}
          </div>

          {/* Dictation Input & Eye Reveal Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">

            {/* Input Label & Segment Prev/Next Navigation */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
              <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider">
                {isFreeVideoDictation ? "CHÉP LẠI LỜI THOẠI TRONG VIDEO GỐC:" : `GÕ NHỮNG GÌ BẠN NGHE ĐƯỢC (CÂU #${currentSubIndex + 1} / ${currentLesson.segments.length}):`}
              </label>

              <div className="flex items-center gap-2">
                <button onClick={handlePrevSub} disabled={currentSubIndex === 0 || isGuidedPlayback} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold flex items-center gap-1 disabled:opacity-40" aria-label="Câu trước">
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Câu trước
                </button>
                <button onClick={handleNextSub} disabled={isGuidedPlayback} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold flex items-center gap-1 disabled:opacity-40" aria-label="Câu tiếp">
                  Câu tiếp <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Large Spacious Input Textarea */}
            <textarea
              rows={4}
              value={dictationInput}
              onChange={(e) => setDictationInput(e.target.value)}
              placeholder={isFreeVideoDictation ? "Xem video và chép lại câu tiếng Hàn bạn nghe được..." : "Gõ câu trả lời tiếng Hàn của bạn ở đây..."}
              disabled={isSubmitted}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-lg font-noto font-bold text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all leading-relaxed"
            />

            {/* Interactive Word Hint Boxes (Eye Reveal) */}
            {!isFreeVideoDictation && <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {targetWords.map((word, wIdx) => {
                  const isRevealed = revealedWordIndices.includes(wIdx);
                  const wordKey = cleanText(word);
                  const wordGloss = privateContent?.wordGlossary[wordKey]?.[translationLanguage]
                    || generatedWordGlosses[`${translationLanguage}:${wordKey}`];
                  return (
                    <button
                      key={`word-${wIdx}`}
                      onClick={() => toggleRevealWord(wIdx)}
                      className={`px-3 py-2 rounded-xl border text-sm font-noto font-bold transition-all flex flex-col items-center gap-1 ${
                        isRevealed
                          ? "bg-purple-600/30 border-purple-500 text-sky-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-purple-500/50"
                      }`}
                      aria-label={isRevealed ? `Từ đã hiện: ${word}` : "Bấm để xem gợi ý"}
                    >
                      <Eye className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                      <span>{isRevealed ? word : "·".repeat(Math.max(word.length, 2))}</span>
                      {isRevealed && <span className="max-w-28 text-center text-[10px] font-medium leading-4 text-emerald-200">{wordGloss || "Đang tải nghĩa…"}</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-amber-400 font-medium">
                Các từ được tiết lộ sẽ bị tính là lỗi và ảnh hưởng đến điểm số của bạn.
              </p>
            </div>}

            {currentSub?.text && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3" aria-live="polite">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Dịch nghĩa · {{ vi: "Tiếng Việt", en: "English", ja: "日本語" }[translationLanguage]}</p>
              {displayedTranslation
                ? <p className="mt-1 text-sm leading-6 text-slate-200">{displayedTranslation}</p>
                : translationLoading
                  ? <p className="mt-1 text-sm text-slate-400">Đang tải nghĩa câu…</p>
                  : <p className="mt-1 text-sm text-amber-300">{translationError || "Chưa có bản dịch cho câu này."}</p>}
            </div>}

            {/* Dictation Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {!isFreeVideoDictation && <button
                onClick={revealAllWords}
                className="py-3 px-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-400 font-bold text-xs hover:bg-amber-900/40 transition-all flex items-center justify-center gap-2"
                aria-label="Hiện tất cả từ"
              >
                <Eye className="w-4 h-4" aria-hidden="true" /> HIỆN TẤT CẢ TỪ
              </button>}

              {!isSubmitted ? (
                <button
                  onClick={handleCheckAnswer}
                  disabled={!dictationInput.trim()}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider disabled:opacity-50 shadow-lg shadow-purple-900/40 transition-all"
                >
                  {isFreeVideoDictation ? "LƯU BẢN CHÉP" : "KIỂM TRA CÂU GÕ (ENTER)"}
                </button>
              ) : (
                <button
                  onClick={handleNextSub}
                  className="py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-900/40 transition-all"
                >
                  TIẾP THEO &gt;
                </button>
              )}
            </div>

            {/* Feedback Score Panel */}
            {isSubmitted && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">{isFreeVideoDictation ? "BẢN CHÉP VIDEO GỐC:" : "KẾT QUẢ SO SÁNH:"}</span>
                  {!isFreeVideoDictation && <span className={(score || 0) >= 80 ? "text-emerald-400 text-sm font-extrabold" : (score || 0) >= 50 ? "text-amber-400 text-sm font-extrabold" : "text-rose-400 text-sm font-extrabold"}>{score}% Match</span>}
                </div>
                {!isFreeVideoDictation && <div className="p-3 bg-slate-900 rounded-lg text-sm font-noto font-bold text-white leading-relaxed">{currentSub.text}</div>}
                {/* Show user's answer for comparison */}
                <div className="p-3 bg-slate-900/50 rounded-lg text-sm font-noto text-slate-300 leading-relaxed border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">CÂU TRẢ LỜI CỦA BẠN:</span>
                  {dictationInput}
                </div>
              </div>
            )}

          </div>
        </main>

        {/* RIGHT COLUMN: SUBTITLE TIMELINE LIST (BẢN CHÉP BÀI HỌC) (Col 10-12) */}
        <aside className="order-3 min-w-0 lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 max-h-[420px] lg:max-h-[820px] overflow-y-auto shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">BẢN CHÉP BÀI HỌC</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              {completedSubIds.length}/{currentLesson.segments.length}
            </span>
          </div>

          {isFreeVideoDictation ? <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm leading-6 text-slate-300">
            <p className="font-bold text-sky-300">Đang dùng video YouTube gốc</p>
            <p className="mt-2">Phát video, chép trực tiếp vào ô bên cạnh rồi lưu bản chép. Video không bị thay bằng giọng đọc TTS.</p>
            {currentLesson.sourceUrl && <a className="mt-3 inline-block text-sky-300 underline" href={currentLesson.sourceUrl} target="_blank" rel="noreferrer">Mở video trên YouTube ↗</a>}
          </div> : <div className="space-y-2.5">
            {currentLesson.segments.map((sub: any, subIdx: number) => {
              const isSelected = subIdx === currentSubIndex;
              const isDone = completedSubIds.includes(sub.id);
              const words = cleanText(sub.text).split(/\s+/).filter(Boolean);
              const masked = words.map(w => "·".repeat(Math.max(w.length, 2))).join(" ");

              let cardStyle = "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800";
              if (isDone) {
                cardStyle = isSelected
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-900/30"
                  : "bg-emerald-500/10 border-emerald-500/40 text-emerald-400/90";
              } else if (isSelected) {
                cardStyle = "bg-purple-600/20 border-purple-500 text-slate-200 shadow-md shadow-purple-900/30";
              }

              return (
                <button
                  key={`sub-${sub.id}`}
                  onClick={() => handleSelectSub(subIdx)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all space-y-1.5 ${cardStyle}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-mono font-bold ${isDone ? "text-emerald-400" : isSelected ? "text-purple-400" : "text-sky-400"}`}>
                      {currentLesson.sourceType === "original" ? `CÂU #${subIdx + 1}` : `#${subIdx + 1} (${Math.floor(sub.start / 60)}:${Math.floor(sub.start % 60).toString().padStart(2, '0')})`}
                    </span>
                    <span>{isDone ? "✅" : isSelected && isPlayingFull ? "🔊 ĐANG NGHE" : "⚠️"}</span>
                  </div>
                  <p className="text-xs font-noto font-bold line-clamp-2 leading-relaxed">
                    {isDone ? sub.text : masked}
                  </p>
                </button>
              );
            })}
          </div>}
        </aside>

      </div>
    </div>
  );
};

