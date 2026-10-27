"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { ApiClient } from "../../lib/apiClient";
import { AudioLines, Mic, MicOff, RefreshCw, Volume2 } from "lucide-react";
import NIKL_KOREAN_VI from "../../data/niklKoreanViVocabulary.json";
import { loadVietnameseVocabulary } from "../../lib/dictionarySearch";

const PROMPTS = [
  { korean: "안녕하세요. 만나서 반갑습니다.", vietnamese: "Xin chào. Rất vui được gặp bạn." },
  { korean: "저는 베트남에서 왔어요.", vietnamese: "Tôi đến từ Việt Nam." },
  { korean: "한국어를 열심히 공부하고 있어요.", vietnamese: "Tôi đang chăm chỉ học tiếng Hàn." },
  { korean: "오늘 날씨가 정말 좋네요.", vietnamese: "Thời tiết hôm nay đẹp thật đấy." },
  { korean: "이 음식은 조금 맵지만 맛있어요.", vietnamese: "Món này hơi cay nhưng ngon." },
  { korean: "주말에 친구하고 영화를 볼 거예요.", vietnamese: "Cuối tuần tôi sẽ xem phim với bạn." },
  { korean: "지하철역이 어디에 있는지 아세요?", vietnamese: "Bạn có biết ga tàu điện ngầm ở đâu không?" },
  { korean: "매일 조금씩 연습하면 실력이 늘 거예요.", vietnamese: "Luyện tập mỗi ngày một chút thì trình độ sẽ tiến bộ." },
];

const SPEAKING_WORDS = NIKL_KOREAN_VI.map((item) => ({ korean: item.hangul, vietnamese: item.vietnamese, kind: "word" as const }));

type RecognitionAlternative = { transcript: string };
type RecognitionEvent = { results: ArrayLike<ArrayLike<RecognitionAlternative>> };
type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionConstructor = new () => RecognitionLike;

function normalize(value: string) { return value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, ""); }

function similarity(target: string, actual: string): number {
  const left = Array.from(normalize(target));
  const right = Array.from(normalize(actual));
  if (!left.length || !right.length) return 0;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1));
    }
    previous = current;
  }
  return Math.max(0, Math.round((1 - previous[right.length] / Math.max(left.length, right.length)) * 100));
}

export default function SpeakingPracticePage() {
  const { currentUser } = useApp();
  const [speakingWords, setSpeakingWords] = useState(SPEAKING_WORDS);
  useEffect(() => {
    void loadVietnameseVocabulary().then((items) => {
      setSpeakingWords(items.map((item) => ({ korean: item.hangul, vietnamese: item.vietnamese, kind: "word" as const })));
    }).catch(() => {});
  }, []);
  const [index, setIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("");
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const prompt = index < PROMPTS.length ? { ...PROMPTS[index], kind: "sentence" as const } : speakingWords[index - PROMPTS.length] || speakingWords[0];

  const percent = useMemo(() => transcript ? similarity(prompt.korean, transcript) : null, [prompt.korean, transcript]);

  function speak() {
    if (!("speechSynthesis" in window)) { setMessage("Trình duyệt này chưa hỗ trợ đọc tiếng Hàn."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(prompt.korean);
    utterance.lang = "ko-KR";
    utterance.rate = 0.82;
    const koreanVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ko"));
    if (koreanVoice) utterance.voice = koreanVoice;
    window.speechSynthesis.speak(utterance);
  }

  function startRecording() {
    const browserWindow = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) { setMessage("Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Hãy thử phiên bản Chrome mới nhất."); return; }
    setMessage("");
    setTranscript("");
    setScore(null);
    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const result = event.results[0]?.[0]?.transcript || "";
      setTranscript(result);
      const nextScore = similarity(prompt.korean, result);
      setScore(nextScore);
      void ApiClient.recordStudySession("speaking", 1, nextScore >= 70 ? 1 : 0, 0, 10);
    };
    recognition.onerror = (event) => {
      setMessage(event.error === "not-allowed" ? "Bạn cần cho phép dùng micro trong trình duyệt." : "Không nhận diện được giọng nói. Hãy thử lại trong môi trường yên tĩnh.");
      setRecording(false);
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    setRecording(true);
    try { recognition.start(); } catch { setRecording(false); setMessage("Micro đang bận. Vui lòng thử lại."); }
  }

  function nextPrompt() {
    recognitionRef.current?.stop();
    setRecording(false);
    setIndex((value) => value < PROMPTS.length - 1 ? value + 1 : PROMPTS.length + Math.floor(Math.random() * speakingWords.length));
    setTranscript("");
    setScore(null);
    setMessage("");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5 animate-fadeIn">
        <header className="card-duo p-6"><p className="text-xs font-bold uppercase tracking-widest text-violet-300">Luyện phát âm · {(PROMPTS.length + speakingWords.length).toLocaleString("vi-VN")} từ và câu mẫu</p><h1 className="mt-2 text-2xl font-black text-white">Nghe mẫu và nói theo</h1><p className="mt-2 text-sm text-slate-400">Luyện câu giao tiếp và từ tiếng Hàn có nghĩa tiếng Việt từ Từ điển Học tiếng Hàn của Viện Ngôn ngữ Quốc gia Hàn Quốc. Bấm “Từ/câu tiếp” để lấy mẫu ngẫu nhiên. Dùng giọng đọc và nhận diện có sẵn trong trình duyệt.</p></header>
        <section className="card-duo space-y-6 p-6 sm:p-8">
          <div className="text-center"><span className="inline-flex rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-[10px] font-bold text-sky-300">{prompt.kind === "word" ? "Từ vựng · NIKL" : "Câu giao tiếp"}</span><p className="mt-4 font-noto text-2xl font-black leading-relaxed text-white sm:text-3xl">{prompt.korean}</p><p className="mt-3 text-sm text-slate-400">{prompt.vietnamese}</p></div>
          <div className="flex flex-wrap justify-center gap-3"><button type="button" onClick={speak} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-xs font-bold text-slate-200 hover:border-sky-500"><Volume2 className="h-4 w-4 text-sky-300" /> Nghe mẫu</button><button type="button" onClick={recording ? () => recognitionRef.current?.stop() : startRecording} className={`btn-duo inline-flex items-center gap-2 px-5 py-3 text-xs ${recording ? "bg-rose-600 text-white" : "btn-duo-primary"}`}>{recording ? <><MicOff className="h-4 w-4" /> Dừng ghi âm</> : <><Mic className="h-4 w-4" /> Bắt đầu nói</>}</button><button type="button" onClick={nextPrompt} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-xs font-bold text-slate-200 hover:border-violet-500"><RefreshCw className="h-4 w-4" /> Từ/câu tiếp</button></div>
          {recording && <p role="status" className="flex items-center justify-center gap-2 text-xs font-bold text-rose-300"><AudioLines className="h-4 w-4 animate-pulse" /> Đang nghe… Hãy đọc câu tiếng Hàn.</p>}
          {message && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{message}</p>}
          {transcript && <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5 text-center"><p className="text-xs font-bold text-slate-400">Trình duyệt nghe được</p><p className="mt-2 font-noto text-lg font-bold text-slate-100">{transcript}</p><p className="mt-4 text-3xl font-black text-emerald-300">{score}%</p><p className="text-xs text-slate-400">Độ giống văn bản nhận diện</p></div>}
          <p className="text-center text-[11px] leading-5 text-slate-500">{currentUser ? "Tiến độ XP được lưu khi đăng nhập." : "Bạn vẫn có thể luyện tập mà không cần đăng nhập; đăng nhập để lưu tiến độ."}</p>
        </section>
      </div>
    </AppShell>
  );
}
