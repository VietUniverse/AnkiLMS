"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiClient } from "../lib/apiClient";
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, Rocket, Volume2, X } from "lucide-react";

type Word = { korean: string; meaning: string; example?: string };
type Meteor = { id: number; word: Word; x: number; y: number; speed: number };
type Bullet = { id: number; x: number; y: number };
type GameState = {
  status: "intro" | "playing" | "paused" | "won" | "lost";
  targets: Word[];
  targetIndex: number;
  meteors: Meteor[];
  bullets: Bullet[];
  shipX: number;
  score: number;
  lives: number;
  correct: number;
  elapsed: number;
  message: string;
};

const emptyGame = (): GameState => ({ status: "intro", targets: [], targetIndex: 0, meteors: [], bullets: [], shipX: 50, score: 0, lives: 3, correct: 0, elapsed: 0, message: "" });

function randomSample<T,>(items: T[], count: number): T[] {
  const selected = new Set<number>();
  const result: T[] = [];
  while (result.length < Math.min(count, items.length)) {
    const index = Math.floor(Math.random() * items.length);
    if (selected.has(index)) continue;
    selected.add(index);
    result.push(items[index]);
  }
  return result;
}

export function KoreanVocabularyShooter({ words, onExit }: { words: Word[]; onExit: () => void }) {
  const koreanWords = useMemo(() => {
    const unique = new Map<string, Word>();
    for (const word of words) {
      const meaning = word.meaning.split(/\s*;\s*/)[0].trim().slice(0, 72);
      if (/[\uac00-\ud7a3]/u.test(word.korean) && meaning) unique.set(word.korean.normalize("NFC"), { ...word, meaning });
    }
    return [...unique.values()];
  }, [words]);
  const [game, setGame] = useState<GameState>(emptyGame);
  const gameRef = useRef(game);
  const directionRef = useRef(0);
  const fireRef = useRef(false);
  const lastShotRef = useRef(0);
  const lastFrameRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const nextIdRef = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const recordedRef = useRef(false);

  const updateGame = useCallback((next: GameState) => { gameRef.current = next; setGame(next); }, []);

  const startGame = useCallback(() => {
    const next = { ...emptyGame(), status: "playing" as const, targets: randomSample(koreanWords, 20) };
    recordedRef.current = false;
    lastFrameRef.current = performance.now();
    lastSpawnRef.current = 0;
    updateGame(next);
  }, [koreanWords, updateGame]);

  const shoot = useCallback((x = gameRef.current.shipX) => {
    const current = gameRef.current;
    if (current.status !== "playing") return;
    const next = { ...current, bullets: [...current.bullets, { id: nextIdRef.current++, x, y: 86 }] };
    updateGame(next);
  }, [updateGame]);

  const finish = useCallback((state: GameState, status: "won" | "lost") => {
    const finalState = { ...state, status, bullets: [], message: status === "won" ? "Xuất sắc! Bạn đã bảo vệ thiên hà." : "Tàu đã hết năng lượng. Hãy thử lại nhé." };
    updateGame(finalState);
    if (!recordedRef.current) {
      recordedRef.current = true;
      void ApiClient.recordStudySession("game_korean_shooter", finalState.targets.length, finalState.correct, finalState.correct * 2, Math.max(1, Math.round(finalState.elapsed)));
    }
  }, [updateGame]);

  useEffect(() => {
    if (game.status !== "playing") return;
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.08, Math.max(0.01, (now - lastFrameRef.current) / 1000));
      lastFrameRef.current = now;
      const current = gameRef.current;
      if (current.status !== "playing") return;

      let next: GameState = {
        ...current,
        elapsed: current.elapsed + dt,
        shipX: Math.min(94, Math.max(6, current.shipX + directionRef.current * 54 * dt)),
        meteors: current.meteors.map((meteor) => ({ ...meteor, y: meteor.y + meteor.speed * dt })),
        bullets: current.bullets.map((bullet) => ({ ...bullet, y: bullet.y - 105 * dt })).filter((bullet) => bullet.y > -5),
      };

      if (fireRef.current && now - lastShotRef.current > 300) {
        next.bullets.push({ id: nextIdRef.current++, x: next.shipX, y: 86 });
        lastShotRef.current = now;
      }

      if (now - lastSpawnRef.current > 950 && next.targets[next.targetIndex]) {
        const target = next.targets[next.targetIndex];
        const word = Math.random() < 0.55 ? target : koreanWords[Math.floor(Math.random() * koreanWords.length)];
        next.meteors.push({ id: nextIdRef.current++, word, x: 8 + Math.random() * 84, y: -8, speed: 8 + Math.random() * 4 });
        next.meteors = next.meteors.slice(-10);
        lastSpawnRef.current = now;
      }

      let hitCorrect = false;
      let lostLife = 0;
      const remainingBullets: Bullet[] = [];
      const removedMeteors = new Set<number>();
      for (const bullet of next.bullets) {
        const hit = next.meteors.find((meteor) => !removedMeteors.has(meteor.id) && Math.abs(meteor.x - bullet.x) < 6.5 && Math.abs(meteor.y - bullet.y) < 5.5);
        if (!hit) { remainingBullets.push(bullet); continue; }
        removedMeteors.add(hit.id);
        if (hit.word.korean === next.targets[next.targetIndex]?.korean) {
          hitCorrect = true;
          next.correct += 1;
          next.score += 70;
          next.targetIndex += 1;
          next.message = `정답! ${hit.word.korean} · ${hit.word.meaning}`;
          if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(hit.word.korean);
            utterance.lang = "ko-KR";
            utterance.rate = 0.85;
            window.speechSynthesis.speak(utterance);
          }
        } else {
          lostLife += 1;
          next.message = "오답! 다음 목표를 조심히 찾아보세요.";
        }
      }
      next.bullets = remainingBullets;
      next.meteors = next.meteors.filter((meteor) => !removedMeteors.has(meteor.id));

      const expiredTarget = next.meteors.some((meteor) => meteor.y > 97 && meteor.word.korean === next.targets[next.targetIndex]?.korean);
      const expiredCount = next.meteors.filter((meteor) => meteor.y > 97).length;
      if (expiredTarget) { lostLife += 1; next.targetIndex += 1; next.message = "Mục tiêu đã trôi qua. Tập trung vào từ kế tiếp!"; }
      if (expiredCount) next.meteors = next.meteors.filter((meteor) => meteor.y <= 97);
      next.lives -= lostLife;

      if (next.targetIndex >= next.targets.length) { finish(next, "won"); return; }
      if (next.lives <= 0) { next.lives = 0; finish(next, "lost"); return; }
      if (hitCorrect || lostLife || Math.floor(now / 500) !== Math.floor((now - dt * 1000) / 500)) {
        if (!hitCorrect && !lostLife && now - lastSpawnRef.current > 0) next.message = "";
      }
      updateGame(next);
    }, 40);
    return () => window.clearInterval(timer);
  }, [game.status, finish, koreanWords, updateGame]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (gameRef.current.status !== "playing") return;
      if (["ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") directionRef.current = -1;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") directionRef.current = 1;
      if (event.key === " ") fireRef.current = true;
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight" || ["a", "d"].includes(event.key.toLowerCase())) directionRef.current = 0;
      if (event.key === " ") fireRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  function pause() {
    if (game.status === "playing") { fireRef.current = false; directionRef.current = 0; updateGame({ ...gameRef.current, status: "paused" }); }
    else if (game.status === "paused") { lastFrameRef.current = performance.now(); updateGame({ ...gameRef.current, status: "playing" }); }
  }

  function leave() { fireRef.current = false; directionRef.current = 0; window.speechSynthesis?.cancel(); onExit(); }
  const target = game.targets[game.targetIndex];
  const isActive = game.status === "playing";

  if (game.status === "intro") return <section className="overflow-hidden rounded-3xl border border-indigo-400/20 bg-[#090d20] text-white shadow-2xl">
    <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,#45216e_0%,#11142d_48%,#090d20_100%)] p-6 sm:p-10">
      <button onClick={leave} aria-label="Thoát" className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/30 p-2 text-slate-300 hover:text-white"><X className="h-4 w-4" /></button>
      <div className="mx-auto max-w-2xl py-6 text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 shadow-[0_0_40px_#22d3ee33]"><Rocket className="h-10 w-10" /></div><p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Haechi Space Mission</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Phi đội Hangul</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">Bảo vệ thiên hà bằng vốn từ tiếng Hàn. Đọc nghĩa tiếng Việt, tìm đúng từ Hangul đang rơi và bắn trúng trước khi nó vượt qua tàu.</p>
        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-bold text-cyan-200">01 · Đọc nghĩa</p><p className="mt-1 text-xs leading-5 text-slate-400">Từ mục tiêu hiện bằng tiếng Việt.</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-bold text-fuchsia-200">02 · Ngắm bắn</p><p className="mt-1 text-xs leading-5 text-slate-400">Dùng ← → hoặc A/D để di chuyển tàu.</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-bold text-amber-200">03 · Phóng tên lửa</p><p className="mt-1 text-xs leading-5 text-slate-400">Nhấn Space để bắn; trên điện thoại dùng nút điều khiển.</p></div></div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3"><button onClick={startGame} disabled={koreanWords.length < 4} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-7 text-sm font-black text-white shadow-lg shadow-cyan-900/40 transition hover:brightness-110 disabled:opacity-40"><Play className="h-4 w-4 fill-current" />Bắt đầu nhiệm vụ</button><span className="text-xs text-slate-400">{koreanWords.length.toLocaleString("vi-VN")} từ Hangul · 20 mục tiêu · 3 tim</span></div>
      </div>
    </div>
  </section>;

  if (game.status === "won" || game.status === "lost") return <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-indigo-400/20 bg-[#090d20] p-6 text-center text-white shadow-2xl sm:p-10"><div className="text-6xl">{game.status === "won" ? "🏆" : "🛸"}</div><p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">미션 종료 · Nhiệm vụ kết thúc</p><h2 className="mt-2 text-3xl font-black">{game.status === "won" ? "Đã bảo vệ thiên hà!" : "Tàu cần tiếp nhiên liệu"}</h2><p className="mt-3 text-sm text-slate-300">Bắn trúng {game.correct}/{game.targets.length} từ · {game.score} điểm · {Math.round(game.elapsed)} giây</p><p className="mt-2 text-xs text-emerald-300">Tiến độ và XP đã được ghi nhận.</p><div className="mt-6 flex justify-center gap-3"><button onClick={startGame} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black text-white"><RotateCcw className="h-4 w-4" />Chơi lại</button><button onClick={leave} className="min-h-11 rounded-xl border border-slate-700 px-5 text-xs font-bold text-slate-300">Thoát</button></div></section>;

  return <section className="overflow-hidden rounded-3xl border border-indigo-400/20 bg-[#090d20] text-white shadow-2xl">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#10162e] px-4 py-3 sm:px-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Rocket className="h-5 w-5" /></span><div><p className="text-xs font-black text-white">PHI ĐỘI HANGUL</p><p className="text-[10px] text-slate-400">Màn {Math.min(game.targetIndex + 1, game.targets.length)}/{game.targets.length} · Từ vựng tiếng Hàn</p></div></div><div className="flex items-center gap-3"><span className="text-sm font-black text-amber-300">🏆 {game.score}</span><span className="text-lg tracking-wider">{"❤️".repeat(game.lives)}<span className="opacity-20">{"♡".repeat(3 - game.lives)}</span></span><button onClick={pause} aria-label={game.status === "paused" ? "Tiếp tục" : "Tạm dừng"} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200">{game.status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button><button onClick={leave} aria-label="Thoát" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300"><X className="h-4 w-4" /></button></div></header>
    <div className="border-b border-white/10 bg-[#0d1228] px-4 py-3 text-center sm:px-6"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">찾을 뜻 · Tìm từ có nghĩa</p><p className="mt-1 text-xl font-black text-cyan-200 sm:text-2xl">{target?.meaning || "준비하세요"}</p><p className="mt-1 text-[10px] text-slate-500">Tìm từ Hangul tương ứng và bắn trúng</p></div>
    <div ref={boardRef} className="relative h-[min(58vh,520px)] min-h-[340px] overflow-hidden bg-[radial-gradient(ellipse_at_18%_25%,#42175b_0%,transparent_40%),radial-gradient(ellipse_at_80%_45%,#172657_0%,transparent_45%),linear-gradient(145deg,#100b27,#090f25)]" onPointerMove={(event) => { if (event.buttons === 1) { const rect = event.currentTarget.getBoundingClientRect(); const next = { ...gameRef.current, shipX: Math.min(94, Math.max(6, ((event.clientX - rect.left) / rect.width) * 100)) }; updateGame(next); } }}>
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(1px 1px at 10% 20%,#fff 99%,transparent),radial-gradient(1px 1px at 35% 70%,#fff 99%,transparent),radial-gradient(1px 1px at 72% 15%,#fff 99%,transparent),radial-gradient(1px 1px at 88% 62%,#fff 99%,transparent),radial-gradient(1px 1px at 55% 38%,#fff 99%,transparent)", backgroundSize: "170px 130px" }} />
      <div className="absolute right-[7%] top-[10%] h-12 w-12 rounded-full bg-gradient-to-br from-orange-300 via-orange-600 to-red-900 shadow-[0_0_35px_#f9731666] after:absolute after:-left-3 after:top-4 after:h-4 after:w-20 after:rotate-[-18deg] after:rounded-[50%] after:border-[5px] after:border-amber-200/70" />
      {game.meteors.map((meteor) => <button key={meteor.id} onClick={() => shoot(meteor.x)} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-300/60 bg-gradient-to-r from-fuchsia-950 to-indigo-900 px-3 py-2 text-xs font-black text-fuchsia-100 shadow-lg shadow-fuchsia-500/20 transition-transform active:scale-90 sm:text-sm" style={{ left: `${meteor.x}%`, top: `${meteor.y}%` }}>{meteor.word.korean}</button>)}
      {game.bullets.map((bullet) => <span key={bullet.id} className="pointer-events-none absolute z-20 h-4 w-1.5 -translate-x-1/2 rounded-full bg-cyan-200 shadow-[0_0_12px_5px_#22d3ee88]" style={{ left: `${bullet.x}%`, top: `${bullet.y}%` }} />)}
      <div className="absolute bottom-[7%] left-0 h-1 w-full bg-gradient-to-r from-transparent via-rose-400 to-transparent shadow-[0_0_16px_#fb7185]" />
      <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2 select-none text-4xl drop-shadow-[0_0_16px_#22d3ee] sm:text-5xl" style={{ left: `${game.shipX}%`, top: "91%" }}>🚀</div>
      <div aria-live="polite" className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-center text-xs font-black text-emerald-200">{game.status === "paused" ? "일시 정지 · Tạm dừng" : game.message}</div>
      {game.status === "paused" && <button onClick={pause} className="absolute inset-0 z-40 m-auto flex h-14 w-14 items-center justify-center rounded-full border border-cyan-200/50 bg-cyan-500/25 text-white backdrop-blur"><Play className="h-6 w-6 fill-current" /></button>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1228] px-4 py-3 sm:px-6"><p className="hidden text-[11px] text-slate-400 sm:block">← → / A D di chuyển · giữ Space để bắn · chạm từ để ngắm</p><div className="mx-auto flex items-center gap-3 sm:mx-0"><button aria-label="Sang trái" onPointerDown={() => { directionRef.current = -1; }} onPointerUp={() => { directionRef.current = 0; }} onPointerLeave={() => { directionRef.current = 0; }} className="flex h-11 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200"><ArrowLeft className="h-5 w-5" /></button><button onClick={() => shoot()} onPointerDown={() => { fireRef.current = true; }} onPointerUp={() => { fireRef.current = false; }} onPointerLeave={() => { fireRef.current = false; }} className="flex h-11 min-w-28 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 text-xs font-black text-white"><Rocket className="h-4 w-4" />BẮN</button><button aria-label="Sang phải" onPointerDown={() => { directionRef.current = 1; }} onPointerUp={() => { directionRef.current = 0; }} onPointerLeave={() => { directionRef.current = 0; }} className="flex h-11 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200"><ArrowRight className="h-5 w-5" /></button><button onClick={() => target && window.speechSynthesis && (() => { const utterance = new SpeechSynthesisUtterance(target.korean); utterance.lang = "ko-KR"; window.speechSynthesis.speak(utterance); })()} aria-label="Nghe mục tiêu" className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200"><Volume2 className="h-4 w-4" /></button></div></div>
  </section>;
}
