"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Clock3, Headphones, Layers, Search, Sparkles, Volume2 } from "lucide-react";
import { AppShell } from "./AppShell";
import { KOREAN_COURSE } from "../data/koreanCourse";
import { KoreanPractice } from "./KoreanPractice";

const STORAGE_KEY = "haechivn_korean_course_progress_v1";
type CourseProgress = { completed: string[]; lastLesson: string | null };

export function KoreanLessonsModule() {
  const [filter, setFilter] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState<CourseProgress>({ completed: [], lastLesson: null });
  const [hiddenLessonIds, setHiddenLessonIds] = useState<string[]>([]);
  const [answer, setAnswer] = useState<number | null>(null);
  const courseLessons = useMemo(() => KOREAN_COURSE.filter((lesson) => !hiddenLessonIds.includes(lesson.id)), [hiddenLessonIds]);
  const active = courseLessons.find((lesson) => lesson.id === activeId) || null;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      setProgress({ completed: Array.isArray(saved.completed) ? saved.completed : [], lastLesson: typeof saved.lastLesson === "string" ? saved.lastLesson : null });
    } catch { setProgress({ completed: [], lastLesson: null }); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/lessons").then((response) => response.ok ? response.json() : null).then((data) => {
      if (!cancelled && Array.isArray(data?.hiddenLessonIds)) setHiddenLessonIds(data.hiddenLessonIds);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const lessons = useMemo(() => courseLessons.filter((lesson) =>
    (filter === "Tất cả" || lesson.level === filter) &&
    `${lesson.title} ${lesson.unit} ${lesson.goal} ${lesson.vocabulary.map((word) => word.korean + word.meaning).join(" ")}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  ), [filter, query, courseLessons]);
  const units = useMemo(() => [...new Set(lessons.map((lesson) => lesson.unit))], [lessons]);

  function saveProgress(next: CourseProgress) {
    setProgress(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  function openLesson(id: string) {
    setActiveId(id); setAnswer(null);
    saveProgress({ ...progress, lastLesson: id });
  }
  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "ko-KR"; utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }
  function completeLesson() {
    if (!active || answer !== active.quiz.answer) return;
    saveProgress({ ...progress, completed: [...new Set([...progress.completed, active.id])] });
  }

  return <AppShell>
    <div className="mx-auto max-w-7xl space-y-6 animate-fadeIn pb-24">
      {active ? <>
        <button onClick={() => { setActiveId(null); setAnswer(null); }} className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Thư viện bài học</button>
        <header className="card-duo overflow-hidden border-sky-500/20 bg-gradient-to-br from-[#13244e] via-[#101d3d] to-[#0f1b38] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-300"><span>{active.unit}</span><span>·</span><span>{active.level}</span><span>·</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {active.minutes} phút</span></div>
          <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">{active.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{active.goal}</p>
          <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-slate-950/50 px-3 py-1.5 text-[11px] font-bold text-slate-300">{active.vocabulary.length} từ mới</span><span className="rounded-full bg-slate-950/50 px-3 py-1.5 text-[11px] font-bold text-slate-300">{active.grammar.length} mẫu ngữ pháp</span><span className="rounded-full bg-slate-950/50 px-3 py-1.5 text-[11px] font-bold text-slate-300">Hội thoại thực tế</span></div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="card-duo p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><span className="rounded-lg bg-violet-500/15 p-2 text-violet-300"><BookOpen className="h-4 w-4" /></span><div><h2 className="text-sm font-black text-white">Ngữ pháp trọng tâm</h2><p className="text-[10px] text-slate-500">Đọc mẫu, hiểu cách dùng, rồi nói ví dụ thành tiếng</p></div></div><div className="space-y-3">{active.grammar.map((item) => <article key={item.pattern} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"><h3 className="font-noto text-sm font-black text-violet-200">{item.pattern}</h3><p className="mt-2 text-xs leading-5 text-slate-400">{item.explanation}</p><button onClick={() => speak(item.example)} className="mt-3 flex items-start gap-2 rounded-lg bg-slate-900/80 p-3 text-left hover:bg-slate-800"><Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" /><span><span className="font-noto text-sm font-bold text-white">{item.example}</span><span className="mt-1 block text-[11px] text-slate-400">{item.translation}</span></span></button></article>)}</div></div>
          <div className="card-duo p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><span className="rounded-lg bg-emerald-500/15 p-2 text-emerald-300"><Volume2 className="h-4 w-4" /></span><div><h2 className="text-sm font-black text-white">Từ vựng và phát âm</h2><p className="text-[10px] text-slate-500">Chạm vào một từ để nghe cách đọc tiếng Hàn</p></div></div><div className="grid gap-2 sm:grid-cols-2">{active.vocabulary.map((word) => <button key={word.korean} onClick={() => speak(word.korean)} className="group flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-left hover:border-emerald-500/40"><span><span className="block font-noto text-base font-black text-white">{word.korean}</span><span className="mt-1 block text-xs font-semibold text-emerald-200">{word.meaning}</span></span><Volume2 className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-emerald-300" /></button>)}</div>
            <div className="mt-5 rounded-xl border border-sky-500/20 bg-sky-950/15 p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-xs font-black text-sky-200">Hội thoại ngắn</h3><p className="mt-1 text-[10px] text-slate-500">Nghe từng câu, sau đó đọc lại theo vai</p></div><Headphones className="h-4 w-4 text-sky-300" /></div><div className="space-y-2">{active.dialogue.map((line, index) => <button key={`${line.speaker}-${index}`} onClick={() => speak(line.korean)} className="flex w-full gap-3 rounded-lg p-2 text-left hover:bg-slate-900/80"><span className="w-12 shrink-0 pt-0.5 text-[10px] font-bold text-sky-300">{line.speaker}</span><span><span className="block font-noto text-sm text-white">{line.korean}</span><span className="mt-0.5 block text-[11px] text-slate-500">{line.translation}</span></span></button>)}</div></div>
          </div>
        </section>

        <KoreanPractice title={`Nghe chép & shadowing · ${active.title}`} prompts={active.dialogue.map((line, index) => ({ korean: line.korean, translation: line.translation, label: `${line.speaker} · Câu ${index + 1}` }))} />

        <section className="card-duo p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><span className="rounded-lg bg-amber-500/15 p-2 text-amber-300"><CheckCircle2 className="h-4 w-4" /></span><div><h2 className="text-sm font-black text-white">Kiểm tra nhanh</h2><p className="text-[10px] text-slate-500">Trả lời đúng để lưu bài đã hoàn thành</p></div></div><p className="font-noto text-base font-bold text-slate-100">{active.quiz.question}</p><div className="mt-4 grid gap-2 md:grid-cols-3">{active.quiz.options.map((option, index) => { const correct = answer !== null && index === active.quiz.answer; const wrong = answer === index && index !== active.quiz.answer; return <button key={option} onClick={() => setAnswer(index)} className={`rounded-xl border p-3 text-left text-xs font-semibold transition ${correct ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200" : wrong ? "border-rose-500/50 bg-rose-500/10 text-rose-200" : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-sky-500/50"}`}><span className="mr-2 text-slate-500">{String.fromCharCode(65 + index)}.</span>{option}{correct && <Check className="ml-2 inline h-4 w-4" />}</button>; })}</div>{answer !== null && <div role="status" className={`mt-4 rounded-xl p-3 text-xs leading-5 ${answer === active.quiz.answer ? "border border-emerald-500/20 bg-emerald-500/5 text-emerald-200" : "border border-amber-500/20 bg-amber-500/5 text-amber-100"}`}>{answer === active.quiz.answer ? "Đúng rồi! " : "Chưa đúng. "}{active.quiz.explanation}</div>}<div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] text-slate-500">{progress.completed.includes(active.id) ? "Bạn đã hoàn thành bài này." : "Có thể xem lại bài và làm lại câu hỏi bất cứ lúc nào."}</span><button onClick={completeLesson} disabled={answer !== active.quiz.answer || progress.completed.includes(active.id)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="h-4 w-4" />{progress.completed.includes(active.id) ? "Đã hoàn thành" : "Hoàn thành bài học"}</button></div></section>

        <div className="grid gap-3 sm:grid-cols-3"><Link href="/flashcards" className="card-duo flex items-center gap-3 p-4 text-xs font-bold text-slate-200 hover:border-sky-500"><Layers className="h-5 w-5 text-sky-300" /> Ôn tiếp từ mới bằng SRS Anki</Link><Link href="/dictation" className="card-duo flex items-center gap-3 p-4 text-xs font-bold text-slate-200 hover:border-violet-500"><Headphones className="h-5 w-5 text-violet-300" /> Luyện nghe chép chính tả</Link><button onClick={() => { const next = courseLessons[courseLessons.findIndex((item) => item.id === active.id) + 1]; if (next) openLesson(next.id); else { setActiveId(null); setAnswer(null); } }} className="card-duo flex items-center justify-center gap-2 p-4 text-xs font-bold text-emerald-200 hover:border-emerald-500">Bài tiếp theo <ArrowRight className="h-4 w-4" /></button></div>
      </> : <>
        <header className="card-duo relative overflow-hidden border-sky-500/20 bg-gradient-to-br from-[#13244e] via-[#101d3d] to-[#0f1b38] p-6 sm:p-9"><div className="absolute -right-10 -top-12 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" /><div className="relative"><p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300"><Sparkles className="h-3.5 w-3.5" /> Lộ trình học có hướng dẫn</p><h1 className="mt-3 text-2xl font-black text-white sm:text-4xl">Bài học tiếng Hàn</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Học theo từng chặng từ giới thiệu bản thân đến giao tiếp trung cấp. Mỗi bài có mục tiêu, ngữ pháp giải thích bằng tiếng Việt, từ vựng phát âm được, hội thoại và câu hỏi kiểm tra.</p><div className="mt-6 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">{[{ value: courseLessons.length, label: "bài học" }, { value: new Set(courseLessons.map((lesson) => lesson.unit)).size, label: "chặng học" }, { value: `${progress.completed.length}/${courseLessons.length}`, label: "đã hoàn thành" }].map((stat) => <div key={stat.label} className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3"><b className="text-xl font-black text-white">{stat.value}</b><span className="mt-1 block text-[10px] font-bold text-slate-500">{stat.label}</span></div>)}</div></div></header>
        <div className="flex flex-col gap-3 sm:flex-row"><label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3"><Search className="h-4 w-4 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600" placeholder="Tìm bài, chủ đề hoặc từ vựng…" /></label><div className="flex flex-wrap gap-2">{["Tất cả", "Sơ cấp 1", "Sơ cấp 2", "Trung cấp"].map((level) => <button key={level} onClick={() => setFilter(level)} className={`rounded-full border px-3 py-2 text-[11px] font-bold ${filter === level ? "border-sky-400 bg-sky-500/15 text-sky-200" : "border-slate-700 text-slate-400 hover:text-white"}`}>{level}</button>)}</div></div>
        {progress.lastLesson && !progress.completed.includes(progress.lastLesson) && courseLessons.some((lesson) => lesson.id === progress.lastLesson) && <button onClick={() => openLesson(progress.lastLesson!)} className="flex w-full items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-left"><span><span className="block text-[10px] font-bold uppercase tracking-widest text-amber-300">Tiếp tục bài đang học</span><b className="mt-1 block text-sm text-white">{courseLessons.find((lesson) => lesson.id === progress.lastLesson)?.title}</b></span><ArrowRight className="h-5 w-5 text-amber-300" /></button>}
        {units.map((unit) => { const unitLessons = lessons.filter((lesson) => lesson.unit === unit); return <section key={unit} className="space-y-3"><div className="flex items-end justify-between border-b border-slate-800 pb-2"><div><p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Lộ trình</p><h2 className="mt-1 text-lg font-black text-white">{unit}</h2></div><span className="text-[10px] font-bold text-slate-500">{unitLessons.filter((lesson) => progress.completed.includes(lesson.id)).length}/{unitLessons.length} bài xong</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{unitLessons.map((lesson, index) => { const done = progress.completed.includes(lesson.id); return <button key={lesson.id} onClick={() => openLesson(lesson.id)} className="card-duo group flex h-full flex-col p-5 text-left transition hover:-translate-y-0.5 hover:border-sky-500/50"><div className="flex items-center justify-between gap-3"><span className="rounded-lg bg-slate-950 px-2.5 py-1 text-[10px] font-black text-slate-500">{String(index + 1).padStart(2, "0")}</span><span className="rounded-full border border-slate-700 px-2.5 py-1 text-[9px] font-bold text-slate-400">{lesson.level}</span></div><h3 className="mt-4 font-noto text-base font-black text-white group-hover:text-sky-200">{lesson.title}</h3><p className="mt-2 flex-1 text-xs leading-5 text-slate-400">{lesson.goal}</p><div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3"><span className="flex items-center gap-1 text-[10px] font-bold text-slate-500"><Clock3 className="h-3 w-3" />{lesson.minutes} phút · {lesson.vocabulary.length} từ</span><span className={`inline-flex items-center gap-1 text-[10px] font-black ${done ? "text-emerald-300" : "text-sky-300"}`}>{done ? <><CheckCircle2 className="h-3.5 w-3.5" /> Hoàn thành</> : <>Vào học <ArrowRight className="h-3.5 w-3.5" /></>}</span></div></button>; })}</div></section>; })}
        {!lessons.length && <p className="card-duo p-8 text-center text-sm text-slate-400">Không tìm thấy bài phù hợp. Hãy đổi cấp độ hoặc từ khóa.</p>}
        <p className="text-center text-[10px] leading-5 text-slate-600">Tiến độ lộ trình được lưu trên thiết bị này. Âm thanh phát âm dùng giọng tiếng Hàn có sẵn trong trình duyệt.</p>
      </>}
    </div>
  </AppShell>;
}

