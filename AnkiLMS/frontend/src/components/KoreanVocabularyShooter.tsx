"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiClient } from "../lib/apiClient";
import { Pause, Play, Rocket, RotateCcw, X } from "lucide-react";

type Word = { korean: string; meaning: string; example?: string };
type WordMode = "random" | "fsrs";
type GameState = {
  status: "intro" | "playing" | "paused" | "won" | "lost";
  targets: Word[];
  targetIndex: number;
  meteorY: number;
  speed: number;
  score: number;
  lives: number;
  correct: number;
  elapsed: number;
  message: string;
  shot: boolean;
};

const emptyGame = (): GameState => ({ status: "intro", targets: [], targetIndex: 0, meteorY: -8, speed: 4.2, score: 0, lives: 3, correct: 0, elapsed: 0, message: "", shot: false });
const normalize = (text: string) => text.normalize("NFC").replace(/[\s\p{P}\p{S}]/gu, "").toLocaleLowerCase("ko-KR");

function sample<T,>(items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

export function KoreanVocabularyShooter({ words, learnedWords = [], initialMode = "random", onExit }: { words: Word[]; learnedWords?: Word[]; initialMode?: WordMode; onExit: () => void }) {
  const koreanWords = useMemo(() => {
    const unique = new Map<string, Word>();
    words.forEach((word) => {
      const meaning = word.meaning.split(/\s*;\s*/)[0].trim().slice(0, 72);
      if (/[\uac00-\ud7a3]/u.test(word.korean) && meaning) unique.set(normalize(word.korean), { ...word, meaning });
    });
    return [...unique.values()];
  }, [words]);
  const learnedKeys = useMemo(() => new Set(learnedWords.map((word) => normalize(word.korean))), [learnedWords]);
  const learnedCount = useMemo(() => koreanWords.filter((word) => learnedKeys.has(normalize(word.korean))).length, [koreanWords, learnedKeys]);
  const [wordMode, setWordMode] = useState<WordMode>(initialMode);
  const selectSessionWords = useCallback((mode: WordMode) => {
    const learned = koreanWords.filter((word) => learnedKeys.has(normalize(word.korean)));
    if (mode === "fsrs") return sample(learned, learned.length);
    const fresh = koreanWords.filter((word) => !learnedKeys.has(normalize(word.korean)));
    const learnedSample = sample(learned, Math.min(30, learned.length, 100));
    return sample([...learnedSample, ...sample(fresh, Math.max(0, Math.min(100, koreanWords.length) - learnedSample.length))], Math.min(100, koreanWords.length));
  }, [koreanWords, learnedKeys]);
  const [game, setGame] = useState<GameState>(emptyGame);
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const gameRef = useRef(game);
  const lastFrameRef = useRef(0);
  const recordedRef = useRef(false);
  const update = useCallback((next: GameState) => { gameRef.current = next; setGame(next); }, []);
  const target = game.targets[game.targetIndex];
  const stage = Math.min(3, Math.floor(game.correct / 4));
  const stageNames = ["Khởi động", "Ổn định", "Tăng tốc", "Thử thách"];

  const finish = useCallback((next: GameState, status: "won" | "lost") => {
    const ended = { ...next, status, shot: false, message: status === "won" ? "Bạn đã bắn trúng toàn bộ mục tiêu!" : "Tàu đã hết năng lượng. Hãy thử lại nhé." };
    update(ended);
    if (!recordedRef.current && ended.correct > 0 && ended.elapsed >= 10) {
      recordedRef.current = true;
      void ApiClient.recordStudySession("game_korean_shooter", Math.max(1, ended.correct), ended.correct, ended.correct * 2, Math.max(10, Math.round(ended.elapsed)));
    }
  }, [update]);

  const startGame = useCallback(() => {
    const sessionWords = selectSessionWords(wordMode);
    if (!sessionWords.length) return;
    recordedRef.current = false;
    setAnswer("");
    lastFrameRef.current = performance.now();
    update({ ...emptyGame(), status: "playing", targets: sessionWords });
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [selectSessionWords, update, wordMode]);

  useEffect(() => {
    if (game.status !== "playing") return;
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.1, Math.max(0.01, (now - lastFrameRef.current) / 1000));
      lastFrameRef.current = now;
      const current = gameRef.current;
      if (current.status !== "playing") return;
      const difficulty = Math.min(3, Math.floor(current.correct / 4));
      const baseSpeed = 4.2 + difficulty * 0.45;
      const next = { ...current, elapsed: current.elapsed + dt, meteorY: current.meteorY + current.speed * dt };
      if (next.meteorY >= 90) {
        next.lives -= 1;
        next.meteorY = -8;
        next.speed = baseSpeed;
        next.message = "Từ rơi mất rồi! Cùng thử lại từ này nhé.";
        if (next.lives <= 0) { next.lives = 0; finish(next, "lost"); return; }
      }
      update(next);
    }, 40);
    return () => window.clearInterval(timer);
  }, [game.status, finish, update]);

  function fire() {
    const current = gameRef.current;
    const word = current.targets[current.targetIndex];
    if (current.status !== "playing" || !word || !answer.trim()) return;
    if (normalize(answer) !== normalize(word.korean)) {
      const speed = Math.min(7.2, current.speed + 1.15);
      setAnswer("");
      update({ ...current, speed, message: "Chưa đúng — thiên thạch tăng tốc! Kiểm tra Hangul rồi thử lại.", shot: false });
      inputRef.current?.focus();
      return;
    }
    const correct = current.correct + 1;
    const targetIndex = current.targetIndex + 1;
    const next = {
      ...current,
      correct,
      targetIndex,
      meteorY: -8,
      speed: 4.2 + Math.min(3, Math.floor(correct / 4)) * 0.45,
      score: current.score + 100,
      message: `명중! ${word.korean} · Chính xác!`,
      shot: true,
    };
    setAnswer("");
    if (targetIndex >= current.targets.length) finish(next, "won");
    else {
      update(next);
      window.setTimeout(() => { const latest = gameRef.current; if (latest.shot) update({ ...latest, shot: false }); }, 380);
      inputRef.current?.focus();
    }
  }

  function pause() {
    if (gameRef.current.status === "playing") update({ ...gameRef.current, status: "paused" });
    else if (gameRef.current.status === "paused") { lastFrameRef.current = performance.now(); update({ ...gameRef.current, status: "playing" }); inputRef.current?.focus(); }
  }
  function leave() { onExit(); }

  if (game.status === "intro") return <section className="overflow-hidden rounded-3xl border border-indigo-400/20 bg-[#090d20] text-white shadow-2xl">
    <div className="relative bg-[radial-gradient(ellipse_at_top,#45216e_0%,#11142d_48%,#090d20_100%)] p-6 sm:p-10">
      <button onClick={leave} aria-label="Thoát" className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/30 p-2 text-slate-300 hover:text-white"><X className="h-4 w-4" /></button>
      <div className="mx-auto max-w-2xl py-6 text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200"><Rocket className="h-10 w-10" /></div><p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Haechi Space Mission</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Phi đội Hangul</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">Chọn ôn toàn bộ từ đã học theo FSRS hoặc bắn thử tối đa 100 từ ngẫu nhiên. Chơi từ ngẫu nhiên không cần học trước.</p>
        <div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-3" role="group" aria-label="Chọn bộ từ chơi">
          <button type="button" onClick={() => setWordMode("random")} aria-pressed={wordMode === "random"} className={`rounded-2xl border p-4 text-left transition ${wordMode === "random" ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-white/10 bg-black/20 text-slate-300 hover:border-cyan-300/40"}`}><span className="block text-sm font-black">Từ ngẫu nhiên</span><span className="mt-1 block text-xs opacity-80">Lấy từ toàn bộ {koreanWords.length.toLocaleString("vi-VN")} mục có nghĩa Việt</span></button>
          <button type="button" onClick={() => setWordMode("fsrs")} aria-pressed={wordMode === "fsrs"} className={`rounded-2xl border p-4 text-left transition ${wordMode === "fsrs" ? "border-fuchsia-300 bg-fuchsia-400/15 text-fuchsia-100" : "border-white/10 bg-black/20 text-slate-300 hover:border-fuchsia-300/40"}`}><span className="block text-sm font-black">Ôn từ FSRS</span><span className="mt-1 block text-xs opacity-80">{learnedCount.toLocaleString("vi-VN")} từ đã học</span></button>
        </div>
        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-bold text-cyan-200">01 · Đọc nghĩa</p><p className="mt-1 text-xs leading-5 text-slate-400">Nghĩa tiếng Việt rơi từ trên xuống.</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-bold text-fuchsia-200">02 · Gõ Hangul</p><p className="mt-1 text-xs leading-5 text-slate-400">Gõ đúng từ tiếng Hàn rồi nhấn Enter.</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-bold text-amber-200">03 · Tăng độ khó</p><p className="mt-1 text-xs leading-5 text-slate-400">Tốc độ tăng nhẹ theo từng 4 từ; sai sẽ tăng tốc mục tiêu hiện tại.</p></div></div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3"><button onClick={startGame} disabled={wordMode === "fsrs" ? !learnedCount : !koreanWords.length} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-7 text-sm font-black text-white disabled:opacity-40"><Play className="h-4 w-4 fill-current" />{wordMode === "fsrs" ? "Ôn từ đã học" : "Chơi từ ngẫu nhiên"}</button><span className="text-xs text-slate-400">{wordMode === "fsrs" ? `${learnedCount.toLocaleString("vi-VN")} từ đã học FSRS · 3 lượt` : `Tối đa ${Math.min(100, koreanWords.length)} từ ngẫu nhiên · 3 lượt`}</span></div>
        {!koreanWords.length && <p className="mt-3 text-xs font-bold text-amber-300">Đang tải từ điển. Hãy thử lại sau giây lát.</p>}
        {wordMode === "fsrs" && !learnedCount && <p className="mt-3 text-xs font-bold text-amber-300">Chưa có từ đã học trong bộ từ hiện tại. Hãy chọn Từ ngẫu nhiên hoặc học từ bằng FSRS trước.</p>}
      </div>
    </div>
  </section>;

  if (game.status === "won" || game.status === "lost") return <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-indigo-400/20 bg-[#090d20] p-6 text-center text-white shadow-2xl sm:p-10"><div className="text-6xl">{game.status === "won" ? "🏆" : "🛸"}</div><p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">미션 종료 · Nhiệm vụ kết thúc</p><h2 className="mt-2 text-3xl font-black">{game.status === "won" ? "Đã bảo vệ thiên hà!" : "Tàu cần tiếp nhiên liệu"}</h2><p className="mt-3 text-sm text-slate-300">Gõ đúng {game.correct}/{game.targets.length} từ · {game.score} điểm · {Math.round(game.elapsed)} giây</p><p className="mt-2 text-xs text-emerald-300">XP được tính ở mức thấp theo lượt học hợp lệ.</p><div className="mt-6 flex justify-center gap-3"><button onClick={startGame} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black text-white"><RotateCcw className="h-4 w-4" />Chơi lại</button><button onClick={leave} className="min-h-11 rounded-xl border border-slate-700 px-5 text-xs font-bold text-slate-300">Thoát</button></div></section>;

  return <section className="overflow-hidden rounded-3xl border border-indigo-400/20 bg-[#090d20] text-white shadow-2xl">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#10162e] px-4 py-3 sm:px-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Rocket className="h-5 w-5" /></span><div><p className="text-xs font-black text-white">PHI ĐỘI HANGUL</p><p className="text-[10px] text-slate-400">Mục tiêu {Math.min(game.targetIndex + 1, game.targets.length)}/{game.targets.length} · {stageNames[stage]}</p></div></div><div className="flex items-center gap-3"><span className="text-sm font-black text-amber-300">🏆 {game.score}</span><span className="text-lg tracking-wider">{"❤️".repeat(game.lives)}<span className="opacity-20">{"♡".repeat(3 - game.lives)}</span></span><button onClick={pause} aria-label={game.status === "paused" ? "Tiếp tục" : "Tạm dừng"} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200">{game.status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button><button onClick={leave} aria-label="Thoát" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300"><X className="h-4 w-4" /></button></div></header>
    <div className="relative h-[min(53vh,460px)] min-h-[300px] overflow-hidden bg-[radial-gradient(ellipse_at_18%_25%,#42175b_0%,transparent_40%),radial-gradient(ellipse_at_80%_45%,#172657_0%,transparent_45%),linear-gradient(145deg,#100b27,#090f25)]">
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(1px 1px at 10% 20%,#fff 99%,transparent),radial-gradient(1px 1px at 35% 70%,#fff 99%,transparent),radial-gradient(1px 1px at 72% 15%,#fff 99%,transparent),radial-gradient(1px 1px at 88% 62%,#fff 99%,transparent),radial-gradient(1px 1px at 55% 38%,#fff 99%,transparent)", backgroundSize: "170px 130px" }} />
      <div className="absolute right-[7%] top-[10%] h-12 w-12 rounded-full bg-gradient-to-br from-orange-300 via-orange-600 to-red-900 shadow-[0_0_35px_#f9731666]" />
      <div className="absolute left-1/2 z-10 -translate-x-1/2 rounded-2xl border border-cyan-200/60 bg-gradient-to-b from-amber-200 to-orange-500 px-5 py-3 text-center text-sm font-black text-slate-950 shadow-[0_0_30px_#fb923c99] transition-[top] duration-75 sm:text-base" style={{ top: `${Math.max(2, game.meteorY)}%` }}><span className="block text-[9px] uppercase tracking-widest text-orange-950">뜻 · Nghĩa</span>{target?.meaning || "준비하세요"}</div>
      <div className="absolute bottom-[7%] left-0 h-1 w-full bg-gradient-to-r from-transparent via-rose-400 to-transparent shadow-[0_0_16px_#fb7185]" />
      <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 text-4xl drop-shadow-[0_0_16px_#22d3ee] sm:text-5xl">🚀</div>
      {game.shot && <div className="pointer-events-none absolute bottom-[13%] left-1/2 h-[70%] w-1 -translate-x-1/2 bg-gradient-to-t from-cyan-200 via-cyan-300 to-transparent shadow-[0_0_14px_#22d3ee]" />}
      <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] font-bold text-cyan-200">Tốc độ {game.speed.toFixed(1)} · Sai sẽ tăng tốc</div>
      {game.status === "paused" && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-sm"><p className="font-black text-white">Đang tạm dừng</p><button onClick={pause} className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white"><Play className="h-5 w-5 fill-current" /></button></div>}
    </div>
    <div className="bg-[#0d1228] p-4 sm:px-6"><div className="flex flex-col gap-3 sm:flex-row"><label className="flex flex-1 items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 focus-within:border-cyan-400"><span className="text-xs font-bold text-slate-400">Hangul</span><input ref={inputRef} value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") fire(); }} disabled={!target || game.status !== "playing"} lang="ko" autoComplete="off" autoCapitalize="off" spellCheck={false} className="min-h-12 w-full bg-transparent font-noto text-lg font-bold text-white outline-none placeholder:text-slate-600" placeholder="Gõ từ tiếng Hàn rồi nhấn Enter…" /></label><button onClick={fire} disabled={!answer.trim() || game.status !== "playing"} className="min-h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-7 text-xs font-black text-white disabled:opacity-40"><Rocket className="mr-2 inline h-4 w-4" />GÕ ĐÚNG ĐỂ BẮN</button></div><p aria-live="polite" className={`mt-2 min-h-5 text-center text-xs font-bold ${game.message.includes("Chưa đúng") || game.message.includes("rơi") ? "text-amber-300" : "text-emerald-300"}`}>{game.message || "Nhập đáp án Hangul. Trả lời đúng mới bắn được mục tiêu."}</p><div className="mt-2 flex justify-between text-[10px] text-slate-500"><span>Sai: thiên thạch tăng tốc · Hết giờ: mất 1 lượt và từ sẽ rơi lại</span><span>{game.correct}/{game.targets.length} đúng</span></div></div>
  </section>;
}
