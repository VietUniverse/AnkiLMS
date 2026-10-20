"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Sparkles, Flame, Zap, Gem, LogOut, User as UserIcon, BookOpen, Volume2 } from "lucide-react";
import { UserProfile, ApiClient } from "../lib/apiClient";
import { searchDictionary, DictEntry } from "../data/koreanMiniDict";

interface HeaderProps {
  currentUser: UserProfile | null;
  onOpenAuth: (isRegisterMode?: boolean) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onOpenAuth, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DictEntry[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchDictionary(searchQuery);
      setSearchResults(results);
      setShowDropdown(true);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
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
    <header className="sticky top-0 z-30 bg-[#0b1329]/95 backdrop-blur-md border-b-2 border-[#19284d] px-4 py-2.5 flex items-center justify-between gap-3 select-none">
      {/* Search Bar Left */}
      <div className="relative flex-1 max-w-sm" ref={dropdownRef}>
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b9bb4]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tra từ điển tiếng Hàn (VD: 안녕, cơm...)"
          className="w-full bg-[#132247] border border-[#1e3a70] rounded-full pl-10 pr-4 py-1.5 text-xs text-white placeholder-[#8b9bb4] focus:outline-none focus:border-blue-500 transition-all"
        />

        {/* Dictionary Search Dropdown Result */}
        {showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-[#0f1b38] border-2 border-blue-500/40 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
            <div className="p-2 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
              <span>Từ điển Hàn - Việt inline</span>
              <span className="text-blue-400">{searchResults.length} kết quả</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 border-b border-slate-800/60 hover:bg-blue-600/10 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-amber-400 font-noto">{item.hangul}</span>
                        <span className="text-xs font-mono text-slate-400">/{item.romaja}/</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                          {item.partOfSpeech}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white mt-0.5">{item.vietnamese}</p>
                      {item.example && (
                        <p className="text-[11px] text-slate-400 italic mt-0.5 font-noto">"{item.example}"</p>
                      )}
                    </div>
                    <button
                      onClick={() => playSound(item.hangul)}
                      className="p-2 text-amber-400 hover:text-amber-300 rounded-xl bg-amber-500/10 shrink-0"
                      title="Phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">Không tìm thấy từ tương ứng</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Stats Badges */}
      <div className="flex items-center gap-2.5">
        {currentUser ? (
          <>
            {/* Streak */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black">
              <Flame className="w-3.5 h-3.5 fill-amber-400 animate-pulse" />
              <span>{currentUser.streak || 0}</span>
            </div>

            {/* XP */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-black">
              <Zap className="w-3.5 h-3.5 fill-blue-400" />
              <span>{currentUser.xp || 0} XP</span>
            </div>

            {/* Gem / Kim Cương */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black cursor-pointer hover:bg-cyan-500/25 transition-all" title="Kim Cương 💎 (Dùng để mua vật phẩm & Streak Freeze)">
              <Gem className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
              <span>{(currentUser.gems || 0).toLocaleString()} 💎</span>
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
