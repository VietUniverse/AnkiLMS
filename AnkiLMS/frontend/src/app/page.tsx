"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { useApp } from "../contexts/AppProvider";
import { Flame, Zap, Layers, Trophy, Calendar, CheckCircle2, Gamepad2, Target, X, LogIn } from "lucide-react";
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
          <div className="relative rounded-3xl p-8 sm:p-12 text-center space-y-4 bg-[#e8eef7] dark:bg-[#111c38] shadow-sm overflow-hidden animate-fadeIn">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Chào mừng đến với <span className="text-blue-600 dark:text-blue-400">HaechiVN</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl font-medium text-slate-700 dark:text-slate-200 leading-relaxed max-w-none xl:whitespace-nowrap mx-auto">
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

        {/* Master Dashboard Block - Gộp tất cả hành động & thống kê thành 1 khối duy nhất theo style Dark Glass nguyên khối không viền */}
        <div className="rounded-3xl bg-[#090f1e] text-white p-6 sm:p-8 space-y-6 shadow-2xl border-0 overflow-hidden animate-fadeIn">
          {/* Top Bar: Thống kê tổng quan & Link BXH */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#132247]/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#111c38] flex items-center justify-center text-blue-400 font-black shrink-0">
                <Zap className="w-5 h-5 text-blue-400 fill-blue-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {currentUser ? `Chào mừng ${currentUser.name || "bạn"}, tiếp tục hành trình nào!` : "Bảng Tiến Độ & Nhiệm Vụ Hôm Nay"}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Duy trì chuỗi học và điểm danh mỗi ngày để tích lũy XP thăng cấp
                </p>
              </div>
            </div>

            <Link
              href="/leaderboard"
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#111c38] hover:bg-[#182850] text-purple-300 text-xs font-bold transition-colors flex items-center gap-1.5 border-0 shrink-0"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Xem Bảng Xếp Hạng</span>
            </Link>
          </div>

          {/* 3 Metric Cards: Streak, Level & Tiến trình, Tổng XP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Chuỗi Streak */}
            <div className="p-5 rounded-2xl bg-[#0b1329] flex flex-col justify-between space-y-3 border-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chuỗi Streak</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-black text-white">{currentUser?.streak || 0}</span>
                  <span className="text-sm font-bold text-amber-400">ngày</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Streak cao nhất: {currentUser?.longest_streak || currentUser?.streak || 0} ngày
                </p>
              </div>
            </div>

            {/* Card 2: Cấp độ (Level) & Tiến trình XP */}
            <div className="p-5 rounded-2xl bg-[#0b1329] flex flex-col justify-between space-y-3 border-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cấp độ (Level)</span>
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                  {userLevel}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sky-300">Lên level {userLevel + 1}</span>
                  <span className="font-semibold text-slate-400">Còn {neededXPForNext} XP</span>
                </div>
                <div className="w-full h-2.5 bg-[#132247] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${levelProgressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>{currentLevelProgressXP} / 300 XP</span>
                  <span>{levelProgressPercent}%</span>
                </div>
              </div>
            </div>

            {/* Card 3: Tổng XP tích lũy */}
            <div className="p-5 rounded-2xl bg-[#0b1329] flex flex-col justify-between space-y-3 border-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Tích Lũy</span>
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-400 fill-blue-400" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-black text-white">{(currentUser?.xp || 0).toLocaleString()}</span>
                  <span className="text-sm font-bold text-blue-400">XP</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Đã quy đổi: {(currentUser?.xp || 0)} 💎 kim cương
                </p>
              </div>
            </div>
          </div>

          {/* Dãy nút bấm hành động căn giữa - Nguyên khối không viền */}
          <div className="p-4 rounded-2xl bg-[#070d1a] flex flex-wrap items-center justify-center gap-3 border-0">
            {/* Điểm danh */}
            {hasCheckedInToday ? (
              <button
                disabled
                className="px-6 py-3 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center gap-2 cursor-not-allowed border-0"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>ĐÃ ĐIỂM DANH (+50 💎)</span>
              </button>
            ) : (
              <button
                onClick={handleCheckin}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold text-xs shadow-lg shadow-blue-900/40 transition-all cursor-pointer flex items-center gap-2 border-0"
              >
                <Flame className="w-4 h-4 text-white fill-white" />
                <span>ĐIỂM DANH NGAY · NHẬN 50 💎 HÔM NAY</span>
              </button>
            )}

            {/* Ôn tập */}
            <Link
              href="/flashcards"
              className="px-6 py-3 rounded-xl bg-[#132247] hover:bg-[#1a2f60] active:scale-[0.99] text-white font-bold text-xs transition-colors flex items-center gap-2 border-0"
            >
              <Layers className="w-4 h-4 text-blue-400" />
              <span>ÔN TẬP</span>
            </Link>

            {/* Chơi game · Ôn từ */}
            <Link
              href="/games"
              className="px-5 py-3 rounded-xl bg-[#111c38] hover:bg-[#182850] active:scale-[0.99] text-amber-300 font-bold text-xs transition-colors flex items-center gap-2 border-0"
            >
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              <span>CHƠI GAME · ÔN TỪ</span>
            </Link>

            {/* Nhiệm vụ */}
            <Link
              href="/missions"
              className="px-5 py-3 rounded-xl bg-[#111c38] hover:bg-[#182850] active:scale-[0.99] text-sky-300 font-bold text-xs transition-colors flex items-center gap-2 border-0"
            >
              <Target className="w-4 h-4 text-sky-400" />
              <span>NHIỆM VỤ · {dailyMissionCount}/3</span>
            </Link>
          </div>
        </div>

        {/* Tiến Độ Học Tập 90 Ngày Gần Nhất - Đồng bộ khối nguyên khối không viền */}
        <div className="rounded-3xl p-6 sm:p-8 bg-[#090f1e] text-white shadow-2xl border-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-black text-white">Tiến Độ Học Tập 90 Ngày Gần Nhất</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-bold">{heatmapData.length} ngày đã ghi nhận</span>
          </div>

          <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start pt-1">
            {renderHeatmapGrid()}
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-semibold border-t border-[#132247] pt-3">
            <span>Ít học</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#16274e]" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-800" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            </div>
            <span>Học nhiều</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
