"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TOPIK_QUESTION_BANK, TopikQuestion } from "../data/topikQuestionBank";
import { TOPIK_I_FILL_BLANK_EXAMS } from "../data/topikFillBlankExams";
import writingBankRaw from "../data/topikWritingBank.json";
import officialPapersRaw from "../data/topikOfficialPapers.json";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileText,
  Headphones,
  Layers,
  ListChecks,
  Pencil,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { ApiClient } from "../lib/apiClient";

type ExamSet = {
  id: string;
  title: string;
  subtitle: string;
  section: string;
  icon: React.ElementType;
  duration: number;
  questions: TopikQuestion[];
  instruction?: string;
};

type WritingItem = {
  id: number;
  questionNo: number;
  category: string;
  topic: string;
  promptText: string;
  modelAnswers: string[];
  views: number;
};

type OfficialPaper = {
  round: number;
  level: string;
  type: string;
  format: string;
  file: string;
  sizeMb: number;
};

const WRITING_BANK = writingBankRaw as WritingItem[];
const OFFICIAL_PAPERS = officialPapersRaw as OfficialPaper[];

const QUESTION_GROUPS: Omit<ExamSet, "questions">[] = [
  { id: "mini", title: "Bộ luyện tổng hợp", subtitle: "Đọc · nghe · từ vựng và ngữ pháp", section: "all", icon: BookOpen, duration: 15 },
  { id: "listening", title: "Luyện nghe", subtitle: "Nghe hội thoại, chọn đáp án", section: "listening", icon: Headphones, duration: 5 },
  { id: "reading", title: "Luyện đọc", subtitle: "Đọc hiểu và tìm thông tin", section: "reading", icon: BookOpen, duration: 10 },
  { id: "grammar", title: "Từ vựng & ngữ pháp", subtitle: "220+ câu trắc nghiệm ngữ pháp & từ vựng", section: "grammar", icon: ListChecks, duration: 15 },
];

const OFFICIAL_EXAM_SESSIONS = [
  { round: 102, year: 2025 },
  { round: 96, year: 2024 },
  { round: 91, year: 2023 },
  { round: 83, year: 2022 },
  { round: 64, year: 2019 },
  { round: 60, year: 2018 },
  { round: 52, year: 2017 },
  { round: 47, year: 2016 },
  { round: 41, year: 2015 },
  { round: 37, year: 2014 },
  { round: 36, year: 2014 },
  { round: 35, year: 2014 },
];

export const TopikExamModule: React.FC = () => {
  const [levelTab, setLevelTab] = useState<"I" | "II" | "writing" | "papers">("I");
  const [activeSet, setActiveSet] = useState<ExamSet | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [showQuestionMap, setShowQuestionMap] = useState(false);
  const submittedRef = useRef(false);
  const selectedAnswersRef = useRef(selectedAnswers);
  selectedAnswersRef.current = selectedAnswers;

  // State cho phần Luyện Viết (Câu 51~54)
  const [writingFilter, setWritingFilter] = useState<number | "all">("all");
  const [selectedWritingPrompt, setSelectedWritingPrompt] = useState<WritingItem | null>(null);
  const [writingDraft, setWritingDraft] = useState<string>("");
  const [writingDraftA, setWritingDraftA] = useState<string>("");
  const [writingDraftB, setWritingDraftB] = useState<string>("");
  const [showModelAnswer, setShowModelAnswer] = useState<boolean>(false);

  // State cho phần Tài liệu gốc
  const [papersRoundFilter, setPapersRoundFilter] = useState<number | "all">("all");

  const sets = useMemo<ExamSet[]>(() => QUESTION_GROUPS.map((set) => ({
    ...set,
    questions: set.section === "all" ? TOPIK_QUESTION_BANK : TOPIK_QUESTION_BANK.filter((question) => question.section === set.section),
  })).filter((set) => set.questions.length > 0), []);

  const fillBlankSets = useMemo<ExamSet[]>(() => TOPIK_I_FILL_BLANK_EXAMS.map((set) => ({
    ...set,
    section: "grammar",
    icon: ListChecks,
  })), []);

  const handleSubmit = useCallback(() => {
    if (submittedRef.current || !activeSet) return;
    submittedRef.current = true;
    setIsSubmitted(true);
    const correct = activeSet.questions.reduce((sum, question) => sum + (selectedAnswersRef.current[question.id] === question.correctAnswer ? 1 : 0), 0);
    setFinalScore(correct);
    const accuracy = activeSet.questions.length ? Math.round(correct / activeSet.questions.length * 100) : 0;
    ApiClient.recordStudySession("topik", activeSet.questions.length, correct, Math.round(accuracy / 2), Math.max(0, activeSet.duration * 60 - timeLeft));
  }, [activeSet, timeLeft]);

  useEffect(() => {
    if (!activeSet || isSubmitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const timer = window.setTimeout(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [activeSet, handleSubmit, isSubmitted, timeLeft]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentIndex]);

  const startSet = (set: ExamSet) => {
    submittedRef.current = false;
    setActiveSet(set);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setIsSubmitted(false);
    setFinalScore(null);
    setTimeLeft(set.duration * 60);
    setShowQuestionMap(false);
  };

  const returnToCatalog = () => {
    window.speechSynthesis?.cancel();
    setActiveSet(null);
    setIsSubmitted(false);
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const currentQ = activeSet?.questions[currentIndex];

  useEffect(() => {
    if (!activeSet || isSubmitted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((index) => Math.min(activeSet.questions.length - 1, index + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((index) => Math.max(0, index - 1));
      } else if (["1", "2", "3", "4"].includes(e.key) && currentQ) {
        e.preventDefault();
        const optionIndex = Number(e.key) - 1;
        setSelectedAnswers((answers) => ({ ...answers, [currentQ.id]: optionIndex }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSet, currentIndex, currentQ, isSubmitted]);

  const playListeningPassage = () => {
    if (!currentQ?.passage || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQ.passage);
    utterance.lang = "ko-KR";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const filteredWritingPrompts = useMemo(() => {
    if (writingFilter === "all") return WRITING_BANK;
    return WRITING_BANK.filter((w) => w.questionNo === writingFilter);
  }, [writingFilter]);

  const groupedPapers = useMemo(() => {
    const map = new Map<number, OfficialPaper[]>();
    for (const p of OFFICIAL_PAPERS) {
      if (papersRoundFilter !== "all" && p.round !== papersRoundFilter) continue;
      const list = map.get(p.round) || [];
      list.push(p);
      map.set(p.round, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [papersRoundFilter]);

  if (!activeSet) {
    const practiceCount = TOPIK_QUESTION_BANK.length;
    const listeningCount = TOPIK_QUESTION_BANK.filter((question) => question.section === "listening").length;
    const readingCount = TOPIK_QUESTION_BANK.filter((question) => question.section === "reading").length;
    const grammarCount = TOPIK_QUESTION_BANK.filter((question) => question.section === "grammar").length;

    return <main className="mx-auto max-w-5xl space-y-5 pb-24 animate-fadeIn select-none">
      <header className="rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-[#111d38] via-[#121a31] to-[#1e1940] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">HaechiVN · Trung Tâm Luyện Thi TOPIK</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">TOPIK I / II & Luyện Viết</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Luyện trắc nghiệm theo dạng bài, 24 đề thi thử chính thức, 51 đề luyện viết câu 51–54 có đáp án mẫu và trọn bộ đề thi gốc PDF.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/topik/archive" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 text-xs font-black text-white hover:brightness-110">
              24 đề chính thức <ArrowRight className="h-4 w-4" />
            </a>
            <a href="/explore" className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-xs font-black text-sky-200 hover:bg-sky-400/15">
              <Layers className="h-4 w-4" /> Bộ thẻ TOPIK
            </a>
          </div>
        </div>

        {/* Level & Module Selector Tabs */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            onClick={() => setLevelTab("I")}
            aria-pressed={levelTab === "I"}
            className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
              levelTab === "I" ? "border-sky-400/60 bg-sky-400/10" : "border-white/10 bg-slate-950/20 hover:border-white/20"
            }`}
          >
            <span className="text-xs font-black uppercase tracking-widest text-sky-300">TOPIK I</span>
            <span className="mt-1 block text-sm font-bold text-white">Sơ cấp · Cấp 1–2</span>
            <span className="mt-1 block text-[11px] text-slate-400">Nghe & đọc · 200 điểm</span>
          </button>

          <button
            onClick={() => setLevelTab("II")}
            aria-pressed={levelTab === "II"}
            className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
              levelTab === "II" ? "border-violet-400/60 bg-violet-400/10" : "border-white/10 bg-slate-950/20 hover:border-white/20"
            }`}
          >
            <span className="text-xs font-black uppercase tracking-widest text-violet-300">TOPIK II</span>
            <span className="mt-1 block text-sm font-bold text-white">Trung · Cao cấp 3–6</span>
            <span className="mt-1 block text-[11px] text-slate-400">Nghe, đọc & thi thử</span>
          </button>

          <button
            onClick={() => setLevelTab("writing")}
            aria-pressed={levelTab === "writing"}
            className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
              levelTab === "writing" ? "border-rose-400/60 bg-rose-400/10" : "border-white/10 bg-slate-950/20 hover:border-white/20"
            }`}
          >
            <span className="text-xs font-black uppercase tracking-widest text-rose-300">LUYỆN VIẾT</span>
            <span className="mt-1 block text-sm font-bold text-white">Câu 51 – 54</span>
            <span className="mt-1 block text-[11px] text-slate-400">51 đề & bài mẫu NIIED</span>
          </button>

          <a
            href="/topik/wongoji"
            className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 p-4 text-left transition shadow-xs group"
          >
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center justify-between">
              <span>VIẾT 원고지</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
            </span>
            <span className="mt-1 block text-sm font-bold text-white">Giấy Kẻ Ô Vuông</span>
            <span className="mt-1 block text-[11px] text-emerald-300/80">Kiểm tra đúng xanh sai đỏ</span>
          </a>

          <button
            onClick={() => setLevelTab("papers")}
            aria-pressed={levelTab === "papers"}
            className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
              levelTab === "papers" ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 bg-slate-950/20 hover:border-white/20"
            }`}
          >
            <span className="text-xs font-black uppercase tracking-widest text-amber-300">ĐỀ THI GỐC</span>
            <span className="mt-1 block text-sm font-bold text-white">PDF & File Nghe</span>
            <span className="mt-1 block text-[11px] text-slate-400">63 tài liệu kỳ 41~91</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          TAB 1: TOPIK I (SƠ CẤP)
          ========================================================================= */}
      {levelTab === "I" && (
        <section className="space-y-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">Bộ luyện TOPIK I</h2>
              <p className="mt-1 text-xs text-slate-400">227 câu hỏi trắc nghiệm ngữ pháp, từ vựng và bài đọc hiểu chọn lọc</p>
            </div>
            <span className="text-xs text-slate-500">{practiceCount} câu</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {sets.map((set) => {
              const Icon = set.icon;
              const count = set.questions.length;
              return (
                <button
                  key={set.id}
                  onClick={() => startSet(set)}
                  className="group rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 text-left transition hover:border-sky-400/40 hover:bg-slate-900 sm:p-5 cursor-pointer"
                >
                  <span className="flex items-center justify-between">
                    <span className="rounded-xl bg-sky-400/10 p-2.5 text-sky-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">{count} câu · {set.duration} phút</span>
                  </span>
                  <span className="mt-4 block text-base font-black text-white">{set.title}</span>
                  <span className="mt-1 block text-xs text-slate-400">{set.subtitle}</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-sky-300">
                    Bắt đầu <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </button>
              );
            })}
          </div>

          <section className="mt-8" aria-labelledby="topik-i-past-tests">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="topik-i-past-tests" className="text-lg font-black text-white">Các kỳ TOPIK I</h2>
                <p className="mt-1 text-xs text-slate-400">12 kỳ trong danh mục lưu trữ · 70 câu · 100 phút mỗi kỳ</p>
              </div>
              <a href="/topik/archive" className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/[0.06] px-3 py-2 text-[11px] font-bold text-sky-200 hover:bg-sky-400/10">
                Mở kho 24 đề
              </a>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {OFFICIAL_EXAM_SESSIONS.map(({ round, year }) => (
                <article key={`i-${round}`} className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
                  <p className="text-sm font-black text-white">Kỳ {round} <span className="text-slate-400">· {year}</span></p>
                  <p className="mt-1 text-[11px] text-slate-400">TOPIK I · 70 câu · 100 phút</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a href={`/topik/archive?id=${round}-topik1&mode=practice`} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-700 px-2 py-2 text-[10px] font-bold text-slate-200 hover:border-sky-400/50">
                      Luyện đề
                    </a>
                    <a href={`/topik/archive?id=${round}-topik1&mode=mock`} className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500/15 px-2 py-2 text-[10px] font-bold text-sky-200 hover:bg-sky-500/25">
                      Thi thử
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="mb-3 mt-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">10 đề luyện theo nhóm câu</h2>
              <p className="mt-1 text-xs text-slate-400">Mỗi đề gồm 5 câu cùng dạng · làm nhanh trong khoảng 5 phút</p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] font-bold text-emerald-200">
              HaechiVN biên soạn · không phải đề chính thức
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fillBlankSets.map((set, index) => {
              const Icon = set.icon;
              return (
                <button
                  key={set.id}
                  onClick={() => startSet(set)}
                  className="group rounded-2xl border border-emerald-400/15 bg-slate-900/70 p-4 text-left transition hover:border-emerald-300/45 hover:bg-slate-900 sm:p-5 cursor-pointer"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full border border-emerald-400/20 px-2.5 py-1 text-[10px] font-black text-emerald-200">
                      CÂU 1–5 · ĐIỀN KHUYẾT
                    </span>
                  </span>
                  <span className="mt-4 block text-base font-black text-white">{set.title}</span>
                  <span className="mt-1 block min-h-8 text-xs text-slate-400">{set.subtitle}</span>
                  <span className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>5 câu · {set.duration} phút</span>
                    <span>Đề {String(index + 1).padStart(2, "0")}</span>
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-emerald-300">
                    Làm đề <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Nghe", count: listeningCount },
              { label: "Đọc", count: readingCount },
              { label: "Từ vựng & ngữ pháp", count: grammarCount },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/35 px-4 py-3">
                <span className="text-sm font-bold text-slate-200">{item.label}</span>
                <span className="float-right text-xs text-slate-500">{item.count} câu hiện có</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          TAB 2: TOPIK II (TRUNG & CAO CẤP)
          ========================================================================= */}
      {levelTab === "II" && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.04] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">Bộ luyện TOPIK II</p>
            <h2 className="mt-2 text-xl font-black text-white">Luyện nghe · đọc · thi thử tương tác</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              12 kỳ thi chính thức đã được lưu trong kho nội bộ HaechiVN, gồm câu hỏi, đáp án, giải thích chi tiết, hình ảnh minh họa và audio cắt theo từng câu.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/topik/archive?id=102-topik2&mode=practice" className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-xs font-black text-white hover:bg-violet-400">
                Luyện đề Kỳ 102 mới nhất
              </a>
              <a href="/topik/archive?id=102-topik2&mode=mock" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-xs font-bold text-slate-200 hover:border-violet-400/50">
                Thi thử có bấm giờ (180 phút)
              </a>
              <button
                type="button"
                onClick={() => setLevelTab("writing")}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-black text-rose-300 hover:bg-rose-500/20 cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                Luyện viết Câu 51–54 ({WRITING_BANK.length} đề)
              </button>
            </div>
          </div>

          <section aria-labelledby="topik-ii-past-tests">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="topik-ii-past-tests" className="text-lg font-black text-white">Các kỳ TOPIK II</h2>
                <p className="mt-1 text-xs text-slate-400">12 kỳ trong danh mục lưu trữ · 100 câu · 180 phút mỗi kỳ</p>
              </div>
              <a href="/topik/archive" className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-400/[0.06] px-3 py-2 text-[11px] font-bold text-violet-200 hover:bg-violet-400/10">
                Mở kho 24 đề
              </a>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {OFFICIAL_EXAM_SESSIONS.map(({ round, year }) => (
                <article key={`ii-${round}`} className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
                  <p className="text-sm font-black text-white">Kỳ {round} <span className="text-slate-400">· {year}</span></p>
                  <p className="mt-1 text-[11px] text-slate-400">TOPIK II · 100 câu · 180 phút</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a href={`/topik/archive?id=${round}-topik2&mode=practice`} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-700 px-2 py-2 text-[10px] font-bold text-slate-200 hover:border-violet-400/50">
                      Luyện đề
                    </a>
                    <a href={`/topik/archive?id=${round}-topik2&mode=mock`} className="inline-flex items-center justify-center gap-1 rounded-lg bg-violet-500/15 px-2 py-2 text-[10px] font-bold text-violet-200 hover:bg-violet-500/25">
                      Thi thử
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {/* =========================================================================
          TAB 3: LUYỆN VIẾT TOPIK II (CÂU 51 ~ 54)
          ========================================================================= */}
      {levelTab === "writing" && (
        <section className="space-y-5">
          {selectedWritingPrompt ? (
            /* Chi tiết đề bài luyện viết */
            <div className="rounded-3xl border border-rose-500/30 bg-slate-900/80 p-5 sm:p-7 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWritingPrompt(null);
                    setWritingDraft("");
                    setWritingDraftA("");
                    setWritingDraftB("");
                    setShowModelAnswer(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Danh sách 51 đề viết</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-black text-rose-300">
                    Câu {selectedWritingPrompt.questionNo}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    {selectedWritingPrompt.category}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-black text-white">{selectedWritingPrompt.topic}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedWritingPrompt.questionNo === 51 && "Điền hai vế câu (ㄱ, ㄴ) phù hợp với bối cảnh thông báo, thư từ hoặc tin nhắn."}
                  {selectedWritingPrompt.questionNo === 52 && "Điền hai vế câu (ㄱ, ㄴ) theo logic giải thích, quan hệ nguyên nhân - kết quả."}
                  {selectedWritingPrompt.questionNo === 53 && "Viết đoạn văn ngắn 200~300 chữ phân tích biểu đồ, số liệu và nguyên nhân/triển vọng."}
                  {selectedWritingPrompt.questionNo === 54 && "Viết bài luận nghị luận xã hội 600~700 chữ trả lời đầy đủ 3 câu hỏi gợi ý."}
                </p>
              </div>

              {/* Đề bài tiếng Hàn */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 font-noto text-sm sm:text-base leading-7 sm:leading-8 text-slate-100 whitespace-pre-line shadow-inner">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">ĐỀ BÀI CHÍNH THỨC</p>
                {selectedWritingPrompt.promptText}
              </div>

              {/* Khung luyện viết trực tiếp */}
              {selectedWritingPrompt.questionNo <= 52 ? (
                /* Dạng điền khuyết Câu 51 & 52: 2 ô gõ riêng biệt cho ㄱ và ㄴ */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">ㄱ</span>
                        <span>Đáp án điền cho vị trí (ㄱ):</span>
                      </label>
                      <input
                        type="text"
                        value={writingDraftA}
                        onChange={(e) => setWritingDraftA(e.target.value)}
                        placeholder="Gõ đáp án tiếng Hàn cho (ㄱ)..."
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-700 bg-slate-950/90 font-noto text-sm sm:text-base text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">ㄴ</span>
                        <span>Đáp án điền cho vị trí (ㄴ):</span>
                      </label>
                      <input
                        type="text"
                        value={writingDraftB}
                        onChange={(e) => setWritingDraftB(e.target.value)}
                        placeholder="Gõ đáp án tiếng Hàn cho (ㄴ)..."
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-700 bg-slate-950/90 font-noto text-sm sm:text-base text-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Dạng bài luận Câu 53 & 54: khung soạn thảo kèm đếm ký tự 원고지 */
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5 text-sky-400" />
                      <span>Bài làm của bạn (gõ tiếng Hàn):</span>
                    </label>
                    <span className={`font-mono font-bold ${
                      selectedWritingPrompt.questionNo === 53 && (writingDraft.length < 200 || writingDraft.length > 300)
                        ? "text-amber-400"
                        : selectedWritingPrompt.questionNo === 54 && (writingDraft.length < 600 || writingDraft.length > 700)
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}>
                      {writingDraft.length} ký tự
                      {selectedWritingPrompt.questionNo === 53 && " (chuẩn: 200~300 chữ)"}
                      {selectedWritingPrompt.questionNo === 54 && " (chuẩn: 600~700 chữ)"}
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={writingDraft}
                    onChange={(e) => setWritingDraft(e.target.value)}
                    placeholder="Nhập bài viết phân tích / bài luận của bạn bằng tiếng Hàn..."
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 p-4 font-noto text-sm leading-relaxed text-white outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              )}

              {/* Toggle Đáp án mẫu */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowModelAnswer((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2.5 text-xs font-black text-white shadow-lg cursor-pointer"
                >
                  {showModelAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showModelAnswer ? "Ẩn bài giải mẫu" : "Xem Đáp Án Mẫu & Phân Tích Chuẩn"}</span>
                </button>
              </div>

              {showModelAnswer && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đáp Án Mẫu Đạt Điểm Tối Đa (Tham khảo Viện NIIED)</span>
                  </div>
                  {selectedWritingPrompt.modelAnswers.map((ans, idx) => (
                    <div key={idx} className="rounded-xl border border-emerald-500/30 bg-slate-950/60 p-4 font-noto text-sm sm:text-base leading-relaxed text-emerald-200 whitespace-pre-line">
                      {ans}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Danh sách 51 đề viết */
            <div className="space-y-5">
              {/* Banner Luyện Viết Giấy Kẻ Ô Nguyên Bản (원고지) */}
              <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/50 p-5 sm:p-6 shadow-xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-black text-emerald-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>PHÒNG LUYỆN VIẾT GIẤY KẺ Ô 원고지 (CHUẨN NIIED)</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      Luyện viết trên giấy thi 20 ô/dòng · Tự động chấm xanh đúng đỏ sai
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Mô phỏng 100% giấy thi tự luận (주관식 답란), in sẵn nội dung cho trước, gõ trực tiếp vào ô khuyết và bấm Enter để chấm. Có trợ lý gợi ý 3 cấp hỗ trợ giải đề.
                    </p>
                  </div>
                  <a
                    href="/topik/wongoji"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-6 py-3.5 text-sm font-black text-slate-950 shadow-lg transition-transform hover:scale-[1.02] cursor-pointer shrink-0"
                  >
                    <span>Vào Phòng Viết 원고지</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-rose-400" />
                    <span>Kho 51 Đề Luyện Viết TOPIK II (Câu 51 ~ 54)</span>
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Gồm đầy đủ các dạng điền thông báo, giải thích, phân tích biểu đồ và bài luận nghị luận xã hội kèm đáp án mẫu.
                  </p>
                </div>

                {/* Sub-filters */}
                <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setWritingFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      writingFilter === "all" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Tất cả (51)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWritingFilter(51)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      writingFilter === 51 ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Câu 51 (27)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWritingFilter(52)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      writingFilter === 52 ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Câu 52 (8)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWritingFilter(53)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      writingFilter === 53 ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Câu 53 (8)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWritingFilter(54)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      writingFilter === 54 ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Câu 54 (8)
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {filteredWritingPrompts.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 flex flex-col justify-between space-y-3 hover:border-rose-500/40 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[11px] font-black text-rose-300">
                          Câu {item.questionNo}
                        </span>
                        <span className="text-[11px] text-slate-500 font-bold">{item.views} lượt xem</span>
                      </div>
                      <h3 className="text-sm font-bold text-white line-clamp-1">{item.topic}</h3>
                      <p className="text-xs text-slate-400 font-noto line-clamp-3 leading-relaxed">
                        {item.promptText}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWritingPrompt(item);
                        setWritingDraft("");
                        setWritingDraftA("");
                        setWritingDraftB("");
                        setShowModelAnswer(false);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 py-2 px-3 text-xs font-bold text-rose-200 transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Luyện viết đề này →</span>
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 4: TÀI LIỆU ĐỀ THI GỐC & FILE NGHE MP3
          ========================================================================= */}
      {levelTab === "papers" && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span>Trọn Bộ 63 Đề Thi Gốc & File Nghe MP3 (Kỳ 41 ~ 91)</span>
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Tài liệu chính thức từ Viện Giáo dục Quốc tế Hàn Quốc (NIIED) gồm Đề thi PDF, Đáp án PDF, Transcript phần nghe và Audio MP3.
              </p>
            </div>

            <div className="flex flex-wrap gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setPapersRoundFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  papersRoundFilter === "all" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
                }`}
              >
                Tất cả kỳ
              </button>
              {[91, 83, 64, 60, 52, 47, 41].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setPapersRoundFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    papersRoundFilter === r ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Kỳ {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {groupedPapers.map(([round, papers]) => {
              const top1Papers = papers.filter((p) => p.level === "TOPIK 1");
              const top2Papers = papers.filter((p) => p.level === "TOPIK 2");

              return (
                <div key={round} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-black text-amber-300">
                        KỲ THI {round}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">
                        Đề thi chuẩn NIIED Hàn Quốc ({papers.length} file tài liệu)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`/topik/archive?id=${round}-topik1&mode=practice`}
                        className="rounded-lg bg-sky-500/15 border border-sky-400/30 px-2.5 py-1 text-[11px] font-bold text-sky-200 hover:bg-sky-500/25"
                      >
                        Thi online TOPIK I →
                      </a>
                      <a
                        href={`/topik/archive?id=${round}-topik2&mode=practice`}
                        className="rounded-lg bg-violet-500/15 border border-violet-400/30 px-2.5 py-1 text-[11px] font-bold text-violet-200 hover:bg-violet-500/25"
                      >
                        Thi online TOPIK II →
                      </a>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* TOPIK I */}
                    <div className="rounded-2xl border border-sky-500/20 bg-slate-950/40 p-4 space-y-2.5">
                      <h4 className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>TOPIK I (Sơ cấp · Kỳ {round})</span>
                      </h4>
                      <div className="space-y-1.5">
                        {top1Papers.map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-slate-900/80 border border-slate-800">
                            <span className="text-slate-200 font-bold flex items-center gap-2">
                              {p.format === "PDF" ? <FileText className="w-3.5 h-3.5 text-rose-400" /> : <Headphones className="w-3.5 h-3.5 text-amber-400" />}
                              <span>{p.type}</span>
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {p.format} · {p.sizeMb} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* TOPIK II */}
                    <div className="rounded-2xl border border-violet-500/20 bg-slate-950/40 p-4 space-y-2.5">
                      <h4 className="text-xs font-black text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>TOPIK II (Trung & Cao cấp · Kỳ {round})</span>
                      </h4>
                      <div className="space-y-1.5">
                        {top2Papers.map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-slate-900/80 border border-slate-800">
                            <span className="text-slate-200 font-bold flex items-center gap-2">
                              {p.format === "PDF" ? <FileText className="w-3.5 h-3.5 text-rose-400" /> : <Headphones className="w-3.5 h-3.5 text-amber-400" />}
                              <span>{p.type}</span>
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {p.format} · {p.sizeMb} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Footer info */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-black text-white">Kho đề thi và học liệu TOPIK toàn diện</h2>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          24 đề thi thử chính thức, 227 câu hỏi trắc nghiệm ngữ pháp, 51 đề bài mẫu luyện viết và trọn bộ đề thi gốc lưu trữ nội bộ trên HaechiVN.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/topik/archive" className="rounded-lg bg-sky-500 px-3 py-2 text-[11px] font-black text-white hover:bg-sky-400">
            Mở kho 24 đề chính thức
          </a>
          <button
            type="button"
            onClick={() => setLevelTab("writing")}
            className="rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 hover:border-rose-400/40 hover:text-white cursor-pointer"
          >
            Luyện viết Câu 51–54
          </button>
          <a href="/explore" className="rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 hover:border-sky-400/40 hover:text-white">
            Bộ thẻ từ vựng NIKL & Ngữ pháp
          </a>
        </div>
      </section>
    </main>;
  }

  // Giao diện khi đang làm bài luyện trắc nghiệm
  const currentCorrect = currentQ ? selectedAnswers[currentQ.id] === currentQ.correctAnswer : false;

  return <main className="mx-auto max-w-3xl space-y-4 pb-24 animate-fadeIn select-none">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <button onClick={returnToCatalog} className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Chọn bộ khác
      </button>
      <div className="text-center">
        <p className="text-xs font-black text-white">{activeSet.title}</p>
        <p className="text-[10px] text-slate-500">HaechiVN · Luyện thi chuẩn TOPIK</p>
      </div>
      <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-bold ${
        timeLeft < 120 ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : "border-slate-700 bg-slate-950 text-amber-200"
      }`}>
        <Clock3 className="h-3.5 w-3.5" />
        {formatTime(timeLeft)}
      </span>
    </header>

    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-sky-300">
            Câu {currentIndex + 1} / {activeSet.questions.length}
          </p>
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-400 transition-all"
              style={{ width: `${((currentIndex + 1) / activeSet.questions.length) * 100}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setShowQuestionMap((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 cursor-pointer"
        >
          <ListChecks className="h-4 w-4" />
          {Object.keys(selectedAnswers).length}/{activeSet.questions.length}
        </button>
      </div>

      {showQuestionMap && (
        <div className="mt-3 grid grid-cols-8 gap-2">
          {activeSet.questions.map((question, index) => (
            <button
              key={question.id}
              onClick={() => {
                setCurrentIndex(index);
                setShowQuestionMap(false);
              }}
              className={`h-9 rounded-lg border text-xs font-bold cursor-pointer ${
                index === currentIndex
                  ? "border-sky-400 bg-sky-400/15 text-sky-200"
                  : selectedAnswers[question.id] !== undefined
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 text-slate-400"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}

      {currentQ && (
        <div className="mt-5 border-t border-slate-800 pt-5">
          {activeSet.instruction && (
            <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Hướng dẫn làm bài</p>
              <p className="mt-1 text-xs text-slate-300">{activeSet.instruction}</p>
            </div>
          )}

          {currentQ.passage && currentQ.section !== "listening" && (
            <div className="mb-4 whitespace-pre-line rounded-xl border border-slate-800 bg-slate-950/70 p-4 font-noto text-sm leading-7 text-slate-200">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Đoạn văn đọc hiểu</p>
              {currentQ.passage}
            </div>
          )}

          {currentQ.section === "listening" && currentQ.passage && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.04] p-4">
              <div>
                <p className="text-xs font-bold text-white">Nghe hội thoại</p>
                <p className="mt-1 text-[10px] text-slate-400">Giọng đọc tiếng Hàn chuẩn</p>
              </div>
              <button
                onClick={playListeningPassage}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-400/15 px-3 py-2 text-xs font-bold text-sky-200 cursor-pointer"
              >
                <Volume2 className="h-4 w-4" /> Phát
              </button>
            </div>
          )}

          <h2 className="font-noto text-base font-black leading-7 text-white">{currentQ.question}</h2>

          <div className="mt-4 space-y-2">
            {currentQ.options.map((option, optionIndex) => {
              const selected = selectedAnswers[currentQ.id] === optionIndex;
              const correct = currentQ.correctAnswer === optionIndex;
              const color = isSubmitted
                ? correct
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                  : selected
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-100"
                  : "border-slate-800 bg-slate-950/40 text-slate-400"
                : selected
                ? "border-sky-400/50 bg-sky-400/10 text-white"
                : "border-slate-800 bg-slate-950/40 text-slate-200 hover:border-slate-600";

              return (
                <button
                  key={optionIndex}
                  disabled={isSubmitted}
                  onClick={() => setSelectedAnswers((answers) => ({ ...answers, [currentQ.id]: optionIndex }))}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition cursor-pointer ${color}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-black">
                    {optionIndex + 1}
                  </span>
                  <span className="flex-1 font-noto">{option}</span>
                  {isSubmitted && correct && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                  {isSubmitted && selected && !correct && <XCircle className="h-4 w-4 text-rose-300" />}
                </button>
              );
            })}
          </div>

          {isSubmitted && (
            <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-400/[0.05] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Giải thích chi tiết</p>
              <p className="mt-1 text-sm text-slate-200">{currentQ.explanation}</p>
            </div>
          )}

          <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md p-3.5 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 rounded-b-2xl shadow-xl">
            <button
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              disabled={currentIndex === 0}
              className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
            >
              ← Trước
            </button>
            <div className="flex items-center gap-2">
              {!isSubmitted && (
                <button
                  onClick={handleSubmit}
                  className="rounded-lg border border-amber-400/30 px-4 py-2 text-xs font-black text-amber-200 hover:bg-amber-400/10 cursor-pointer"
                >
                  Nộp bộ luyện
                </button>
              )}
              <button
                onClick={() =>
                  currentIndex === activeSet.questions.length - 1
                    ? isSubmitted
                      ? returnToCatalog()
                      : handleSubmit()
                    : setCurrentIndex((index) => Math.min(activeSet.questions.length - 1, index + 1))
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-black text-white shadow-md shadow-sky-500/20 transition active:scale-95 cursor-pointer"
              >
                {currentIndex === activeSet.questions.length - 1 ? (isSubmitted ? "Xong" : "Nộp bài") : "Tiếp"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {isSubmitted && finalScore !== null && (
      <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5 text-center">
        <p className="text-xs font-bold text-slate-300">Kết quả · {activeSet.title}</p>
        <p className="mt-1 text-3xl font-black text-emerald-300">
          {finalScore} / {activeSet.questions.length}
        </p>
        <p className="text-xs text-slate-400">
          {Math.round((finalScore / activeSet.questions.length) * 100)}% chính xác · Đây là điểm bài luyện tập kiến thức.
        </p>
        <button
          onClick={() => startSet(activeSet)}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Làm lại
        </button>
      </section>
    )}

    <p className="text-center text-[10px] text-slate-600">
      Bài luyện nội bộ do HaechiVN biên soạn · Đề thi chính thức mở từ cổng kho 24 đề TOPIK.
    </p>
  </main>;
};
