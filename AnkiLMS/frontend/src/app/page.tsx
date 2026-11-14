"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { OnigiriHeatmap } from "../components/OnigiriHeatmap";
import { StreakPanel } from "../components/StreakPanel";
import { InstallAppButton } from "../components/InstallAppButton";
import { useApp } from "../contexts/AppProvider";
import { Flame, Zap, Layers, X, LogIn, Play, ClipboardCheck, ArrowRight, GraduationCap } from "lucide-react";
import { ApiClient } from "../lib/apiClient";
import { getStudyRank } from "../lib/studyRanks";
import { loadProgress, NEW_WORDS_FOR_CHECKIN, vietnamToday } from "../lib/dailyLimits";

export default function Home() {
  const router = useRouter();
  const { currentUser, heatmapData, handleOpenAuth, isAuthReady, isFeatureEnabled } = useApp();
  const [newWordsToday, setNewWordsToday] = React.useState(0);
  const [showWelcome, setShowWelcome] = React.useState(false);
  const [showPlacementPrompt, setShowPlacementPrompt] = React.useState(false);
  const [lastLessonTitle, setLastLessonTitle] = React.useState<string | null>(null);
  const [installDismissed, setInstallDismissed] = React.useState(true);
  React.useEffect(() => {
    try { setInstallDismissed(localStorage.getItem("haechivn_install_dismissed") === "1"); } catch { setInstallDismissed(false); }
  }, []);
  const dismissInstall = () => {
    setInstallDismissed(true);
    try { localStorage.setItem("haechivn_install_dismissed", "1"); } catch { /* bỏ qua */ }
  };

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTitle = localStorage.getItem("haechivn_last_lesson_title");
      setLastLessonTitle(savedTitle);
    }
  }, []);

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
    const syncNewWords = () => setNewWordsToday(loadProgress().newDone);
    syncNewWords();
    window.addEventListener("haechivn:daily-progress-updated", syncNewWords);
    window.addEventListener("focus", syncNewWords);
    return () => {
      window.removeEventListener("haechivn:daily-progress-updated", syncNewWords);
      window.removeEventListener("focus", syncNewWords);
    };
  }, [currentUser?.id]);

  const todayStr = vietnamToday();
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
              Lười biếng muốn học ít mà vẫn nhớ lâu thì chào đón cậu tới với Haechi chúng tớ :)))
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
            <StreakPanel data={heatmapData} streak={currentUser.streak || 0} longestStreak={currentUser.longest_streak || 0} />

            {/* Hành động chính */}
            <div className={`grid gap-3 ${hasCheckedInToday ? "" : "sm:grid-cols-2"}`}>
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
              {!hasCheckedInToday && (
                <div className="flex min-h-16 flex-col justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-amber-700 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 shrink-0 fill-current" />
                    <span className="text-sm font-black">Học {NEW_WORDS_FOR_CHECKIN} từ mới để điểm danh</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-amber-500/20" role="progressbar" aria-valuemin={0} aria-valuemax={NEW_WORDS_FOR_CHECKIN} aria-valuenow={Math.min(newWordsToday, NEW_WORDS_FOR_CHECKIN)}>
                      <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${Math.min(100, (newWordsToday / NEW_WORDS_FOR_CHECKIN) * 100)}%` }} />
                    </div>
                    <span className="shrink-0 text-xs font-black tabular-nums">{Math.min(newWordsToday, NEW_WORDS_FOR_CHECKIN)}/{NEW_WORDS_FOR_CHECKIN}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Gợi ý cài ứng dụng, chỉ hiện trên điện thoại và máy tính bảng; người dùng có thể để sau */}
            {!installDismissed && (
              <div className="md:hidden space-y-1.5">
                <InstallAppButton variant="card" />
                <button type="button" onClick={dismissInstall} className="mx-auto block cursor-pointer text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200">Để sau</button>
              </div>
            )}

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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {isFeatureEnabled("flashcards") && (
                <Link href="/flashcards" className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-2 py-4 text-center transition hover:border-sky-400 dark:border-stone-800 dark:bg-stone-900/70">
                  <Layers className="h-6 w-6 text-sky-500" />
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">Từ vựng</span>
                </Link>
              )}
              {isFeatureEnabled("topik") && (
                <Link href="/topik/archive" className="flex flex-col items-center gap-1.5 rounded-2xl border border-sky-200 bg-sky-50 px-2 py-4 text-center transition hover:border-sky-500 dark:border-sky-400/20 dark:bg-sky-400/10">
                  <GraduationCap className="h-6 w-6 text-sky-600 dark:text-sky-300" />
                  <span className="text-xs font-bold text-sky-800 dark:text-sky-200">Thi thử TOPIK</span>
                </Link>
              )}
            </div>

            {/* Heatmap cả năm chỉ cho màn từ tablet trở lên */}
            <div className="hidden md:block">
              <OnigiriHeatmap data={heatmapData} streak={currentUser.streak || 0} />
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
