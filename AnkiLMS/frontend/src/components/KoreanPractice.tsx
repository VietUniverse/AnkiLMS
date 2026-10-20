"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Mic, Volume2 } from "lucide-react";
import { calculateKoreanSimilarity, normalizeKoreanText } from "../lib/koreanText";
import { speakKorean, stopKoreanSpeech } from "../lib/koreanSpeech";

export type KoreanPracticePrompt = { korean: string; translation?: string; label?: string };

export function KoreanPractice({ prompts, title = "Luyện ngay", autoPlay = false }: { prompts: KoreanPracticePrompt[]; title?: string; autoPlay?: boolean }) {
  const available = useMemo(() => prompts.filter((item) => item.korean.trim()), [prompts]);
  const [mode, setMode] = useState<"dictation" | "shadowing">("dictation");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState("");
  const prompt = available[index];

  const speak = () => speakKorean(prompt.korean);

  useEffect(() => {
    if (!autoPlay || !prompt) return;
    const timer = window.setTimeout(() => { void speak(); }, 120);
    return () => { window.clearTimeout(timer); stopKoreanSpeech(); };
  // Automatically play each new prompt when entering practice or moving on.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, prompt?.korean]);

  const record = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Nhận dạng giọng nói cần Chrome hoặc Edge."); return; }
    setError("");
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => setHeard(event.results?.[0]?.[0]?.transcript || "");
    recognition.onerror = () => setError("Không nhận được giọng nói. Kiểm tra quyền microphone rồi thử lại.");
    recognition.start();
  };

  const resetPrompt = (nextIndex: number) => {
    setIndex(nextIndex);
    setAnswer("");
    setChecked(false);
    setRevealed(false);
    setHeard("");
    setError("");
  };

  if (!prompt) return null;
  const result = checked ? calculateKoreanSimilarity(normalizeKoreanText(answer), normalizeKoreanText(prompt.korean)) : null;

  return <section className="card-duo overflow-hidden border border-sky-500/20 bg-gradient-to-br from-[#111d38] to-[#171a3b]" aria-label={title}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3 sm:px-6">
      <div className="min-w-0"><p className="text-[10px] font-bold text-sky-300">{prompt.label || title} · {index + 1}/{available.length}</p><h1 className="mt-0.5 truncate text-base font-black text-white">{title}</h1></div>
      <div className="flex rounded-xl border border-slate-700 bg-slate-950/50 p-1" aria-label="Chế độ luyện tập">
        <button onClick={() => { setMode("dictation"); setAnswer(""); setChecked(false); }} aria-pressed={mode === "dictation"} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${mode === "dictation" ? "bg-violet-500/20 text-violet-200" : "text-slate-400"}`}>Nghe chép</button>
        <button onClick={() => { setMode("shadowing"); setAnswer(""); setChecked(false); }} aria-pressed={mode === "shadowing"} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${mode === "shadowing" ? "bg-emerald-500/20 text-emerald-200" : "text-slate-400"}`}>Shadowing</button>
      </div>
    </header>

    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/45 p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{mode === "dictation" ? "Nghe rồi chép lại" : "Nghe rồi nói nhại"}</p>
          {revealed ? <><p className="mt-2 font-noto text-xl font-black text-white">{prompt.korean}</p>{prompt.translation && <p className="mt-1 text-sm text-slate-300">{prompt.translation}</p>}</> : <p className="mt-2 text-sm text-slate-400">Âm thanh đã tự phát · bấm loa để nghe lại</p>}
        </div>
        <button onClick={speak} aria-label="Phát lại câu tiếng Hàn" className="shrink-0 rounded-xl bg-sky-500/15 p-3 text-sky-200 hover:bg-sky-500/25"><Volume2 className="h-5 w-5" /></button>
      </div>

      {mode === "dictation" ? <div>
        <label className="block text-xs font-bold text-slate-400" htmlFor="topic-dictation-answer">Câu bạn nghe được</label>
        <textarea id="topic-dictation-answer" autoFocus value={answer} onChange={(event) => { setAnswer(event.target.value); setChecked(false); }} rows={3} placeholder="Nhập câu tiếng Hàn…" className="mt-2 block w-full resize-y rounded-xl border border-slate-700 bg-slate-950/70 p-3 font-noto text-base text-white outline-none focus:border-sky-500" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (answer.trim()) setChecked(true); } }} />
        <div className="mt-3 flex items-center justify-between gap-3"><button onClick={() => setRevealed((value) => !value)} className="inline-flex items-center gap-2 text-xs font-bold text-amber-200"><Eye className="h-4 w-4" />{revealed ? "Ẩn đáp án" : "Xem đáp án và nghĩa"}</button><button onClick={() => setChecked(true)} disabled={!answer.trim()} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"><Check className="h-4 w-4" />Kiểm tra</button></div>
        {result !== null && <p role="status" className={`mt-3 text-sm font-bold ${result >= 90 ? "text-emerald-300" : "text-amber-200"}`}>Độ khớp: {Math.round(result)}%</p>}
      </div> : <div>
        <p className="text-xs text-slate-400">Nói lại câu vừa nghe, hoặc dùng micro để đối chiếu lời nhận dạng.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3"><button onClick={record} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-xs font-black text-emerald-200"><Mic className="h-4 w-4" />Dùng micro</button><button onClick={() => setRevealed((value) => !value)} className="inline-flex items-center gap-2 text-xs font-bold text-amber-200"><Eye className="h-4 w-4" />{revealed ? "Ẩn đáp án" : "Xem đáp án"}</button></div>
        {heard && <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 font-noto text-sm text-white">{heard}<span className="ml-2 text-xs text-emerald-200">{Math.round(calculateKoreanSimilarity(normalizeKoreanText(heard), normalizeKoreanText(prompt.korean)))}%</span></p>}
      </div>}

      {error && <p role="status" className="text-xs text-amber-200">{error}</p>}
      {available.length > 1 && <footer className="flex items-center justify-between border-t border-white/5 pt-3"><span className="text-[11px] text-slate-500">{index + 1} / {available.length}</span><button onClick={() => resetPrompt((index + 1) % available.length)} className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:border-sky-500">Câu tiếp <span aria-hidden="true">→</span></button></footer>}
    </div>
  </section>;
}
