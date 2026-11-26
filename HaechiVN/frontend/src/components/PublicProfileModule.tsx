"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, BookOpen, Brain, CheckCircle2, Clock3, Flame, Library, LockKeyhole, Zap } from "lucide-react";
import { useApp } from "../contexts/AppProvider";
import { getStudyRank } from "../lib/studyRanks";
import { OnigiriHeatmap, type HeatmapItem } from "./OnigiriHeatmap";
import { StreakPanel } from "./StreakPanel";

type PublicProfile = {
  id: string; name: string; bio: string | null; avatar_url: string | null; profile_public: number;
  streak: number; longest_streak: number; xp: number; level: number; active_badge: string | null;
  active_frame: string | null; active_background: string | null; created_at: string;
};
type ProfileData = {
  profile: PublicProfile;
  summary: {
    session_count: number; cards_reviewed: number; correct_count: number; duration_seconds: number;
    srs_cards_reviewed: number; srs_correct_count: number; vocab_count: number;
  };
  days: { day: string; minutes: number; cards: number; xp: number; checked_in: number }[];
  sessions: { module: string; cards_reviewed: number; duration_seconds: number | null; created_at: string }[];
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
    const controller = new AbortController();
    void (async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await fetch(`/api/profile?id=${encodeURIComponent(profileId)}`, {
          credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }, signal: controller.signal,
        });
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          if (attempt === 0) continue;
          throw new Error("Máy chủ tạm thời không trả dữ liệu hồ sơ. Vui lòng tải lại trang.");
        }
        const result = await response.json() as ProfileData & { error?: string };
        if (!response.ok) throw new Error(result.error || "Không xem được hồ sơ này.");
        if (active) { setData(result); setError(""); }
        return;
      }
    })().catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Không tải được hồ sơ.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [profileId]);

  if (loading) return <div className="mx-auto max-w-4xl animate-pulse rounded-3xl border border-stone-200 bg-white p-8 text-sm text-stone-500">Đang tải hồ sơ học viên…</div>;
  if (error || !data) return <div className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-8 text-center"><LockKeyhole className="mx-auto h-10 w-10 text-amber-300" /><h1 className="mt-3 text-lg font-black text-stone-900 dark:text-stone-100">Hồ sơ không khả dụng</h1><p className="mt-2 text-sm text-stone-500">{error || "Hồ sơ này có thể đã bị xóa hoặc đặt ở chế độ riêng tư."}</p><Link href="/leaderboard" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-bold text-stone-900 dark:text-stone-100"><ArrowLeft className="h-4 w-4" />Quay lại bảng xếp hạng</Link></div>;

  const { profile, summary, days, sessions } = data;
  const heatmap: HeatmapItem[] = days.map((day) => ({
    checkin_date: day.day,
    time_spent_minutes: day.minutes,
    xp_earned: day.xp,
    cards_reviewed: day.cards,
    checked_in: day.checked_in,
  }));
  const isMine = currentUser?.id === profile.id;
  // correct_count có thể vượt cards_reviewed (thẻ sibling), chặn ở 100 để không hiện 113%.
  const accuracy = summary.cards_reviewed ? Math.min(100, Math.round((summary.correct_count / summary.cards_reviewed) * 100)) : 0;
  const retention = summary.srs_cards_reviewed > 0 ? Math.min(100, Math.round((summary.srs_correct_count / summary.srs_cards_reviewed) * 100)) : null;

  return <div className="mx-auto max-w-5xl space-y-4 pb-24">
    <div className="flex items-center justify-between gap-3">
      <Link href="/leaderboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900/70 dark:text-stone-200"><ArrowLeft className="h-4 w-4" />Bảng xếp hạng</Link>
      {isMine && <Link href="/profile/settings" className="inline-flex min-h-10 items-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-stone-900 dark:text-stone-100 transition-colors hover:bg-sky-800">Chỉnh sửa hồ sơ</Link>}
    </div>

    <section className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900/70 sm:p-8">
      {profile.active_background && backgrounds[profile.active_background] && <>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: backgrounds[profile.active_background] }} />
        <div className="absolute inset-0 bg-white/85" />
      </>}
      <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <div className="rounded-2xl border border-stone-200 bg-white p-1 dark:border-white/20 dark:bg-[#101a32]" style={profile.active_frame && frames[profile.active_frame] ? { backgroundImage: frames[profile.active_frame] } : undefined}>
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800 text-4xl font-black text-stone-600 dark:text-stone-300">{profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} width={96} height={96} decoding="async" className="h-full w-full object-cover" /> : profile.name.slice(0, 1).toUpperCase()}</div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="mt-2 break-words text-2xl font-black text-stone-900 dark:text-stone-100 sm:text-3xl">{profile.name}</h1>
          {profile.bio && <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600 dark:text-stone-300 sm:mx-0">{profile.bio}</p>}
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1 text-xs font-bold text-stone-600 dark:text-stone-300">{getStudyRank(profile.level)}, cấp {profile.level || 1}</span>
            <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1 text-xs font-bold text-stone-600 dark:text-stone-300"><Zap className="mr-1 inline h-3.5 w-3.5" />{profile.xp.toLocaleString("vi-VN")} XP</span>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800"><Flame className="mr-1 inline h-3.5 w-3.5" />{profile.streak} ngày liên tiếp</span>
            {profile.active_badge && <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-bold text-fuchsia-800">🏅 {badgeNames[profile.active_badge] || "Huy hiệu Haechi"}</span>}
          </div>
        </div>
      </div>
    </section>

    {/* Cùng bộ số liệu với trang hồ sơ cá nhân để xem người khác không bị lệch cách hiểu. */}
    <section className="grid grid-cols-2 divide-x divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900/70 sm:grid-cols-4 sm:divide-y-0">{[ 
      { label: "Tổng thời gian học", value: duration(summary.duration_seconds), hint: `${summary.session_count.toLocaleString("vi-VN")} phiên học`, icon: Clock3, color: "text-sky-500" },
      { label: "Thẻ", value: summary.cards_reviewed.toLocaleString("vi-VN"), hint: `${accuracy}% chính xác`, icon: CheckCircle2, color: "text-emerald-500" },
      { label: "Vốn từ", value: summary.vocab_count.toLocaleString("vi-VN"), hint: "thẻ đã thuộc", icon: Library, color: "text-amber-500" },
      { label: "Trí nhớ", value: retention === null ? "—" : `${retention}%`, hint: "Mục tiêu 90%", icon: Brain, color: "text-rose-500" },
    ].map(({ label, value, hint, icon: Icon, color }) => <div key={label} className="p-4 text-center"><p className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300"><Icon className={`h-3.5 w-3.5 ${color}`} />{label}</p><p className="mt-1.5 text-xl font-black tabular-nums text-stone-900 dark:text-stone-100">{value}</p><p className="text-[11px] text-stone-600 dark:text-stone-300">{hint}</p></div>)}</section>

    <StreakPanel data={heatmap} streak={profile.streak} longestStreak={profile.longest_streak || profile.streak} publicView />
    <OnigiriHeatmap data={heatmap} streak={profile.streak} />

    <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/70 sm:p-6">
      <div className="mb-3 flex items-center gap-2"><Award className="h-5 w-5 text-stone-500 dark:text-stone-400" /><h2 className="font-black text-stone-900 dark:text-stone-100">Phiên học gần đây</h2></div>
      {sessions.length ? <div className="space-y-2">{sessions.slice(0, 6).map((session, index) => <div key={`${session.created_at}-${index}`} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 dark:border-stone-800 dark:bg-stone-900/70"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"><BookOpen className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-stone-900 dark:text-stone-100">{session.module === "dictation" ? "Nghe chép" : session.module === "shadowing" ? "Shadowing" : session.module === "srs" ? "Học bộ thẻ" : "Luyện tiếng Hàn"}</p><p className="text-[10px] text-stone-600 dark:text-stone-300">{new Date(`${session.created_at.replace(" ", "T")}Z`).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" })}</p></div><span className="text-xs font-bold text-stone-600 dark:text-stone-300">{session.cards_reviewed} câu, {session.duration_seconds == null ? "thời lượng chưa xác định" : duration(session.duration_seconds)}</span></div>)}</div> : <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-xs text-stone-600 dark:text-stone-300">Chưa có phiên học được ghi nhận.</p>}
    </section>
  </div>;
}
