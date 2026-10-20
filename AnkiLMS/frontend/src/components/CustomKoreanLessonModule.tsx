"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calculateKoreanSimilarity } from "../lib/koreanText";
import { ApiClient } from "../lib/apiClient";
import { ArrowLeft, ArrowRight, CheckCircle2, Clapperboard, Play, Plus, Trash2, Volume2 } from "lucide-react";

type PersonalLesson = { id: string; title: string; videoId: string; lines: string[]; translations: string[]; createdAt: string };
const STORAGE_KEY = "haechivn_personal_korean_lessons_v1";

function getVideoId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
    if (url.hostname.endsWith("youtube.com") || url.hostname.endsWith("youtube-nocookie.com")) {
      return url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).at(-1) || "";
    }
  } catch { return ""; }
  return "";
}

export function CustomKoreanLessonModule() {
  const [lessons, setLessons] = useState<PersonalLesson[]>([]);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [translations, setTranslations] = useState("");
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); if (Array.isArray(saved)) setLessons(saved); } catch { setLessons([]); }
  }, []);
  const active = useMemo(() => lessons.find((lesson) => lesson.id === activeId) || null, [lessons, activeId]);
  const videoId = getVideoId(videoUrl.trim());
  const currentLine = active?.lines[lineIndex] || "";

  function saveLessons(next: PersonalLesson[]) { setLessons(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  function createLesson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const lines = transcript.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!title.trim()) { setError("Nhập tên bài học."); return; }
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) { setError("Link YouTube chưa hợp lệ. Hãy dùng link dạng youtube.com/watch?v=… hoặc youtu.be/…"); return; }
    if (!lines.length) { setError("Dán phụ đề tiếng Hàn, mỗi dòng một câu."); return; }
    if (lines.length > 200) { setError("Mỗi bài tối đa 200 dòng để học dễ theo dõi."); return; }
    const vi = translations.split(/\r?\n/).map((line) => line.trim());
    const lesson: PersonalLesson = { id: crypto.randomUUID(), title: title.trim(), videoId, lines, translations: lines.map((_, index) => vi[index] || ""), createdAt: new Date().toISOString() };
    saveLessons([lesson, ...lessons]); setTitle(""); setVideoUrl(""); setTranscript(""); setTranslations(""); setActiveId(lesson.id); setLineIndex(0); setAnswer(""); setScore(null);
  }
  function startPractice(lesson: PersonalLesson) { setActiveId(lesson.id); setLineIndex(0); setAnswer(""); setScore(null); }
  function checkAnswer() {
    if (!currentLine || score !== null) return;
    const result = calculateKoreanSimilarity(currentLine, answer);
    setScore(result);
    void ApiClient.recordStudySession("custom_dictation", 1, result >= 80 ? 1 : 0, result >= 80 ? 5 : 0, 20);
  }
  function moveLine(offset: number) { setLineIndex((value) => Math.min(active!.lines.length - 1, Math.max(0, value + offset))); setAnswer(""); setScore(null); }
  function speak() { if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(currentLine); utterance.lang = "ko-KR"; utterance.rate = 0.82; window.speechSynthesis.speak(utterance); }

  if (active) return <div className="mx-auto max-w-6xl space-y-5 animate-fadeIn"><button onClick={() => setActiveId(null)} className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Danh sách bài của tôi</button><header className="card-duo p-5"><p className="text-xs font-bold uppercase tracking-widest text-violet-300">Dictation cá nhân · {lineIndex + 1}/{active.lines.length}</p><h1 className="mt-2 text-xl font-black text-white">{active.title}</h1><p className="mt-1 text-xs text-slate-400">Gõ lại câu tiếng Hàn bạn nghe được trong video, sau đó đối chiếu phụ đề.</p></header><div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]"><section className="card-duo overflow-hidden"><div className="aspect-video bg-black"><iframe src={`https://www.youtube-nocookie.com/embed/${active.videoId}?enablejsapi=1&playsinline=1`} title={active.title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div><div className="flex items-center justify-between p-4"><button onClick={() => moveLine(-1)} disabled={lineIndex === 0} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 disabled:opacity-40"><ArrowLeft className="inline h-4 w-4" /> Câu trước</button><button onClick={() => moveLine(1)} disabled={lineIndex >= active.lines.length - 1} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 disabled:opacity-40">Câu tiếp <ArrowRight className="inline h-4 w-4" /></button></div></section><section className="card-duo flex flex-col p-5"><div className="mb-4 flex items-center justify-between"><span className="text-xs font-bold text-violet-300">CÂU {lineIndex + 1}</span><button onClick={speak} aria-label="Nghe đọc câu tiếng Hàn" className="rounded-lg border border-slate-700 p-2 text-sky-300"><Volume2 className="h-4 w-4" /></button></div><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (score === null) checkAnswer(); } }} lang="ko" className="min-h-32 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 font-noto text-base text-white outline-none focus:border-sky-500" placeholder="Gõ câu bạn vừa nghe…" />{score !== null && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Độ giống {score}%</div><p className="mt-2 font-noto text-sm text-white">{currentLine}</p>{active.translations[lineIndex] && <p className="mt-1 text-xs text-slate-400">{active.translations[lineIndex]}</p>}</div>}<button onClick={checkAnswer} disabled={!answer.trim() || score !== null} className="btn-duo btn-duo-primary mt-4 px-4 py-3 text-xs disabled:opacity-40">Kiểm tra câu trả lời</button></section></div></div>;

  return <div className="mx-auto max-w-5xl space-y-6 animate-fadeIn"><header className="card-duo p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-violet-300">Bài học do bạn tạo</p><h1 className="mt-2 text-2xl font-black text-white">Tạo bài Dictation từ video YouTube</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Dán link video và phụ đề tiếng Hàn (mỗi dòng một câu). HaechiVN sẽ tạo bài nghe chép riêng cho bạn. Phụ đề không được tự nhận dạng; bạn có thể sao chép từ phụ đề của video. Bài được lưu trong trình duyệt này.</p></header><form onSubmit={createLesson} className="card-duo grid gap-4 p-5 sm:grid-cols-2"><label className="text-xs font-bold text-slate-300">Tên bài<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-violet-500" placeholder="Ví dụ: Hội thoại ở quán cà phê" /></label><label className="text-xs font-bold text-slate-300">Link YouTube<input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-violet-500" placeholder="https://youtu.be/…" /></label><label className="text-xs font-bold text-slate-300 sm:col-span-2">Phụ đề tiếng Hàn · mỗi dòng một câu<textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={7} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 font-noto text-sm text-white outline-none focus:border-violet-500" placeholder={'안녕하세요.\n오늘은 무엇을 드릴까요?'} /></label><label className="text-xs font-bold text-slate-300 sm:col-span-2">Bản dịch tiếng Việt (không bắt buộc) · cùng thứ tự dòng<textarea value={translations} onChange={(event) => setTranslations(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-violet-500" placeholder={'Xin chào.\nHôm nay bạn muốn dùng gì ạ?'} /></label>{error && <p role="alert" className="sm:col-span-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}<button type="submit" className="btn-duo btn-duo-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:col-span-2"><Plus className="h-4 w-4" /> Tạo bài Dictation</button></form><section className="space-y-3"><div className="flex items-center gap-2"><Clapperboard className="h-5 w-5 text-sky-300" /><h2 className="text-lg font-black text-white">Bài đã tạo trên thiết bị này</h2></div>{lessons.length ? <div className="grid gap-3 sm:grid-cols-2">{lessons.map((lesson) => <article key={lesson.id} className="card-duo flex flex-col p-5"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">{lesson.lines.length} câu</p><h3 className="mt-2 flex-1 text-lg font-black text-white">{lesson.title}</h3><div className="mt-4 flex items-center gap-2"><button onClick={() => startPractice(lesson)} className="btn-duo btn-duo-primary inline-flex flex-1 items-center justify-center gap-2 px-4 py-3 text-xs"><Play className="h-4 w-4" /> Bắt đầu học</button><button onClick={() => saveLessons(lessons.filter((item) => item.id !== lesson.id))} aria-label={`Xóa bài ${lesson.title}`} className="rounded-xl border border-slate-700 p-3 text-slate-400 hover:border-rose-500 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button></div></article>)}</div> : <div className="card-duo p-8 text-center text-sm text-slate-400">Bạn chưa tạo bài học nào.</div>}</section><Link href="/dictation" className="inline-block text-xs font-bold text-sky-300">Mở thư viện Dictation có sẵn →</Link></div>;
}
