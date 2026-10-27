"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, Award, BookOpen, Clock3, Flame, LockKeyhole, Sparkles, Trophy, Zap } from "lucide-react";
import { useApp } from "../contexts/AppProvider";
import { getStudyRank } from "../lib/studyRanks";

type PublicProfile = {
  id: string; name: string; bio: string | null; avatar_url: string | null; profile_public: number;
  streak: number; longest_streak: number; xp: number; level: number; active_badge: string | null;
  active_frame: string | null; active_background: string | null; created_at: string;
};
type ProfileData = {
  profile: PublicProfile;
  summary: { session_count: number; cards_reviewed: number; duration_seconds: number };
  days: { day: string; minutes: number; cards: number }[];
  sessions: { module: string; cards_reviewed: number; duration_seconds: number; created_at: string }[];
};

const frames: Record<string, string> = {
  frame_neon: "linear-gradient(135deg,#22d3ee,#6366f1,#e879f9)", frame_hanbok: "linear-gradient(135deg,#fb7185,#fbbf24,#fef3c7)",
  frame_galaxy: "linear-gradient(135deg,#312e81,#7c3aed,#22d3ee)", frame_diamond: "linear-gradient(135deg,#a5f3fc,#60a5fa,#f5d0fe)", frame_gold: "linear-gradient(135deg,#92400e,#facc15,#fff7ae)",
};
const backgrounds: Record<string, string> = {
  bg_seoul: "radial-gradient(at 15% 10%,#4338ca 0,transparent 42%),radial-gradient(at 90% 20%,#c026d3 0,transparent 38%),linear-gradient(140deg,#070b22,#172554 55%,#0f172a)",
  bg_cherry: "radial-gradient(at 15% 15%,#f9a8d4 0,transparent 40%),radial-gradient(at 90% 25%,#fda4af 0,transparent 35%),linear-gradient(140deg,#4a173c,#831843 55%,#1f1235)",
  bg_bukchon: "radial-gradient(at 80% 0%,#fb923c 0,transparent 40%),radial-gradient(at 10% 100%,#b45309 0,transparent 45%),linear-gradient(140deg,#292018,#78350f 55%,#1c1917)",
  bg_milkyway: "radial-gradient(at 15% 20%,#7c3aed 0,transparent 40%),radial-gradient(at 85% 65%,#0891b2 0,transparent 42%),linear-gradient(140deg,#09051c,#1e1b4b 50%,#020617)",
  bg_palace: "radial-gradient(at 70% 8%,#e0f2fe 0,transparent 24%),radial-gradient(at 12% 86%,#0e7490 0,transparent 38%),linear-gradient(145deg,#061326,#164e63 48%,#0f172a)",
  bg_aurora: "radial-gradient(at 15% 5%,#34d399 0,transparent 36%),radial-gradient(at 80% 15%,#8b5cf6 0,transparent 40%),radial-gradient(at 50% 100%,#0891b2 0,transparent 50%),linear-gradient(150deg,#020617,#0f172a 55%,#10112a)",
};
const badgeNames: Record<string, string> = { study_sprout: "Mầm học tập", hangul_star: "Ngôi sao Hangeul", topik_tiger: "Hổ TOPIK", badge_seoul_night: "Đêm Seoul", badge_dokkaebi: "Dokkaebi huyền thoại", badge_dragon: "Rồng Hàn ngữ" };
const duration = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}p`;

export function PublicProfileModule({ profileId }: { profileId: string }) {
  const { currentUser } = useApp();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) { setError("Không tìm thấy mã hồ sơ."); setLoading(false); return; }
    let active = true;
    void fetch(`/api/profile?id=${encodeURIComponent(profileId)}`, { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không xem được hồ sơ này.");
      if (active) setData(result as ProfileData);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được hồ sơ."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profileId]);

  if (loading) return <div className="mx-auto max-w-4xl animate-pulse rounded-3xl border border-slate-800 bg-slate-900 p-8 text-sm text-slate-400">Đang tải hồ sơ học viên…</div>;
  if (error || !data) return <div className="mx-auto max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center"><LockKeyhole className="mx-auto h-10 w-10 text-amber-300" /><h1 className="mt-3 text-lg font-black text-white">Hồ sơ không khả dụng</h1><p className="mt-2 text-sm text-slate-400">{error || "Hồ sơ này có thể đã bị xóa hoặc đặt ở chế độ riêng tư."}</p><Link href="/leaderboard" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-bold text-white"><ArrowLeft className="h-4 w-4" />Quay lại bảng xếp hạng</Link></div>;

  const { profile, summary, days, sessions } = data;
  const today = new Date();
  const activeDays = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(today); date.setDate(today.getDate() - (27 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { key, data: days.find((day) => day.day === key) };
  });
  const isMine = currentUser?.id === profile.id;

  return <div className="mx-auto max-w-5xl space-y-5 pb-24 text-slate-100">
    <div className="flex items-center justify-between gap-3"><Link href="/leaderboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-slate-200"><ArrowLeft className="h-4 w-4" />Bảng xếp hạng</Link>{isMine && <Link href="/profile/settings" className="inline-flex min-h-10 items-center rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 text-xs font-bold text-sky-200">Chỉnh sửa hồ sơ</Link>}</div>
    <section className="relative overflow-hidden rounded-3xl border border-indigo-300/20 bg-gradient-to-br from-indigo-950 via-slate-900 to-fuchsia-950 bg-cover bg-center p-5 sm:p-8" style={profile.active_background && backgrounds[profile.active_background] ? { backgroundImage: backgrounds[profile.active_background] } : undefined}>
      <div className="absolute inset-0 bg-slate-950/20" /><div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <div className="rounded-[28px] bg-gradient-to-br from-sky-300 via-fuchsia-400 to-indigo-400 p-1 shadow-xl" style={profile.active_frame && frames[profile.active_frame] ? { backgroundImage: frames[profile.active_frame] } : undefined}><div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[24px] bg-slate-950 text-4xl font-black text-white">{profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" /> : profile.name.slice(0, 1).toUpperCase()}</div></div>
        <div className="min-w-0 flex-1"><div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sky-100"><Sparkles className="h-3 w-3" />Hồ sơ học viên</div><h1 className="mt-2 break-words text-2xl font-black text-white sm:text-3xl">{profile.name}</h1>{profile.bio && <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-100 sm:mx-0">{profile.bio}</p>}<div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start"><span className="rounded-full bg-slate-950/40 px-3 py-1 text-xs font-bold text-amber-100">{getStudyRank(profile.level)} · Cấp {profile.level || 1}</span><span className="rounded-full bg-slate-950/40 px-3 py-1 text-xs font-bold text-amber-100"><Zap className="mr-1 inline h-3.5 w-3.5" />{profile.xp.toLocaleString("vi-VN")} XP</span><span className="rounded-full bg-slate-950/40 px-3 py-1 text-xs font-bold text-orange-100"><Flame className="mr-1 inline h-3.5 w-3.5" />{profile.streak} ngày liên tiếp</span>{profile.active_badge && <span className="rounded-full bg-fuchsia-950/60 px-3 py-1 text-xs font-bold text-fuchsia-100">🏅 {badgeNames[profile.active_badge] || "Huy hiệu Haechi"}</span>}</div></div>
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[
      { label: "Thời gian học", value: duration(summary.duration_seconds), icon: Clock3, color: "text-sky-300" },
      { label: "Phiên học", value: summary.session_count.toLocaleString("vi-VN"), icon: BookOpen, color: "text-violet-300" },
      { label: "Câu đã luyện", value: summary.cards_reviewed.toLocaleString("vi-VN"), icon: Activity, color: "text-emerald-300" },
      { label: "Chuỗi tốt nhất", value: `${profile.longest_streak || profile.streak} ngày`, icon: Trophy, color: "text-amber-300" },
    ].map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><Icon className={`mb-3 h-5 w-5 ${color}`} /><p className="text-lg font-black text-white">{value}</p><p className="mt-1 text-[11px] font-semibold text-slate-400">{label}</p></div>)}</section>

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6"><div className="mb-4 flex items-center justify-between gap-2"><div><h2 className="flex items-center gap-2 font-black text-white"><Activity className="h-5 w-5 text-emerald-300" />Hoạt động học gần đây</h2><p className="mt-1 text-xs text-slate-400">28 ngày vừa qua</p></div><span className="text-[10px] font-bold text-slate-400">{days.filter((day) => day.minutes || day.cards).length} ngày hoạt động</span></div><div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14 sm:gap-2">{activeDays.map(({ key, data: day }) => <div key={key} title={`${key}: ${day?.minutes || 0} phút`} className={`aspect-square rounded-md ${!day || (!day.minutes && !day.cards) ? "bg-slate-800" : day.minutes >= 30 ? "bg-emerald-400" : day.minutes >= 10 ? "bg-emerald-500/70" : "bg-emerald-800"}`} />)}</div></section>

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6"><div className="mb-3 flex items-center gap-2"><Award className="h-5 w-5 text-amber-300" /><h2 className="font-black text-white">Phiên học gần đây</h2></div>{sessions.length ? <div className="divide-y divide-slate-800">{sessions.slice(0, 6).map((session, index) => <div key={`${session.created_at}-${index}`} className="flex items-center gap-3 py-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-200"><BookOpen className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-white">{session.module === "dictation" ? "Nghe chép" : session.module === "shadowing" ? "Shadowing" : session.module === "srs" ? "Ôn Anki" : "Luyện tiếng Hàn"}</p><p className="text-[10px] text-slate-400">{new Date(`${session.created_at.replace(" ", "T")}Z`).toLocaleDateString("vi-VN", { dateStyle: "medium" })}</p></div><span className="text-xs font-bold text-slate-300">{session.cards_reviewed} câu · {duration(session.duration_seconds)}</span></div>)}</div> : <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">Chưa có phiên học được ghi nhận.</p>}</section>
  </div>;
}
