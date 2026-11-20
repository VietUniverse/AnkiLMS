"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { AppShell } from "../../../components/AppShell";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Lightbulb,
  Pencil,
  RotateCcw,
  Sparkles,
  Volume2,
  X,
  XCircle,
  AlertCircle,
  Lock,
  Unlock,
  ExternalLink,
  FileText,
  BarChart2,
  Layers,
} from "lucide-react";
import rawWongojiBank from "../../../data/topikWongojiBank.json";
import { speakKorean } from "../../../lib/koreanSpeech";

// 20 columns per row on authentic TOPIK II composition answer sheet (주관식 답란)
const COLS = 20;

export interface WongojiItem {
  id: string;
  questionNo: number;
  category: string;
  topic: string;
  source: string;
  promptText: string;
  promptHtml?: string;
  figureSvg?: string;
  dataHtml?: string;
  blankA?: {
    expected: string;
    variants: string[];
    hint1: string;
    hint2: string;
    hint3: string;
  };
  blankB?: {
    expected: string;
    variants: string[];
    hint1: string;
    hint2: string;
    hint3: string;
  };
  minChars?: number;
  maxChars?: number;
  modelEssay?: string;
  translation?: string;
  grammar?: string;
  vocab?: string;
  pitfalls?: string;
  hints?: string[];
}

const WONGOJI_BANK = rawWongojiBank as WongojiItem[];

interface GridCell {
  char: string;
  isPreFilled: boolean;
  isBlank: boolean;
  blankType?: "A" | "B" | "essay";
  blankIndex?: number;
  status?: "correct" | "wrong" | "empty";
  expectedChar?: string;
  ghostChar?: string;
  isFocused?: boolean;
}

export default function WongojiPracticePage() {
  const [selectedFilter, setSelectedFilter] = useState<number | "all">("all");
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (selectedFilter === "all") return WONGOJI_BANK;
    return WONGOJI_BANK.filter((it) => it.questionNo === selectedFilter);
  }, [selectedFilter]);

  const currentItem = filteredItems[selectedItemIndex] || WONGOJI_BANK[0];

  // User typing inputs
  const [typedA, setTypedA] = useState("");
  const [typedB, setTypedB] = useState("");
  const [typedEssay, setTypedEssay] = useState("");

  // Ghost text (chữ mờ watermark gợi ý của bài mẫu để giấy không bị trống trơn)
  const [showGhostText, setShowGhostText] = useState(true);

  // Submitted & Graded state
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 3-level Hint State: 0 (none), 1 (level 1), 2 (level 2), 3 (level 3)
  const [hintLevel, setHintLevel] = useState<number>(0);

  // Reset states on item change
  useEffect(() => {
    setTypedA("");
    setTypedB("");
    setTypedEssay("");
    setIsSubmitted(false);
    setHintLevel(0);
  }, [currentItem.id]);

  // Normalize text for Korean matching (NFC, remove trailing punctuation)
  const normalize = (s?: string) => (s || "").normalize("NFC").replace(/[.,?!~'"·]/g, "").trim().toLowerCase();

  // Find best matching variant for A and B
  const bestVariantA = useMemo(() => {
    if (!currentItem.blankA) return "";
    const variants = currentItem.blankA.variants && currentItem.blankA.variants.length > 0
      ? currentItem.blankA.variants
      : [currentItem.blankA.expected];
    const normTyped = normalize(typedA);
    const found = variants.find((v) => normalize(v) === normTyped || normalize(v).replace(/\s+/g, "") === normTyped.replace(/\s+/g, ""));
    return found || currentItem.blankA.expected;
  }, [currentItem.blankA, typedA]);

  const bestVariantB = useMemo(() => {
    if (!currentItem.blankB) return "";
    const variants = currentItem.blankB.variants && currentItem.blankB.variants.length > 0
      ? currentItem.blankB.variants
      : [currentItem.blankB.expected];
    const normTyped = normalize(typedB);
    const found = variants.find((v) => normalize(v) === normTyped || normalize(v).replace(/\s+/g, "") === normTyped.replace(/\s+/g, ""));
    return found || currentItem.blankB.expected;
  }, [currentItem.blankB, typedB]);

  // Build the Won-go-ji Grid Cells
  const { gridRows, stats } = useMemo(() => {
    const cells: GridCell[] = [];
    const isBlankType = currentItem.questionNo <= 52 && Boolean(currentItem.blankA || currentItem.blankB);

    if (isBlankType) {
      // Split prompt by ( ㄱ ) or ( ㄴ ) or [[A]] or [[B]]
      const prompt = currentItem.promptText;
      const parts = prompt.split(/(\(\s*[ㄱ㉠]\s*\)|\[\s*[ㄱ㉠]\s*\]|\[\[A\]\]|\(\s*[ㄴ㉡]\s*\)|\[\s*[ㄴ㉡]\s*\]|\[\[B\]\])/);

      const expA = bestVariantA || currentItem.blankA?.expected || " ".repeat(15);
      const expB = bestVariantB || currentItem.blankB?.expected || " ".repeat(15);

      const spanLenA = Math.max(expA.length, 12);
      const spanLenB = Math.max(expB.length, 12);

      let correctCount = 0;
      let totalBlankCells = 0;

      for (const part of parts) {
        if (/(\(\s*[ㄱ㉠]\s*\)|\[\s*[ㄱ㉠]\s*\]|\[\[A\]\])/.test(part)) {
          // Slot A cells
          const userChars = Array.from(typedA);
          const expChars = Array.from(expA);
          const count = Math.max(spanLenA, userChars.length);

          for (let i = 0; i < count; i++) {
            totalBlankCells++;
            const uChar = userChars[i] || "";
            const eChar = expChars[i] || "";
            let status: "correct" | "wrong" | "empty" | undefined = undefined;

            if (isSubmitted) {
              if (uChar && eChar && uChar === eChar) {
                status = "correct";
                correctCount++;
              } else if (!uChar && !eChar) {
                status = "correct";
                correctCount++;
              } else {
                status = "wrong";
              }
            }

            cells.push({
              char: uChar,
              isPreFilled: false,
              isBlank: true,
              blankType: "A",
              blankIndex: i,
              status,
              expectedChar: eChar,
              ghostChar: eChar,
            });
          }
        } else if (/(\(\s*[ㄴ㉡]\s*\)|\[\s*[ㄴ㉡]\s*\]|\[\[B\]\])/.test(part)) {
          // Slot B cells
          const userChars = Array.from(typedB);
          const expChars = Array.from(expB);
          const count = Math.max(spanLenB, userChars.length);

          for (let i = 0; i < count; i++) {
            totalBlankCells++;
            const uChar = userChars[i] || "";
            const eChar = expChars[i] || "";
            let status: "correct" | "wrong" | "empty" | undefined = undefined;

            if (isSubmitted) {
              if (uChar && eChar && uChar === eChar) {
                status = "correct";
                correctCount++;
              } else if (!uChar && !eChar) {
                status = "correct";
                correctCount++;
              } else {
                status = "wrong";
              }
            }

            cells.push({
              char: uChar,
              isPreFilled: false,
              isBlank: true,
              blankType: "B",
              blankIndex: i,
              status,
              expectedChar: eChar,
              ghostChar: eChar,
            });
          }
        } else {
          // Pre-filled text: lay out character by character
          const lines = part.split("\n");
          lines.forEach((line, lineIdx) => {
            const chars = Array.from(line);
            for (let c of chars) {
              cells.push({
                char: c,
                isPreFilled: true,
                isBlank: false,
              });
            }
            if (lineIdx < lines.length - 1) {
              // Wrap newline to next row
              const remainder = cells.length % COLS;
              if (remainder > 0) {
                const fillCount = COLS - remainder;
                for (let k = 0; k < fillCount; k++) {
                  cells.push({
                    char: "",
                    isPreFilled: true,
                    isBlank: false,
                  });
                }
              }
            }
          });
        }
      }

      // Pad remainder of last row to complete 20 columns
      const rem = cells.length % COLS;
      if (rem > 0) {
        const fill = COLS - rem;
        for (let k = 0; k < fill; k++) {
          cells.push({ char: "", isPreFilled: true, isBlank: false });
        }
      }

      // Chunk into rows of 20
      const rows: GridCell[][] = [];
      for (let i = 0; i < cells.length; i += COLS) {
        rows.push(cells.slice(i, i + COLS));
      }

      return {
        gridRows: rows,
        stats: {
          total: totalBlankCells,
          correct: correctCount,
          percent: totalBlankCells > 0 ? Math.round((correctCount / totalBlankCells) * 100) : 0,
        },
      };
    } else {
      // Essay mode (Câu 53 & 54)
      const model = currentItem.modelEssay || "";
      const userText = typedEssay;
      const modelChars = Array.from(model);
      const userChars = Array.from(userText);

      const targetLen = currentItem.questionNo === 53 ? 300 : Math.min(800, Math.max(modelChars.length + 40, 600));
      const totalCells = Math.max(targetLen, Math.ceil((Math.max(modelChars.length, userChars.length) + 1) / COLS) * COLS);

      let correctCount = 0;
      let totalEvaluated = Math.max(userChars.length, modelChars.length);

      for (let i = 0; i < totalCells; i++) {
        const uChar = userChars[i] || "";
        const mChar = modelChars[i] || "";
        let status: "correct" | "wrong" | "empty" | undefined = undefined;

        if (isSubmitted) {
          if (i < userChars.length) {
            if (uChar === mChar) {
              status = "correct";
              correctCount++;
            } else {
              status = "wrong";
            }
          }
        }

        cells.push({
          char: uChar,
          isPreFilled: false,
          isBlank: true,
          blankType: "essay",
          blankIndex: i,
          status,
          expectedChar: mChar,
          ghostChar: mChar,
        });
      }

      const rows: GridCell[][] = [];
      for (let i = 0; i < cells.length; i += COLS) {
        rows.push(cells.slice(i, i + COLS));
      }

      return {
        gridRows: rows,
        stats: {
          total: totalEvaluated,
          correct: correctCount,
          percent: totalEvaluated > 0 ? Math.round((correctCount / totalEvaluated) * 100) : 0,
        },
      };
    }
  }, [currentItem, typedA, typedB, typedEssay, isSubmitted, bestVariantA, bestVariantB]);

  // Action: Điền toàn bộ bài mẫu vào ô gõ (để người học thấy bài mẫu hoàn chỉnh trên giấy ô)
  const handleFillModelAnswer = () => {
    if (currentItem.blankA) setTypedA(bestVariantA || currentItem.blankA.expected);
    if (currentItem.blankB) setTypedB(bestVariantB || currentItem.blankB.expected);
    if (currentItem.modelEssay) setTypedEssay(currentItem.modelEssay);
    setIsSubmitted(false);
  };

  // Trigger hint step
  const handleCallHint = () => {
    if (hintLevel < 3) {
      const nextLevel = hintLevel + 1;
      setHintLevel(nextLevel);

      // Level 2: Fill in first characters as scaffold
      if (nextLevel === 2) {
        if (currentItem.blankA && !typedA) {
          const expA = bestVariantA || currentItem.blankA.expected;
          setTypedA(expA.slice(0, 3));
        }
        if (currentItem.blankB && !typedB) {
          const expB = bestVariantB || currentItem.blankB.expected;
          setTypedB(expB.slice(0, 3));
        }
        if (currentItem.modelEssay && !typedEssay) {
          setTypedEssay(currentItem.modelEssay.slice(0, 40));
        }
      }
      // Level 3: Fill entire model answer
      if (nextLevel === 3) {
        handleFillModelAnswer();
      }
    }
  };

  const isBlankType = currentItem.questionNo <= 52 && Boolean(currentItem.blankA || currentItem.blankB);

  return (
    <AppShell>
      <div className="min-h-screen bg-[#fcfaf7] dark:bg-[#0c101c] text-stone-900 dark:text-stone-100 py-6 sm:py-8 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Bar Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-3">
              <Link
                href="/topik"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Trở về TOPIK</span>
              </Link>
              <div className="h-4 w-px bg-stone-300 dark:bg-stone-700" />
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black tracking-tight text-stone-900 dark:text-white">
                  Luyện Viết Giấy Kẻ Ô (원고지) · TOPIK II 주관식 답란
                </h1>
              </div>
            </div>

            {/* Selector filter: Câu 51, 52, 53, 54 */}
            <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200 dark:border-stone-800">
              {[
                { id: "all", label: `Tất cả (${WONGOJI_BANK.length})` },
                { id: 51, label: `Câu 51 (Điền thông báo)` },
                { id: 52, label: `Câu 52 (Giải thích)` },
                { id: 53, label: `Câu 53 (Biểu đồ)` },
                { id: 54, label: `Câu 54 (Nghị luận)` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedFilter(f.id as any);
                    setSelectedItemIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedFilter === f.id
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question Selector & Meta Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-xs border border-rose-500/30">
                Câu {currentItem.questionNo}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs">
                {currentItem.topic}
              </span>
              <span className="text-xs font-mono text-stone-400">
                {selectedItemIndex + 1} / {filteredItems.length} đề
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedItemIndex === 0}
                onClick={() => setSelectedItemIndex((i) => Math.max(0, i - 1))}
                className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-50 cursor-pointer"
              >
                ← Đề trước
              </button>
              <button
                type="button"
                disabled={selectedItemIndex >= filteredItems.length - 1}
                onClick={() => setSelectedItemIndex((i) => Math.min(filteredItems.length - 1, i + 1))}
                className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-50 cursor-pointer"
              >
                Đề tiếp theo →
              </button>
            </div>
          </div>

          {/* MAIN LAYOUT: CONTENT & PAPER (LEFT 8 COLS) + HINTS & TOOLS (RIGHT 4 COLS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* CỘT TRÁI: ĐỀ BÀI + KHUNG GÕ + GIẤY KẺ Ô NGUYÊN BẢN (원고지) */}
            <div className="lg:col-span-8 space-y-5">
              
              {/* 1. HỘP ĐỀ BÀI CHÍNH THỨC & BIỂU ĐỒ (OFFICIAL PROMPT & CHART BOX) */}
              <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-xs uppercase tracking-wider">
                      ĐỀ BÀI CÂU {currentItem.questionNo}
                    </span>
                    <span className="text-xs font-bold text-stone-500">
                      {currentItem.questionNo === 51 && "Điền hai vế câu phù hợp với bối cảnh thông báo, thư từ"}
                      {currentItem.questionNo === 52 && "Điền hai vế câu theo logic giải thích, khoa học"}
                      {currentItem.questionNo === 53 && "Viết đoạn văn 200~300 chữ phân tích biểu đồ số liệu"}
                      {currentItem.questionNo === 54 && "Viết bài luận nghị luận xã hội 600~700 chữ"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakKorean(currentItem.promptText)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold transition cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Nghe đọc đề</span>
                  </button>
                </div>

                {/* Nội dung đề bài tiếng Hàn */}
                <div className="font-noto text-sm sm:text-base leading-relaxed text-stone-900 dark:text-stone-100 whitespace-pre-line bg-stone-50 dark:bg-stone-950/70 p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-stone-800/80 shadow-2xs">
                  {currentItem.promptText}
                </div>

                {/* Biểu đồ SVG vector sắc nét (dành cho Câu 53 thi thật) */}
                {currentItem.figureSvg && (
                  <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-4 sm:p-5 overflow-x-auto flex flex-col items-center justify-center">
                    <p className="text-[11px] font-black uppercase tracking-wider text-rose-500 mb-2 self-start flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>BIỂU ĐỒ SỐ LIỆU ĐỀ THI</span>
                    </p>
                    <div
                      className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto text-stone-900 dark:text-stone-100"
                      dangerouslySetInnerHTML={{ __html: currentItem.figureSvg }}
                    />
                  </div>
                )}

                {/* Bảng số liệu khảo sát (nếu có dataHtml) */}
                {currentItem.dataHtml && (
                  <div
                    className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40 p-4 text-xs font-noto leading-relaxed text-stone-700 dark:text-stone-300"
                    dangerouslySetInnerHTML={{ __html: currentItem.dataHtml }}
                  />
                )}
              </div>

              {/* 2. KHU VỰC GÕ BÀI LÀM (TYPING INPUT AREA) - ĐẶT NGAY TRÊN GIẤY THI */}
              <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-black text-stone-900 dark:text-white">
                      Khung gõ bài làm (tự động điền vào giấy kẻ ô):
                    </h3>
                  </div>

                  {/* Thanh công cụ tiện ích */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Nút Điền bài mẫu chuẩn NIIED */}
                    <button
                      type="button"
                      onClick={handleFillModelAnswer}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
                      title="Điền ngay toàn bộ bài mẫu chuẩn vào giấy ô để xem cách trình bày"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Điền bài mẫu lên giấy</span>
                    </button>

                    {/* Toggle Hiện/Ẩn chữ mờ gợi ý (Ghost Text) */}
                    <button
                      type="button"
                      onClick={() => setShowGhostText((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white text-xs font-bold transition cursor-pointer"
                    >
                      {showGhostText ? <Eye className="w-3.5 h-3.5 text-sky-500" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{showGhostText ? "Chữ mờ gợi ý: BẬT" : "Chữ mờ gợi ý: TẮT"}</span>
                    </button>
                  </div>
                </div>

                {isBlankType ? (
                  /* Dạng Điền 2 vị trí ㉠ và ㉡ (Câu 51 & 52) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentItem.blankA && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-black">㉠</span>
                            <span>Gõ đáp án cho ô khuyết ㉠:</span>
                          </span>
                        </label>
                        <input
                          type="text"
                          value={typedA}
                          onChange={(e) => setTypedA(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                              e.preventDefault();
                              setIsSubmitted(true);
                            }
                          }}
                          placeholder="Gõ tiếng Hàn cho ㉠..."
                          className="w-full h-11 px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-noto text-sm sm:text-base text-stone-900 dark:text-stone-100 focus:border-amber-500 focus:bg-white dark:focus:bg-stone-900 outline-none transition"
                        />
                      </div>
                    )}

                    {currentItem.blankB && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-sky-500/20 flex items-center justify-center text-[10px] font-black">㉡</span>
                            <span>Gõ đáp án cho ô khuyết ㉡:</span>
                          </span>
                        </label>
                        <input
                          type="text"
                          value={typedB}
                          onChange={(e) => setTypedB(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                              e.preventDefault();
                              setIsSubmitted(true);
                            }
                          }}
                          placeholder="Gõ tiếng Hàn cho ㉡..."
                          className="w-full h-11 px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-noto text-sm sm:text-base text-stone-900 dark:text-stone-100 focus:border-sky-500 focus:bg-white dark:focus:bg-stone-900 outline-none transition"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Dạng Viết bài luận Câu 53 & 54 */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-400">
                        Gõ bài viết tiếng Hàn tại đây (từng chữ sẽ lập tức nhảy vào giấy ô bên dưới):
                      </span>
                      <span className={`font-mono font-bold ${
                        currentItem.questionNo === 53 && (typedEssay.length < 200 || typedEssay.length > 300)
                          ? "text-amber-500"
                          : currentItem.questionNo === 54 && (typedEssay.length < 600 || typedEssay.length > 700)
                          ? "text-amber-500"
                          : "text-emerald-500"
                      }`}>
                        {typedEssay.length} / {currentItem.questionNo === 53 ? "200~300 ký tự" : "600~700 ký tự"}
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      value={typedEssay}
                      onChange={(e) => setTypedEssay(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          setIsSubmitted(true);
                        }
                      }}
                      placeholder="Gõ bài viết bằng tiếng Hàn... (Chữ sẽ tự động dàn đều vào từng ô vuông 20 ký tự/dòng của tờ giấy thi bên dưới)"
                      className="w-full p-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-noto text-sm sm:text-base leading-relaxed text-stone-900 dark:text-stone-100 focus:border-rose-500 focus:bg-white dark:focus:bg-stone-900 outline-none transition"
                    />
                  </div>
                )}

                {/* Các nút hành động chính */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSubmitted(true)}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Kiểm tra & Chấm bài (Enter)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTypedA("");
                        setTypedB("");
                        setTypedEssay("");
                        setIsSubmitted(false);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Làm lại</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-stone-400">
                    Ô đúng: <b className="text-emerald-500">Tô Xanh</b> · Ô sai: <b className="text-rose-500">Tô Đỏ</b>
                  </span>
                </div>
              </div>

              {/* 3. TỜ GIẤY THI CHÍNH THỨC NGUYÊN BẢN (원고지 - 20 Ô / DÒNG) */}
              <div className="rounded-3xl border-2 border-stone-300 dark:border-stone-700/80 bg-[#fffdfa] dark:bg-[#121724] p-4 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.06)] relative overflow-hidden">
                {/* Header Giấy Thi Gốc */}
                <div className="border-b-2 border-stone-300 dark:border-stone-700 pb-3 mb-4 flex flex-wrap items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                  <div className="flex items-center gap-2 font-serif font-black tracking-widest uppercase text-sm sm:text-base text-stone-800 dark:text-stone-200">
                    <span>주 관 식 답 란</span>
                    <span className="text-[11px] font-sans font-normal text-stone-400">(Answer sheet for composition)</span>
                  </div>
                  <div className="font-mono text-[11px] font-bold">
                    Câu {currentItem.questionNo} · {currentItem.category}
                  </div>
                </div>

                {/* Hướng dẫn giấy thi */}
                <div className="mb-4 text-xs font-serif italic text-stone-500 dark:text-stone-400 border-b border-dashed border-stone-200 dark:border-stone-800 pb-2 flex items-center justify-between">
                  <span>
                    ※ 아래 빈칸에 규정에 맞게 작성하십시오 (띄어쓰기 포함).
                  </span>
                  <span className="text-[11px] font-mono not-italic text-stone-400">
                    20 ô vuông / dòng · Đếm mốc 20, 40, 60...
                  </span>
                </div>

                {/* KHUNG LƯỚI Ô VUÔNG WON-GO-JI (20 Ô / DÒNG) */}
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[620px] select-text">
                    <div className="space-y-1">
                      {gridRows.map((row, rowIdx) => {
                        const rowCharNumber = (rowIdx + 1) * COLS;
                        return (
                          <div key={rowIdx} className="flex items-center gap-1.5">
                            {/* 20 ô vuông trên dòng */}
                            <div className="flex-1 grid grid-cols-[repeat(20,minmax(0,1fr))] gap-0 border-t border-b border-l border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900/60 shadow-2xs">
                              {row.map((cell, colIdx) => {
                                // Phân tích ký tự hiển thị: Chữ thật vs Chữ mờ gợi ý
                                const displayChar = cell.char || (showGhostText && cell.ghostChar ? cell.ghostChar : "");
                                const isGhost = !cell.char && Boolean(showGhostText && cell.ghostChar);

                                // Styling cho từng ô
                                let cellStyle = "border-r border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100";
                                let bgStyle = "bg-white dark:bg-stone-900/60";

                                if (cell.isPreFilled) {
                                  // Nội dung cho trước: màu mực rõ ràng
                                  cellStyle += " font-medium text-stone-800 dark:text-stone-200";
                                } else if (cell.isBlank) {
                                  // Ô cần nhập chữ: tô đậm viền và màu nền gợi mở
                                  if (cell.blankType === "A") {
                                    bgStyle = "bg-amber-500/10 dark:bg-amber-500/15";
                                    cellStyle = "border-r border-amber-400 dark:border-amber-600/60 font-black text-amber-700 dark:text-amber-300";
                                  } else if (cell.blankType === "B") {
                                    bgStyle = "bg-sky-500/10 dark:bg-sky-500/15";
                                    cellStyle = "border-r border-sky-400 dark:border-sky-600/60 font-black text-sky-700 dark:text-sky-300";
                                  } else {
                                    bgStyle = "bg-stone-50 dark:bg-stone-900/80";
                                    cellStyle = "border-r border-stone-300 dark:border-stone-700 font-bold text-stone-900 dark:text-white";
                                  }

                                  // Chữ mờ gợi mở: hiển thị mờ nhạt làm mẫu để không bị trống trơn
                                  if (isGhost) {
                                    cellStyle += " text-stone-300 dark:text-stone-600 select-none opacity-40 font-normal italic";
                                  }

                                  // Đã bấm Enter kiểm tra: Đúng tô xanh, sai tô đỏ!
                                  if (isSubmitted && cell.char) {
                                    if (cell.status === "correct") {
                                      bgStyle = "bg-emerald-500 text-white";
                                      cellStyle = "border-r border-emerald-600 font-black text-white shadow-2xs";
                                    } else if (cell.status === "wrong") {
                                      bgStyle = "bg-rose-500 text-white";
                                      cellStyle = "border-r border-rose-600 font-black text-white shadow-2xs";
                                    }
                                  }
                                }

                                return (
                                  <div
                                    key={colIdx}
                                    title={isSubmitted && cell.status === "wrong" && cell.expectedChar ? `Đáp án chuẩn ô này: "${cell.expectedChar}"` : undefined}
                                    className={`aspect-square flex items-center justify-center font-noto text-xs sm:text-sm transition-colors relative group ${bgStyle} ${cellStyle}`}
                                  >
                                    <span>{displayChar}</span>
                                    {/* Tooltip khi rê vào ô bị tô đỏ */}
                                    {isSubmitted && cell.status === "wrong" && cell.expectedChar && (
                                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex px-1.5 py-0.5 rounded bg-stone-900 text-[10px] text-amber-300 font-mono shadow-md whitespace-nowrap z-30">
                                        Chuẩn: {cell.expectedChar}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Cột số mốc ký tự bên phải (20, 40, 60...) chuẩn NIIED */}
                            <div className="w-8 shrink-0 text-right font-mono text-[10px] sm:text-xs text-stone-400 dark:text-stone-500">
                              {rowCharNumber}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Chú thích giấy thi bên dưới */}
                <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-400 flex flex-wrap items-center justify-between gap-2">
                  <span>※ 주어진 답란의 방향을 바꿔서 답안을 쓰면 &apos;0&apos;점 처리됩니다.</span>
                  {isSubmitted && (
                    <div className="font-bold flex items-center gap-2">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Ô đúng: {stats.correct}
                      </span>
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        Ô sai / thiếu: {stats.total - stats.correct}
                      </span>
                      <span className="text-stone-600 dark:text-stone-300">
                        ({stats.percent}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* CỘT PHẢI: 3 CẤP GỢI Ý & TRỢ LÝ BÀI VIẾT */}
            <div className="lg:col-span-4 space-y-5">
              {/* Box 3 Lần Gọi Gợi Ý */}
              <div className="rounded-3xl border border-amber-500/30 bg-white dark:bg-stone-900 p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                      <Lightbulb className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-stone-900 dark:text-white">Trợ Lý Gợi Ý 3 Cấp</h3>
                      <p className="text-[11px] text-stone-400">Cho phép 3 lần gọi trợ giúp</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    hintLevel === 0 ? "bg-emerald-500/15 text-emerald-600" :
                    hintLevel === 1 ? "bg-amber-500/15 text-amber-600" :
                    hintLevel === 2 ? "bg-orange-500/15 text-orange-600" :
                    "bg-rose-500/15 text-rose-600"
                  }`}>
                    {3 - hintLevel} lần còn lại
                  </span>
                </div>

                {/* Nút Gọi Gợi Ý Cấp 1, 2, 3 */}
                <button
                  type="button"
                  disabled={hintLevel >= 3}
                  onClick={handleCallHint}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition"
                >
                  <Sparkles className="w-4 h-4" />
                  {hintLevel === 0 && <span>Gọi Gợi Ý Cấp 1 (Ngữ pháp & Bối cảnh)</span>}
                  {hintLevel === 1 && <span>Gọi Gợi Ý Cấp 2 (Từ khóa & Điền sẵn chữ đầu)</span>}
                  {hintLevel === 2 && <span>Gọi Gợi Ý Cấp 3 (Hiện Toàn Văn Đáp Án Chuẩn)</span>}
                  {hintLevel >= 3 && <span>Đã Mở Hết 3 Cấp Gợi Ý</span>}
                </button>

                {/* Vùng Hiển Thị Nội Dung 3 Cấp Gợi Ý */}
                <div className="space-y-3 pt-2">
                  {/* CẤP 1: NGỮ PHÁP & Ý TƯỞNG */}
                  {hintLevel >= 1 && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs leading-relaxed space-y-1.5 animate-fadeIn">
                      <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 uppercase text-[10px] tracking-wider">
                        <Check className="w-3.5 h-3.5" />
                        <span>Gợi Ý Cấp 1: Cấu trúc & Ý tưởng</span>
                      </div>
                      <p className="text-stone-700 dark:text-stone-300 font-noto">
                        {currentItem.blankA?.hint1 || currentItem.hints?.[0] || "Xác định đuôi câu trang trọng (-습니다 / -ㅂ니다) và mạch logic câu trước sau."}
                      </p>
                      {currentItem.blankB?.hint1 && (
                        <p className="text-stone-700 dark:text-stone-300 font-noto pt-1 border-t border-amber-500/20">
                          {currentItem.blankB.hint1}
                        </p>
                      )}
                    </div>
                  )}

                  {/* CẤP 2: TỪ KHÓA & ĐIỀN CHỮ ĐẦU */}
                  {hintLevel >= 2 && (
                    <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-xs leading-relaxed space-y-1.5 animate-fadeIn">
                      <div className="flex items-center gap-1.5 font-bold text-orange-600 dark:text-orange-400 uppercase text-[10px] tracking-wider">
                        <Check className="w-3.5 h-3.5" />
                        <span>Gợi Ý Cấp 2: Khung từ khóa & Ký tự gợi mở</span>
                      </div>
                      <p className="text-stone-700 dark:text-stone-300 font-noto">
                        {currentItem.blankA?.hint2 || currentItem.hints?.[1] || "Đã điền sẵn các ký tự đầu tiên vào ô trống trên giấy kẻ ô."}
                      </p>
                      {currentItem.blankB?.hint2 && (
                        <p className="text-stone-700 dark:text-stone-300 font-noto pt-1 border-t border-orange-500/20">
                          {currentItem.blankB.hint2}
                        </p>
                      )}
                    </div>
                  )}

                  {/* CẤP 3: TOÀN BỘ ĐÁP ÁN MẪU CHUẨN */}
                  {hintLevel >= 3 && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs leading-relaxed space-y-2 animate-fadeIn">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-wider">
                        <Check className="w-3.5 h-3.5" />
                        <span>Gợi Ý Cấp 3: Đáp án mẫu chính thức</span>
                      </div>
                      {currentItem.blankA && (
                        <div className="font-noto text-emerald-950 dark:text-emerald-200">
                          <b className="text-amber-500">㉠:</b> {bestVariantA || currentItem.blankA.expected}
                        </div>
                      )}
                      {currentItem.blankB && (
                        <div className="font-noto text-emerald-950 dark:text-emerald-200">
                          <b className="text-sky-500">㉡:</b> {bestVariantB || currentItem.blankB.expected}
                        </div>
                      )}
                      {currentItem.modelEssay && (
                        <div className="font-noto text-emerald-950 dark:text-emerald-200 whitespace-pre-line leading-relaxed">
                          {currentItem.modelEssay}
                        </div>
                      )}
                      {currentItem.translation && (
                        <p className="text-stone-500 dark:text-stone-400 pt-1 border-t border-emerald-500/20 italic">
                          Dịch: {currentItem.translation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Thông tin tra cứu bổ trợ (Ngữ pháp, Từ vựng, Bẫy) */}
              {(currentItem.grammar || currentItem.vocab || currentItem.pitfalls) && (
                <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3.5 shadow-xs text-xs">
                  <h4 className="font-black text-stone-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Kiến Thức Trọng Tâm Đề Thi
                  </h4>
                  {currentItem.grammar && (
                    <div className="space-y-1">
                      <span className="font-bold text-stone-500 block">⚡ Ngữ pháp:</span>
                      <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-noto">
                        {currentItem.grammar}
                      </p>
                    </div>
                  )}
                  {currentItem.vocab && (
                    <div className="space-y-1">
                      <span className="font-bold text-stone-500 block">📝 Từ vựng:</span>
                      <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-noto">
                        {currentItem.vocab}
                      </p>
                    </div>
                  )}
                  {currentItem.pitfalls && (
                    <div className="space-y-1">
                      <span className="font-bold text-rose-500 block">⚠️ Bẫy & Lỗi cần tránh:</span>
                      <p className="text-rose-600 dark:text-rose-400 leading-relaxed font-noto">
                        {currentItem.pitfalls}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
