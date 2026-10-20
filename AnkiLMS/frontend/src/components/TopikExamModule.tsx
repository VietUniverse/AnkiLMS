"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TOPIK_QUESTION_BANK, TopikQuestion } from "../data/topikQuestionBank";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Clock3, ExternalLink, Headphones, ListChecks, RotateCcw, Volume2, XCircle } from "lucide-react";
import { ApiClient } from "../lib/apiClient";

type ExamSet = { id: string; title: string; subtitle: string; section: string; icon: React.ElementType; duration: number; questions: TopikQuestion[] };

const QUESTION_GROUPS: Omit<ExamSet, "questions">[] = [
  { id: "mini", title: "Bộ luyện tổng hợp", subtitle: "Đọc · nghe · từ vựng và ngữ pháp", section: "all", icon: BookOpen, duration: 15 },
  { id: "listening", title: "Luyện nghe", subtitle: "Nghe hội thoại, chọn đáp án", section: "listening", icon: Headphones, duration: 5 },
  { id: "reading", title: "Luyện đọc", subtitle: "Đọc hiểu và tìm thông tin", section: "reading", icon: BookOpen, duration: 10 },
  { id: "grammar", title: "Từ vựng & ngữ pháp", subtitle: "Ngữ pháp và cách dùng từ", section: "grammar", icon: ListChecks, duration: 10 },
];

const OFFICIAL_PAST_TEST = "https://www.topik.go.kr/TWSTDY/TWSTDY0090.do";
const OFFICIAL_TOPIK_BASIC = "https://www.topik.go.kr/TWSTDY/TWSTDY0111.do";
const OFFICIAL_IBT_TOPIK_I = "https://www.topik.go.kr/asset/vendor/tutorial/exam1/login.html";
const OFFICIAL_IBT_TOPIK_II = "https://www.topik.go.kr/asset/vendor/tutorial/exam2/login.html";

export const TopikExamModule: React.FC = () => {
  const [levelTab, setLevelTab] = useState<"I" | "II">("I");
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

  const sets = useMemo<ExamSet[]>(() => QUESTION_GROUPS.map((set) => ({
    ...set,
    questions: set.section === "all" ? TOPIK_QUESTION_BANK : TOPIK_QUESTION_BANK.filter((question) => question.section === set.section),
  })).filter((set) => set.questions.length > 0), []);

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
  const currentCorrect = currentQ ? selectedAnswers[currentQ.id] === currentQ.correctAnswer : false;

  const playListeningPassage = () => {
    if (!currentQ?.passage || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQ.passage);
    utterance.lang = "ko-KR";
    utterance.rate = 0.9;
    const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith("ko"));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  if (!activeSet) {
    const practiceCount = TOPIK_QUESTION_BANK.length;
    const listeningCount = TOPIK_QUESTION_BANK.filter((question) => question.section === "listening").length;
    const readingCount = TOPIK_QUESTION_BANK.filter((question) => question.section === "reading").length;
    const grammarCount = TOPIK_QUESTION_BANK.filter((question) => question.section === "grammar").length;

    return <main className="mx-auto max-w-5xl space-y-5 pb-24 animate-fadeIn">
      <header className="rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-[#111d38] via-[#121a31] to-[#1e1940] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">HaechiVN · Luyện thi</p><h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">TOPIK I / II</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Chọn cấp độ và dạng bài để luyện. Theo dõi tiến độ, làm từng câu và xem giải thích sau khi nộp.</p></div>
          <a href={OFFICIAL_PAST_TEST} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-xs font-black text-sky-200 hover:bg-sky-400/15">Đề chính thức <ExternalLink className="h-4 w-4" /></a>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={() => setLevelTab("I")} aria-pressed={levelTab === "I"} className={`rounded-2xl border p-4 text-left transition ${levelTab === "I" ? "border-sky-400/60 bg-sky-400/10" : "border-white/10 bg-slate-950/20 hover:border-white/20"}`}><span className="text-xs font-black uppercase tracking-widest text-sky-300">TOPIK I</span><span className="mt-1 block text-sm font-bold text-white">Sơ cấp · cấp 1–2</span><span className="mt-1 block text-[11px] text-slate-400">Nghe và đọc · 200 điểm</span></button>
          <button onClick={() => setLevelTab("II")} aria-pressed={levelTab === "II"} className={`rounded-2xl border p-4 text-left transition ${levelTab === "II" ? "border-violet-400/60 bg-violet-400/10" : "border-white/10 bg-slate-950/20 hover:border-white/20"}`}><span className="text-xs font-black uppercase tracking-widest text-violet-300">TOPIK II</span><span className="mt-1 block text-sm font-bold text-white">Trung · cao cấp · cấp 3–6</span><span className="mt-1 block text-[11px] text-slate-400">Nghe, đọc và viết · 300 điểm</span></button>
        </div>
      </header>

      {levelTab === "I" ? <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-black text-white">Bộ luyện TOPIK I</h2><p className="mt-1 text-xs text-slate-400">Bài luyện HaechiVN · chưa phải đề thi chính thức</p></div><span className="text-xs text-slate-500">{practiceCount} câu</span></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {sets.map((set) => { const Icon = set.icon; const count = set.questions.length; const stat = set.id === "mini" ? `${count} câu · ${set.duration} phút` : `${count} câu · ${set.duration} phút`;
            return <button key={set.id} onClick={() => startSet(set)} className="group rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 text-left transition hover:border-sky-400/40 hover:bg-slate-900 sm:p-5"><span className="flex items-center justify-between"><span className="rounded-xl bg-sky-400/10 p-2.5 text-sky-300"><Icon className="h-5 w-5" /></span><span className="text-[11px] font-bold text-slate-500">{stat}</span></span><span className="mt-4 block text-base font-black text-white">{set.title}</span><span className="mt-1 block text-xs text-slate-400">{set.subtitle}</span><span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-sky-300">Bắt đầu <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></button>;
          })}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[{ label: "Nghe", count: listeningCount }, { label: "Đọc", count: readingCount }, { label: "Từ vựng & ngữ pháp", count: grammarCount }].map((item) => <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/35 px-4 py-3"><span className="text-sm font-bold text-slate-200">{item.label}</span><span className="float-right text-xs text-slate-500">{item.count} câu hiện có</span></div>)}
        </div>
      </section> : <section className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.04] p-5 sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">Bộ luyện TOPIK II</p><h2 className="mt-2 text-xl font-black text-white">Luyện nghe · đọc · viết</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Ngân hàng câu luyện TOPIK II của HaechiVN chưa được biên soạn đủ để tạo đề mô phỏng đáng tin cậy. Bạn có thể làm đề và trải nghiệm IBT trực tiếp trên cổng chính thức trong lúc bộ đề nội bộ được hoàn thiện.</p>
        <div className="mt-4 flex flex-wrap gap-2"><a href={OFFICIAL_IBT_TOPIK_II} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-xs font-black text-white hover:bg-violet-400">Trải nghiệm IBT TOPIK II <ExternalLink className="h-4 w-4" /></a><a href={OFFICIAL_PAST_TEST} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-xs font-bold text-slate-200 hover:border-violet-400/50">Làm đề công khai <ExternalLink className="h-4 w-4" /></a></div>
      </section>}

      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /><h2 className="text-sm font-black text-white">Đề và tài liệu chính thức</h2></div>
        <p className="mt-1 text-xs text-slate-400">Mở bài thi công khai, bài thi cơ bản hoặc phần trải nghiệm IBT do TOPIK cung cấp.</p>
        <div className="mt-3 flex flex-wrap gap-2"><a href={OFFICIAL_PAST_TEST} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 hover:border-sky-400/40 hover:text-white">Đề thi công khai ↗</a><a href={OFFICIAL_TOPIK_BASIC} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 hover:border-sky-400/40 hover:text-white">TOPIK Basic ↗</a><a href={OFFICIAL_IBT_TOPIK_I} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 hover:border-sky-400/40 hover:text-white">Trải nghiệm IBT I ↗</a></div>
      </section>
    </main>;
  }

  return <main className="mx-auto max-w-3xl space-y-4 pb-24 animate-fadeIn">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <button onClick={returnToCatalog} className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" />Chọn bộ khác</button>
      <div className="text-center"><p className="text-xs font-black text-white">{activeSet.title}</p><p className="text-[10px] text-slate-500">TOPIK I · Bài luyện HaechiVN</p></div>
      <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-bold ${timeLeft < 120 ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : "border-slate-700 bg-slate-950 text-amber-200"}`}><Clock3 className="h-3.5 w-3.5" />{formatTime(timeLeft)}</span>
    </header>

    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-sky-300">Câu {currentIndex + 1} / {activeSet.questions.length}</p><div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${(currentIndex + 1) / activeSet.questions.length * 100}%` }} /></div></div><button onClick={() => setShowQuestionMap((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300"><ListChecks className="h-4 w-4" />{Object.keys(selectedAnswers).length}/{activeSet.questions.length}</button></div>
      {showQuestionMap && <div className="mt-3 grid grid-cols-8 gap-2">{activeSet.questions.map((question, index) => <button key={question.id} onClick={() => { setCurrentIndex(index); setShowQuestionMap(false); }} className={`h-9 rounded-lg border text-xs font-bold ${index === currentIndex ? "border-sky-400 bg-sky-400/15 text-sky-200" : selectedAnswers[question.id] !== undefined ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-400"}`}>{index + 1}</button>)}</div>}
      {currentQ && <div className="mt-5 border-t border-slate-800 pt-5">
        {currentQ.passage && currentQ.section !== "listening" && <div className="mb-4 whitespace-pre-line rounded-xl border border-slate-800 bg-slate-950/70 p-4 font-noto text-sm leading-7 text-slate-200"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Đoạn đọc</p>{currentQ.passage}</div>}
        {currentQ.section === "listening" && currentQ.passage && <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.04] p-4"><div><p className="text-xs font-bold text-white">Nghe hội thoại</p><p className="mt-1 text-[10px] text-slate-400">Giọng đọc tiếng Hàn trên thiết bị</p></div><button onClick={playListeningPassage} className="inline-flex items-center gap-2 rounded-lg bg-sky-400/15 px-3 py-2 text-xs font-bold text-sky-200"><Volume2 className="h-4 w-4" />Phát</button></div>}
        <h2 className="font-noto text-base font-black leading-7 text-white">{currentQ.question}</h2>
        <div className="mt-4 space-y-2">{currentQ.options.map((option, optionIndex) => {
          const selected = selectedAnswers[currentQ.id] === optionIndex;
          const correct = currentQ.correctAnswer === optionIndex;
          const color = isSubmitted ? correct ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100" : selected ? "border-rose-500/50 bg-rose-500/10 text-rose-100" : "border-slate-800 bg-slate-950/40 text-slate-400" : selected ? "border-sky-400/50 bg-sky-400/10 text-white" : "border-slate-800 bg-slate-950/40 text-slate-200 hover:border-slate-600";
          return <button key={optionIndex} disabled={isSubmitted} onClick={() => setSelectedAnswers((answers) => ({ ...answers, [currentQ.id]: optionIndex }))} className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition ${color}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-black">{optionIndex + 1}</span><span className="flex-1 font-noto">{option}</span>{isSubmitted && correct && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}{isSubmitted && selected && !correct && <XCircle className="h-4 w-4 text-rose-300" />}</button>;
        })}</div>
        {isSubmitted && <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-400/[0.05] p-4"><p className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Giải thích</p><p className="mt-1 text-sm text-slate-200">{currentQ.explanation}</p></div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4">
          <button onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 disabled:opacity-40">← Trước</button>
          <div className="flex gap-2">{!isSubmitted && <button onClick={handleSubmit} className="rounded-lg border border-amber-400/30 px-4 py-2 text-xs font-black text-amber-200 hover:bg-amber-400/10">Nộp bộ luyện</button>}<button onClick={() => currentIndex === activeSet.questions.length - 1 ? (isSubmitted ? returnToCatalog() : handleSubmit()) : setCurrentIndex((index) => Math.min(activeSet.questions.length - 1, index + 1))} className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-4 py-2 text-xs font-black text-white hover:bg-sky-400">{currentIndex === activeSet.questions.length - 1 ? isSubmitted ? "Xong" : "Nộp bài" : "Tiếp"}<ArrowRight className="h-3.5 w-3.5" /></button></div>
        </div>
      </div>}
    </div>

    {isSubmitted && finalScore !== null && <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5 text-center"><p className="text-xs font-bold text-slate-300">Kết quả · {activeSet.title}</p><p className="mt-1 text-3xl font-black text-emerald-300">{finalScore} / {activeSet.questions.length}</p><p className="text-xs text-slate-400">{Math.round(finalScore / activeSet.questions.length * 100)}% chính xác · Đây là điểm luyện tập, không quy đổi thành cấp TOPIK chính thức.</p><button onClick={() => startSet(activeSet)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200"><RotateCcw className="h-3.5 w-3.5" />Làm lại</button></section>}
    <p className="text-center text-[10px] text-slate-600">Bộ luyện nội bộ do HaechiVN biên soạn · Đề thi chính thức mở từ cổng TOPIK.</p>
  </main>;
};
