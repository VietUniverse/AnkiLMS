"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ApiClient } from "../lib/apiClient";
import {
  ChevronRight, Crosshair, Flame, Gauge, Keyboard, Lightbulb,
  MousePointerClick, Pause, Play, Rocket, RotateCcw, Shield, Sparkles,
  Target, Trophy, Volume2, VolumeX, X, Zap,
} from "lucide-react";

type Word = { korean: string; meaning: string; example?: string };
type WordMode = "random" | "fsrs";
type InputMode = "type" | "choice";
type Difficulty = "chill" | "normal" | "insane";
type Status = "intro" | "playing" | "paused" | "won" | "lost";

type GameState = {
  status: Status;
  targets: Word[];
  targetIndex: number;
  meteorY: number;
  speed: number;
  score: number;
  lives: number;
  maxLives: number;
  correct: number;
  misses: number;
  combo: number;
  maxCombo: number;
  elapsed: number;
  message: string;
  shot: boolean;
  explosion: number;
  wrongFlash: number;
  blastY: number;
};

const DIFFICULTIES: Record<Difficulty, { label: string; sub: string; lives: number; speed: number; mission: number; multiplier: number; accent: string }> = {
  chill: { label: "Thư giãn", sub: "5 mạng · rơi chậm", lives: 5, speed: 4.6, mission: 20, multiplier: 1, accent: "from-emerald-400 to-cyan-400" },
  normal: { label: "Phi công", sub: "3 mạng · tốc độ chuẩn", lives: 3, speed: 6.2, mission: 30, multiplier: 1.5, accent: "from-cyan-400 to-blue-500" },
  insane: { label: "Tử thần", sub: "1 mạng · rơi nhanh", lives: 1, speed: 8.4, mission: 40, multiplier: 2.5, accent: "from-amber-400 to-rose-500" },
};

const emptyGame = (difficulty: Difficulty): GameState => ({
  status: "intro", targets: [], targetIndex: 0, meteorY: -12,
  speed: DIFFICULTIES[difficulty].speed, score: 0,
  lives: DIFFICULTIES[difficulty].lives, maxLives: DIFFICULTIES[difficulty].lives,
  correct: 0, misses: 0, combo: 0, maxCombo: 0, elapsed: 0, message: "",
  shot: false, explosion: 0, wrongFlash: 0, blastY: 38,
});

const normalize = (text: string) => text.normalize("NFC").replace(/[\s\p{P}\p{S}]/gu, "").toLocaleLowerCase("ko-KR");

const GAME_CSS = `
  @keyframes hx-twinkle{0%,100%{opacity:.18;transform:scale(.8)}50%{opacity:.95;transform:scale(1.25)}}
  @keyframes hx-orbit{to{transform:rotate(360deg)}}
  @keyframes hx-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes hx-pulse{0%,100%{box-shadow:0 0 0 0 rgba(34,211,238,.28)}50%{box-shadow:0 0 0 14px rgba(34,211,238,0)}}
  @keyframes hx-burst{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(.15)}}
  @keyframes hx-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
  @keyframes hx-thruster{0%,100%{transform:scaleY(1);opacity:.8}50%{transform:scaleY(1.3);opacity:1}}
  @keyframes hx-in{from{opacity:0;transform:translateY(-8px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes hx-glow{0%,100%{box-shadow:0 0 22px rgba(34,211,238,.25)}50%{box-shadow:0 0 34px rgba(34,211,238,.55)}}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game [class*="text-white"]{color:#ffffff!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game [class*="text-slate-100"],
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game [class*="text-slate-200"]{color:#e2e8f0!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game [class*="text-slate-300"]{color:#cbd5e1!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game [class*="text-slate-400"]{color:#94a3b8!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game [class*="text-slate-500"]{color:#64748b!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game [class*="text-cyan-300"]{color:#67e8f9!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game [class*="text-emerald-300"]{color:#6ee7b7!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game [class*="text-amber-300"]{color:#fcd34d!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game [class*="text-rose-300"]{color:#fda4af!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game input{background-color:#020617!important;color:#f8fafc!important;border-color:#334155!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game input::placeholder{color:#64748b!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game header{background-color:rgba(10,16,36,.92)!important;border-bottom-color:rgba(255,255,255,.1)!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game header [class*="text-white"]{color:#ffffff!important}
  html[data-theme="light"] body:not(:has(.login-page-root)) .hx-game header [class*="text-slate-400"]{color:#94a3b8!important}
`;

function sample<T,>(items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

function Starfield({ count = 56, muted = false }: { count?: number; muted?: boolean }) {
  const stars = useMemo(() => Array.from({ length: count }, (_, index) => ({
    x: (index * 37 + 11) % 100,
    y: (index * 61 + 7) % 100,
    size: 1 + (index % 4) * 0.55,
    delay: (index % 9) * 0.55,
    duration: 2.6 + (index % 5) * 0.7,
  })), [count]);
  return <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    {stars.map((star, index) => <span
      key={index}
      className={muted ? "absolute rounded-full bg-white/35" : "absolute rounded-full bg-white/80"}
      style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size, animation: `hx-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite` }}
    />)}
  </div>;
}

function Burst({ seed }: { seed: number }) {
  const particles = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    const distance = 34 + (index % 5) * 14;
    return {
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      size: index % 3 === 0 ? 7 : 4,
      color: index % 3 === 0 ? "#fbbf24" : index % 3 === 1 ? "#67e8f9" : "#fb7185",
    };
  });
  return <div key={seed} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-0 w-0">
    {particles.map((particle, index) => <span
      key={index}
      className="absolute rounded-full"
      style={{
        width: particle.size, height: particle.size, background: particle.color,
        boxShadow: `0 0 12px ${particle.color}`,
        animation: "hx-burst .62s cubic-bezier(.2,.7,.3,1) forwards",
        "--tx": `${particle.tx}px`, "--ty": `${particle.ty}px`,
      } as CSSProperties}
    />)}
  </div>;
}

export function KoreanVocabularyShooter({ words, learnedWords = [], initialMode = "random", onExit }: { words: Word[]; learnedWords?: Word[]; initialMode?: WordMode; onExit: () => void }) {
  const koreanWords = useMemo(() => {
    const unique = new Map<string, Word>();
    words.forEach((word) => {
      const meaning = word.meaning.split(/\s*;\s*/)[0].trim().slice(0, 74);
      if (/[\uac00-\ud7a3]/u.test(word.korean) && meaning) unique.set(normalize(word.korean), { ...word, meaning });
    });
    return [...unique.values()];
  }, [words]);
  const learnedKeys = useMemo(() => new Set(learnedWords.map((word) => normalize(word.korean))), [learnedWords]);
  const learnedCount = useMemo(() => koreanWords.filter((word) => learnedKeys.has(normalize(word.korean))).length, [koreanWords, learnedKeys]);

  const [wordMode, setWordMode] = useState<WordMode>(initialMode);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [inputMode, setInputMode] = useState<InputMode>("type");
  const [game, setGame] = useState<GameState>(() => emptyGame("normal"));
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [best, setBest] = useState(0);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const gameRef = useRef(game);
  const lastFrameRef = useRef(0);
  const lastPaintRef = useRef(0);
  const recordedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);
  const bestRef = useRef(0);

  const update = useCallback((next: GameState) => { gameRef.current = next; setGame(next); }, []);
  const target = game.targets[game.targetIndex];
  const stage = Math.min(3, Math.floor(game.correct / 6));
  const stageNames = ["Khởi động", "Ổn định", "Tăng tốc", "Thử thách"];
  const accuracy = game.correct + game.misses > 0 ? Math.round((game.correct / (game.correct + game.misses)) * 100) : 100;

  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);
  useEffect(() => { bestRef.current = best; }, [best]);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const listener = () => setReduceMotion(media?.matches ?? false);
    media?.addEventListener?.("change", listener);
    const timer = window.setTimeout(() => {
      try { setBest(Number(localStorage.getItem("haechivn_shooter_best") || 0)); setSoundOn(localStorage.getItem("haechivn_shooter_sound") !== "off"); } catch { /* ignore */ }
      const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
      if (coarse) { setCoarsePointer(true); setInputMode("choice"); }
      setReduceMotion(media?.matches ?? false);
    }, 0);
    return () => { window.clearTimeout(timer); media?.removeEventListener?.("change", listener); };
  }, []);

  const getAudio = useCallback(() => {
    if (!soundRef.current) return null;
    try {
      if (!audioRef.current) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        audioRef.current = new Ctor();
      }
      if (audioRef.current.state === "suspended") void audioRef.current.resume();
      return audioRef.current;
    } catch { return null; }
  }, []);

  const tone = useCallback((freq: number, duration: number, type: OscillatorType, gainValue = 0.035, endFreq?: number) => {
    const ctx = getAudio();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    if (endFreq) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), ctx.currentTime + duration);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain); gain.connect(ctx.destination);
    oscillator.start(); oscillator.stop(ctx.currentTime + duration);
  }, [getAudio]);

  const sfx = useCallback((kind: "laser" | "hit" | "wrong" | "miss" | "combo" | "win" | "lose") => {
    if (kind === "laser") tone(900, 0.16, "sawtooth", 0.028, 260);
    else if (kind === "hit") { tone(160, 0.22, "triangle", 0.06, 60); tone(520, 0.16, "sine", 0.028, 780); }
    else if (kind === "wrong") tone(190, 0.22, "square", 0.04, 120);
    else if (kind === "miss") tone(150, 0.32, "sawtooth", 0.045, 70);
    else if (kind === "combo") { tone(880, 0.12, "sine", 0.035); window.setTimeout(() => tone(1320, 0.14, "sine", 0.03), 80); }
    else if (kind === "win") { [523, 659, 784, 1046].forEach((freq, index) => window.setTimeout(() => tone(freq, 0.22, "triangle", 0.04), index * 110)); }
    else tone(220, 0.4, "triangle", 0.05, 90);
  }, [tone]);

  const selectSessionWords = useCallback((mode: WordMode, level: Difficulty) => {
    const config = DIFFICULTIES[level];
    if (mode === "fsrs") return sample(learnedWords, Math.min(config.mission, learnedWords.length));
    return sample(koreanWords, Math.min(config.mission, koreanWords.length));
  }, [koreanWords, learnedWords]);

  const finish = useCallback((next: GameState, status: "won" | "lost") => {
    const ended = {
      ...next, status, shot: false,
      message: status === "won" ? "Phi đội đã hạ toàn bộ mục tiêu. Xuất sắc!" : "Tàu hết năng lượng. Rút về căn cứ và thử lại nhé!",
    };
    update(ended);
    if (ended.score > bestRef.current) {
      bestRef.current = ended.score; setBest(ended.score);
      try { localStorage.setItem("haechivn_shooter_best", String(ended.score)); } catch { /* ignore */ }
    }
    sfx(status === "won" ? "win" : "lose");
    if (!recordedRef.current && ended.correct > 0 && ended.elapsed >= 10) {
      recordedRef.current = true;
      const xp = Math.max(1, Math.round(ended.correct * 2 * DIFFICULTIES[difficulty].multiplier + ended.maxCombo));
      void ApiClient.recordStudySession("game_korean_shooter", Math.max(1, ended.correct), ended.correct, xp, Math.max(10, Math.round(ended.elapsed)));
    }
  }, [difficulty, sfx, update]);

  const startGame = useCallback(() => {
    const sessionWords = selectSessionWords(wordMode, difficulty);
    if (!sessionWords.length) return;
    recordedRef.current = false;
    setAnswer(""); setShowHint(false);
    lastFrameRef.current = performance.now(); lastPaintRef.current = 0;
    update({ ...emptyGame(difficulty), status: "playing", targets: sessionWords });
    sfx("laser");
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [difficulty, selectSessionWords, sfx, update, wordMode]);

  useEffect(() => {
    if (game.status !== "playing") return;
    let raf = 0;
    const tick = (now: number) => {
      const current = gameRef.current;
      if (current.status !== "playing") return;
      if (!lastFrameRef.current) lastFrameRef.current = now;
      const dt = Math.min(0.12, Math.max(0.01, (now - lastFrameRef.current) / 1000));
      lastFrameRef.current = now;
      if (now - lastPaintRef.current < 32) { raf = requestAnimationFrame(tick); return; }
      lastPaintRef.current = now;
      const config = DIFFICULTIES[difficulty];
      const stageNow = Math.min(3, Math.floor(current.correct / 6));
      const baseSpeed = config.speed + stageNow * 0.72;
      const next = { ...current, elapsed: current.elapsed + dt, meteorY: current.meteorY + current.speed * dt };
      if (next.meteorY >= 92) {
        next.lives -= 1; next.meteorY = -12; next.speed = baseSpeed; next.combo = 0;
        next.misses += 1;
        next.message = "Thiên thạch lọt lưới! Đã bật gợi ý — thử lại từ này.";
        setShowHint(true);
        if (next.lives <= 0) { next.lives = 0; finish(next, "lost"); return; }
        sfx("miss");
      }
      update(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [difficulty, finish, game.status, sfx, update]);

  function submit(value: string) {
    const current = gameRef.current;
    const word = current.targets[current.targetIndex];
    if (current.status !== "playing" || !word || !value.trim()) return;
    if (normalize(value) !== normalize(word.korean)) {
      const next = {
        ...current, speed: Math.min(10.5, current.speed + 0.95), combo: 0,
        score: Math.max(0, current.score - 10), wrongFlash: current.wrongFlash + 1,
        misses: current.misses + 1,
        message: `Chưa đúng — thiên thạch tăng tốc! Gợi ý: ${Array.from(word.korean)[0]}…`,
      };
      setAnswer(""); setShowHint(true); update(next); sfx("wrong");
      inputRef.current?.focus();
      return;
    }
    const combo = current.combo + 1;
    const targetIndex = current.targetIndex + 1;
    const stageNow = Math.min(3, Math.floor((current.correct + 1) / 6));
    const proximity = Math.max(0, Math.round((92 - current.meteorY) * 2));
    const gained = Math.round((100 + combo * 12 + proximity) * DIFFICULTIES[difficulty].multiplier);
    const next = {
      ...current, correct: current.correct + 1, targetIndex,
      meteorY: -12, speed: DIFFICULTIES[difficulty].speed + stageNow * 0.72,
      score: current.score + gained, combo, maxCombo: Math.max(current.maxCombo, combo),
      message: combo >= 3 ? `COMBO x${combo}! ${word.korean} · +${gained} điểm` : `명중! ${word.korean} · +${gained} điểm`,
      shot: true, explosion: current.explosion + 1, blastY: Math.max(8, current.meteorY), wrongFlash: current.wrongFlash,
    };
    setAnswer(""); setShowHint(false); sfx("hit");
    if (combo >= 3) sfx("combo");
    if (targetIndex >= current.targets.length) { finish(next, "won"); return; }
    update(next);
    window.setTimeout(() => { const latest = gameRef.current; if (latest.shot) update({ ...latest, shot: false }); }, 320);
    inputRef.current?.focus();
  }

  function fire() { submit(answer); }

  function togglePause() {
    const current = gameRef.current;
    if (current.status === "playing") { update({ ...current, status: "paused" }); }
    else if (current.status === "paused") { lastFrameRef.current = performance.now(); update({ ...current, status: "playing" }); inputRef.current?.focus(); }
  }

  function toggleSound() {
    setSoundOn((current) => {
      const next = !current;
      try { localStorage.setItem("haechivn_shooter_sound", next ? "on" : "off"); } catch { /* ignore */ }
      return next;
    });
  }

  function useHint() {
    const current = gameRef.current;
    if (current.status !== "playing" || showHint) return;
    setShowHint(true);
    update({ ...current, score: Math.max(0, current.score - 25), message: "Đã mở gợi ý — trừ 25 điểm." });
  }

  const options = useMemo(() => {
    if (!target) return [];
    const pool = koreanWords.filter((word) => normalize(word.korean) !== normalize(target.korean));
    return sample([target, ...sample(pool, 3)], Math.min(4, pool.length + 1));
  }, [koreanWords, target]);

  if (game.status === "intro") {
    return <section className="hx-game relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[#050916] text-white shadow-[0_30px_80px_-20px_rgba(34,211,238,.35)]">
      <style>{GAME_CSS}</style>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,rgba(124,58,237,.55),transparent_45%),radial-gradient(ellipse_at_85%_20%,rgba(6,182,212,.35),transparent_40%),linear-gradient(145deg,#050916,#0b1030_55%,#050916)]" />
      <Starfield count={70} />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full border border-cyan-300/20" style={{ animation: "hx-orbit 26s linear infinite" }}><span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_20px_#67e8f9]" /></div>
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full border border-fuchsia-300/15" style={{ animation: "hx-orbit 34s linear infinite reverse" }}><span className="absolute bottom-1/2 right-0 h-2.5 w-2.5 translate-x-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_18px_#f0abfc]" /></div>
      <div className="relative p-6 sm:p-10">
        <button onClick={onExit} aria-label="Thoát" className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/30 p-2 text-slate-300 transition hover:border-cyan-300/50 hover:text-white"><X className="h-4 w-4" /></button>
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[1.8rem] border border-cyan-300/30 bg-cyan-300/10 text-cyan-200" style={{ animation: "hx-pulse 3s ease-in-out infinite" }}><Rocket className="h-12 w-12" /></div>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-cyan-300">Haechi Space Mission · 01</p>
          <h2 className="mt-2 bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-6xl">PHI ĐỘI HANGUL</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300">Bắn hạ thiên thạch bằng cách gõ đúng Hangul hoặc chọn đáp án. Chuỗi combo càng dài, điểm càng cao — không cần bàn phím tiếng Hàn vẫn chơi được.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold">
            <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1.5 text-emerald-200">{koreanWords.length.toLocaleString("vi-VN")} từ có nghĩa</span>
            <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-3 py-1.5 text-fuchsia-200">{learnedCount.toLocaleString("vi-VN")} từ FSRS</span>
            <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-amber-200">Kỷ lục {best.toLocaleString("vi-VN")} điểm</span>
          </div>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-4 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-3xl border border-white/10 bg-black/25 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-200"><Target className="h-4 w-4" /> Chọn độ khó</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => {
                const item = DIFFICULTIES[key];
                const active = difficulty === key;
                return <button key={key} type="button" onClick={() => setDifficulty(key)} aria-pressed={active} className={`rounded-2xl border p-3 text-left transition ${active ? "border-cyan-300/70 bg-cyan-400/15" : "border-white/10 bg-white/[0.035] hover:border-cyan-300/35"}`}>
                  <span className={`block bg-gradient-to-r ${item.accent} bg-clip-text text-sm font-black text-transparent`}>{item.label}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-slate-400">{item.sub}</span>
                  <span className="mt-2 block text-[10px] font-bold text-slate-500">{item.mission} mục tiêu · x{item.multiplier} điểm</span>
                </button>;
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-fuchsia-200"><Keyboard className="h-4 w-4" /> Cách nhập</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setInputMode("type")} aria-pressed={inputMode === "type"} className={`flex items-center gap-2 rounded-2xl border p-3 text-left text-xs font-bold transition ${inputMode === "type" ? "border-cyan-300/70 bg-cyan-400/15 text-cyan-100" : "border-white/10 bg-white/[0.035] text-slate-300"}`}><Keyboard className="h-4 w-4 shrink-0" /><span>Gõ Hangul<small className="mt-0.5 block font-normal text-[10px] opacity-70">Dành cho ai có bàn phím Hàn</small></span></button>
              <button type="button" onClick={() => setInputMode("choice")} aria-pressed={inputMode === "choice"} className={`flex items-center gap-2 rounded-2xl border p-3 text-left text-xs font-bold transition ${inputMode === "choice" ? "border-fuchsia-300/70 bg-fuchsia-400/15 text-fuchsia-100" : "border-white/10 bg-white/[0.035] text-slate-300"}`}><MousePointerClick className="h-4 w-4 shrink-0" /><span>Chọn đáp án<small className="mt-0.5 block font-normal text-[10px] opacity-70">Chơi trên điện thoại / không cần gõ</small></span></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setWordMode("random")} aria-pressed={wordMode === "random"} className={`rounded-2xl border p-3 text-left transition ${wordMode === "random" ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-white/10 bg-white/[0.035] text-slate-300"}`}><span className="block text-xs font-black">Từ ngẫu nhiên</span><span className="mt-1 block text-[10px] opacity-75">Lấy từ toàn bộ {koreanWords.length.toLocaleString("vi-VN")} mục</span></button>
              <button type="button" onClick={() => setWordMode("fsrs")} aria-pressed={wordMode === "fsrs"} className={`rounded-2xl border p-3 text-left transition ${wordMode === "fsrs" ? "border-fuchsia-300 bg-fuchsia-400/15 text-fuchsia-100" : "border-white/10 bg-white/[0.035] text-slate-300"}`}><span className="block text-xs font-black">Ôn FSRS</span><span className="mt-1 block text-[10px] opacity-75">{learnedCount.toLocaleString("vi-VN")} từ đã học</span></button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-200"><Sparkles className="h-4 w-4" /> Nhiệm vụ</div>
            <div className="mt-3 space-y-2">
              {[
                { icon: Crosshair, title: "Đọc nghĩa", text: "Thiên thạch rơi xuống mang nghĩa tiếng Việt." },
                { icon: Zap, title: "Bắn chính xác", text: "Gõ Hangul hoặc chọn đáp án đúng trước khi chạm đất." },
                { icon: Flame, title: "Giữ combo", text: "Đúng liên tiếp để nhân điểm; sai sẽ tăng tốc." },
              ].map((step) => <div key={step.title} className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><step.icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><div><p className="text-xs font-black text-white">{step.title}</p><p className="mt-0.5 text-[11px] leading-5 text-slate-400">{step.text}</p></div></div>)}
            </div>
            <button onClick={startGame} disabled={wordMode === "fsrs" ? !learnedCount : !koreanWords.length} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-fuchsia-500 px-5 text-sm font-black text-white shadow-[0_18px_40px_-12px_rgba(34,211,238,.65)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><Play className="h-4 w-4 fill-current" /> Bắt đầu nhiệm vụ <ChevronRight className="h-4 w-4" /></button>
            <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>{wordMode === "fsrs" ? `${learnedCount.toLocaleString("vi-VN")} từ FSRS · tối đa ${DIFFICULTIES[difficulty].mission}` : `Tối đa ${Math.min(DIFFICULTIES[difficulty].mission, koreanWords.length)} từ · ${DIFFICULTIES[difficulty].lives} mạng`}</span>
              <button type="button" onClick={toggleSound} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-slate-400 hover:text-white">{soundOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}{soundOn ? "Âm thanh" : "Tắt tiếng"}</button>
            </div>
            {!koreanWords.length && <p className="mt-2 text-[11px] font-bold text-amber-300">Đang tải từ điển. Hãy thử lại sau giây lát.</p>}
            {wordMode === "fsrs" && !learnedCount && <p className="mt-2 text-[11px] font-bold text-amber-300">Chưa có từ FSRS. Chọn Từ ngẫu nhiên hoặc học thẻ trước.</p>}
            {coarsePointer && <p className="mt-2 text-[10px] text-cyan-300/80">Đã tự chọn chế độ Chọn đáp án cho thiết bị cảm ứng.</p>}
          </div>
        </div>
      </div>
    </section>;
  }

  if (game.status === "won" || game.status === "lost") {
    const won = game.status === "won";
    return <section className="hx-game relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[#050916] p-6 text-center text-white shadow-2xl sm:p-10">
      <style>{GAME_CSS}</style>
      <Starfield count={45} muted />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,.24),transparent_55%)]" />
      <div className="relative mx-auto max-w-xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-cyan-300/30 bg-cyan-300/10 text-4xl">{won ? "🏆" : "🛸"}</div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">{won ? "Mission complete" : "Mission failed"}</p>
        <h2 className="mt-2 text-3xl font-black sm:text-4xl">{won ? "Phi đội chiến thắng!" : "Rút về căn cứ"}</h2>
        <p className="mt-3 text-sm text-slate-300">{won ? "Bạn đã bảo vệ được tuyến phòng thủ Hangul." : "Hết năng lượng, nhưng mỗi lần thử là thêm một từ nhớ lâu hơn."}</p>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Điểm", value: game.score.toLocaleString("vi-VN"), icon: Trophy },
            { label: "Đúng", value: `${game.correct}/${game.targets.length}`, icon: Target },
            { label: "Combo", value: `x${game.maxCombo}`, icon: Flame },
            { label: "Thời gian", value: `${Math.round(game.elapsed)}s`, icon: Gauge },
          ].map((stat) => <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><stat.icon className="mx-auto h-4 w-4 text-cyan-300" /><p className="mt-1 text-lg font-black">{stat.value}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</p></div>)}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400"><Shield className="h-3.5 w-3.5 text-emerald-300" /> Độ chính xác {accuracy}% · XP được ghi ở mức thấp theo lượt học hợp lệ.</div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={startGame} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-xs font-black text-white"><RotateCcw className="h-4 w-4" /> Chơi lại</button>
          <button onClick={onExit} className="min-h-11 rounded-xl border border-white/15 px-5 text-xs font-bold text-slate-300">Thoát</button>
        </div>
      </div>
    </section>;
  }

  return <section className="hx-game relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[#050916] text-white shadow-[0_30px_90px_-25px_rgba(34,211,238,.4)]">
    <style>{GAME_CSS}</style>
    <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0a1024]/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300"><Rocket className="h-5 w-5" /></span>
        <div><p className="text-xs font-black tracking-widest text-white">PHI ĐỘI HANGUL</p><p className="text-[10px] text-slate-400">Mục tiêu {Math.min(game.targetIndex + 1, game.targets.length)}/{game.targets.length} · {stageNames[stage]}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-xs font-black text-amber-200"><Trophy className="h-3.5 w-3.5" /> {game.score.toLocaleString("vi-VN")}</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-2.5 py-1 text-xs font-black text-fuchsia-200"><Flame className="h-3.5 w-3.5" /> x{game.combo}</span>
        <span className="inline-flex items-center gap-1 text-sm tracking-wider" aria-label={`${game.lives} mạng`}>{Array.from({ length: game.maxLives }, (_, index) => <Shield key={index} className={`h-4 w-4 ${index < game.lives ? "text-rose-300" : "text-slate-700"}`} />)}</span>
        <button onClick={toggleSound} aria-label={soundOn ? "Tắt âm thanh" : "Bật âm thanh"} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-white">{soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>
        <button onClick={togglePause} aria-label={game.status === "paused" ? "Tiếp tục" : "Tạm dừng"} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:text-white">{game.status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
        <button onClick={onExit} aria-label="Thoát" className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-white"><X className="h-4 w-4" /></button>
      </div>
    </header>
    <div className="h-1 w-full bg-white/5"><div className="h-full bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-400 transition-[width] duration-300" style={{ width: `${Math.round((game.correct / Math.max(1, game.targets.length)) * 100)}%` }} /></div>

    <div className="relative h-[min(54vh,470px)] min-h-[320px] overflow-hidden" key={`stage-${game.wrongFlash}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_22%,rgba(88,28,135,.55),transparent_42%),radial-gradient(ellipse_at_82%_48%,rgba(8,47,73,.7),transparent_45%),linear-gradient(145deg,#080b20,#050916_60%,#0b0f28)]" />
      <Starfield count={60} />
      <div className="pointer-events-none absolute right-[7%] top-[9%] h-14 w-14 rounded-full bg-gradient-to-br from-orange-200 via-orange-500 to-red-900 shadow-[0_0_50px_rgba(249,115,22,.35)]"><div className="absolute inset-2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fed7aa,transparent_55%)]" /></div>
      <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-72 rounded-[50%] bg-gradient-to-t from-cyan-500/15 to-transparent blur-2xl" />

      <div className="absolute inset-x-0 top-0 z-10 h-full" style={{ animation: game.wrongFlash ? "hx-shake .32s ease-in-out" : undefined }}>
        {target && <div key={game.targetIndex} className="absolute left-1/2 z-20 w-[min(86%,430px)] -translate-x-1/2 transition-[top] duration-100 ease-linear" style={{ top: `${Math.max(2, game.meteorY)}%` }}>
          <div className="relative mx-auto">
            <div className="absolute left-1/2 top-0 h-16 w-1 -translate-x-1/2 -translate-y-full bg-gradient-to-t from-orange-300/10 via-orange-300/50 to-transparent blur-[1px]" />
            <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-100 via-orange-200 to-orange-500 px-4 py-3 text-center text-slate-950 shadow-[0_0_38px_rgba(251,146,60,.55)]" style={{ animation: reduceMotion ? undefined : "hx-in .25s ease-out" }}>
              <span className="block text-[9px] font-black uppercase tracking-[0.28em] text-orange-950/70">뜻 · Nghĩa</span>
              <p className="mt-0.5 line-clamp-3 text-sm font-black leading-5 sm:text-base">{target.meaning}</p>
              {showHint && <p className="mt-1 rounded-md bg-black/10 px-2 py-0.5 font-noto text-xs font-bold text-orange-950">Gợi ý: {Array.from(target.korean)[0]}…</p>}
            </div>
          </div>
        </div>}
        {game.explosion > 0 && <div className="absolute left-1/2 -translate-x-1/2" style={{ top: `${game.blastY}%` }}><Burst seed={game.explosion} /></div>}
      </div>

      <div className="absolute bottom-[7%] left-0 h-px w-full bg-gradient-to-r from-transparent via-rose-400/70 to-transparent shadow-[0_0_20px_#fb7185]" />
      <div className="absolute bottom-[8%] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center">
        {game.shot && <div className="pointer-events-none absolute bottom-[75%] h-[52vh] w-1 bg-gradient-to-t from-cyan-200 via-cyan-300/80 to-transparent shadow-[0_0_18px_#22d3ee]" />}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-cyan-200" style={{ animation: reduceMotion ? undefined : "hx-glow 2.4s ease-in-out infinite" }}>
          <Rocket className="h-8 w-8 -rotate-45 drop-shadow-[0_0_12px_#67e8f9]" />
          <span className="absolute -bottom-3 h-4 w-3 rounded-full bg-gradient-to-b from-amber-300 to-rose-500 blur-[2px]" style={{ animation: reduceMotion ? undefined : "hx-thruster .45s ease-in-out infinite" }} />
        </div>
      </div>

      <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] font-bold text-cyan-200">Tốc độ {game.speed.toFixed(1)}</span>
        <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] font-bold text-slate-300">Sai: tăng tốc</span>
        {game.combo >= 3 && <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/20 px-3 py-1.5 text-[10px] font-black text-fuchsia-200">COMBO x{game.combo}</span>}
      </div>
      {game.status === "paused" && <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm"><p className="font-black text-white">Đang tạm dừng</p><button onClick={togglePause} className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white"><Play className="h-5 w-5 fill-current" /></button></div>}
    </div>

    <div className="relative z-10 bg-[#0a1024] p-4 sm:px-6">
      {inputMode === "type" ? <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex flex-1 items-center gap-3 rounded-xl border border-slate-700 bg-[#020617] px-4 transition focus-within:border-cyan-400 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,.12)]"><Keyboard className="h-4 w-4 shrink-0 text-cyan-400" /><input ref={inputRef} value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") fire(); }} disabled={!target || game.status !== "playing"} lang="ko" autoComplete="off" autoCapitalize="off" spellCheck={false} className="min-h-12 w-full bg-transparent font-noto text-lg font-bold text-white outline-none placeholder:text-slate-600" placeholder="Gõ Hangul rồi nhấn Enter…" /></label>
        <div className="flex gap-2"><button onClick={useHint} disabled={!target || game.status !== "playing" || showHint} className="inline-flex min-h-12 items-center gap-1 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 text-xs font-black text-amber-200 disabled:opacity-30"><Lightbulb className="h-4 w-4" /> Gợi ý</button><button onClick={fire} disabled={!answer.trim() || game.status !== "playing"} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-xs font-black text-white disabled:opacity-40"><Crosshair className="h-4 w-4" /> BẮN</button></div>
      </div> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((option, index) => <button key={option.korean} onClick={() => submit(option.korean)} disabled={game.status !== "playing"} className="group flex min-h-14 items-center gap-2 rounded-xl border border-slate-700 bg-[#020617] px-3 text-left transition hover:-translate-y-0.5 hover:border-fuchsia-400/60 hover:bg-fuchsia-500/10 disabled:opacity-40"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-[10px] font-black text-slate-500 group-hover:text-fuchsia-300">{index + 1}</span><span className="font-noto text-base font-black text-white">{option.korean}</span></button>)}
      </div>}
      <div className="mt-2 flex flex-col items-center justify-between gap-2 text-[10px] text-slate-500 sm:flex-row">
        <p aria-live="polite" className={`min-h-5 text-center text-xs font-bold sm:text-left ${game.message.includes("Chưa đúng") || game.message.includes("lọt") ? "text-amber-300" : "text-emerald-300"}`}>{game.message || (inputMode === "type" ? "Gõ đúng Hangul để bắn hạ thiên thạch." : "Chọn đáp án đúng trước khi thiên thạch chạm đất.")}</p>
        <span className="shrink-0">{game.correct}/{game.targets.length} đúng · {accuracy}% chính xác</span>
      </div>
    </div>
  </section>;
}
