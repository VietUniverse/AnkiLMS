"use client";

import React, { useState } from "react";
import { ChevronDown, Flame, Zap, Gem, LogOut, User as UserIcon, Menu, ArrowLeft } from "lucide-react";
import { UserProfile } from "../lib/apiClient";
import { EggThemeToggle } from "./EggThemeToggle";
import { useApp } from "../contexts/AppProvider";

interface HeaderProps {
  currentUser: UserProfile | null;
  onOpenAuth: (isRegisterMode?: boolean) => void;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onOpenAuth, onLogout, onToggleMobileMenu }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { activeStudySession } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-[#0b1329]/95 backdrop-blur-md border-b-2 border-[#19284d] px-3 sm:px-5 h-14 flex items-center justify-between gap-3 select-none transition-colors">
      {/* Vùng bên trái: Nút Trở về (khi học thẻ) HOẶC Logo/Menu (khi ở trang khác) */}
      <div className="flex items-center gap-2.5 min-w-0">
        {activeStudySession ? (
          <div className="flex items-center gap-2 min-w-0 animate-reveal">
            <button
              onClick={activeStudySession.onExit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 text-xs font-bold transition-all shadow-xs cursor-pointer border border-stone-200 dark:border-stone-700 shrink-0"
              title="Trở về danh sách bài học"
            >
              <ArrowLeft className="w-4 h-4 text-stone-600 dark:text-stone-300" />
              <span>Trở về</span>
            </button>
            <span className="hidden md:inline-block text-xs font-bold text-stone-800 dark:text-stone-200 truncate max-w-[180px]">
              {activeStudySession.title}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 -ml-1 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 cursor-pointer shrink-0"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="shrink-0 text-xs font-black tracking-tight text-white sm:hidden">
              Haechi<span className="text-sky-400">VN</span>
            </span>
            <span className="hidden sm:inline-block text-xs font-bold text-slate-400 dark:text-slate-500">
              HaechiVN Tiếng Hàn &amp; Anki LMS
            </span>
          </div>
        )}
      </div>

      {/* Vùng Giữa (Khi học thẻ): Chuyển đổi Lật thẻ / Gõ từ & Tiến độ */}
      {activeStudySession && activeStudySession.setStudyMode && (
        <div className="flex items-center gap-2 animate-reveal">
          <div className="flex items-center bg-stone-100 dark:bg-stone-800/90 p-0.5 rounded-xl text-xs font-medium select-none border border-stone-200/80 dark:border-stone-700/80">
            <button
              type="button"
              onClick={() => activeStudySession.setStudyMode?.("flip")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeStudySession.studyMode === "flip"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              Lật thẻ
            </button>
            <button
              type="button"
              onClick={() => activeStudySession.setStudyMode?.("typing")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeStudySession.studyMode === "typing"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              Gõ từ
            </button>
          </div>

          {activeStudySession.progressText && (
            <span className="hidden sm:inline-block text-xs font-mono font-bold text-stone-600 dark:text-stone-300 px-2 py-1 rounded-lg bg-stone-100/80 dark:bg-stone-800/80 border border-stone-200/60 dark:border-stone-700/60">
              {activeStudySession.progressText}
            </span>
          )}
        </div>
      )}

      {/* Vùng bên phải: User Stats Badges & Theme */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <EggThemeToggle />
        {currentUser ? (
          <>
            {/* Streak */}
            <div className="flex items-center gap-1 px-1.5 py-1 sm:px-2.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] sm:text-xs font-black">
              <Flame className="w-3.5 h-3.5 fill-amber-400 animate-pulse" />
              <span>{currentUser.streak || 0}</span>
            </div>

            {/* XP */}
            <div className="hidden items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-black sm:flex">
              <Zap className="w-3.5 h-3.5 fill-blue-400" />
              <span>{currentUser.xp || 0} XP</span>
            </div>

            {/* Gem / Kim Cương */}
            <div className="flex items-center gap-1 px-1.5 py-1 sm:px-2.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] sm:text-xs font-black cursor-pointer hover:bg-cyan-500/25 transition-all" title="Kim Cương 💎 (Dùng để mua vật phẩm & Streak Freeze)">
              <Gem className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
              <span className="hidden sm:inline">{(currentUser.gems || 0).toLocaleString()} 💎</span>
            </div>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-[#132247] border border-[#1e3a70] text-xs font-bold text-white hover:border-blue-500 transition-colors"
              >
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : currentUser.role === "admin" ? (
                  <img src="/brand/haechivn-mark.webp" alt="HaechiVN admin" className="w-6 h-6 rounded-full object-contain" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[10px]">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline max-w-[80px] truncate">{currentUser.name}</span>
                <ChevronDown className="w-3 h-3 text-[#8b9bb4]" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#0f1b38] border-2 border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs font-black text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => onOpenAuth(false)}
            className="btn-duo btn-duo-primary px-4 py-1.5 text-xs flex items-center gap-1.5"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Đăng Nhập</span>
          </button>
        )}
      </div>
    </header>
  );
};
