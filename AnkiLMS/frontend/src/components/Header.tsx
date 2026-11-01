"use client";

import React from "react";
import { User as UserIcon, Menu, ArrowLeft } from "lucide-react";
import { UserProfile } from "../lib/apiClient";
import { useApp } from "../contexts/AppProvider";
import { StudyBackgroundPanel } from "./StudyBackgroundPanel";

interface HeaderProps {
  currentUser: UserProfile | null;
  onOpenAuth: (isRegisterMode?: boolean) => void;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onOpenAuth, onToggleMobileMenu }) => {
  const { activeStudySession } = useApp();

  return (
    <header className={`sticky top-0 z-30 ${activeStudySession ? "bg-[#0b1329]" : "bg-[#0b1329]/95 backdrop-blur-md"} border-b-2 border-[#19284d] px-3 sm:px-5 h-14 flex items-center justify-between gap-3 select-none transition-colors`}>
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

      {/* Thanh tiến độ dính đáy thanh trên khi học thẻ, là một phần của thanh */}
      {activeStudySession && activeStudySession.progressPercent !== undefined && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={activeStudySession.progressPercent}>
          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${activeStudySession.progressPercent}%` }} />
        </div>
      )}

      {/* Giữa thanh khi học thẻ: số thẻ mới (xanh) và thẻ ôn (đỏ) còn lại, chỉ phân biệt bằng màu */}
      {activeStudySession && activeStudySession.remainingNew !== undefined && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4 text-xl font-black tabular-nums animate-reveal">
          <span className="text-sky-500" title="Từ mới còn lại" aria-label={`${activeStudySession.remainingNew} từ mới còn lại`}>{activeStudySession.remainingNew}</span>
          <span className="text-rose-500" title="Từ ôn còn lại" aria-label={`${activeStudySession.remainingReview} từ ôn còn lại`}>{activeStudySession.remainingReview}</span>
        </div>
      )}

      {/* Vùng bên phải: User Stats Badges & Theme */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {activeStudySession && <StudyBackgroundPanel />}
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
