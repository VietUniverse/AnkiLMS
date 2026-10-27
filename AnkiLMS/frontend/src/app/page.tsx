"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { OnigiriHeatmap } from "../components/OnigiriHeatmap";
import { useApp } from "../contexts/AppProvider";
import { Flame, Zap, Layers, Trophy, Calendar, CheckCircle2, Gamepad2, Target, X, LogIn, Search, Volume2 } from "lucide-react";
import { VOCABULARY_DATA } from "../data/koreanData";
import { SEJONG_TOPIC_VOCABULARY } from "../data/sejongTopicVocabulary";
import { speakKorean } from "../lib/koreanSpeech";
import { ApiClient } from "../lib/apiClient";

export default function Home() {
  const router = useRouter();
  const { currentUser, heatmapData, handleCheckin, handleOpenAuth, isAuthReady, isFeatureEnabled } = useApp();
  const [dailyMissionCount, setDailyMissionCount] = React.useState(0);
  const [showWelcome, setShowWelcome] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

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

  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchPool
      .filter((item) => item.korean.toLowerCase().includes(q) || item.meaning.toLowerCase().includes(q))
      .slice(0, 5);
  }, [searchQuery, searchPool]);

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
  const [showDemo, setShowDemo] = React.useState(true); // Demo dữ liệu mô phỏng theo Onigiri

  // Dữ liệu mẫu demo mô phỏng 180 ngày ôn tập liên tục
  const demoHeatmapData = React.useMemo(() => {
    const list: Array<{ checkin_date: string; time_spent_minutes: number; xp_earned: number; cards_reviewed: number }> = [];
    const now = new Date();
    for (let i = 180; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayOfWeek = d.getDay();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${dayStr}`;

      const hash = dateStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const rand = (hash % 100) / 100;
      const studyChance = dayOfWeek === 0 || dayOfWeek === 6 ? 0.5 : 0.82;

      if (rand < studyChance) {
        let minutes = 15;
        let xp = 30;
        let cards = 35;
        if (rand < 0.25) {
          minutes = 10 + (hash % 10);
          xp = 25;
          cards = Math.round(minutes * 2.2);
        } else if (rand < 0.6) {
          minutes = 25 + (hash % 20);
          xp = 60;
          cards = Math.round(minutes * 2.5);
        } else {
          minutes = 45 + (hash % 45);
          xp = 120;
          cards = Math.round(minutes * 2.8);
        }
        list.push({ checkin_date: dateStr, time_spent_minutes: minutes, xp_earned: xp, cards_reviewed: cards });
      }
    }
    return list;
  }, []);

  const activeHeatmapSource = showDemo ? demoHeatmapData : heatmapData;

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
        {/* Welcome Popup / Banner - Khối nguyên khối màu không viền, tự động xuống dòng theo kích thước block nếu dài */}
        {showWelcome && (
          <div className="relative rounded-3xl p-8 sm:p-12 text-center space-y-4 bg-[#e8eef7] dark:bg-[#111c38] shadow-sm overflow-hidden animate-fadeIn">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
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

        {/* Khối Tra Từ Vựng - Căn giữa, ngay trên khối tiến độ */}
        <div className="rounded-3xl bg-[#090f1e] text-white p-5 sm:p-6 shadow-2xl border-0 space-y-3.5 animate-fadeIn text-center">
          <div className="space-y-1 text-center">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center justify-center gap-2">
              <Search className="w-5 h-5 text-blue-400" />
              <span>Tra Từ Vựng</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
              Tra cứu nhanh nghĩa tiếng Việt, câu ví dụ và phát âm chuẩn giọng Seoul
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
                      <p className="text-xs sm:text-sm font-semibold text-blue-300">{item.meaning}</p>
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

        {/* Master Dashboard Block - Căn giữa toàn bộ layout, tinh gọn bớt dòng, phong cách Dark Solid Block */}
        <div className="rounded-3xl bg-[#090f1e] text-white p-5 sm:p-6 space-y-4 shadow-2xl border-0 overflow-hidden animate-fadeIn text-center">
          {/* Header căn giữa gọn 1 dòng */}
          <div className="text-center">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
              {currentUser ? `Chào ${currentUser.name || "bạn"}, tiếp tục chuỗi học và điểm danh nhận 💎 hôm nay!` : "Bảng Tiến Độ & Nhiệm Vụ Hôm Nay"}
            </h2>
          </div>

          {/* 3 Metric Cards: Chuỗi Streak, Cấp độ, Tổng Tích Lũy - Căn giữa, cô đọng bớt dòng */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Card 1: Chuỗi Streak */}
            <div className="py-4 px-5 rounded-2xl bg-[#0b1329] flex flex-col items-center justify-center text-center space-y-1 border-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Chuỗi Streak
              </span>
              <div className="flex items-center justify-center gap-2">
                <Flame className="w-6 h-6 text-amber-400 fill-amber-400 shrink-0" />
                <span className="text-3xl font-black text-white">{currentUser?.streak || 0}</span>
                <span className="text-xs font-bold text-amber-400">ngày</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Streak cao nhất: {currentUser?.longest_streak || currentUser?.streak || 0} ngày
              </p>
            </div>

            {/* Card 2: Cấp độ (Level) */}
            <div className="py-4 px-5 rounded-2xl bg-[#0b1329] flex flex-col items-center justify-center text-center space-y-1.5 border-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Cấp độ (Level)
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                  {userLevel}
                </span>
                <span className="text-xs font-bold text-sky-300">
                  Lên Lv.{userLevel + 1} · Còn {neededXPForNext} XP
                </span>
              </div>
              <div className="w-full max-w-[200px] mx-auto space-y-1">
                <div className="w-full h-2 bg-[#132247] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${levelProgressPercent}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 font-medium flex justify-between px-1">
                  <span>{currentLevelProgressXP} / 300 XP</span>
                  <span>{levelProgressPercent}%</span>
                </div>
              </div>
            </div>

            {/* Card 3: Tổng Tích Lũy */}
            <div className="py-4 px-5 rounded-2xl bg-[#0b1329] flex flex-col items-center justify-center text-center space-y-1 border-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tổng Tích Lũy
              </span>
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-6 h-6 text-blue-400 fill-blue-400 shrink-0" />
                <span className="text-3xl font-black text-white">{(currentUser?.xp || 0).toLocaleString()}</span>
                <span className="text-xs font-bold text-blue-400">XP</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Đã quy đổi: {(currentUser?.xp || 0)} 💎 kim cương
              </p>
            </div>
          </div>

          {/* Dãy nút bấm hành động căn giữa gọn gàng - Nguyên khối không viền */}
          <div className="p-3.5 rounded-2xl bg-[#070d1a] flex flex-wrap items-center justify-center gap-2.5 border-0">
            {/* Điểm danh */}
            {hasCheckedInToday ? (
              <button
                disabled
                className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center gap-2 cursor-not-allowed border-0"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>ĐÃ ĐIỂM DANH (+50 💎)</span>
              </button>
            ) : (
              <button
                onClick={handleCheckin}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold text-xs shadow-lg shadow-blue-900/40 transition-all cursor-pointer flex items-center gap-2 border-0"
              >
                <Flame className="w-4 h-4 text-white fill-white" />
                <span>ĐIỂM DANH NGAY · NHẬN 50 💎 HÔM NAY</span>
              </button>
            )}

            {/* Từ vựng */}
            {isFeatureEnabled("flashcards") && <Link
              href="/flashcards"
              className="px-5 py-2.5 rounded-xl bg-[#132247] hover:bg-[#1a2f60] active:scale-[0.99] text-white font-bold text-xs transition-colors flex items-center gap-2 border-0"
            >
              <Layers className="w-4 h-4 text-blue-400" />
              <span>TỪ VỰNG</span>
            </Link>}

            {/* Chơi game · Ôn từ */}
            {isFeatureEnabled("games") && <Link
              href="/games"
              className="px-4 py-2.5 rounded-xl bg-[#111c38] hover:bg-[#182850] active:scale-[0.99] text-amber-300 font-bold text-xs transition-colors flex items-center gap-2 border-0"
            >
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              <span>CHƠI GAME · ÔN TỪ</span>
            </Link>}

            {/* Nhiệm vụ */}
            {isFeatureEnabled("missions") && <Link
              href="/missions"
              className="px-4 py-2.5 rounded-xl bg-[#111c38] hover:bg-[#182850] active:scale-[0.99] text-sky-300 font-bold text-xs transition-colors flex items-center gap-2 border-0"
            >
              <Target className="w-4 h-4 text-sky-400" />
              <span>NHIỆM VỤ · {dailyMissionCount}/3</span>
            </Link>}
          </div>
        </div>

        {/* Heatmap Hoạt Động Ôn Tập Chuẩn Onigiri Anki Addon */}
        <OnigiriHeatmap
          data={activeHeatmapSource}
          streak={currentUser?.streak || 0}
          showDemo={showDemo}
          onToggleDemo={() => setShowDemo((prev) => !prev)}
        />
      </div>
    </AppShell>
  );
}
