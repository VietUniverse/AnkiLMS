"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
import Link from "next/link";
import lessonsData from "../data/topik_lessons.json";
import { ApiClient } from "../lib/apiClient";
import { loadYouTubeIframeApi } from "../lib/youtubeIframe";
import { ArrowDown, ArrowUp, Captions, Check, ChevronDown, ChevronUp, Clock3, Headphones, ListVideo, Pause, Play, Settings2, Volume2, VolumeX } from "lucide-react";

type Segment = { id: number; start: number; end: number; text: string };
type Lesson = { id: string; lessonNum: number; title: string; topikLevel: number; startSec: number; endSec: number; durationSec: number; videoId: string; segments?: Segment[]; sourceTitle?: string };
type Player = {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (options: { videoId: string; startSeconds: number; endSeconds: number }) => void;
  getCurrentTime: () => number;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  getPlayerState: () => number;
};

const playlist = lessonsData as Lesson[];
const playerApiOrigin = "https://www.youtube.com";

export function PassiveListeningModule() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const playerRef = useRef<Player | null>(null);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const autoPlayRef = useRef(false);
  const touchStartRef = useRef<number | null>(null);
  const wheelLockRef = useRef(false);
  const recordedRef = useRef<Set<string>>(new Set());
  const completedRef = useRef<Set<string>>(new Set());

  const current = playlist[activeIndex] || playlist[0];
  const currentRef = useRef(current);
  currentRef.current = current;
  const nextLesson = playlist[activeIndex + 1];
  const previousLesson = playlist[activeIndex - 1];
  const currentSegment = useMemo(() => current?.segments?.find((segment) => currentTime >= segment.start && currentTime < segment.end), [current, currentTime]);
  const progress = current ? Math.min(100, Math.max(0, ((currentTime - current.startSec) / Math.max(1, current.durationSec)) * 100)) : 0;

  const changeLesson = useCallback((index: number, autoplay = true) => {
    const bounded = Math.max(0, Math.min(playlist.length - 1, index));
    const lesson = playlist[bounded];
    if (!lesson) return;
    activeIndexRef.current = bounded;
    autoPlayRef.current = autoplay;
    setActiveIndex(bounded);
    setCurrentTime(lesson.startSec);
    setPlayerError("");
    if (playerRef.current) {
      playerRef.current.loadVideoById({ videoId: lesson.videoId, startSeconds: lesson.startSec, endSeconds: lesson.endSec });
      if (autoplay) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    }
    setPlaying(autoplay);
    setShowPlaylist(false);
  }, []);

  const markCompleted = useCallback((lesson: Lesson) => {
    if (completedRef.current.has(lesson.id)) return;
    completedRef.current.add(lesson.id);
    setCompleted(Array.from(completedRef.current));
    if (!recordedRef.current.has(lesson.id)) {
      recordedRef.current.add(lesson.id);
      void ApiClient.recordStudySession("passive_listening", 1, 1, 0, Math.max(1, Math.round(lesson.durationSec)));
    }
  }, []);

  useEffect(() => {
    if (!playerHostRef.current || !current) return;
    let cancelled = false;
    let monitor: number | undefined;
    void loadYouTubeIframeApi().then((api) => {
      if (cancelled || !playerHostRef.current) return;
      const host = document.createElement("div");
      host.className = "h-full w-full";
      playerHostRef.current.replaceChildren(host);
      const PlayerCtor = api.Player as unknown as new (element: HTMLElement, options: Record<string, unknown>) => Player;
      playerRef.current = new PlayerCtor(host, {
        width: "100%", height: "100%", videoId: current.videoId,
        playerVars: { autoplay: autoPlayRef.current ? 1 : 0, start: Math.floor(current.startSec), end: Math.ceil(current.endSec), playsinline: 1, controls: 0, rel: 0, fs: 0, disablekb: 1, origin: window.location.origin },
        events: {
          onReady: (event: { target: Player }) => {
            event.target.setPlaybackRate(rate);
            if (muted) event.target.mute();
            else event.target.unMute();
            if (autoPlayRef.current) event.target.playVideo();
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === 1) setPlaying(true);
            if (event.data === 2 || event.data === 0) setPlaying(false);
            if (event.data === 0) {
              markCompleted(currentRef.current);
              changeLesson(activeIndexRef.current + 1, true);
            }
          },
          onError: () => setPlayerError("Video này không phát được trong trình nhúng. Hãy mở video trực tiếp trên YouTube hoặc chuyển sang bài khác."),
        },
      });
      monitor = window.setInterval(() => {
        const player = playerRef.current;
        if (!player || player.getPlayerState() !== 1) return;
        const time = player.getCurrentTime();
        setCurrentTime(time);
        const lesson = currentRef.current;
        if (time >= lesson.endSec - 0.25) {
          markCompleted(lesson);
          changeLesson(activeIndexRef.current + 1, true);
        }
      }, 400);
    }).catch(() => setPlayerError("Không tải được trình phát YouTube. Kiểm tra mạng rồi thử lại."));

    return () => {
      cancelled = true;
      if (monitor) window.clearInterval(monitor);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [activeIndex, changeLesson, markCompleted, current]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.setPlaybackRate(rate);
    if (muted) player.mute();
    else player.unMute();
  }, [muted, rate]);

  const togglePlay = () => {
    if (!playerRef.current) { autoPlayRef.current = true; setPlaying(true); return; }
    if (playing) playerRef.current.pauseVideo();
    else { autoPlayRef.current = true; playerRef.current.playVideo(); }
  };

  const handleWheel = (event: WheelEvent) => {
    if (Math.abs(event.deltaY) < 35 || wheelLockRef.current) return;
    wheelLockRef.current = true;
    window.setTimeout(() => { wheelLockRef.current = false; }, 650);
    if (event.deltaY > 0) changeLesson(activeIndex + 1, true);
    else changeLesson(activeIndex - 1, true);
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key === "ArrowDown" || event.key === "PageDown") { event.preventDefault(); changeLesson(activeIndexRef.current + 1, true); }
      if (event.key === "ArrowUp" || event.key === "PageUp") { event.preventDefault(); changeLesson(activeIndexRef.current - 1, true); }
      if (event.key === " ") { event.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (next) playerRef.current?.mute(); else playerRef.current?.unMute();
  };

  if (!current) return <div className="p-10 text-center text-slate-300">Chưa có video trong danh sách phát.</div>;

  return (
    <div className="mx-auto w-full max-w-[1500px] animate-fadeIn">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <div><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300"><Headphones className="h-4 w-4" /> HaechiVN · Nghe thụ động</p><h1 className="mt-1 text-xl font-black text-white sm:text-2xl">Lướt để nghe tiếng Hàn</h1></div>
        <div className="flex items-center gap-2"><span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-slate-300">{activeIndex + 1} / {playlist.length} video</span><button onClick={() => setShowPlaylist((value) => !value)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"><ListVideo className="h-4 w-4" />Danh sách</button></div>
      </header>

      <div className="relative h-[min(76dvh,820px)] min-h-[470px] overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl shadow-black/40 sm:h-[min(78dvh,860px)]" onWheel={handleWheel} onTouchStart={(event) => { touchStartRef.current = event.touches[0]?.clientY ?? null; }} onTouchEnd={(event) => {
        if (touchStartRef.current === null) return;
        const delta = touchStartRef.current - (event.changedTouches[0]?.clientY ?? touchStartRef.current);
        if (Math.abs(delta) > 55) changeLesson(activeIndexRef.current + (delta > 0 ? 1 : -1), true);
        touchStartRef.current = null;
      }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#243041_0%,_#090b11_72%)]" />
        <div ref={playerHostRef} className="absolute inset-0 flex items-center justify-center [&>div]:h-full [&>div]:w-full [&_iframe]:h-full [&_iframe]:w-full" />
        {playerError && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-8 text-center"><div><p className="mb-4 text-sm font-bold text-rose-200">{playerError}</p><a href={`https://www.youtube.com/watch?v=${current.videoId}`} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-950">Mở trên YouTube ↗</a></div></div>}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute left-4 right-16 top-4 z-10 flex items-center gap-2 text-xs font-bold text-white drop-shadow sm:left-6 sm:top-5"><span className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 backdrop-blur"><span className="text-cyan-300">TOPIK {current.topikLevel}</span><span className="mx-2 text-white/40">·</span>{current.videoId === "TLgAJgYqIZk" ? "Hội thoại hằng ngày" : "Giao tiếp · TTMIK"}</span><button onClick={() => setShowSettings((value) => !value)} className="rounded-full border border-white/20 bg-black/40 p-2 backdrop-blur" aria-label="Cài đặt phát"><Settings2 className="h-4 w-4" /></button></div>

        {showSettings && <div className="absolute right-14 top-14 z-20 w-44 rounded-2xl border border-white/15 bg-slate-950/95 p-3 shadow-xl backdrop-blur"><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Tốc độ phát</p><div className="grid grid-cols-3 gap-1">{[0.75, 1, 1.25].map((value) => <button key={value} onClick={() => { setRate(value); playerRef.current?.setPlaybackRate(value); }} className={`rounded-lg py-2 text-xs font-bold ${rate === value ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-slate-300"}`}>{value}×</button>)}</div><button onClick={() => { setCaptionsOn((value) => !value); setShowSettings(false); }} className="mt-2 flex w-full items-center gap-2 rounded-lg bg-white/5 px-2 py-2 text-xs font-bold text-slate-300"><Captions className="h-4 w-4" /> Phụ đề {captionsOn ? "bật" : "tắt"}</button></div>}

        <button onClick={togglePlay} className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white opacity-70 backdrop-blur transition hover:scale-105 hover:opacity-100" aria-label={playing ? "Tạm dừng video" : "Phát video"}>{playing ? <Pause className="h-7 w-7 fill-white" /> : <Play className="ml-1 h-7 w-7 fill-white" />}</button>

        <div className="absolute bottom-0 left-0 right-0 z-10 h-56 bg-gradient-to-t from-black/95 via-black/60 to-transparent sm:h-64" />
        <div className="absolute bottom-5 left-4 right-[4.5rem] z-20 sm:bottom-7 sm:left-7 sm:right-24">
          {captionsOn && currentSegment && <p className="mb-3 inline-block max-w-full rounded-xl bg-black/65 px-3 py-2 text-base font-black leading-relaxed text-white shadow-lg backdrop-blur sm:text-xl">{currentSegment.text}</p>}
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">{current.sourceTitle || "Talk To Me In Korean"}</p>
          <h2 className="line-clamp-2 text-lg font-black leading-snug text-white drop-shadow sm:text-2xl">{current.title.replace(/^Bài \d+:\s*/, "")}</h2>
          <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-200"><Clock3 className="h-3.5 w-3.5" />{Math.floor(current.durationSec / 60)}:{String(Math.floor(current.durationSec % 60)).padStart(2, "0")} · {current.segments?.length || 0} câu</div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-cyan-300 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-4 sm:bottom-28 sm:right-5 sm:gap-5">
          <button onClick={toggleMute} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/70" aria-label={muted ? "Bật tiếng" : "Tắt tiếng"}>{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
          <button onClick={() => setCaptionsOn((value) => !value)} className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur ${captionsOn ? "bg-cyan-300 text-slate-950" : "bg-black/40 text-white"}`} aria-label="Bật tắt phụ đề"><Captions className="h-5 w-5" /></button>
          <button onClick={() => { markCompleted(current); changeLesson(activeIndex + 1, true); }} disabled={!nextLesson} className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/70 disabled:opacity-30" aria-label="Video tiếp theo"><ChevronDown className="h-6 w-6" /><span className="-mt-1 text-[9px] font-black">TIẾP</span></button>
          <button onClick={() => { if (completedRef.current.has(current.id)) return; markCompleted(current); }} className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur ${completed.includes(current.id) ? "bg-emerald-400 text-slate-950" : "bg-black/40 text-white hover:bg-emerald-500/80"}`} aria-label="Đánh dấu đã nghe">{completed.includes(current.id) ? <Check className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}</button>
        </div>

        <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 text-[10px] font-bold text-white/65"><ArrowUp className="h-3 w-3" /> Vuốt lên để xem bài tiếp theo <ArrowDown className="h-3 w-3" /></div>

        {showPlaylist && <div className="absolute inset-0 z-30 bg-black/65 backdrop-blur-sm" onClick={() => setShowPlaylist(false)}><aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-sm flex-col border-l border-white/10 bg-slate-950/95 p-4" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Danh sách phát</p><h3 className="mt-1 text-lg font-black text-white">Video luyện nghe</h3></div><button onClick={() => setShowPlaylist(false)} className="rounded-lg bg-white/10 p-2 text-white" aria-label="Đóng danh sách"><ChevronDown className="h-5 w-5" /></button></div><div className="flex-1 space-y-2 overflow-y-auto">{playlist.map((lesson, index) => <button key={lesson.id} onClick={() => changeLesson(index, true)} className={`w-full rounded-xl border p-3 text-left ${index === activeIndex ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.07]"}`}><div className="flex items-center justify-between gap-2"><p className="line-clamp-1 text-xs font-bold text-white">{lesson.title.replace(/^Bài \d+:\s*/, "")}</p>{completed.includes(lesson.id) && <Check className="h-4 w-4 shrink-0 text-emerald-300" />}</div><p className="mt-1 text-[10px] text-slate-500">TOPIK {lesson.topikLevel} · {Math.round(lesson.durationSec)} giây</p></button>)}</div><Link href="/dictation" className="mt-3 rounded-xl bg-cyan-400/10 px-3 py-3 text-center text-xs font-bold text-cyan-200">Luyện nghe chép chính tả →</Link></aside></div>}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 px-1 text-[11px] text-slate-500"><span>{previousLesson ? <button onClick={() => changeLesson(activeIndex - 1, true)} className="inline-flex items-center gap-1 font-bold text-slate-300 hover:text-white"><ChevronUp className="h-4 w-4" />Bài trước</button> : <span>Đang ở bài đầu tiên</span>}</span><span className="hidden sm:inline">Phím ↑ / ↓ cũng dùng để chuyển video</span><span>{nextLesson ? <button onClick={() => { markCompleted(current); changeLesson(activeIndex + 1, true); }} className="inline-flex items-center gap-1 font-bold text-cyan-200 hover:text-white">Bài tiếp <ChevronDown className="h-4 w-4" /></button> : <span>Đã tới bài cuối</span>}</span></div>
    </div>
  );
}
