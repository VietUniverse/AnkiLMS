"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Headphones, ListChecks, Loader2, Play, RotateCcw, Volume2, XCircle } from "lucide-react";
import { ApiClient } from "../lib/apiClient";

type ArchiveOption = { html?: string; image?: string; alt?: string };
type ArchiveQuestion = {
  no: number;
  points?: number;
  answer: number;
  layout?: number;
  prompt?: { html?: string; image?: string; alt?: string };
  options?: ArchiveOption[];
  audio?: [number, number];
  replay?: [number, number];
  explanation?: string;
};
type ArchiveGroup = { from: number; to: number; instruction?: string };
type ArchiveSection = { id: string; title: string; minutes?: number; audio?: string; groups?: ArchiveGroup[]; questions: ArchiveQuestion[] };
type ArchiveExam = { id: string; round: number; year: number; level: "TOPIK I" | "TOPIK II"; sections: ArchiveSection[] };
type CatalogExam = { id: string; level: "TOPIK I" | "TOPIK II"; round: number; year: number; questions: number };
type Mode = "practice" | "mock";

const LEVEL_I_TIME = 100 * 60;
const LEVEL_II_TIME = 180 * 60;

const ARCHIVE_CSS = `
  html[data-theme="light"] body:not(:has(.login-page-root)) .topik-archive [class*="text-white"]{color:#ffffff!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .topik-archive [class*="text-slate-300"]{color:#cbd5e1!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .topik-archive [class*="text-slate-200"]{color:#e2e8f0!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .topik-archive [class*="text-slate-100"]{color:#f1f5f9!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .topik-archive [class*="text-slate-400"]{color:#94a3b8!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .topik-archive [class*="text-slate-500"]{color:#64748b!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .topik-archive [class*="text-sky-300"]{color:#7dd3fc!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .topik-archive [class*="bg-slate-900"]{background-color:#0f172a!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .topik-archive [class*="bg-slate-800"]{background-color:#1e293b!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .topik-archive [class*="bg-slate-700"]{background-color:#334155!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .topik-archive [class*="bg-slate-950"]{background-color:#020617!important}
`;

function safeHtml(html?: string) {
  if (!html) return "";
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

function imageUrl(round: number, path?: string) {
  if (!path) return "";
  const file = path.split("/").pop() || path;
  return `/topik-archive/data/images/${round}__images_${file}`;
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function sectionAudioUrl(exam: ArchiveExam, section: ArchiveSection) {
  if (!section.audio) return "";
  const file = section.audio.split("/").pop();
  return file ? `/topik-archive/data/audio/${exam.round}-${file}?v=20261109` : "";
}

function ExamRunner({ exam, mode, onExit }: { exam: ArchiveExam; mode: Mode; onExit: () => void }) {
  const sections = exam.sections.filter((section) => section.questions.length > 0);
  const allQuestions = useMemo(() => sections.flatMap((section) => section.questions), [sections]);
  const totalPoints = useMemo(() => allQuestions.reduce((sum, question) => sum + (question.points || 2), 0), [allQuestions]);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [timeLeft, setTimeLeft] = useState(mode === "mock" ? (exam.level === "TOPIK I" ? LEVEL_I_TIME : LEVEL_II_TIME) : 0);
  const [score, setScore] = useState<{ correct: number; points: number; total: number } | null>(null);
  const [started, setStarted] = useState(mode !== "mock");
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioWindow, setAudioWindow] = useState<[number, number | null]>([0, null]);
  const [fullscreenError, setFullscreenError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const fullscreenRootRef = useRef<HTMLElement>(null);
  const stopAtRef = useRef<number | null>(null);
  const submittedRef = useRef(false);
  const startedRef = useRef(started);
  const submitRef = useRef<() => void>(() => undefined);
  const playRequestRef = useRef(0);
  const answersRef = useRef(answers);

  const section = sections[sectionIndex];
  const question = section?.questions[index];
  const group = section?.groups?.find((item) => question && question.no >= item.from && question.no <= item.to);
  const selected = question ? answers[question.no] : undefined;
  const isChecked = question ? !!checked[question.no] : false;
  const audioUrl = section ? sectionAudioUrl(exam, section) : "";

  const pauseAudio = useCallback(() => {
    stopAtRef.current = null;
    audioRef.current?.pause();
  }, []);

  useEffect(() => () => pauseAudio(), [pauseAudio]);

  const submit = useCallback(() => {
    if (submittedRef.current) return;
    if (mode === "mock" && !startedRef.current) return;
    submittedRef.current = true;
    const correct = allQuestions.filter((item) => answersRef.current[item.no] === item.answer).length;
    const points = allQuestions.reduce((sum, item) => sum + (answersRef.current[item.no] === item.answer ? (item.points || 2) : 0), 0);
    setScore({ correct, points, total: totalPoints });
    setSubmitted(true);
    pauseAudio();
    if (document.fullscreenElement && fullscreenRootRef.current?.contains(document.fullscreenElement)) {
      void document.exitFullscreen().catch(() => undefined);
    }
    const seconds = mode === "mock" ? (exam.level === "TOPIK I" ? LEVEL_I_TIME : LEVEL_II_TIME) - timeLeft : allQuestions.length * 30;
    void ApiClient.recordStudySession("topik_archive", allQuestions.length, correct, Math.max(1, Math.round(points / 10)), Math.max(10, seconds));
  }, [allQuestions, exam.level, mode, pauseAudio, timeLeft, totalPoints]);

  useEffect(() => {
    startedRef.current = started;
    answersRef.current = answers;
    submitRef.current = submit;
  }, [answers, started, submit]);

  useEffect(() => {
    if (mode !== "mock" || !started || submitted) return;
    if (timeLeft <= 0) {
      submitRef.current();
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [mode, started, submitted, timeLeft]);

  useEffect(() => {
    if (mode !== "mock" || !started || submitted) return;
    const submitWhenLeavingExam = () => {
      if (!submittedRef.current && startedRef.current) submitRef.current();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") submitWhenLeavingExam();
    };
    const onFullscreenChange = () => {
      if (document.visibilityState === "visible" && !document.fullscreenElement) submitWhenLeavingExam();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [mode, started, submitted]);

  const play = (start?: number, end?: number) => {
    if (!audioRef.current || !audioUrl) return;
    const requestId = ++playRequestRef.current;
    const audio = audioRef.current;
    if (audio.src !== new URL(audioUrl, window.location.href).href) {
      audio.src = audioUrl;
      audio.load();
    }
    const segmentStart = start ?? 0;
    const segmentEnd = end ?? null;
    stopAtRef.current = end ?? null;
    setAudioWindow([segmentStart, segmentEnd]);
    const startPlayback = () => {
      if (requestId !== playRequestRef.current || !audioRef.current) return;
      audio.currentTime = segmentStart;
      setAudioTime(segmentStart);
      void audio.play().catch(() => undefined);
    };
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) startPlayback();
    else audio.addEventListener("loadedmetadata", startPlayback, { once: true });
  };

  const startMock = async () => {
    const root = fullscreenRootRef.current;
    if (!root?.requestFullscreen) {
      setFullscreenError("Trình duyệt này không hỗ trợ chế độ toàn màn hình. Hãy mở bằng trình duyệt khác để thi thử.");
      return;
    }
    const fullscreenRequest = root.requestFullscreen();
    const listeningIndex = sections.findIndex((item) => item.id === "listening" && item.audio);
    if (listeningIndex >= 0) {
      const listening = sections[listeningIndex];
      const url = sectionAudioUrl(exam, listening);
      const audio = audioRef.current;
      setSectionIndex(listeningIndex);
      setIndex(0);
      setAudioWindow([0, null]);
      if (audio && url) {
        audio.src = url;
        audio.load();
        stopAtRef.current = null;
        void audio.play().catch(() => undefined);
      }
    }
    try {
      await fullscreenRequest;
    } catch {
      pauseAudio();
      setFullscreenError("Chưa thể mở toàn màn hình. Hãy cho phép trang dùng chế độ toàn màn hình rồi thử lại.");
      return;
    }
    setFullscreenError("");
    setStarted(true);
  };

  useEffect(() => {
    if (mode !== "practice" || submitted || section?.id !== "listening" || !question) return;
    const segment = question.audio || question.replay;
    if (segment) play(segment[0], segment[1]);
    else if (section.audio) play();
    // Each question intentionally starts its own official audio interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, submitted, sectionIndex, index, audioUrl]);

  const choose = (optionIndex: number) => {
    if (!question || submitted) return;
    setAnswers((current) => ({ ...current, [question.no]: optionIndex + 1 }));
    if (mode === "practice") setChecked((current) => ({ ...current, [question.no]: true }));
  };

  const goTo = (nextSection: number, nextIndex: number) => {
    if (mode === "practice") pauseAudio();
    setSectionIndex(Math.max(0, Math.min(sections.length - 1, nextSection)));
    setIndex(Math.max(0, Math.min(sections[nextSection]?.questions.length - 1 || 0, nextIndex)));
    setShowMap(false);
  };

  const nextQuestion = () => {
    if (!section) return;
    if (index < section.questions.length - 1) goTo(sectionIndex, index + 1);
    else if (sectionIndex < sections.length - 1) goTo(sectionIndex + 1, 0);
    else if (mode === "practice" && !submitted) submit();
  };

  const previousQuestion = () => {
    if (!section) return;
    if (index > 0) goTo(sectionIndex, index - 1);
    else if (sectionIndex > 0) goTo(sectionIndex - 1, sections[sectionIndex - 1].questions.length - 1);
  };

  const seekPracticeAudio = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.max(audioWindow[0], Math.min(audioWindow[1] ?? audio.duration ?? value, value));
    audio.currentTime = next;
    setAudioTime(next);
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement && fullscreenRootRef.current?.contains(document.fullscreenElement)) {
      void document.exitFullscreen().catch(() => undefined);
    }
  };

  if (!section || !question) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-300">Không tải được câu hỏi.</div>;

  if (mode === "mock" && !started) return <main ref={fullscreenRootRef} className="topik-archive mx-auto max-w-3xl space-y-5 p-5 sm:p-8">
    <style>{ARCHIVE_CSS}</style>
    <audio ref={audioRef} preload="auto" className="hidden" />
    <div className="rounded-3xl border border-amber-400/25 bg-slate-900 p-6 sm:p-9">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Thi thử · Kỳ {exam.round} · {exam.level}</p>
      <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">Sẵn sàng bắt đầu bài thi?</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">Bài thi kéo dài {exam.level === "TOPIK I" ? "100" : "180"} phút. Khi bắt đầu, đề sẽ mở toàn màn hình và phần nghe tự phát liên tục một lần. Thanh nghe chỉ hiển thị tiến độ; không thể tua hoặc tạm dừng.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={startMock} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-400">Xác nhận · Bắt đầu thi</button>
        <button onClick={onExit} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800">Quay lại kho đề</button>
      </div>
      {fullscreenError && <p role="alert" className="mt-4 text-sm font-bold text-rose-300">{fullscreenError}</p>}
    </div>
  </main>;

  return <main ref={fullscreenRootRef} className={`topik-archive ${mode === "mock" ? "min-h-screen w-full space-y-4 bg-slate-950 p-3 sm:p-6" : "mx-auto max-w-4xl space-y-4 pb-24 animate-fadeIn"}`}>
    <style>{ARCHIVE_CSS}</style>
    <audio ref={audioRef} onLoadedMetadata={(event) => setAudioDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onDurationChange={(event) => setAudioDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onTimeUpdate={(event) => { const current = event.currentTarget.currentTime; setAudioTime(current); if (stopAtRef.current != null && current >= stopAtRef.current) { event.currentTarget.pause(); stopAtRef.current = null; } }} onPause={(event) => { const audio = event.currentTarget; if (mode === "mock" && startedRef.current && !submittedRef.current && audio.currentTime < audio.duration) void audio.play().catch(() => undefined); }} preload="auto" className="hidden" />
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
      {mode === "mock" ? <button onClick={() => { if (window.confirm("Bỏ thi và thoát khỏi bài thi này? Tiến độ hiện tại sẽ không được lưu.")) { exitFullscreen(); onExit(); } }} className="inline-flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-400/20"><ArrowLeft className="h-4 w-4" /> Bỏ thi</button> : <button onClick={() => { pauseAudio(); onExit(); }} className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Kho đề</button>}
      <div className="text-center"><p className="text-xs font-black text-white">Kỳ {exam.round} · {exam.year} · {exam.level}</p><p className="text-[10px] text-slate-500">{mode === "mock" ? "Thi thử · không xem đáp án trước khi nộp" : "Luyện đề · phản hồi ngay"}</p></div>
      <div className="flex items-center gap-2">
        {mode === "mock" ? <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-bold ${timeLeft < 300 ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : "border-slate-700 bg-slate-950 text-amber-200"}`}><Clock3 className="h-3.5 w-3.5" />{formatTime(timeLeft)}</span> : <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[10px] font-bold text-emerald-200">Luyện đề</span>}
        <button onClick={() => setShowMap((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300"><ListChecks className="h-4 w-4" />{Object.keys(answers).length}/{allQuestions.length}</button>
      </div>
    </header>

    {section.id === "listening" && section.audio && <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4" aria-label="Tiến trình audio bài nghe">
      <div className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-slate-200">{mode === "mock" ? "Bài nghe · tự phát liên tục" : `Nghe câu ${question.no} · tự phát`}</span><span className="font-mono text-slate-300">{formatTime(mode === "mock" ? audioTime : Math.max(0, audioTime - audioWindow[0]))} / {formatTime(mode === "mock" ? audioDuration : Math.max(0, (audioWindow[1] ?? audioDuration) - audioWindow[0]))}</span></div>
      <div className="mt-3 flex items-center gap-3">
        <input aria-label="Tiến trình audio" type="range" min={mode === "mock" ? 0 : audioWindow[0]} max={Math.max(mode === "mock" ? audioDuration : audioWindow[1] ?? audioDuration, 0.1)} step="0.1" value={Math.min(audioTime, Math.max(mode === "mock" ? audioDuration : audioWindow[1] ?? audioDuration, 0.1))} disabled={mode === "mock" || !audioDuration} onChange={(event) => seekPracticeAudio(Number(event.target.value))} className={`h-2 min-w-0 flex-1 accent-sky-500 ${mode === "mock" ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`} />
        <span className="shrink-0 text-[10px] font-bold text-slate-400">Còn {formatTime(Math.max(0, (mode === "mock" ? audioDuration : audioWindow[1] ?? audioDuration) - audioTime))}</span>
        {mode === "practice" && <button onClick={() => play(question.audio?.[0] ?? question.replay?.[0], question.audio?.[1] ?? question.replay?.[1])} aria-label="Phát lại câu hiện tại" className="rounded-lg border border-sky-400/25 bg-sky-400/10 p-2 text-sky-200"><Play className="h-4 w-4" /></button>}
      </div>
      {mode === "mock" && <p className="mt-2 text-[10px] text-slate-400">Không thể tua hoặc tạm dừng trong khi thi.</p>}
    </section>}

    <div className="flex flex-wrap gap-2">
      {sections.map((item, itemIndex) => <button key={item.id} onClick={() => goTo(itemIndex, 0)} className={`rounded-xl border px-4 py-2 text-xs font-black transition ${itemIndex === sectionIndex ? "border-sky-400/60 bg-sky-400/10 text-sky-700 dark:text-sky-200" : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"}`}>{item.id === "listening" ? <Headphones className="mr-1.5 inline h-3.5 w-3.5" /> : null}{item.id === "listening" ? "Nghe" : "Đọc"} · {item.questions.length} câu</button>)}
    </div>

    {showMap && <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="mb-3 flex items-center justify-between"><p className="text-xs font-black text-white">Bản đồ câu hỏi</p><span className="text-[10px] text-slate-500">Đã chọn {Object.keys(answers).length}/{allQuestions.length}</span></div>
      {sections.map((item, itemIndex) => <div key={item.id} className="mb-3 last:mb-0"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.id === "listening" ? "Nghe" : "Đọc"}</p><div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">{item.questions.map((q, qIndex) => <button key={q.no} onClick={() => goTo(itemIndex, qIndex)} className={`h-8 rounded-md border text-[10px] font-bold ${itemIndex === sectionIndex && qIndex === index ? "border-sky-400 bg-sky-400/15 text-sky-200" : answers[q.no] ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-500"}`}>{q.no}</button>)}</div></div>)}
    </div>}

    <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div><p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Câu {question.no} / {exam.level === "TOPIK I" ? 70 : 100}</p><p className="mt-0.5 text-[10px] text-slate-500">{question.points || 2} điểm · {section.title}</p></div>
        {mode === "practice" && question.audio && <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-[10px] font-bold text-sky-200"><Volume2 className="h-3.5 w-3.5" /> Audio câu hỏi</span>}
      </div>

      {group?.instruction && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Hướng dẫn nhóm câu {group.from}–{group.to}</p><p className="mt-1 whitespace-pre-line text-xs leading-6 text-slate-300" dangerouslySetInnerHTML={{ __html: safeHtml(group.instruction) }} /></div>}

      {question.prompt?.html && <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 font-noto text-sm leading-7 text-slate-100 [&_.exam-box]:rounded-lg [&_.exam-box]:border [&_.exam-box]:border-slate-700 [&_.exam-box]:p-3 [&_b]:font-black" dangerouslySetInnerHTML={{ __html: safeHtml(question.prompt.html) }} />}
      {question.prompt?.image && <figure className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-white p-2"><img src={imageUrl(exam.round, question.prompt.image)} alt={question.prompt.alt || `Câu ${question.no}`} className="mx-auto max-h-[360px] w-auto max-w-full object-contain" loading="lazy" /></figure>}

      <div className={`mt-4 grid gap-2 ${question.layout === 4 ? "sm:grid-cols-2" : question.layout === 2 ? "sm:grid-cols-2" : ""}`}>
        {(question.options || []).map((option, optionIndex) => {
          const active = selected === optionIndex + 1;
          const correct = question.answer === optionIndex + 1;
          const reveal = submitted || (mode === "practice" && isChecked);
          const style = reveal && correct ? "border-emerald-500/60 bg-emerald-500/10" : reveal && active && !correct ? "border-rose-500/60 bg-rose-500/10" : active ? "border-sky-400/60 bg-sky-400/10" : "border-slate-800 bg-slate-950/50 hover:border-slate-600";
          return <button key={optionIndex} onClick={() => choose(optionIndex)} disabled={submitted} className={`flex min-h-12 items-start gap-3 rounded-xl border p-3 text-left transition ${style}`}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-black text-white">{optionIndex + 1}</span>
            <span className="min-w-0 flex-1">
              {option.html && <span className="block whitespace-pre-line font-noto text-sm leading-6 text-slate-100" dangerouslySetInnerHTML={{ __html: safeHtml(option.html) }} />}
              {option.image && <img src={imageUrl(exam.round, option.image)} alt={option.alt || `Lựa chọn ${optionIndex + 1}`} className="mt-2 max-h-48 w-full rounded-lg bg-white object-contain" loading="lazy" />}
            </span>
            {reveal && correct && <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />}
            {reveal && active && !correct && <XCircle className="mt-1 h-4 w-4 shrink-0 text-rose-300" />}
          </button>;
        })}
      </div>

      {(submitted || (mode === "practice" && isChecked)) && <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-400/[0.05] p-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Đáp án {question.answer} · Giải thích</p>
        <div className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-200">{question.explanation || `Đáp án đúng là ${question.answer}.`}</div>
      </div>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4">
        <button onClick={previousQuestion} disabled={sectionIndex === 0 && index === 0} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 disabled:opacity-40">← Trước</button>
        <div className="flex flex-wrap gap-2">
          {mode === "practice" && !isChecked && <button onClick={() => setChecked((current) => ({ ...current, [question.no]: true }))} disabled={!selected} className="rounded-lg border border-amber-400/30 px-4 py-2 text-xs font-black text-amber-200 hover:bg-amber-400/10 disabled:opacity-40">Kiểm tra</button>}
          {!submitted && (sectionIndex < sections.length - 1 || index < section.questions.length - 1) && <button onClick={nextQuestion} className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-4 py-2 text-xs font-black text-white hover:bg-sky-400">Tiếp <ArrowRight className="h-3.5 w-3.5" /></button>}
          {!submitted && sectionIndex === sections.length - 1 && index === section.questions.length - 1 && <button onClick={submit} className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-black text-white hover:bg-emerald-400">Nộp bài</button>}
        </div>
      </div>
    </section>

    {submitted && score && <section className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.05] p-5 text-center">
      <p className="text-xs font-bold text-slate-300">Kết quả · Kỳ {exam.round} · {exam.level}</p>
      <p className="mt-1 text-4xl font-black text-emerald-300">{score.points}<span className="text-lg text-emerald-200/70">/{score.total} điểm</span></p>
      <p className="mt-1 text-xs text-slate-400">{score.correct}/{allQuestions.length} câu đúng · {Math.round(score.correct / allQuestions.length * 100)}% chính xác</p>
      <p className="mt-2 text-[10px] text-slate-500">Điểm luyện tập nội bộ, không phải kết quả do NIIED cấp.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2"><button onClick={() => { setAnswers({}); setChecked({}); setSubmitted(false); setScore(null); submittedRef.current = false; setSectionIndex(0); setIndex(0); setTimeLeft(mode === "mock" ? (exam.level === "TOPIK I" ? LEVEL_I_TIME : LEVEL_II_TIME) : 0); if (mode === "mock") { exitFullscreen(); setStarted(false); } }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200"><RotateCcw className="h-3.5 w-3.5" /> Làm lại</button>{mode === "practice" && <button onClick={() => { pauseAudio(); onExit(); }} className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200">Chọn đề khác</button>}</div>
    </section>}
  </main>;
}

export function TopikArchiveModule() {
  const [catalog, setCatalog] = useState<CatalogExam[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"TOPIK I" | "TOPIK II">("TOPIK I");
  const [active, setActive] = useState<{ id: string; mode: Mode } | null>(null);
  const [exam, setExam] = useState<ArchiveExam | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || "";
    const mode = params.get("mode");
    if (!id || (mode !== "practice" && mode !== "mock")) return;
    const timer = window.setTimeout(() => setActive({ id, mode }), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    void fetch("/topik-archive/data/index.json", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Không tải được danh mục đề.")))
      .then((data) => setCatalog(Array.isArray(data?.exams) ? data.exams : []))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Không tải được danh mục đề."));
  }, []);

  useEffect(() => {
    if (!active) return;
    void fetch(`/topik-archive/data/${active.id}.json`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Không tải được đề.")))
      .then((data) => setExam(data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Không tải được đề."));
  }, [active]);

  const exams = useMemo(() => (catalog || []).filter((item) => item.level === tab), [catalog, tab]);

  if (active) {
    if (error) return <main className="mx-auto max-w-3xl p-6"><div className="rounded-2xl border border-rose-400/30 bg-rose-400/[0.06] p-6 text-center text-sm text-rose-200">{error}</div><button onClick={() => { setError(""); setActive(null); }} className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300">← Về kho đề</button></main>;
    if (!exam || exam.id !== active.id) return <main className="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-sky-400" /><span className="ml-2 text-sm text-slate-300">Đang tải đề...</span></main>;
    return <ExamRunner exam={exam} mode={active.mode} onExit={() => setActive(null)} />;
  }

  return <main className="topik-archive mx-auto max-w-5xl space-y-5 pb-24 animate-fadeIn">
    <style>{ARCHIVE_CSS}</style>
    <header className="rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-[#111d38] via-[#121a31] to-[#1e1940] p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">HaechiVN · Kho đề</p><h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">TOPIK I / II · 24 đề chính thức</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Luyện đề có đáp án và giải thích, hoặc thi thử có tính giờ. Đề, ảnh và audio lấy từ bộ lưu trữ NIIED 2014–2025.</p></div>
        <a href="/topik" className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-xs font-black text-sky-200 hover:bg-sky-400/15"><ArrowLeft className="h-4 w-4" /> Luyện theo dạng bài</a>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {(["TOPIK I", "TOPIK II"] as const).map((level) => <button key={level} onClick={() => setTab(level)} aria-pressed={tab === level} className={`rounded-2xl border p-4 text-left transition ${tab === level ? "border-sky-400/60 bg-sky-400/10" : "border-white/10 bg-slate-950/20 hover:border-white/20"}`}><span className="text-xs font-black uppercase tracking-widest text-sky-300">{level}</span><span className="mt-1 block text-sm font-bold text-white">{level === "TOPIK I" ? "Sơ cấp · cấp 1–2" : "Trung · cao cấp · cấp 3–6"}</span><span className="mt-1 block text-[11px] text-slate-400">{level === "TOPIK I" ? "70 câu · 100 phút · 200 điểm" : "100 câu · 180 phút · 300 điểm"}</span></button>)}
      </div>
    </header>

    {error && <div className="rounded-xl border border-rose-400/30 bg-rose-400/[0.06] p-4 text-sm text-rose-200">{error}</div>}
    {!catalog && !error && <div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-sm text-slate-300"><Loader2 className="mr-2 h-5 w-5 animate-spin text-sky-400" /> Đang tải kho đề...</div>}

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {exams.map((item) => <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-black text-white">Kỳ {item.round} <span className="text-slate-400">· {item.year}</span></p><p className="mt-1 text-[11px] text-slate-400">{item.level} · {item.questions} câu</p></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-1 text-[9px] font-black text-emerald-200">CHÍNH THỨC</span></div>
        <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => setActive({ id: item.id, mode: "practice" })} className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-2 py-2 text-[10px] font-black text-sky-200 hover:bg-sky-400/20">Luyện đề</button><button onClick={() => setActive({ id: item.id, mode: "mock" })} className="rounded-lg bg-slate-800 px-2 py-2 text-[10px] font-black text-white hover:bg-slate-700">Thi thử</button></div>
      </article>)}
    </div>

    <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-[11px] leading-5 text-slate-400">
      <p className="font-bold text-slate-200">Nguồn và lưu ý</p>
      <p className="mt-1">Đề thi, hình ảnh và audio thuộc bản quyền của NIIED/TOPIK. Trang này dùng cho luyện tập nội bộ, không thay thế cổng đăng ký hoặc kết quả chính thức. Audio có thể tải chậm ở lần nghe đầu.</p>
      <p className="mt-2 font-bold text-emerald-300">Tài nguyên được sử dụng cho mục đích phi thương mại theo sự cho phép của đơn vị cung cấp.</p>
    </section>
  </main>;
}
