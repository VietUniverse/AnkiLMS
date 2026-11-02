"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, CheckCircle2, Clock3, Flame, Gem, Mail, Mic2, NotebookPen, Play, Trophy, User, Zap } from "lucide-react";
import { ApiClient, StudyProfileSummary, UserProfile } from "../lib/apiClient";
import { ACHIEVEMENTS_DATA } from "../data/achievementsData";
import { getStudyRank } from "../lib/studyRanks";
import { OnigiriHeatmap } from "./OnigiriHeatmap";
import { StreakPanel } from "./StreakPanel";
import { TestHistory } from "./TestHistory";

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

export const ProfileModule: React.FC<ProfileModuleProps> = ({ currentUser, onOpenAuth }) => {
  const [stats, setStats] = useState<StudyProfileSummary | null>(null);
  const [heatmapData, setHeatmapData] = useState<Awaited<ReturnType<typeof ApiClient.getHeatmapData>>>([]);
  const [claimedBadgeIds, setClaimedBadgeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    void Promise.all([
      ApiClient.getStudyProfileSummary(),
      ApiClient.getHeatmapData(),
      fetch("/api/achievements", { credentials: "same-origin", cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null),
    ]).then(([summary, heatmap, achievementData]) => {
      if (!active) return;
      setStats(summary);
      setHeatmapData(heatmap);
      setClaimedBadgeIds(new Set((achievementData?.achievements || []).filter((item: { claimed?: boolean }) => item.claimed).map((item: { id: string }) => item.id)));
    });
    return () => { active = false; };
  }, [currentUser?.id]);

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
    { label: "Chuỗi hiện tại", value: `${currentUser.streak || 0} ngày`, hint: `Kỷ lục: ${currentUser.longest_streak || currentUser.streak || 0} ngày`, icon: Flame, color: "text-orange-500", bg: "bg-orange-400/10" },
    { label: "Tổng thời gian học", value: formatDuration(summary?.duration_seconds || 0), hint: `${summary?.session_count || 0} phiên học`, icon: Clock3, color: "text-sky-500", bg: "bg-sky-400/10" },
    { label: "Câu đã luyện", value: (summary?.cards_reviewed || 0).toLocaleString("vi-VN"), hint: `${accuracy}% chính xác`, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-400/10" },
    { label: "Kim cương", value: (currentUser.gems || 0).toLocaleString("vi-VN"), hint: `${(currentUser.xp || 0).toLocaleString("vi-VN")} XP tích lũy`, icon: Gem, color: "text-violet-500", bg: "bg-violet-400/10" },
  ];

  const card = "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70";
  const rankLabel = getStudyRank(currentUser.level);
  const roleLabel = currentUser.role === "admin" ? "Quản trị viên" : currentUser.role === "teacher" ? "Giáo viên" : "Học viên";

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-24 text-stone-900 dark:text-stone-100 animate-fadeIn">
      {/* Hồ sơ */}
      <section
        className={`${card} relative overflow-hidden bg-cover bg-center p-5 sm:p-6`}
        style={currentUser.active_background && backgroundVisuals[currentUser.active_background] ? { backgroundImage: backgroundVisuals[currentUser.active_background] } : undefined}
      >
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className="mx-auto shrink-0 rounded-2xl bg-gradient-to-br from-amber-300 via-fuchsia-400 to-indigo-400 p-[3px] sm:mx-0"
            style={currentUser.active_frame && frameVisuals[currentUser.active_frame] ? { backgroundImage: frameVisuals[currentUser.active_frame], padding: "4px" } : undefined}
          >
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt={currentUser.name} className="h-20 w-20 rounded-[13px] object-cover bg-stone-100 dark:bg-stone-950" />
            ) : currentUser.role === "admin" ? (
              <img src="/brand/haechivn-mark.webp" alt="HaechiVN admin" className="h-20 w-20 rounded-[13px] object-contain bg-stone-100 dark:bg-stone-900" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-[13px] bg-stone-100 dark:bg-stone-900 text-3xl font-black">{currentUser.name.charAt(0).toUpperCase()}</div>
            )}
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="truncate text-2xl font-black tracking-tight">{currentUser.name}</h1>
            <p className="mt-0.5 flex items-center justify-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 sm:justify-start">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{currentUser.email}</span>
              <span aria-hidden>|</span>
              <span className="shrink-0">{roleLabel}</span>
            </p>
            {currentUser.bio && <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600 dark:text-stone-300">{currentUser.bio}</p>}
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-xs font-bold sm:justify-start">
              <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-600 dark:text-amber-300">{rankLabel}</span>
              <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-sky-600 dark:text-sky-300"><Zap className="mr-1 inline h-3.5 w-3.5" />{(currentUser.xp || 0).toLocaleString("vi-VN")} XP</span>
              <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-orange-600 dark:text-orange-300"><Flame className="mr-1 inline h-3.5 w-3.5" />{currentUser.streak || 0} ngày</span>
              {currentUser.active_badge && <span className="rounded-full bg-fuchsia-500/10 px-2.5 py-1 text-fuchsia-600 dark:text-fuchsia-300">🏅 {badgeNames[currentUser.active_badge] || "Huy hiệu Haechi"}</span>}
            </div>
          </div>

          <div className="flex justify-center gap-2 sm:flex-col">
            <Link href="/profile/settings" className="rounded-xl bg-sky-500 px-4 py-2 text-center text-xs font-bold text-white transition hover:bg-sky-600">Cài đặt</Link>
            <Link href={`/member?id=${encodeURIComponent(currentUser.id)}`} className="rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-2 text-center text-xs font-bold transition hover:bg-stone-100 dark:hover:bg-stone-800">Trang công khai</Link>
          </div>
        </div>
      </section>

      {/* Số liệu */}
      <section className={`${card} grid grid-cols-2 divide-x divide-y divide-stone-200 dark:divide-stone-800 lg:grid-cols-4 lg:divide-y-0 overflow-hidden`}>
        {statsCards.map(({ label, value, hint, icon: Icon, color }) => (
          <div key={label} className="p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400"><Icon className={`h-3.5 w-3.5 ${color}`} />{label}</p>
            <p className="mt-1.5 text-xl font-black tabular-nums">{value}</p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">{hint}</p>
          </div>
        ))}
      </section>

      <StreakPanel data={heatmapData} streak={currentUser.streak || 0} longestStreak={currentUser.longest_streak || 0} />

      {/* Heatmap cả năm chỉ hiện từ màn tablet trở lên; điện thoại dùng dải 7 ngày và lịch tháng ở trên. */}
      <div className="hidden md:block">
        <OnigiriHeatmap data={heatmapData} streak={currentUser.streak || 0} />
      </div>

      <TestHistory limit={5} showMoreLink />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* Thành tích */}
        <section className={`${card} p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black"><Trophy className="h-4 w-4 text-amber-500" />Thành tích <span className="font-normal text-stone-400">({earnedBadges.length})</span></h2>
            <a href="/achievements" className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">Tất cả →</a>
          </div>
          {earnedBadges.length ? (
            <div className="grid grid-cols-2 gap-2">
              {earnedBadges.slice(0, 6).map((badge) => (
                <div key={badge.id} className="flex items-center gap-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 p-2.5">
                  <span className="text-lg">{badge.icon}</span>
                  <p className="min-w-0 truncate text-xs font-bold">{badge.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-stone-300 dark:border-stone-700 p-4 text-center text-xs text-stone-500 dark:text-stone-400">Học đều mỗi ngày để mở khóa mốc đầu tiên.</p>
          )}
          <a href="/rewards" className="mt-4 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-2 text-xs font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition">
            <span><Gem className="mr-1.5 inline h-4 w-4 text-violet-500" />Đổi kim cương</span><span>→</span>
          </a>
        </section>

        {/* Phiên học */}
        <section className={`${card} p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black"><CalendarDays className="h-4 w-4 text-sky-500" />Phiên học gần đây</h2>
            <a href="/lessons" className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"><BookOpen className="h-3.5 w-3.5" />Tiếp tục học</a>
          </div>
          {stats?.sessions.length ? (
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {stats.sessions.slice(0, 8).map((session, index) => (
                <div key={`${session.created_at}-${index}`} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300">
                    {session.module === "dictation" ? <NotebookPen className="h-4 w-4" /> : session.module === "shadowing" || session.module === "speaking" ? <Mic2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{moduleLabels[session.module] || "Phiên học"}</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">{new Date(`${session.created_at.replace(" ", "T")}Z`).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                  <p className="text-right text-xs text-stone-500 dark:text-stone-400"><span className="font-bold text-stone-800 dark:text-stone-200">{session.cards_reviewed} câu</span><br />{session.duration_seconds == null ? "Thời lượng chưa xác định" : formatDuration(session.duration_seconds)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-700 p-6 text-center">
              <p className="text-sm font-bold">Chưa có phiên học nào</p>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Bắt đầu luyện tập để xây dựng lịch sử học của bạn.</p>
              <a href="/shadowing" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600"><Play className="h-4 w-4" />Bắt đầu học</a>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
