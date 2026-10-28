"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, BookOpen, CalendarDays, CheckCircle2, Clock3, Flame, Gem, LogOut, Mail, Mic2, NotebookPen, Play, Shield, Sparkles, Trophy, User, Zap } from "lucide-react";
import { ApiClient, StudyProfileSummary, UserProfile } from "../lib/apiClient";
import { ACHIEVEMENTS_DATA } from "../data/achievementsData";
import { getStudyRank } from "../lib/studyRanks";

interface ProfileModuleProps {
  currentUser: UserProfile | null;
  onOpenAuth: (isRegisterMode?: boolean) => void;
  onLogout: () => void;
}

const moduleLabels: Record<string, string> = {
  srs: "Ôn tập Anki", dictation: "Nghe chép", shadowing: "Nhại theo",
  topik: "Luyện thi TOPIK", hangeul: "Hangeul", speaking: "Luyện nói",
};

const frameVisuals: Record<string, string> = {
  frame_neon: "linear-gradient(135deg,#22d3ee,#6366f1,#e879f9)", frame_hanbok: "linear-gradient(135deg,#fb7185,#fbbf24,#fef3c7)",
  frame_galaxy: "linear-gradient(135deg,#312e81,#7c3aed,#22d3ee)", frame_diamond: "linear-gradient(135deg,#a5f3fc,#60a5fa,#f5d0fe)",
  frame_gold: "linear-gradient(135deg,#92400e,#facc15,#fff7ae)",
};
const backgroundVisuals: Record<string, string> = {
  bg_seoul: "radial-gradient(at 15% 10%,#4338ca 0,transparent 42%),radial-gradient(at 90% 20%,#c026d3 0,transparent 38%),linear-gradient(140deg,#070b22,#172554 55%,#0f172a)",
  bg_cherry: "radial-gradient(at 15% 15%,#f9a8d4 0,transparent 40%),radial-gradient(at 90% 25%,#fda4af 0,transparent 35%),linear-gradient(140deg,#4a173c,#831843 55%,#1f1235)",
  bg_bukchon: "radial-gradient(at 80% 0%,#fb923c 0,transparent 40%),radial-gradient(at 10% 100%,#b45309 0,transparent 45%),linear-gradient(140deg,#292018,#78350f 55%,#1c1917)",
  bg_milkyway: "radial-gradient(at 15% 20%,#7c3aed 0,transparent 40%),radial-gradient(at 85% 65%,#0891b2 0,transparent 42%),linear-gradient(140deg,#09051c,#1e1b4b 50%,#020617)",
  bg_palace: "radial-gradient(at 70% 8%,#e0f2fe 0,transparent 24%),radial-gradient(at 12% 86%,#0e7490 0,transparent 38%),linear-gradient(145deg,#061326,#164e63 48%,#0f172a)",
  bg_aurora: "radial-gradient(at 15% 5%,#34d399 0,transparent 36%),radial-gradient(at 80% 15%,#8b5cf6 0,transparent 40%),radial-gradient(at 50% 100%,#0891b2 0,transparent 50%),linear-gradient(150deg,#020617,#0f172a 55%,#10112a)",
};
const badgeNames: Record<string, string> = { study_sprout: "Mầm học tập", hangul_star: "Ngôi sao Hangeul", topik_tiger: "Hổ TOPIK", badge_seoul_night: "Đêm Seoul", badge_dokkaebi: "Dokkaebi huyền thoại", badge_dragon: "Rồng Hàn ngữ" };

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}p` : `${minutes} phút`;
};

export const ProfileModule: React.FC<ProfileModuleProps> = ({ currentUser, onOpenAuth, onLogout }) => {
  const [stats, setStats] = useState<StudyProfileSummary | null>(null);
  const [claimedBadgeIds, setClaimedBadgeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    void Promise.all([
      ApiClient.getStudyProfileSummary(),
      fetch("/api/achievements", { credentials: "same-origin", cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null),
    ]).then(([summary, achievementData]) => {
      if (!active) return;
      setStats(summary);
      setClaimedBadgeIds(new Set((achievementData?.achievements || []).filter((item: { claimed?: boolean }) => item.claimed).map((item: { id: string }) => item.id)));
    });
    return () => { active = false; };
  }, [currentUser?.id]);

  const activityDays = useMemo(() => {
    const byDay = new Map((stats?.days || []).map((day) => [day.day, day]));
    const today = new Date();
    return Array.from({ length: 28 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (27 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return { key, date, value: byDay.get(key) };
    });
  }, [stats]);

  const earnedBadges = ACHIEVEMENTS_DATA.filter((badge) => claimedBadgeIds.has(badge.id));

  if (!currentUser) {
    return (
      <div className="max-w-lg mx-auto my-16 rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">
        <User className="w-14 h-14 text-slate-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">Hồ sơ học tập của bạn</h2>
        <p className="text-sm text-slate-400 mb-6">Đăng nhập để theo dõi chuỗi học, thành tích và tiến độ của bạn.</p>
        <button onClick={() => onOpenAuth(false)} className="rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3 text-sm font-bold text-white">Đăng nhập</button>
      </div>
    );
  }

  const summary = stats?.summary;
  const accuracy = summary?.cards_reviewed ? Math.round((summary.correct_count / summary.cards_reviewed) * 100) : 0;
  const statsCards = [
    { label: "Chuỗi hiện tại", value: `${currentUser.streak || 0} ngày`, hint: `Kỷ lục: ${currentUser.longest_streak || currentUser.streak || 0} ngày`, icon: Flame, color: "text-orange-300", bg: "bg-orange-400/10" },
    { label: "Tổng thời gian học", value: formatDuration(summary?.duration_seconds || 0), hint: `${summary?.session_count || 0} phiên học`, icon: Clock3, color: "text-sky-300", bg: "bg-sky-400/10" },
    { label: "Câu đã luyện", value: (summary?.cards_reviewed || 0).toLocaleString("vi-VN"), hint: `${accuracy}% chính xác`, icon: CheckCircle2, color: "text-emerald-300", bg: "bg-emerald-400/10" },
    { label: "Kim cương", value: (currentUser.gems || 0).toLocaleString("vi-VN"), hint: `${(currentUser.xp || 0).toLocaleString("vi-VN")} XP tích lũy`, icon: Gem, color: "text-violet-300", bg: "bg-violet-400/10" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 text-slate-100 animate-fadeIn">
      <section className="relative overflow-hidden rounded-[28px] border border-indigo-400/20 bg-gradient-to-br from-indigo-950 via-slate-900 to-fuchsia-950 bg-cover bg-center p-6 sm:p-8" style={currentUser.active_background && backgroundVisuals[currentUser.active_background] ? { backgroundImage: backgroundVisuals[currentUser.active_background] } : undefined}>
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative mx-auto sm:mx-0">
            <div className="rounded-[28px] bg-gradient-to-br from-amber-300 via-fuchsia-400 to-indigo-400 p-[3px] shadow-xl shadow-fuchsia-950/40" style={currentUser.active_frame && frameVisuals[currentUser.active_frame] ? { backgroundImage: frameVisuals[currentUser.active_frame], padding: "4px" } : undefined}>
              {currentUser.avatar_url ? <img src={currentUser.avatar_url} alt={currentUser.name} className="h-24 w-24 rounded-[25px] object-cover bg-slate-950" /> : currentUser.role === "admin" ? <img src="/brand/haechivn-mark.webp" alt="HaechiVN admin" className="h-24 w-24 rounded-[25px] object-contain bg-slate-900" /> : <div className="flex h-24 w-24 items-center justify-center rounded-[25px] bg-slate-900 text-4xl font-black text-white">{currentUser.name.charAt(0).toUpperCase()}</div>}
            </div>
            <span title={getStudyRank(currentUser.level)} className="absolute -bottom-2 -right-2 rounded-full border-4 border-slate-900 bg-amber-400 px-2.5 py-1 text-xs font-black text-slate-950">{getStudyRank(currentUser.level)}</span>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-200"><Sparkles className="h-3.5 w-3.5" /> Hồ sơ học tập</div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{currentUser.name}</h1>
            {currentUser.bio && <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-200 sm:mx-0">{currentUser.bio}</p>}
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-300 sm:justify-start"><Mail className="h-4 w-4" />{currentUser.email}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200"><Zap className="mr-1 inline h-3.5 w-3.5" />{(currentUser.xp || 0).toLocaleString("vi-VN")} XP</span>
              <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs font-bold text-orange-200"><Flame className="mr-1 inline h-3.5 w-3.5" />{currentUser.streak || 0} ngày liên tiếp</span>
              {currentUser.active_badge && <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs font-bold text-fuchsia-100">🏅 {badgeNames[currentUser.active_badge] || "Huy hiệu Haechi"}</span>}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:flex-col sm:items-stretch">
            <Link href="/profile/settings" className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300/20 bg-sky-300/10 px-4 py-2.5 text-xs font-bold text-sky-100 transition hover:bg-sky-300/20">Cài đặt hồ sơ</Link>
            <Link href={`/member?id=${encodeURIComponent(currentUser.id)}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-100 transition hover:bg-white/10">Xem trang công khai</Link>
            <button onClick={onLogout} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-rose-500/10 hover:text-rose-300"><LogOut className="h-4 w-4" />Đăng xuất</button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statsCards.map(({ label, value, hint, icon: Icon, color, bg }) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}><Icon className="h-5 w-5" /></div><p className="text-xl font-black text-white sm:text-2xl">{value}</p><p className="mt-1 text-xs font-bold text-slate-300">{label}</p><p className="mt-1 text-[11px] text-slate-500">{hint}</p></div>)}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-black"><Activity className="h-5 w-5 text-emerald-300" />Hoạt động học tập</h2><p className="mt-1 text-xs text-slate-500">28 ngày gần nhất · mỗi ô là một ngày học</p></div><span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-300">{stats?.days.filter((d) => d.minutes > 0 || d.cards > 0).length || 0} ngày học</span></div>
          <div className="grid grid-cols-7 gap-2 sm:grid-cols-14">
            {activityDays.map(({ key, date, value }) => {
              const intensity = !value || (!value.minutes && !value.cards) ? "bg-slate-800" : value.minutes >= 30 ? "bg-emerald-400" : value.minutes >= 10 ? "bg-emerald-500/70" : "bg-emerald-800";
              return <div key={key} title={`${date.toLocaleDateString("vi-VN")}: ${value?.minutes || 0} phút, ${value?.cards || 0} câu`} className={`aspect-square rounded-md ${intensity}`} />;
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500"><span>{activityDays[0]?.date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</span><span>Ít hơn <i className="mx-1 inline-block h-2.5 w-2.5 rounded-sm bg-slate-800" /> <i className="mx-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-800" /><i className="mx-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/70" /><i className="mx-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Nhiều hơn</span><span>{new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</span></div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-black"><Trophy className="h-5 w-5 text-amber-300" />Thành tích</h2><p className="mt-1 text-xs text-slate-500">Mốc đã đạt theo cấp độ và chuỗi học</p></div><span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-200">{earnedBadges.length} mốc</span></div>
          {earnedBadges.length ? <div className="grid grid-cols-2 gap-2">{earnedBadges.slice(0, 6).map((badge) => <div key={badge.id} className="flex items-center gap-2 rounded-xl border border-amber-300/10 bg-amber-300/5 p-3"><span className="text-xl">{badge.icon}</span><div className="min-w-0"><p className="truncate text-xs font-bold text-amber-100">{badge.name}</p><p className="text-[10px] text-slate-500">Đã đạt</p></div></div>)}</div> : <div className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-xs text-slate-500">Học đều mỗi ngày để mở khóa mốc thành tích đầu tiên.</div>}
          <a href="/achievements" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-300 hover:text-indigo-200">Xem tất cả thành tích <span>→</span></a>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-black"><CalendarDays className="h-5 w-5 text-sky-300" />Phiên học gần đây</h2><p className="mt-1 text-xs text-slate-500">Hoạt động đã đồng bộ trên tài khoản</p></div><a href="/lessons" className="hidden rounded-xl bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-200 hover:bg-indigo-500/20 sm:inline-flex"><BookOpen className="mr-1.5 h-4 w-4" />Tiếp tục học</a></div>
        {stats?.sessions.length ? <div className="divide-y divide-slate-800">{stats.sessions.slice(0, 8).map((session, index) => <div key={`${session.created_at}-${index}`} className="flex items-center gap-3 py-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-200">{session.module === "dictation" ? <NotebookPen className="h-5 w-5" /> : session.module === "shadowing" || session.module === "speaking" ? <Mic2 className="h-5 w-5" /> : <Play className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-white">{moduleLabels[session.module] || "Phiên học"}</p><p className="text-[11px] text-slate-500">{new Date(`${session.created_at.replace(" ", "T")}Z`).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}</p></div><div className="text-right"><p className="text-xs font-bold text-slate-200">{session.cards_reviewed} câu</p><p className="text-[10px] text-slate-500">{formatDuration(session.duration_seconds)}</p></div></div>)}</div> : <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center"><Clock3 className="mx-auto mb-2 h-7 w-7 text-slate-600" /><p className="text-sm font-bold text-slate-300">Chưa có phiên học được ghi nhận</p><p className="mt-1 text-xs text-slate-500">Bắt đầu luyện tập để xây dựng lịch sử học của bạn.</p><a href="/shadowing" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"><Play className="h-4 w-4" />Bắt đầu học</a></div>}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300"><Shield className="h-5 w-5" /></div><div><h3 className="text-sm font-black">Tài khoản HaechiVN</h3><p className="text-xs text-slate-500">Vai trò: {currentUser.role === "admin" ? "Quản trị viên" : currentUser.role === "teacher" ? "Giáo viên" : "Học viên"}</p></div></div><a href="/rewards" className="rounded-xl border border-slate-700 px-4 py-2 text-center text-xs font-bold text-slate-200 hover:border-indigo-400/50 hover:text-white"><Gem className="mr-1.5 inline h-4 w-4 text-violet-300" />Đổi kim cương</a></section>
    </div>
  );
};
