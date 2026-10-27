"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, ChevronDown, Sparkles, Flame, Zap, Gem, LogOut, User as UserIcon, BookOpen, Volume2, Menu } from "lucide-react";
import { UserProfile, ApiClient } from "../lib/apiClient";
import { searchLearningDictionary, DictionaryEntry, naverLookupUrl } from "../lib/dictionarySearch";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useTranslationLanguage } from "../lib/translationPreference";

interface HeaderProps {
  currentUser: UserProfile | null;
  onOpenAuth: (isRegisterMode?: boolean) => void;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onOpenAuth, onLogout, onToggleMobileMenu }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DictionaryEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [translationLanguage] = useTranslationLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setShowDropdown(false);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setShowDropdown(true);
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      void searchLearningDictionary(query, 8, controller.signal).then((results) => {
        if (!cancelled) setSearchResults(results);
      }).catch(() => {
        if (!cancelled) setSearchResults([]);
      }).finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    }, 220);
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timer); };
  }, [searchQuery]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const playSound = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0b1329]/95 backdrop-blur-md border-b-2 border-[#19284d] px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 select-none">
      {/* Mobile Menu Button + Search Bar Left */}
      <div className="order-2 flex w-full max-w-none items-center gap-1.5 sm:order-1 sm:max-w-sm sm:flex-1 sm:gap-2">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 -ml-1 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 cursor-pointer shrink-0"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative min-w-0 flex-1" ref={dropdownRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8b9bb4]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tra từ tiếng Hàn…"
            className="w-full bg-[#132247] border border-[#1e3a70] rounded-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 text-xs text-white placeholder-[#8b9bb4] placeholder:truncate focus:outline-none focus:border-blue-500 transition-all"
          />

          {/* Dictionary Search Dropdown Result */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-[#0f1b38] border-2 border-blue-500/40 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
              <div className="p-2 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                <span>Từ điển Hàn · Việt / Anh</span>
                <Link href={`/dictionary?q=${encodeURIComponent(searchQuery)}`} onClick={() => setShowDropdown(false)} className="text-blue-400 hover:underline">Xem tất cả</Link>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center text-xs text-slate-400">Đang tìm từ…</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 border-b border-slate-800/60 hover:bg-blue-600/10 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-amber-400 font-noto">{item.hangul}</span>
                          {item.partOfSpeech && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">{item.partOfSpeech}</span>}
                        </div>
                        {(translationLanguage === "vi" ? item.vietnamese : translationLanguage === "en" ? item.english : item.japanese) && <p className="text-xs font-bold text-white mt-0.5">{translationLanguage.toUpperCase()} · {translationLanguage === "vi" ? item.vietnamese : translationLanguage === "en" ? item.english : item.japanese}</p>}
                        {item.source === "yomichan" && <p className="text-xs text-slate-300 mt-0.5">Biến thể trong chỉ mục Hàn–Nhật · tra nguồn để xem nghĩa</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => playSound(item.hangul)} className="p-2 text-amber-400 hover:text-amber-300 rounded-xl bg-amber-500/10" title="Phát âm"><Volume2 className="w-4 h-4" /></button>
                        <a href={naverLookupUrl(item.hangul)} target="_blank" rel="noopener noreferrer" className="rounded-lg px-2 py-1 text-[10px] font-bold text-sky-300 hover:bg-sky-500/10">Naver ↗</a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">Không tìm thấy từ tương ứng</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Stats Badges */}
      <div className="order-1 flex w-full items-center justify-between gap-1 sm:order-2 sm:w-auto sm:justify-normal sm:gap-2.5 sm:shrink-0">
        <span className="shrink-0 text-xs font-black tracking-tight text-white sm:hidden">Haechi<span className="text-sky-400">VN</span></span>
        <ThemeSwitcher />
        {currentUser ? (
          <>
            {/* Streak */}
            <div className="flex items-center gap-1 px-1.5 py-1 sm:px-2.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] sm:text-xs font-black">
              <Flame className="w-3.5 h-3.5 fill-amber-400 animate-pulse" />
              <span>{currentUser.streak || 0}</span>
            </div>

            {/* XP - Hidden on small mobile to give search bar breathing room */}
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
