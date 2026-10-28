"use client";

import React, { useState } from "react";
import { HANGEUL_DATA, HangeulChar } from "../data/koreanData";
import { Volume2, Sparkles, Check, ArrowRight } from "lucide-react";
import { composeHangulSyllable, HANGUL_FINALS } from "../lib/hangul";

export const HangeulModule: React.FC = () => {
  const [filter, setFilter] = useState<"all" | "consonant" | "vowel">("all");
  const [selectedChar, setSelectedChar] = useState<HangeulChar>(HANGEUL_DATA[0]);

  // Syllable Builder Interactive State
  const [selectedConsonant, setSelectedConsonant] = useState("ㄱ");
  const [selectedVowel, setSelectedVowel] = useState("ㅏ");
  const [selectedFinal, setSelectedFinal] = useState("");
  const combinedSyllable = composeHangulSyllable(selectedConsonant, selectedVowel, selectedFinal);
  const consonantCount = HANGEUL_DATA.filter((item) => item.type === "consonant").length;
  const vowelCount = HANGEUL_DATA.filter((item) => item.type === "vowel").length;

  const filteredChars = HANGEUL_DATA.filter(
    (item) => filter === "all" || item.type === filter
  );

  const playSound = (text: string) => {
    if ("speechSynthesis" in window) {
      // Cancel any ongoing/queued speech to prevent repeating
      window.speechSynthesis.cancel();
      const koreanText = text.includes(" (") ? text.slice(0, text.indexOf(" (")) : text;
      const utterance = new SpeechSynthesisUtterance(koreanText);
      utterance.lang = "ko-KR";
      utterance.rate = 0.8;
      // Select best Korean voice if available
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find(v => v.lang.startsWith("ko"));
      if (koVoice) utterance.voice = koVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      {/* Module Title Banner */}
      <div className="card-duo p-6 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Level 1: Nhập môn Tiếng Hàn
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
              BETA
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Bảng Chữ Cái Hangeul (한글 Master)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tính năng đang thử nghiệm (Beta). Học 19 phụ âm và 21 nguyên âm, luyện ghép thành âm tiết và nghe phát âm tiếng Hàn
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
          {(["all", "consonant", "vowel"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setFilter(t);
                const firstVisible = HANGEUL_DATA.find((item) => t === "all" || item.type === t);
                if (firstVisible) setSelectedChar(firstVisible);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === t
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-900/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t === "all" ? `Tất cả (${HANGEUL_DATA.length})` : t === "consonant" ? `Phụ âm (${consonantCount})` : `Nguyên âm (${vowelCount})`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Interactive Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {filteredChars.map((item) => {
              const isSelected = selectedChar.char === item.char;
              return (
                <button
                  key={item.char}
                  onClick={() => {
                    setSelectedChar(item);
                    playSound(item.char);
                  }}
                  className={`card-duo p-4 flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-950/40 scale-105 shadow-emerald-500/20"
                      : "hover:border-slate-600 bg-slate-800/80"
                  }`}
                >
                  <span className="text-3xl font-black text-white font-noto mb-1">{item.char}</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    {item.romaja}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Syllable Constructor Widget */}
          <div className="card-duo p-5 bg-slate-900 border-blue-500/30">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Công cụ ghép vần Hangeul (Syllable Builder)
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Consonant Selector */}
                <select
                  value={selectedConsonant}
                  onChange={(e) => setSelectedConsonant(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-lg font-bold text-white font-noto focus:outline-none"
                >
                  {HANGEUL_DATA.filter((i) => i.type === "consonant").map((c) => (
                    <option key={c.char} value={c.char}>
                      {c.char} ({c.romaja})
                    </option>
                  ))}
                </select>

                <span className="text-lg font-black text-slate-500">+</span>

                {/* Vowel Selector */}
                <select
                  value={selectedVowel}
                  onChange={(e) => setSelectedVowel(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-lg font-bold text-white font-noto focus:outline-none"
                >
                  {HANGEUL_DATA.filter((i) => i.type === "vowel").map((v) => (
                    <option key={v.char} value={v.char}>
                      {v.char} ({v.romaja})
                    </option>
                  ))}
                </select>

                <span className="text-lg font-black text-slate-500">+</span>

                <select
                  value={selectedFinal}
                  onChange={(e) => setSelectedFinal(e.target.value)}
                  aria-label="Chọn phụ âm cuối batchim"
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-lg font-bold text-white font-noto focus:outline-none"
                >
                  <option value="">받침 없음</option>
                  {HANGUL_FINALS.map((final) => <option key={final} value={final}>{final} (받침)</option>)}
                </select>

                <ArrowRight className="w-5 h-5 text-slate-500" />
              </div>

              {/* Combined Result Output */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-3xl font-black text-white font-noto shadow-lg">
                  {combinedSyllable}
                </div>

                <button
                  onClick={() => playSound(combinedSyllable)}
                  className="btn-duo btn-duo-primary px-4 py-3 text-xs"
                >
                  <Volume2 className="w-4 h-4 mr-1.5" /> Nghe phát âm
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Character Detailed Breakdown */}
        <div className="card-duo p-6 bg-slate-900 border-emerald-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">
                {selectedChar.type === "consonant" ? "Phụ âm" : "Nguyên âm"}
              </span>
              <button
                onClick={() => playSound(selectedChar.char)}
                className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 active:scale-95 transition-all"
              >
                <Volume2 className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center py-6 border-b border-slate-800">
              <span className="text-7xl font-black text-white font-noto tracking-wider">
                {selectedChar.char}
              </span>
              <h3 className="text-lg font-bold text-emerald-400 mt-2">{selectedChar.name}</h3>
              <p className="text-xs text-slate-400 font-mono mt-1">Phiên âm: /{selectedChar.romaja}/</p>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div>
                <span className="font-bold text-slate-400">Hướng dẫn phát âm:</span>
                <p className="text-slate-200 mt-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {selectedChar.pronunciationGuide}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-400">Từ ví dụ minh họa:</span>
                <div className="mt-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-white text-sm font-noto block">
                      {selectedChar.exampleWord}
                    </span>
                    <span className="text-slate-400 text-[11px]">{selectedChar.exampleMeaning}</span>
                  </div>
                  <button
                    onClick={() => playSound(selectedChar.exampleWord)}
                    className="p-2 text-slate-400 hover:text-emerald-400"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => playSound(selectedChar.char)}
            className="w-full btn-duo btn-duo-success py-3 text-xs"
          >
            Luyện Đọc Ký Tự Này
          </button>
        </div>
      </div>
    </div>
  );
};
