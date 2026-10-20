"use client";

import { useMemo, useState } from "react";
import { Mic, MicOff, RotateCcw, Volume2 } from "lucide-react";
import curatedPractice from "../data/curated_korean_practice.json";
import { SEJONG_TOPIC_VOCABULARY } from "../data/sejongTopicVocabulary";
import { calculateKoreanSimilarity } from "../lib/koreanText";
import { speakKorean, stopKoreanSpeech } from "../lib/koreanSpeech";
import { ApiClient } from "../lib/apiClient";

type Prompt = { korean: string; translation: string; source: string };
type Props = { date: string; userId?: string; completed: boolean; onComplete: () => void };

const prompts: Prompt[] = [
  ...(curatedPractice as Array<{ title: string; segments: Array<{ text: string; translation?: string }> }>).flatMap((lesson) => lesson.segments
    .filter((line) => line.text && line.translation)
    .map((line) => ({ korean: line.text, translation: line.translation!, source: lesson.title }))),
  ...SEJONG_TOPIC_VOCABULARY.filter((item) => item.example && item.translation)
    .map((item) => ({ korean: item.example, translation: item.translation, source: `${item.topic} · ${item.level}` })),
];

function hash(value: string) {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}

export function DailyShadowingChallenge({ date, userId, completed, onComplete }: Props) {
  const prompt = useMemo(() => prompts[hash(`${date}:${userId || "guest"}`) % prompts.length], [date, userId]);
  const [recording, setRecording] = useState(false);
  const [heard, setHeard] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");

  const startRecording = () => {
    const SpeechRecognition = (window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition
      || (window as Window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Trình duyệt chưa hỗ trợ nhận dạng tiếng Hàn. Hãy dùng Chrome hoặc Edge.");
      return;
    }
    setError("");
    setHeard("");
    setScore(null);
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript || "").trim();
      if (!transcript) {
        setError("Chưa nhận được câu nói. Thử nói rõ hơn nhé.");
        return;
      }
      setHeard(transcript);
      const result = calculateKoreanSimilarity(prompt.korean, transcript);
      setScore(result);
      if (result >= 70 && !completed) {
        void ApiClient.recordStudySession("shadowing", 1, 1, Math.min(25, Math.round(result / 8)), 15)
          .then(onComplete);
      }
    };
    recognition.onerror = (event: any) => setError(event.error === "not-allowed" ? "Hãy cho phép dùng micro để luyện nói." : "Không nhận được giọng nói. Thử lại nhé.");
    recognition.onend = () => setRecording(false);
    try {
      recognition.start();
      setRecording(true);
    } catch {
      setRecording(false);
      setError("Không mở được micro. Hãy thử lại.");
    }
  };

  return <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">Câu luyện hôm nay · {prompt.source}</span>
      {score !== null && <span className={`text-xs font-black ${score >= 70 ? "text-emerald-300" : "text-amber-300"}`}>Độ khớp {score}%</span>}
    </div>
    <p className="mt-3 font-noto text-base font-bold leading-7 text-white">{prompt.korean}</p>
    <p className="mt-1 text-sm leading-6 text-slate-400">{prompt.translation}</p>
    {heard && <p className="mt-3 rounded-lg bg-slate-900 px-3 py-2 font-noto text-sm text-slate-200">Bạn nói: {heard}</p>}
    {error && <p role="status" className="mt-2 text-xs text-amber-200">{error}</p>}
    {score !== null && score >= 70 && <p role="status" className="mt-2 text-xs font-bold text-emerald-300">{completed ? "Đã nhận nhiệm vụ hôm nay." : "Đạt yêu cầu, đang ghi nhận tiến độ…"}</p>}
    <div className="mt-3 flex flex-wrap gap-2">
      <button onClick={() => speakKorean(prompt.korean)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:border-sky-500"><Volume2 className="h-4 w-4 text-sky-300" />Phát câu</button>
      <button onClick={() => { stopKoreanSpeech(); speakKorean(prompt.korean); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:border-sky-500"><RotateCcw className="h-4 w-4" />Phát lại</button>
      <button onClick={recording ? undefined : startRecording} disabled={recording || completed} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600/20 px-3 py-2 text-xs font-black text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-50">{recording ? <><MicOff className="h-4 w-4" />Đang nghe…</> : <><Mic className="h-4 w-4" />{completed ? "Đã hoàn thành" : "Bấm micro để nói"}</>}</button>
    </div>
  </div>;
}
