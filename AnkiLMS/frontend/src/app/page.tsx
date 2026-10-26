"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { useApp } from "../contexts/AppProvider";
import { Flame, Zap, Layers, Trophy, Calendar, Sparkles, User, LogIn, CheckCircle2, Headphones, Gamepad2, Compass, BookOpen, Target, X } from "lucide-react";
import { ApiClient } from "../lib/apiClient";

export default function Home() {
  const router = useRouter();
  const { currentUser, heatmapData, handleCheckin, handleOpenAuth, isAuthReady } = useApp();
  const [dailyMissionCount, setDailyMissionCount] = React.useState(0);
  const [showWelcome, setShowWelcome] = React.useState(false);

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

  const renderHeatmapGrid = () => {
    const days = [];
    const today = new Date();
    for (let i = 90; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const match = heatmapData.find((h) => h.checkin_date === dateStr);

      let colorClass = "bg-[#16274e] border-[#1f376d]";
      if (match) {
        if (match.time_spent_minutes >= 45) colorClass = "bg-emerald-400 border-emerald-300 shadow-sm shadow-emerald-400/40";
        else if (match.time_spent_minutes >= 30) colorClass = "bg-emerald-500 border-emerald-400";
        else if (match.time_spent_minutes >= 15) colorClass = "bg-emerald-600 border-emerald-500";
        else colorClass = "bg-emerald-800 border-emerald-700";
      }

      days.push(
        <div
          key={dateStr}
          title={`${dateStr}: ${match ? `${match.time_spent_minutes} phút, +${match.xp_earned} XP` : "Chưa học"}`}
          className={`w-3.5 h-3.5 rounded-sm border ${colorClass} transition-transform hover:scale-125 cursor-pointer`}
        />
      );
    }
    return days;
  };

  const userXP = currentUser?.xp || 0;
  const userLevel = currentUser ? Math.floor(userXP / 300) + 1 : 0;
  const xpForCurrentLevel = (userLevel - 1) * 300;
  const xpForNextLevel = userLevel * 300;
  const currentLevelProgressXP = Math.max(0, userXP - xpForCurrentLevel);
  const neededXPForNext = Math.max(0, xpForNextLevel - userXP);
  const levelProgressPercent = userLevel > 0 ? Math.min(100, Math.max(0, Math.round((currentLevelProgressXP / 300) * 100))) : 0;

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
        {/* Welcome Popup / Banner - Khối nguyên khối màu không viền, ưu tiên giao diện sáng, căn giữa */}
        {showWelcome && (
          <div className="relative rounded-3xl p-8 sm:p-10 text-center space-y-3.5 bg-[#e8eef7] dark:bg-[#111c38] shadow-sm overflow-hidden animate-fadeIn">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Chào mừng đến với <span className="text-blue-600 dark:text-blue-400">HaechiVN</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed font-medium">
              Học từ vựng lặp lại ngắt quãng Anki, luyện nghe chính tả, Shadowing chuẩn giọng Seoul và thử sức với ngân hàng đề thi TOPIK.
            </p>
            <div className="pt-1 flex items-center justify-center">
              <button
                onClick={() => handleDismissWelcome(true)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline underline-offset-4 cursor-pointer transition-colors font-medium"
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

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
          <Link href="/flashcards" className="btn-duo btn-duo-primary px-6 py-3 text-xs flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>Ôn Tập Thẻ Từ Vựng ngay</span>
          </Link>
          {hasCheckedInToday ? (
            <button disabled className="px-6 py-3 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-2 cursor-not-allowed opacity-90 shadow-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ĐÃ ĐIỂM DANH HÔM NAY (+50 XP)</span>
            </button>
          ) : (
            <button onClick={handleCheckin} className="btn-duo btn-duo-orange px-6 py-3 text-xs flex items-center gap-2 cursor-pointer">
              <Flame className="w-4 h-4" />
              <span>ĐIỂM DANH NGAY (+50 XP)</span>
            </button>
          )}
        </div>

        {/* Streak & Level Progress Widget */}
        <div className="card-duo p-5 bg-[#0f1b38] border-[#1e3466] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 shadow-xl">
          {/* Left Section: Streak Info & Action Buttons */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-950 border-2 border-amber-500/60 flex items-center justify-center shadow-lg shadow-amber-950/40">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Flame className="w-7 h-7 text-amber-400 fill-amber-400 animate-pulse" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Streak hiện tại</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white">{currentUser?.streak || 0}</span>
                  <span className="text-sm font-bold text-sky-400">ngày</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>Streak cao nhất: {currentUser?.longest_streak || currentUser?.streak || 0} ngày</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {hasCheckedInToday ? (
                <button
                  disabled
                  className="px-5 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 font-extrabold text-xs flex items-center gap-2 cursor-not-allowed opacity-90 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>ĐÃ ĐIỂM DANH HÔM NAY (50 💎)</span>
                </button>
              ) : (
                <button
                  onClick={handleCheckin}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-sky-900/40 active:scale-95 transition-all cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-white fill-white" />
                  <span>ĐIỂM DANH NGAY · NHẬN 50 💎 HÔM NAY</span>
                </button>
              )}

              <Link href="/games" className="px-4 py-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 font-extrabold text-xs flex items-center gap-2 hover:bg-amber-950/60">
                <Gamepad2 className="h-4 w-4" /><span>CHƠI GAME · ÔN TỪ</span>
              </Link>
              <Link href="/missions" className="px-4 py-2.5 rounded-xl bg-amber-950/30 border border-amber-500/50 text-amber-300 font-extrabold text-xs flex items-center gap-2 hover:bg-amber-950/60 transition-colors">
                <Target className="h-4 w-4" /><span>NHIỆM VỤ · {dailyMissionCount}/3</span>
              </Link>
            </div>
          </div>

          {/* Right Section: Level & XP Progress Bar */}
          <div className="flex-1 space-y-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 border border-purple-400/40 flex items-center justify-center text-xl font-black text-white shadow-md shadow-purple-900/50">
                  {userLevel}
                </div>
                <div>
                  <span className="text-xs font-bold text-sky-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Lên level {userLevel + 1}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Còn {neededXPForNext} XP đến level tiếp
                  </span>
                </div>
              </div>

              <span className="text-sm font-black text-white font-mono">{userXP.toLocaleString()} XP</span>
            </div>

            <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-full transition-all duration-500 shadow-sm shadow-pink-500/50"
                style={{ width: `${levelProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Heatmap & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-duo p-5 bg-[#0f1b38] border-[#1e3466]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-black text-white">Tiến Độ Học Tập 90 Ngày Gần Nhất</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-bold">{heatmapData.length} ngày đã ghi nhận</span>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">{renderHeatmapGrid()}</div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 font-semibold border-t border-slate-800/80 pt-3">
              <span>Ít học</span>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#16274e]"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-800"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></div>
              </div>
              <span>Học nhiều</span>
            </div>
          </div>

          <div className="card-duo p-5 bg-[#0f1b38] border-[#1e3466] flex flex-col justify-between space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Thống Kê Cá Nhân
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#132247] border border-[#1e3a70]">
                <span className="text-xs text-slate-400 font-bold flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400" /> Chuỗi Streak
                </span>
                <span className="text-sm font-black text-amber-400">{currentUser?.streak || 0} ngày</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#132247] border border-[#1e3a70]">
                <span className="text-xs text-slate-400 font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400 fill-blue-400" /> Tổng XP
                </span>
                <span className="text-sm font-black text-blue-400">{currentUser?.xp || 0} XP</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#132247] border border-[#1e3a70]">
                <span className="text-xs text-slate-400 font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-purple-400" /> Cấp độ (Level)
                </span>
                <span className="text-sm font-black text-purple-400">Level {currentUser?.level || 1}</span>
              </div>
            </div>

            <Link href="/leaderboard" className="w-full py-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/40 text-xs font-bold hover:bg-blue-600/30 transition-colors text-center block">
              Xem Bảng Xếp Hạng
            </Link>
          </div>
        </div>

        {/* Quick review and learning routes */}
        <section className="space-y-3">
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Bắt đầu nhanh</p><h2 className="mt-1 text-lg font-black text-white">Tiếp tục học tiếng Hàn</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Link href="/lessons" className="card-duo flex items-center gap-3 p-4 hover:border-sky-500/60"><span className="rounded-xl bg-sky-500/15 p-3 text-sky-300"><BookOpen className="h-5 w-5" /></span><span><b className="block text-sm text-white">Lộ trình bài học</b><small className="text-xs text-slate-400">16 bài từ sơ cấp đến trung cấp</small></span></Link>
            <Link href="/flashcards" className="card-duo flex items-center gap-3 p-4 hover:border-sky-500/60"><span className="rounded-xl bg-blue-500/15 p-3 text-blue-300"><Layers className="h-5 w-5" /></span><span><b className="block text-sm text-white">Ôn từ vựng</b><small className="text-xs text-slate-400">Flashcard SRS và bộ Anki</small></span></Link>
            <Link href="/listen" className="card-duo flex items-center gap-3 p-4 hover:border-cyan-500/60"><span className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300"><Headphones className="h-5 w-5" /></span><span><b className="block text-sm text-white">Nghe thụ động</b><small className="text-xs text-slate-400">Nghe hội thoại theo bài</small></span></Link>
            <Link href="/topics" className="card-duo flex items-center gap-3 p-4 hover:border-emerald-500/60"><span className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300"><Compass className="h-5 w-5" /></span><span><b className="block text-sm text-white">Chủ đề học</b><small className="text-xs text-slate-400">Từ mới trong ngữ cảnh</small></span></Link>
            <Link href="/ai-speaking" className="card-duo flex items-center gap-3 p-4 hover:border-violet-500/60"><span className="rounded-xl bg-violet-500/15 p-3 text-violet-300"><Headphones className="h-5 w-5" /></span><span><b className="block text-sm text-white">Nghe và nói theo</b><small className="text-xs text-slate-400">Dùng nhận diện giọng nói</small></span></Link>
          </div>
        </section>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/hangul" className="card-duo card-duo-hover p-6 bg-[#0f1b38] border-[#1e3466] cursor-pointer space-y-3 block">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black"><BookOpen className="w-5 h-5" /></div>
            <h3 className="text-base font-black text-white">Bảng Chữ Cái Hangeul</h3>
            <p className="text-xs text-slate-400">Học toàn bộ Nguyên âm, Phụ âm và Quy tắc ghép vần tiếng Hàn</p>
          </Link>
          <Link href="/flashcards" className="card-duo card-duo-hover p-6 bg-[#0f1b38] border-[#1e3466] cursor-pointer space-y-3 block">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black"><Layers className="w-5 h-5" /></div>
            <h3 className="text-base font-black text-white">Từ Vựng SRS Anki</h3>
            <p className="text-xs text-slate-400">FSRS 4.5 tự điều chỉnh lịch ôn theo độ khó và độ ổn định ghi nhớ</p>
          </Link>
          <Link href="/topik" className="card-duo card-duo-hover p-6 bg-[#0f1b38] border-[#1e3466] cursor-pointer space-y-3 block">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black"><Trophy className="w-5 h-5" /></div>
            <h3 className="text-base font-black text-white">Đề Thi TOPIK I / II</h3>
            <p className="text-xs text-slate-400">Thi thử trực tuyến có timer đếm ngược và giải thích chi tiết</p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
