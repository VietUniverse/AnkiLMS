"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Award, BookOpen, Check, Clock3, Flame, Gem, Headphones, LockKeyhole, Mic2, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { ACHIEVEMENTS_DATA, ACHIEVEMENT_METRIC_LABELS, AchievementMetric } from "../data/achievementsData";
import { ApiClient, UserProfile } from "../lib/apiClient";
import { useApp } from "../contexts/AppProvider";

type AchievementState = { id: string; metric: AchievementMetric; target: number; gems: number; minCards: number; progress: number; unlocked: boolean; claimed: boolean };
const filters: Array<{ id: "all" | AchievementMetric; label: string }> = [
  { id: "all", label: "Tất cả" }, { id: "streak", label: "Chuỗi học" }, { id: "level", label: "Cấp độ" },
  { id: "sessions", label: "Phiên học" }, { id: "minutes", label: "Thời gian" }, { id: "cards", label: "Câu học" },
  { id: "dictation", label: "Nghe chép" }, { id: "shadowing", label: "Shadowing" }, { id: "topik", label: "TOPIK" }, { id: "accuracy", label: "Độ chính xác" },
];
const metricIcon: Record<AchievementMetric, React.ElementType> = { streak: Flame, level: Zap, sessions: BookOpen, minutes: Clock3, cards: BookOpen, dictation: Headphones, shadowing: Mic2, topik: Award, accuracy: Target };
const tiers = {
  bronze: "from-orange-400/15 to-amber-500/5 border-orange-400/20 text-orange-200",
  silver: "from-slate-300/15 to-slate-500/5 border-slate-300/25 text-slate-100",
  gold: "from-amber-300/20 to-yellow-600/5 border-amber-300/30 text-amber-100",
  diamond: "from-cyan-300/20 via-blue-500/10 to-violet-500/10 border-cyan-200/35 text-cyan-100",
};

interface AchievementsModuleProps { currentUser: UserProfile | null }

export const AchievementsModule: React.FC<AchievementsModuleProps> = ({ currentUser }) => {
  const { handleOpenAuth, setCurrentUser } = useApp();
  const [states, setStates] = useState<AchievementState[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    void fetch("/api/achievements", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được thành tích.");
      if (active) setStates(data.achievements || []);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được thành tích."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser?.id]);

  const stateById = useMemo(() => new Map(states.map((item) => [item.id, item])), [states]);
  const visible = ACHIEVEMENTS_DATA.filter((badge) => filter === "all" || badge.category === filter);
  const claimedCount = states.filter((item) => item.claimed).length;
  const readyCount = states.filter((item) => item.unlocked && !item.claimed).length;

  async function claim(id: string) {
    setWorkingId(id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/achievements", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không nhận được phần thưởng.");
      setStates(data.achievements || []);
      if (currentUser && data.user) {
        const updated = { ...currentUser, ...data.user };
        setCurrentUser(updated);
        localStorage.setItem("haechivn_user_profile", JSON.stringify(updated));
      }
      setMessage(`Đã nhận ${data.gemsAwarded} kim cương!`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không nhận được phần thưởng."); }
    finally { setWorkingId(null); }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24 animate-fadeIn">
      <header className="relative overflow-hidden rounded-[28px] border border-violet-300/20 bg-gradient-to-br from-violet-950 via-slate-900 to-cyan-950 p-6 sm:p-8">
        <div className="absolute -right-8 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/30 bg-gradient-to-br from-amber-300/20 to-fuchsia-500/20 text-amber-200 shadow-lg shadow-amber-950/20"><Trophy className="h-7 w-7" /></div><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">HaechiVN · Hall of fame</p><h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Huy hiệu & mốc chinh phục</h1><p className="mt-1 text-xs text-slate-300 sm:text-sm">Học thật, đạt mốc thật, nhận kim cương để mở khóa vật phẩm hồ sơ.</p></div></div><div className="flex gap-2"><div className="min-w-24 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center"><p className="text-xl font-black text-emerald-200">{claimedCount}<span className="text-sm text-slate-500">/{ACHIEVEMENTS_DATA.length}</span></p><p className="text-[10px] font-bold text-slate-400">Đã nhận</p></div><div className="min-w-24 rounded-2xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-center"><p className="flex items-center justify-center gap-1 text-xl font-black text-amber-100">{currentUser?.gems || 0}<Gem className="h-4 w-4" /></p><p className="text-[10px] font-bold text-amber-100/70">Kim cương</p></div></div></div>
        {readyCount > 0 && <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-100"><Sparkles className="h-4 w-4" />Có {readyCount} mốc sẵn sàng nhận thưởng</div>}
      </header>

      {!currentUser && <div className="card-duo flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left"><div><h2 className="font-black text-white">Đăng nhập để lưu huy hiệu của bạn</h2><p className="mt-1 text-xs text-slate-400">Thành tích được tính từ các phiên học đã đồng bộ lên tài khoản.</p></div><button onClick={() => handleOpenAuth(false)} className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white">Đăng nhập</button></div>}
      {message && <p role="status" className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-200">✨ {message}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}

      <nav className="flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item.id} onClick={() => setFilter(item.id)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition ${filter === item.id ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"}`}>{item.label}</button>)}</nav>
      {loading ? <div className="card-duo p-10 text-center text-sm text-slate-400">Đang đồng bộ hành trình của bạn…</div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.map((badge) => {
        const state = stateById.get(badge.id);
        const unlocked = state?.unlocked || state?.claimed || false;
        const progress = Math.min(badge.reqValue, state?.progress || 0);
        const percent = Math.min(100, Math.round(progress / badge.reqValue * 100));
        const Icon = metricIcon[badge.category];
        return <article key={badge.id} className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 transition-all ${unlocked ? tiers[badge.tier] : "border-slate-800 from-slate-900 to-slate-950 text-slate-500"}`}>
          <div className="flex items-start gap-3"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl ${unlocked ? "border-white/15 bg-black/15 shadow-inner" : "border-slate-700 bg-slate-800/80 grayscale"}`} aria-hidden="true">{badge.icon}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h2 className={`text-sm font-black ${unlocked ? "text-white" : "text-slate-300"}`}>{badge.name}</h2><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{badge.description}</p></div><span className={`rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[9px] font-black uppercase tracking-wider ${unlocked ? "text-amber-100" : "text-slate-500"}`}>{badge.tier === "diamond" ? "Kim cương" : badge.tier}</span></div></div></div>
          <div className="mt-4"><div className="mb-1.5 flex items-center justify-between text-[10px] font-bold"><span className="flex items-center gap-1 text-slate-400"><Icon className="h-3 w-3" />{progress.toLocaleString("vi-VN")} / {badge.reqValue.toLocaleString("vi-VN")} {ACHIEVEMENT_METRIC_LABELS[badge.category]}</span><span className={unlocked ? "text-emerald-200" : "text-slate-500"}>{percent}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-black/30"><div className={`h-full rounded-full transition-all ${unlocked ? "bg-gradient-to-r from-emerald-300 to-cyan-300" : "bg-slate-600"}`} style={{ width: `${percent}%` }} /></div></div>
          <div className="mt-3 flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-xs font-black text-amber-200"><Gem className="h-3.5 w-3.5" />+{badge.rewardGems >= 100 ? 2 : 1}</span>{state?.claimed ? <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-300/10 px-3 py-2 text-[10px] font-black text-emerald-200"><Check className="h-3.5 w-3.5" />Đã nhận thưởng</span> : state?.unlocked && currentUser ? <button disabled={workingId !== null} onClick={() => void claim(badge.id)} className="rounded-lg bg-gradient-to-r from-emerald-300 to-cyan-300 px-3 py-2 text-[10px] font-black text-slate-950 disabled:opacity-50">{workingId === badge.id ? "Đang nhận…" : "Nhận kim cương"}</button> : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500"><LockKeyhole className="h-3 w-3" />Chưa mở khóa</span>}</div>
        </article>;
      })}</div>}
    </div>
  );
};
