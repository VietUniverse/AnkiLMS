"use client";

import React from "react";
import { User as UserIcon, Menu, ArrowLeft } from "lucide-react";
import { UserProfile } from "../lib/apiClient";
import { useApp } from "../contexts/AppProvider";

interface HeaderProps {
  currentUser: UserProfile | null;
  onOpenAuth: (isRegisterMode?: boolean) => void;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onOpenAuth, onToggleMobileMenu }) => {
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
        {!currentUser && (
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
