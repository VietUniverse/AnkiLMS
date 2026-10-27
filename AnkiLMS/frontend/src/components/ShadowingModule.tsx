"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Headphones, Volume2, CheckCircle2, Play, RefreshCw, HelpCircle, Sparkles, Filter, ChevronLeft, ChevronRight, Eye, Mic, MicOff, RotateCcw, Keyboard, ArrowLeft, Star, PlayCircle, Lock, AlertTriangle, Repeat, Award } from "lucide-react";
import { ApiClient } from "../lib/apiClient";
import { calculateKoreanSimilarity, normalizeKoreanText } from "../lib/koreanText";
import { loadLessonProgress, saveLessonProgress } from "../lib/lessonProgress";
import { loadYouTubeIframeApi } from "../lib/youtubeIframe";
import { KOREAN_LESSON_TOPICS, matchesLessonTopic } from "../lib/lessonTopics";

// Import TOPIK lessons dataset
import topikLessonsData from "../data/topik_lessons.json";
import scriptFolderData from "../data/script_folder_lessons.json";
import { SCRIPT_LESSON_GROUPS, getScriptLessonGroupId } from "../data/scriptLessonGroups";
import { TranslationLanguageSetup } from "./TranslationLanguageSetup";
import { useTranslationLanguage } from "../lib/translationPreference";

const DEFAULT_VIDEO_ID = "TLgAJgYqIZk";
const containsKoreanSpeechText = (lesson: any): boolean => {
  const segments = Array.isArray(lesson?.segments) ? lesson.segments : [];
  if (segments.length === 0) return false;
  const koreanLines = segments.filter((segment: any) => /[\uac00-\ud7af]/.test(String(segment?.text || ""))).length;
  return koreanLines / segments.length >= 0.8;
};

// Shadowing needs a real embedded video and Korean speech to imitate.
const ALL_LESSONS: any[] = [...scriptFolderData].filter(
  (lesson: any) => /^[A-Za-z0-9_-]{11}$/.test(String(lesson.videoId || "")) && containsKoreanSpeechText(lesson),
).map((lesson: any) => ({
  ...lesson,
  // TTMIK captions sometimes overlap. Stop a phrase at the next cue's start so
  // replaying one line does not continue into the following line.
  segments: lesson.segments.map((segment: any, index: number) => {
    const nextStart = lesson.segments[index + 1]?.start;
    return nextStart !== undefined && segment.end > nextStart
      ? { ...segment, end: Math.max(segment.start + 0.6, nextStart) }
      : segment;
  }),
  sourceDurationSec: lesson.videoId === "5n7HFxyE4ZI" ? 1027 : undefined,
}));

// Validate YouTube video ID format
const isValidVideoId = (id: string): boolean => /^[A-Za-z0-9_-]{11}$/.test(id);

// Course Section Catalog Data
const RAW_COURSE_SECTIONS: any[] = [{
  id: "sec_talk-to-me-in-korean",
  title: "Hội thoại tiếng Hàn có phụ đề · Talk To Me In Korean",
  videoId: "TLgAJgYqIZk",
  lessons: topikLessonsData.filter((lesson: any) => lesson.videoId === "TLgAJgYqIZk"),
}, {
  id: "sec_ttmik-restaurant",
  title: "Gọi món & ăn uống · Talk To Me In Korean",
  videoId: "5n7HFxyE4ZI",
  lessons: topikLessonsData.filter((lesson: any) => lesson.videoId === "5n7HFxyE4ZI"),
}, ...SCRIPT_LESSON_GROUPS.map((group) => ({
  id: `sec-script-${group.id}`,
  title: group.title,
  description: group.description,
  icon: group.icon,
  catalogGroupId: group.id,
  lessons: scriptFolderData,
}))];

export const ShadowingModule: React.FC = () => {
  const [viewMode, setViewMode] = useState<"catalog" | "workspace">("catalog");
  const [selectedUserLevel, setSelectedUserLevel] = useState<"all" | "beginner" | "experienced">("all");
  const [selectedHashtag, setSelectedHashtag] = useState<string>("#all");
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);

  const [selectedTopik, setSelectedTopik] = useState<string>("all");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("lesson_1");
  const [currentSubIndex, setCurrentSubIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [translationLanguage, setTranslationLanguage] = useTranslationLanguage();

  // Voice Recognition States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [spokenText, setSpokenText] = useState<string | null>(null);
  const [speakingScore, setSpeakingScore] = useState<number | null>(null);
  const [completedSubIds, setCompletedSubIds] = useState<number[]>([]);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [managedLessons, setManagedLessons] = useState<any[]>([]);
  const [hiddenLessonIds, setHiddenLessonIds] = useState<string[]>([]);
  const allLessons = useMemo(() => [...ALL_LESSONS, ...managedLessons.filter((lesson: any) => lesson.collectionId === "script-folder")].filter(
    (lesson: any) => !hiddenLessonIds.includes(lesson.id)
      && /^[A-Za-z0-9_-]{11}$/.test(String(lesson.videoId || ""))
      && containsKoreanSpeechText(lesson),
  ), [managedLessons, hiddenLessonIds]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/lessons").then((response) => response.ok ? response.json() : null).then((data) => {
      if (cancelled || !data) return;
      setHiddenLessonIds(Array.isArray(data.hiddenLessonIds) ? data.hiddenLessonIds : []);
      if (!Array.isArray(data.lessons)) return;
      const rows = data.lessons.filter((row: any) => row.lessonType === "both" || row.lessonType === "shadowing");
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
  const recognitionRef = useRef<any>(null);

  // Filter lessons by level & TOPIK
  const filteredLessons = useMemo(() => {
    let lessons: any[] = allLessons;

    if (selectedUserLevel === "beginner") {
      lessons = lessons.filter((l: any) => l.topikLevel <= 2);
    } else if (selectedUserLevel === "experienced") {
      lessons = lessons.filter((l: any) => l.topikLevel >= 3);
    }

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
    return RAW_COURSE_SECTIONS.map((section) => ({
      ...section,
      lessons: filteredLessons.filter((lesson: any) => section.catalogGroupId
        ? getScriptLessonGroupId(lesson) === section.catalogGroupId
        : section.collectionId ? lesson.collectionId === section.collectionId : lesson.videoId === section.videoId),
      totalLessons: filteredLessons.filter((lesson: any) => section.catalogGroupId
        ? getScriptLessonGroupId(lesson) === section.catalogGroupId
        : section.collectionId ? lesson.collectionId === section.collectionId : lesson.videoId === section.videoId).length,
    })).filter((section) => section.lessons.length > 0);
  }, [filteredLessons]);

  // Safe access to current lesson and segment by selectedLessonId
  const currentLesson = useMemo(() => {
    return allLessons.find((l: any) => l.id === selectedLessonId) || allLessons[0];
  }, [selectedLessonId, allLessons]);

  const currentSub = currentLesson?.segments?.[currentSubIndex] || currentLesson?.segments?.[0] || null;
  const currentTranslation = translationLanguage === "vi" ? currentSub?.translation : translationLanguage === "en" ? currentSub?.translationEn : undefined;
  const [generatedTranslation, setGeneratedTranslation] = useState("");
  useEffect(() => {
    let cancelled = false;
    setGeneratedTranslation("");
    if (!currentSub?.text || currentTranslation?.trim()) return;
    const cacheKey = `haechivn-translation:${translationLanguage}:${currentSub.text}`;
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) { setGeneratedTranslation(cached); return; }
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.search = new URLSearchParams({ client: "gtx", sl: "ko", tl: translationLanguage, dt: "t", q: currentSub.text }).toString();
    void fetch(url).then((response) => response.json()).then((payload) => {
      const chunks = Array.isArray(payload) && Array.isArray(payload[0]) ? payload[0] : [];
      const translation = chunks.map((chunk) => Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : "").join("").trim();
      if (!cancelled && translation) { setGeneratedTranslation(translation); window.localStorage.setItem(cacheKey, translation); }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [currentSub?.id, currentSub?.text, currentTranslation, translationLanguage]);

  // YouTube API Init
  useEffect(() => {
    if (viewMode !== "workspace" || !currentLesson) return;

    if (currentLesson.sourceType === "original") {
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

  // Continuous YouTube Player Monitor: auto-pause at script/segment end
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
      playerRef.current = new (window as any).YT.Player("yt-shadowing-player", {
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

  // Play a specific segment and automatically pause at sub.end
  const playSegment = useCallback((sub: any) => {
    if (!sub) return;

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
        playTTSFallback(sub.text);
      }
    } else {
      playTTSFallback(sub.text);
    }
  }, [playbackSpeed]);

  const playTTSFallback = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = playbackSpeed;
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find(v => v.lang.startsWith("ko"));
      if (koVoice) utterance.voice = koVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const playFullLesson = () => {
    if (!currentLesson) return;
    if (currentLesson.sourceType === "original") {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      currentLesson.segments.forEach((segment: any, index: number) => {
        const utterance = new SpeechSynthesisUtterance(segment.text);
        utterance.lang = "ko-KR"; utterance.rate = playbackSpeed;
        utterance.onstart = () => setCurrentSubIndex(index);
        window.speechSynthesis.speak(utterance);
      });
      return;
    }
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

  // Character-level similarity for voice comparison
  function cleanText(str: string): string {
    return normalizeKoreanText(str);
  }

  function calculateSpeakingSimilarity(target: string, actual: string): number {
    return calculateKoreanSimilarity(target, actual);
  }

  // Web Speech Recognition Recording Handler
  const handleToggleRecord = () => {
    setSpeechError(null);

    if (isRecording) {
      setIsRecording(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_e) {}
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Trình duyệt không hỗ trợ Nhận dạng Giọng nói (Web Speech API). Vui lòng dùng Chrome hoặc Edge.");
      return;
    }

    try {
      pausePlayer(); // Pause video while recording
      const recognition = new SpeechRecognition();
      recognition.lang = "ko-KR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (!transcript) {
          setSpeechError("Chưa nhận được nội dung giọng nói. Hãy thử nói lại.");
          setIsRecording(false);
          return;
        }
        setSpokenText(transcript);

        if (currentSub) {
          const score = calculateSpeakingSimilarity(currentSub.text, transcript);
          setSpeakingScore(score);

          if (score >= 70 && !completedSubIds.includes(currentSub.id)) {
            const nextCompleted = [...completedSubIds, currentSub.id];
            setCompletedSubIds(nextCompleted);
            saveLessonProgress("shadowing", selectedLessonId, nextCompleted);
            const realDuration = Math.round((Date.now() - sessionStartTime) / 1000);
            const xpEarned = Math.min(25, Math.round(score / 8));
            ApiClient.recordStudySession("shadowing", 1, 1, xpEarned, Math.min(realDuration, 300));
          }
        }
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error === "no-speech") {
          setSpeechError("Không phát hiện giọng nói. Hãy nói to rõ hơn và thử lại.");
        } else if (event.error === "not-allowed") {
          setSpeechError("Cần cấp quyền truy cập Microphone cho trang web.");
        } else {
          setSpeechError(`Lỗi nhận dạng: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      setSpokenText(null);
      setSpeakingScore(null);
      setIsRecording(true);
      recognition.start();
    } catch (e: any) {
      setIsRecording(false);
      setSpeechError("Lỗi khởi chạy Microphone: " + (e.message || e));
    }
  };

  const handleSelectSub = (subIdx: number) => {
    pausePlayer();
    setCurrentSubIndex(subIdx);
    setSpokenText(null);
    setSpeakingScore(null);
    setSpeechError(null);
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

  const openLessonWorkspace = (lesson: any) => {
    if (!lesson) return;
    setSelectedLessonId(lesson.id);
    setCurrentSubIndex(0);
    setSpokenText(null);
    setSpeakingScore(null);
    setSpeechError(null);
    setCompletedSubIds(loadLessonProgress("shadowing", lesson.id));
    setSessionStartTime(Date.now());
    setYtError(null);
    setViewMode("workspace");
  };

  const backToCatalog = () => {
    pausePlayer();
    if (isRecording && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_e) {}
    }
    setIsRecording(false);
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
    switch (level) {
      default: return `TOPIK ${level}`;
    }
  };

  // ================= VIEW 1: CATALOG LANDING PAGE =================
  if (viewMode === "catalog") {
    return (
      <div className="space-y-8 animate-fadeIn pb-24 w-full max-w-[1800px] mx-auto text-slate-100 px-2 sm:px-4">

        {/* Banner 1: Header Explanation */}
        <div className="text-center space-y-2 py-4">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-3">
            <Repeat className="w-7 h-7 text-rose-400" />
            <span>Phương Pháp Luyện Nói Nhại (Shadowing Video)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            Chỉ hiển thị video có lời thoại tiếng Hàn. Xem video, nghe từng câu và so sánh giọng nói của bạn với bản mẫu.
          </p>
        </div>
        <div className="flex justify-end"><TranslationLanguageSetup language={translationLanguage} onChange={setTranslationLanguage} /></div>

        {/* Banner 2: Level Selection Big Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedUserLevel(prev => prev === "beginner" ? "all" : "beginner")}
            className={`p-5 rounded-2xl border text-center transition-all cursor-pointer ${
              selectedUserLevel === "beginner"
                ? "bg-rose-950/80 border-rose-500 shadow-xl shadow-rose-900/40 ring-2 ring-rose-500/50 scale-[1.02]"
                : "bg-slate-950/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 opacity-80"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">Dành cho người mới bắt đầu (TOPIK 1 - 2)</h3>
              {selectedUserLevel === "beginner" && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">Đang chọn</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Luyện phát âm ngữ điệu câu ngắn, từ vựng sinh hoạt hàng ngày</p>
          </button>

          <button
            onClick={() => setSelectedUserLevel(prev => prev === "experienced" ? "all" : "experienced")}
            className={`p-5 rounded-2xl border text-center transition-all cursor-pointer ${
              selectedUserLevel === "experienced"
                ? "bg-rose-950/80 border-rose-500 shadow-xl shadow-rose-900/40 ring-2 ring-rose-500/50 scale-[1.02]"
                : "bg-slate-950/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 opacity-80"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-sm font-bold text-rose-400">Dành cho người đã có kinh nghiệm (TOPIK 3 - 6)</h3>
              {selectedUserLevel === "experienced" && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">Đang chọn</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Luyện phản xạ nói câu dài với tốc độ giao tiếp tự nhiên của người Seoul</p>
          </button>
        </div>

        {/* Level filter status bar if active */}
        {selectedUserLevel !== "all" && (
          <div className="flex items-center justify-between bg-rose-950/40 border border-rose-500/30 p-3 rounded-2xl max-w-4xl mx-auto text-xs text-rose-300">
            <span>
              Đang lọc bài luyện nói cho: <strong>{selectedUserLevel === "beginner" ? "Người mới bắt đầu (TOPIK 1 - 2)" : "Người có kinh nghiệm (TOPIK 3 - 6)"}</strong>
            </span>
            <button
              onClick={() => setSelectedUserLevel("all")}
              className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]"
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
                    ? "bg-rose-500 text-white shadow-md shadow-rose-900/40"
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
            <div className="flex items-center justify-between border-l-4 border-rose-500 pl-3">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-black text-white">{sec.icon ? `${sec.icon} ` : ""}{sec.title}</h2>
                  <span className="text-xs text-slate-400 font-bold font-mono">({sec.totalLessons} bài học)</span>
                </div>
                {sec.description && <p className="mt-1 text-xs text-slate-400">{sec.description}</p>}
              </div>

              {sec.sourceUrl && <a href={sec.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-rose-300 hover:text-white underline underline-offset-4">Nguồn xem thêm: {sec.sourceLabel} ↗</a>}

              <button
                onClick={() => setExpandedSectionIds((ids) => isSectionExpanded ? ids.filter((id) => id !== sec.id) : [...ids, sec.id])}
                className="px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-rose-500 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1"
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
                    className="group bg-slate-900 border border-slate-800 hover:border-rose-500 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-rose-900/20 flex flex-col justify-between"
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
                          ⏱️ {Math.round(lesson.durationSec)}s luyện{lesson.sourceDurationSec ? ` / ${Math.floor(lesson.sourceDurationSec / 60)}:${String(lesson.sourceDurationSec % 60).padStart(2, "0")} video` : ""}
                        </span>
                      </div>
                    </div>

                    {/* Card Content & Title */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <h4 className="text-xs font-bold text-slate-100 group-hover:text-rose-400 transition-colors line-clamp-2 leading-relaxed font-noto">
                        {lesson.title}
                      </h4>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-slate-400">Shadowing Speaking</span>
                        <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-black font-mono">
                          {lesson.segmentCount} câu
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

  // ================= VIEW 2: 3-COLUMN SHADOWING WORKSPACE =================
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
          <span className="text-xs font-bold text-slate-400">Bài đang luyện nói:</span>
          <span className="text-xs font-black text-rose-400 font-noto">{currentLesson.title}</span>
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

      {/* Speech Error Toast */}
      {speechError && (
        <div className="p-3.5 bg-amber-500/20 border border-amber-500 rounded-2xl text-xs text-amber-300 font-bold flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Main Spacious Dashboard Layout (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT COLUMN: LESSONS MENU & TOPIK FILTER (Col 1-3) */}
        <aside className="order-2 lg:order-1 lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 max-h-[420px] lg:max-h-[820px] overflow-y-auto shadow-lg">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Repeat className="w-4 h-4 text-rose-400" aria-hidden="true" />
              <span>BÀI HỌC SHADOWING</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{filteredLessons.length} Bài luyện nói theo mẫu</p>
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
                      setCompletedSubIds(loadLessonProgress("shadowing", nextLesson.id));
                    }
                    setSpokenText(null);
                    setSpeakingScore(null);
                    setCompletedSubIds([]);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all ${
                    selectedTopik === lvl
                      ? "bg-rose-600 text-white shadow-md shadow-rose-900/40"
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
                      ? "bg-rose-600/20 border-rose-500 text-white font-bold shadow-md shadow-rose-900/30"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-rose-400 font-extrabold font-mono">BÀI #{l.lessonNum}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold text-[11px]">{l.topikName}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{l.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>⏱️ {Math.round(l.durationSec)}s đoạn luyện{l.sourceDurationSec ? ` / ${Math.floor(l.sourceDurationSec / 60)}:${String(l.sourceDurationSec % 60).padStart(2, "0")} video` : ""} • {l.segmentCount} câu</span>
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
              <span className="text-xs text-slate-400 font-mono">⏱️ Đoạn script {Math.round(currentLesson.durationSec)} giây{currentLesson.sourceDurationSec ? ` · video gốc ${Math.floor(currentLesson.sourceDurationSec / 60)}:${String(currentLesson.sourceDurationSec % 60).padStart(2, "0")}` : ""} ({currentLesson.segments.length} câu)</span>
            </div>

            {/* Video Player */}
            <div className={`relative w-full ${currentLesson.sourceType === "original" ? "min-h-40" : "pt-[56.25%]"} bg-black rounded-xl overflow-hidden border border-slate-800 shadow-md`}>
              {currentLesson.sourceType === "original" ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-950 to-slate-950 p-4 text-center"><span className="text-3xl">🎧</span><p className="text-sm font-bold text-white">Bài nghe tiếng Hàn được đọc bằng giọng Hàn trên thiết bị</p><p className="text-xs text-slate-300">{currentLesson.sourceLabel}</p><a href={currentLesson.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-rose-300 underline underline-offset-4">Mở nguồn tham khảo bên ngoài · không khớp lời luyện ↗</a></div> : <div id="yt-shadowing-player" className="absolute inset-0 h-full w-full"></div>}
            </div>

            {/* Control Buttons & Speed bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={playFullLesson}
                  className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-900/40 transition-all"
                  aria-label="Phát toàn bộ bài học"
                >
                  <Play className="w-4 h-4 fill-white" aria-hidden="true" />
                  <span>PHÁT CẢ BÀI (1-2p)</span>
                </button>

                <button
                  onClick={() => playSegment(currentSub)}
                  className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all"
                  aria-label="Phát lại câu hiện tại"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>PHÁT LẠI CÂU</span>
                </button>
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
                        ? "bg-rose-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Shadowing Speaking Practice Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">

            {/* Header & Segment Prev/Next Navigation */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
              <label className="block text-xs font-bold text-rose-400 uppercase tracking-wider">
                CÂU MẪU NÓI NHẠI (CÂU #{currentSubIndex + 1} / {currentLesson.segments.length}):
              </label>

              <div className="flex items-center gap-2">
                <button onClick={handlePrevSub} disabled={currentSubIndex === 0} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold flex items-center gap-1 disabled:opacity-40" aria-label="Câu trước">
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Câu trước
                </button>
                <button onClick={handleNextSub} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold flex items-center gap-1" aria-label="Câu tiếp">
                  Câu tiếp <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Target Korean Text Display Box */}
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-center">
              <span className="text-2xl md:text-3xl font-black text-white font-noto leading-relaxed block tracking-wide">
                {currentSub.text}
              </span>
              {(currentTranslation || generatedTranslation) && <p className="text-sm text-slate-400">{currentTranslation || generatedTranslation}</p>}
              <button
                onClick={() => playSegment(currentSub)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500/30 transition-all"
              >
                <Volume2 className="w-4 h-4" />
                <span>Nghe phát âm chuẩn người bản xứ</span>
              </button>
            </div>

            {/* Microphone Voice Recording Button */}
            <div className="flex flex-col items-center justify-center space-y-3 py-2">
              <button
                onClick={handleToggleRecord}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                  isRecording
                    ? "bg-rose-600 text-white animate-pulse ring-8 ring-rose-500/30"
                    : "bg-gradient-to-tr from-rose-600 to-amber-500 hover:scale-105 text-white ring-4 ring-rose-500/20"
                }`}
              >
                {isRecording ? <MicOff className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
              </button>

              <span className="text-xs font-bold text-slate-300">
                {isRecording ? "🔴 Đang thu âm... Hãy nói câu tiếng Hàn trên!" : "Bấm Micro để bắt đầu nói nhại"}
              </span>
            </div>

            {/* Feedback Score Panel after Recording */}
            {spokenText !== null && (
              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" /> MỨC ĐỘ KHỚP VỚI BẢN NHẬN DẠNG:
                  </span>
                  <span className={(speakingScore || 0) >= 80 ? "text-emerald-400 text-base font-black" : (speakingScore || 0) >= 50 ? "text-amber-400 text-base font-black" : "text-rose-400 text-base font-black"}>
                    {speakingScore}% khớp {(speakingScore || 0) >= 80 ? "🌟 Rất tốt!" : (speakingScore || 0) >= 50 ? "👍 Khá tốt" : "⚠️ Hãy nghe và thử lại"}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl text-xs font-noto font-bold text-slate-200 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Giọng nói nhận dạng được từ bạn:</span>
                  <p className="text-sm text-sky-300 font-noto">"{spokenText}"</p>
                </div>
              </div>
            )}

            {/* Navigation Next Button */}
            <div className="pt-2">
              <button
                onClick={handleNextSub}
                className="w-full py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-900/40 transition-all flex items-center justify-center gap-2"
              >
                <span>CHUYỂN SANG CÂU TIẾP theo &gt;</span>
              </button>
            </div>

          </div>
        </main>

        {/* RIGHT COLUMN: SUBTITLE TIMELINE LIST (BẢN PHÁT ÂM BÀI HỌC) (Col 10-12) */}
        <aside className="order-3 min-w-0 lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 max-h-[420px] lg:max-h-[820px] overflow-y-auto shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">BẢN PHÁT ÂM BÀI HỌC</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              {completedSubIds.length}/{currentLesson.segments.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {currentLesson.segments.map((sub: any, subIdx: number) => {
              const isSelected = subIdx === currentSubIndex;
              const isDone = completedSubIds.includes(sub.id);

              let cardStyle = "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800";
              if (isDone) {
                cardStyle = isSelected
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-900/30"
                  : "bg-emerald-500/10 border-emerald-500/40 text-emerald-400/90";
              } else if (isSelected) {
                cardStyle = "bg-rose-600/20 border-rose-500 text-slate-200 shadow-md shadow-rose-900/30";
              }

              return (
                <button
                  key={`sub-${sub.id}`}
                  onClick={() => handleSelectSub(subIdx)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all space-y-1.5 ${cardStyle}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-mono font-bold ${isDone ? "text-emerald-400" : isSelected ? "text-rose-400" : "text-sky-400"}`}>
                      #{subIdx + 1} ({Math.floor(sub.start / 60)}:{Math.floor(sub.start % 60).toString().padStart(2, '0')})
                    </span>
                    <span>{isDone ? "✅" : "🎙️"}</span>
                  </div>
                  <p className="text-xs font-noto font-bold line-clamp-2 leading-relaxed">
                    {sub.text}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

      </div>
    </div>
  );
};

