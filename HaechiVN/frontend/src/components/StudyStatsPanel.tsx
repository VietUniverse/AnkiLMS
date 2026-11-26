"use client";

// Khối số liệu học tập (tổng thời gian, thẻ, vốn từ, trí nhớ + tuần/tháng). Dùng ở Trang chủ và Hồ sơ.
import React, { useEffect, useState } from "react";
import { Brain, CheckCircle2, Clock3, Library } from "lucide-react";
import { ApiClient, StudyProfileSummary } from "../lib/apiClient";

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}p` : `${minutes} phút`;
};

export const StudyStatsPanel: React.FC<{ userId: string }> = ({ userId }) => {
  const [stats, setStats] = useState<StudyProfileSummary | null>(null);
  // Vốn từ = số thẻ đã qua giai đoạn học (state "review", cột Due của Anki).
  const [vocabCount, setVocabCount] = useState<number | null>(null);
  const [todayKey, setTodayKey] = useState("");
  const [growth, setGrowth] = useState<{ day: string; young: number; mature: number }[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.all([ApiClient.getStudyProfileSummary(), ApiClient.getCardStates().catch(() => null), ApiClient.getVocabGrowth().catch(() => [])]).then(([summary, cardStates, growthDays]) => {
      if (!active) return;
      setGrowth(growthDays);
      setVocabCount(cardStates ? Object.values(cardStates).filter((item) => item.state === "review").length : null);
      setTodayKey(new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10));
      setStats(summary);
    });
    return () => { active = false; };
  }, [userId]);

  const summary = stats?.summary;
  const accuracy = summary?.cards_reviewed ? Math.round((summary.correct_count / summary.cards_reviewed) * 100) : 0;
  const srsReviewed = summary?.srs_cards_reviewed || 0;
  const retention = srsReviewed > 0 ? Math.round(((summary?.srs_correct_count || 0) / srsReviewed) * 100) : null;
  const statsCards = [
    { label: "Tổng thời gian học", value: formatDuration(summary?.duration_seconds || 0), hint: `${summary?.session_count || 0} phiên học`, icon: Clock3, color: "text-sky-500" },
    { label: "Thẻ", value: (summary?.cards_reviewed || 0).toLocaleString("vi-VN"), hint: `${accuracy}% chính xác`, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Vốn từ", value: vocabCount === null ? "—" : vocabCount.toLocaleString("vi-VN"), hint: "thẻ đã thuộc", icon: Library, color: "text-amber-500" },
    { label: "Trí nhớ", value: retention === null ? "—" : `${retention}%`, hint: "Mục tiêu 90%", icon: Brain, color: "text-rose-500" },
  ];

  // Tuần tính theo giờ VN, thứ Hai là đầu tuần. todayKey được set trong effect vì new Date() là impure.
  const weekStartKey = (weeksAgo: number) => {
    const start = new Date(`${todayKey}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7) - weeksAgo * 7);
    return start.toISOString().slice(0, 10);
  };
  const dayLabel = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
  const periodTotals = (from: string, to: string) => {
    const base = (stats?.days || [])
      .filter((item) => item.day >= from && item.day <= to)
      .reduce((total, item) => ({ minutes: total.minutes + (item.minutes || 0), cards: total.cards + (item.cards || 0) }), { minutes: 0, cards: 0 });
    const srs = (stats?.srsDays || [])
      .filter((item) => item.day >= from && item.day <= to)
      .reduce((total, item) => ({ reviewed: total.reviewed + (item.reviewed || 0), correct: total.correct + (item.correct || 0) }), { reviewed: 0, correct: 0 });
    // Trí nhớ = % thẻ flashcard trả lời "nhớ" trong khoảng đó (cùng cách tính với ô Trí nhớ ở trên).
    return { ...base, retention: srs.reviewed > 0 ? Math.round((srs.correct / srs.reviewed) * 100) : null };
  };
  const dayBefore = (key: string) => new Date(new Date(`${key}T00:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);
  const thisWeekStart = todayKey ? weekStartKey(0) : "";
  const lastWeekStart = todayKey ? weekStartKey(1) : "";
  const lastWeekEnd = thisWeekStart ? dayBefore(thisWeekStart) : "";
  const thisMonthStart = todayKey ? `${todayKey.slice(0, 8)}01` : "";
  const lastMonthEnd = thisMonthStart ? dayBefore(thisMonthStart) : "";
  const lastMonthStart = lastMonthEnd ? `${lastMonthEnd.slice(0, 8)}01` : "";
  const periodCards = todayKey
    ? [
        { label: "Tuần này", range: `${dayLabel(thisWeekStart)}–${dayLabel(todayKey)}`, totals: periodTotals(thisWeekStart, todayKey) },
        { label: "Tuần trước", range: `${dayLabel(lastWeekStart)}–${dayLabel(lastWeekEnd)}`, totals: periodTotals(lastWeekStart, lastWeekEnd) },
        { label: "Tháng này", range: `${dayLabel(thisMonthStart)}–${dayLabel(todayKey)}`, totals: periodTotals(thisMonthStart, todayKey) },
        { label: "Tháng trước", range: `${dayLabel(lastMonthStart)}–${dayLabel(lastMonthEnd)}`, totals: periodTotals(lastMonthStart, lastMonthEnd) },
      ]
    : [];

  const card = "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70";
  return (
    <>
      <section className={`${card} grid grid-cols-2 divide-x divide-y divide-stone-200 dark:divide-stone-800 lg:grid-cols-4 lg:divide-y-0 overflow-hidden`}>
        {statsCards.map(({ label, value, hint, icon: Icon, color }) => (
          <div key={label} className="p-4 text-center">
            <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400"><Icon className={`h-3.5 w-3.5 ${color}`} />{label}</p>
            <p className="mt-1.5 text-xl font-black tabular-nums">{value}</p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">{hint}</p>
          </div>
        ))}
      </section>

      {/* Thống kê tuần/tháng: thời gian, số thẻ (days) và trí nhớ (srsDays) của /api/study-session. */}
      <section className={`${card} grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden bg-stone-200 dark:bg-stone-800`}>
        {periodCards.map(({ label, range, totals }) => (
          <div key={label} className="bg-white p-4 text-center dark:bg-stone-900">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</p>
            <p className="text-[10px] text-stone-400 dark:text-stone-500">{range}</p>
            <p className="mt-1.5 text-xl font-black tabular-nums">{formatDuration(totals.minutes * 60)}</p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">{totals.cards.toLocaleString("vi-VN")} thẻ</p>
            <p className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
              Trí nhớ {totals.retention === null ? "—" : `${totals.retention}%`}
            </p>
          </div>
        ))}
      </section>

      <VocabGrowthChart days={growth} />
    </>
  );
};

// Hai đường theo ngày: non (khoảng ôn < 21 ngày) xanh nhạt, chín (>= 21 ngày) xanh lá đậm.
const VocabGrowthChart: React.FC<{ days: { day: string; young: number; mature: number }[] }> = ({ days }) => {
  if (!days.length) return null;
  const last = days[days.length - 1];
  const W = 600, H = 160, step = W / Math.max(1, days.length - 1);
  const max = Math.max(1, ...days.map((d) => Math.max(d.young, d.mature)));
  const line = (key: "young" | "mature") => days.map((d, i) => `${i * step},${H - (d[key] / max) * H}`).join(" ");
  return (
    <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Sự phát triển vốn từ · 60 ngày</p>
        <div className="flex gap-3 text-[11px] text-stone-600 dark:text-stone-300">
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-lime-500 dark:bg-lime-400" />Non (&lt; 21 ngày) {last.young.toLocaleString("vi-VN")}</span>
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-green-700 dark:bg-green-500" />Chín (≥ 21 ngày) {last.mature.toLocaleString("vi-VN")}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-40 w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label={`Hôm nay ${last.young} từ non, ${last.mature} từ chín`}>
        <polygon points={`0,${H} ${line("mature")} ${W},${H}`} className="fill-green-700/15 dark:fill-green-500/15" />
        <polyline points={line("mature")} fill="none" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" className="stroke-green-700 dark:stroke-green-500" />
        <polyline points={line("young")} fill="none" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" className="stroke-lime-500 dark:stroke-lime-400" />
        {days.map((d, i) => (
          <rect key={d.day} x={i * step - step / 2} y={0} width={step} height={H} fill="transparent">
            <title>{`${d.day.slice(8, 10)}/${d.day.slice(5, 7)}: ${d.young} non, ${d.mature} chín`}</title>
          </rect>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-stone-400 dark:text-stone-500">
        <span>{`${days[0].day.slice(8, 10)}/${days[0].day.slice(5, 7)}`}</span>
        <span>Hôm nay</span>
      </div>
    </section>
  );
};
