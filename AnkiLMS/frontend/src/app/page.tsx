"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { OnigiriHeatmap } from "../components/OnigiriHeatmap";
import { StreakPanel } from "../components/StreakPanel";
import { useApp } from "../contexts/AppProvider";
import { Flame, Zap, Layers, CheckCircle2, Gamepad2, Target, X, LogIn, Search, Volume2, Play, ClipboardCheck, ArrowRight } from "lucide-react";
import { VOCABULARY_DATA } from "../data/koreanData";
import { SEJONG_TOPIC_VOCABULARY } from "../data/sejongTopicVocabulary";
import { speakKorean } from "../lib/koreanSpeech";
import { ApiClient } from "../lib/apiClient";
import { detectDictionarySearchLanguage, matchesDictionarySearchText, searchLearningDictionary } from "../lib/dictionarySearch";
import { useTranslationLanguage } from "../lib/translationPreference";
import { getStudyRank } from "../lib/studyRanks";

export default function Home() {
  const router = useRouter();
  const { currentUser, heatmapData, handleCheckin, handleOpenAuth, isAuthReady, isFeatureEnabled } = useApp();
  const [dailyMissionCount, setDailyMissionCount] = React.useState(0);
  const [showWelcome, setShowWelcome] = React.useState(false);
  const [showPlacementPrompt, setShowPlacementPrompt] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Array<{ korean: string; meaning: string; language: string; example?: string; translation?: string }>>([]);
  const [translationLanguage] = useTranslationLanguage();
  const [lastLessonTitle, setLastLessonTitle] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTitle = localStorage.getItem("haechivn_last_lesson_title");
      setLastLessonTitle(savedTitle);
    }
  }, []);

  const searchPool = React.useMemo(() => {
    const list = [
      ...VOCABULARY_DATA.map((item) => ({
        korean: item.hangul,
        meaning: item.vietnamese,
        example: item.exampleSentence,
        translation: item.exampleTranslation,
      })),
      ...SEJONG_TOPIC_VOCABULARY.map((item) => ({
        korean: item.korean,
        meaning: item.meaning,
        example: item.example,
        translation: item.translation,
      })),
    ];
    const unique = new Map<string, { korean: string; meaning: string; example?: string; translation?: string }>();
    list.forEach((item) => {
      const key = item.korean.trim().toLowerCase();
      if (!unique.has(key)) unique.set(key, item);
    });
    return Array.from(unique.values());
  }, []);

  React.useEffect(() => {
    const query = searchQuery.trim();
    if (!query) { setSearchResults([]); return; }
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const searchLanguage = detectDictionarySearchLanguage(query, translationLanguage);
      void searchLearningDictionary(query, 30, controller.signal, searchLanguage).then((entries) => {
        if (cancelled) return;
        if (entries.length) {
          setSearchResults(entries.slice(0, 5).map((entry) => {
            const selectedMeaning = searchLanguage === "vi" ? entry.vietnamese : searchLanguage === "en" ? entry.english : entry.japanese;
            const fallbackMeaning = entry.vietnamese || entry.english || entry.japanese;
            const language = selectedMeaning ? searchLanguage.toUpperCase() : entry.vietnamese ? "VI" : entry.english ? "EN" : "JA";
            return { korean: entry.hangul, meaning: selectedMeaning || fallbackMeaning || "Chưa có nghĩa trong dữ liệu", language };
          }));
          return;
        }
        setSearchResults(searchLanguage === "vi" ? searchPool.filter((item) => matchesDictionarySearchText(item.korean, query) || matchesDictionarySearchText(item.meaning, query)).slice(0, 5).map((item) => ({ ...item, language: "VI" })) : []);
      }).catch(() => {
        if (!cancelled) {
          setSearchResults(searchLanguage === "vi" ? searchPool.filter((item) => matchesDictionarySearchText(item.korean, query) || matchesDictionarySearchText(item.meaning, query)).slice(0, 5).map((item) => ({ ...item, language: "VI" })) : []);
        }
      });
    }, 180);
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timer); };
  }, [searchQuery, searchPool, translationLanguage]);

  // Nếu chưa đăng nhập thì tự động chuyển hướng sang trang đăng nhập /login
  React.useEffect(() => {
    if (isAuthReady && !currentUser) {
      router.replace("/login");
    }
  }, [isAuthReady, currentUser, router]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const isHidden = localStorage.getItem("haechivn_hide_welcome_banner");
      if (!isHidden) setShowWelcome(true);
    }
  }, []);

  React.useEffect(() => {
    if (!currentUser?.id || !currentUser.created_at || !isFeatureEnabled("placementTest")) {
      setShowPlacementPrompt(false);
      return;
    }
    const createdAtText = currentUser.created_at.includes("T")
      ? currentUser.created_at
      : `${currentUser.created_at.replace(" ", "T")}Z`;
    const createdAt = Date.parse(createdAtText);
    const accountAge = Date.now() - createdAt;
    const dismissed = localStorage.getItem(`haechivn_placement_prompt_dismissed_${currentUser.id}`);
    const alreadyAssessed = Boolean(localStorage.getItem("haechivn_placement_result"));
    setShowPlacementPrompt(Number.isFinite(createdAt) && accountAge >= 0 && accountAge <= 7 * 24 * 60 * 60 * 1000 && !dismissed && !alreadyAssessed);
  }, [currentUser?.id, currentUser?.created_at, isFeatureEnabled]);

  const dismissPlacementPrompt = () => {
    if (currentUser?.id) localStorage.setItem(`haechivn_placement_prompt_dismissed_${currentUser.id}`, "true");
    setShowPlacementPrompt(false);
  };

  const handleDismissWelcome = (forever = false) => {
    setShowWelcome(false);
    if (forever && typeof window !== "undefined") {
      localStorage.setItem("haechivn_hide_welcome_banner", "true");
    }
  };

  React.useEffect(() => {
    setDailyMissionCount(0);
    const refreshMissions = () => {
      if (currentUser) void ApiClient.getDailyMissions().then((summary) => setDailyMissionCount(summary?.completedCount || 0));
      else setDailyMissionCount(0);
    };
    refreshMissions();
    window.addEventListener("haechivn:daily-mission-updated", refreshMissions);
    window.addEventListener("focus", refreshMissions);
    return () => {
      window.removeEventListener("haechivn:daily-mission-updated", refreshMissions);
      window.removeEventListener("focus", refreshMissions);
    };
  }, [currentUser?.id]);

  const todayStr = new Date().toISOString().split("T")[0];
  const hasCheckedInToday = currentUser?.last_checkin_date === todayStr;
  const userXP = currentUser?.xp ?? 150;
  const userLevel = currentUser ? Math.floor(userXP / 300) + 1 : 1;
  const xpForCurrentLevel = (userLevel - 1) * 300;
  const xpForNextLevel = userLevel * 300;
  const currentLevelProgressXP = Math.max(0, userXP - xpForCurrentLevel);
  const neededXPForNext = Math.max(0, xpForNextLevel - userXP);
  const levelProgressPercent = userLevel > 0 ? Math.min(100, Math.max(0, Math.round((currentLevelProgressXP / 300) * 100))) : 50;

  // Nếu chưa đăng nhập: hiển thị duy nhất 1 khối yêu cầu đăng nhập
  if (isAuthReady && !currentUser) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[65vh] text-center space-y-5 animate-fadeIn p-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-lg">
            <LogIn className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl md:text-2xl font-black text-white">Yêu Cầu Đăng Nhập</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vui lòng đăng nhập tài khoản để lưu trữ chuỗi Streak, tích lũy XP, làm nhiệm vụ và mở khóa lộ trình học tiếng Hàn.
            </p>
          </div>
          <Link
            href="/login"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>ĐĂNG NHẬP NGAY</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8 animate-fadeIn">
        {/* Welcome Popup / Banner - Khối nguyên khối màu không viền, tự động xuống dòng theo kích thước block nếu dài */}
        {showWelcome && (
          <div className="relative rounded-3xl p-8 sm:p-12 text-center space-y-4 bg-[#e8eef7] dark:bg-[#111c38] shadow-sm overflow-hidden animate-fadeIn">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.3] text-slate-900 dark:text-white">
              Chào mừng đến với <span className="text-blue-600 dark:text-blue-400">HaechiVN</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl font-medium text-slate-700 dark:text-slate-200 leading-relaxed max-w-4xl mx-auto break-words">
              Học từ vựng lặp lại ngắt quãng Anki, luyện nghe chính tả, Shadowing chuẩn giọng Seoul và thử sức với ngân hàng đề thi TOPIK.
            </p>
            <div className="pt-2 flex items-center justify-center">
              <button
                onClick={() => handleDismissWelcome(true)}
                className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline underline-offset-4 cursor-pointer transition-colors font-medium"
              >
                Không hiển thị lại
              </button>
            </div>

            <button
              onClick={() => handleDismissWelcome(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Đóng tạm thời"
              aria-label="Đóng thông báo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {showPlacementPrompt && (
          <section className="relative overflow-hidden rounded-3xl border border-sky-300/25 bg-gradient-to-r from-sky-950 via-indigo-950 to-violet-950 p-5 text-white shadow-lg sm:p-7" aria-labelledby="placement-prompt-title">
            <button type="button" onClick={dismissPlacementPrompt} aria-label="Để sau" title="Để sau" className="absolute right-3 top-3 rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col gap-5 pr-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-200"><ClipboardCheck className="h-6 w-6" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">Bắt đầu đúng trình độ</p>
                  <h2 id="placement-prompt-title" className="mt-1 text-lg font-black sm:text-xl">Làm bài kiểm tra đầu vào tiếng Hàn</h2>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-200 sm:text-sm">Trả lời một bài đánh giá ngắn để xem mức TOPIK phù hợp và nhận gợi ý bộ thẻ, lộ trình học theo mục tiêu của bạn.</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 sm:pr-2">
                <Link href="/placement-test" className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-xs font-black text-white transition hover:bg-sky-400">Kiểm tra trình độ <ArrowRight className="h-4 w-4" /></Link>
                <button type="button" onClick={dismissPlacementPrompt} className="rounded-xl border border-white/15 px-4 py-3 text-xs font-bold text-slate-200 transition hover:bg-white/10">Để sau</button>
              </div>
            </div>
          </section>
        )}

        {/* Bảng điều khiển kiểu Duolingo: streak là nhân vật chính, rồi nút học tiếp, điểm danh, cấp độ, lối tắt */}
        {currentUser && (
          <section className="space-y-4" aria-label="Tiến độ hôm nay">
            <div className="flex items-end justify-between gap-3 px-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-white">Chào {currentUser.name || "bạn"}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-700 dark:text-violet-300">
                💎 {(currentUser.gems || 0).toLocaleString("vi-VN")}
              </span>
            </div>

            <StreakPanel data={heatmapData} streak={currentUser.streak || 0} longestStreak={currentUser.longest_streak || 0} />

            {/* Hành động chính */}
            <div className="grid gap-3 sm:grid-cols-2">
              {isFeatureEnabled("flashcards") && (
                <Link
                  href="/flashcards?resume=true&from=%2F"
                  title={lastLessonTitle ? `Học tiếp: ${lastLessonTitle}` : "Tiếp tục học từ vựng"}
                  style={{ color: "#fff" }}
                  className="flex min-h-16 items-center gap-3 rounded-2xl bg-sky-500 px-5 py-3 shadow-sm transition hover:bg-sky-600 active:scale-[0.99]"
                >
                  <Play className="h-6 w-6 shrink-0 fill-current" />
                  <span className="min-w-0">
                    <span className="block text-base font-black">Học tiếp</span>
                    {lastLessonTitle && <span className="block truncate text-xs opacity-90">{lastLessonTitle.split(":")[0]}</span>}
                  </span>
                </Link>
              )}
              {hasCheckedInToday ? (
                <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                  <span className="text-sm font-black">Đã điểm danh hôm nay</span>
                </div>
              ) : (
                <button
                  onClick={handleCheckin}
                  style={{ color: "#fff" }}
                  className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl bg-amber-500 px-5 py-3 text-left shadow-sm transition hover:bg-amber-600 active:scale-[0.99]"
                >
                  <Flame className="h-6 w-6 shrink-0 fill-current" />
                  <span>
                    <span className="block text-base font-black">Điểm danh</span>
                    <span className="block text-xs opacity-90">Nhận 1 💎 hôm nay</span>
                  </span>
                </button>
              )}
            </div>

            {/* Cấp độ và XP */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/70">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-base font-black text-amber-700 dark:text-amber-300">{userLevel || 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-stone-900 dark:text-white">{getStudyRank(userLevel)}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Còn {neededXPForNext} XP lên Lv.{(userLevel || 1) + 1}</p>
                  </div>
                </div>
                <p className="flex shrink-0 items-center gap-1 text-sm font-black tabular-nums text-stone-900 dark:text-white"><Zap className="h-4 w-4 fill-amber-400 text-amber-500" />{(currentUser.xp || 0).toLocaleString("vi-VN")}</p>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={levelProgressPercent}>
                <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${Math.max(4, levelProgressPercent || 0)}%` }} />
              </div>
            </div>

            {/* Lối tắt */}
            <div className="grid grid-cols-3 gap-3">
              {isFeatureEnabled("flashcards") && (
                <Link href="/flashcards" className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-2 py-4 text-center transition hover:border-sky-400 dark:border-stone-800 dark:bg-stone-900/70">
                  <Layers className="h-6 w-6 text-sky-500" />
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">Từ vựng</span>
                </Link>
              )}
              {isFeatureEnabled("missions") && (
                <Link href="/missions" className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-2 py-4 text-center transition hover:border-sky-400 dark:border-stone-800 dark:bg-stone-900/70">
                  <Target className="h-6 w-6 text-rose-500" />
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">Nhiệm vụ <span className="tabular-nums text-stone-500 dark:text-stone-400">{dailyMissionCount}/3</span></span>
                </Link>
              )}
              {isFeatureEnabled("games") && (
                <Link href="/games" className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-2 py-4 text-center transition hover:border-sky-400 dark:border-stone-800 dark:bg-stone-900/70">
                  <Gamepad2 className="h-6 w-6 text-amber-500" />
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">Chơi game</span>
                </Link>
              )}
            </div>

            {/* Heatmap cả năm chỉ cho màn từ tablet trở lên */}
            <div className="hidden md:block">
              <OnigiriHeatmap data={heatmapData} streak={currentUser.streak || 0} />
            </div>
          </section>
        )}

        {/* Khối Tra Từ Vựng - Căn giữa, ngay trên khối tiến độ */}
        <div className="rounded-3xl bg-[#090f1e] text-white p-5 sm:p-6 shadow-2xl border-0 space-y-3.5 animate-fadeIn text-center">
          <div className="space-y-1 text-center">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center justify-center gap-2">
              <Search className="w-5 h-5 text-blue-400" />
              <span>Tra Từ Vựng</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
              Tra từ và xem nghĩa {translationLanguage === "vi" ? "tiếng Việt" : translationLanguage === "en" ? "tiếng Anh" : "tiếng Nhật"}, phát âm chuẩn giọng Seoul
            </p>
          </div>

          <div className="max-w-xl mx-auto relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập từ tiếng Hàn hoặc nghĩa tiếng Việt (VD: 행복, yêu, học)..."
              className="w-full px-5 py-3 pr-12 rounded-2xl bg-[#0b1329] text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border-0 shadow-inner"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer border-0"
                title="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Search className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>

          {/* Kết quả tra cứu nhanh (Chỉ hiển thị tiếng Hàn và nghĩa tiếng Việt, TUYỆT ĐỐI KHÔNG hiển thị phiên âm La-tinh) */}
          {searchQuery.trim() && (
            <div className="max-w-xl mx-auto space-y-2 pt-1 animate-fadeIn">
              {searchResults.length > 0 ? (
                searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#0b1329] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-left border-0 shadow-md"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-black text-white">{item.korean}</span>
                        <button
                          onClick={() => speakKorean(item.korean)}
                          className="p-1.5 rounded-lg bg-[#132247] hover:bg-[#1a2f60] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer border-0"
                          title="Phát âm tiếng Hàn"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-blue-300"><span className="mr-1 text-[10px]">{item.language} ·</span>{item.meaning}</p>
                      {item.example && (
                        <p className="text-[11px] text-slate-400 font-normal">
                          {item.example} {item.translation ? `— ${item.translation}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-2">
                  Không tìm thấy từ vựng nào khớp với &quot;{searchQuery}&quot;
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
