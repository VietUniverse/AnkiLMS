"use client";

// Khối số liệu học tập (tổng thời gian, thẻ, vốn từ, trí nhớ + tuần/tháng). Dùng ở Trang chủ và Hồ sơ.
import React, { useEffect, useState } from "react";
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
      setVocabCount(cardStates ? Object.entries(cardStates).filter(([key, item]) => item.state === "review" && !/_-\d+$/.test(key)).length : null);
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
    { label: "Tổng thời gian học", value: formatDuration(summary?.duration_seconds || 0), hint: `${summary?.session_count || 0} phiên học`, tint: "bg-sky-600 text-white dark:bg-sky-700 dark:text-white" },
    { label: "Thẻ", value: (summary?.cards_reviewed || 0).toLocaleString("vi-VN"), hint: `${accuracy}% chính xác`, tint: "bg-emerald-600 text-white dark:bg-emerald-700 dark:text-white" },
    { label: "Vốn từ", value: vocabCount === null ? "—" : vocabCount.toLocaleString("vi-VN"), hint: "thẻ đã thuộc", tint: "bg-amber-600 text-white dark:bg-amber-700 dark:text-white" },
    { label: "Trí nhớ", value: retention === null ? "—" : `${retention}%`, hint: "Mục tiêu 90%", tint: "bg-rose-600 text-white dark:bg-rose-700 dark:text-white" },
  ];

  // todayKey (giờ VN) được set trong effect vì new Date() là impure.
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
  // Cửa sổ trượt: N ngày gần nhất (tính cả hôm nay) so với N ngày ngay trước đó.
  const addDays = (key: string, n: number) => new Date(new Date(`${key}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
  const periodCards = todayKey
    ? [7, 30].map((n) => {
        const from = addDays(todayKey, 1 - n), prevFrom = addDays(todayKey, 1 - 2 * n), prevTo = addDays(todayKey, -n);
        return {
          label: n === 7 ? "7 ngày qua" : "30 ngày qua",
          range: `${dayLabel(from)}–${dayLabel(todayKey)} so với ${dayLabel(prevFrom)}–${dayLabel(prevTo)}`,
          totals: periodTotals(from, todayKey),
          prev: periodTotals(prevFrom, prevTo),
        };
      })
    : [];
  // Mũi tên + chênh lệch; tăng là tiến bộ (xanh), giảm là đỏ.
  const delta = (now: number | null, before: number | null, show: (d: number) => string) => {
    if (now === null || before === null || now === before) return <span className="text-stone-400 dark:text-stone-500">{now === null || before === null ? "—" : "= như cũ"}</span>;
    const up = now > before;
    return <span className={up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{up ? "▲" : "▼"} {show(Math.abs(now - before))}</span>;
  };

  const card = "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70";
  return (
    <>
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {statsCards.map(({ label, value, hint, tint }) => (
          <div key={label} className={`rounded-2xl p-4 text-center ${tint}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</p>
            <p className="mt-1.5 text-xl font-black tabular-nums">{value}</p>
            <p className="text-[11px] opacity-75">{hint}</p>
          </div>
        ))}
      </section>

      {/* Thống kê tuần/tháng: thời gian, số thẻ (days) và trí nhớ (srsDays) của /api/study-session. */}
      <section className={`${card} grid grid-cols-1 sm:grid-cols-2 gap-px overflow-hidden bg-stone-200 dark:bg-stone-800`}>
        {periodCards.map(({ label, range, totals, prev }) => (
          <div key={label} className="bg-white p-4 dark:bg-stone-900" title={range}>
            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">Thời gian</p>
                <p className="text-base font-black tabular-nums">{formatDuration(totals.minutes * 60)}</p>
                <p className="text-[11px] font-bold">{delta(totals.minutes, prev.minutes, (d) => formatDuration(d * 60))}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">Số thẻ</p>
                <p className="text-base font-black tabular-nums">{totals.cards.toLocaleString("vi-VN")}</p>
                <p className="text-[11px] font-bold">{delta(totals.cards, prev.cards, (d) => d.toLocaleString("vi-VN"))}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">Trí nhớ</p>
                <p className="text-base font-black tabular-nums">{totals.retention === null ? "—" : `${totals.retention}%`}</p>
                <p className="text-[11px] font-bold">{delta(totals.retention, prev.retention, (d) => `${d}%`)}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <VocabGrowthChart days={growth} />
    </>
  );
};

// Hai đường theo ngày: non (khoảng ôn < 21 ngày) xanh nhạt, chín (>= 21 ngày) xanh lá đậm.
const VocabGrowthChart: React.FC<{ days: { day: string; young: number; mature: number }[] }> = ({ days }) => {
  const [hover, setHover] = useState<number | null>(null);
  if (!days.length) return null;
  const last = days[days.length - 1];
  const shown = hover === null ? null : days[hover];
  const fmt = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
  // Chuột/ngón tay trên biểu đồ → ngày gần nhất theo trục x.
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setHover(Math.min(days.length - 1, Math.max(0, Math.round(((e.clientX - box.left) / box.width) * (days.length - 1)))));
  };
  const W = 600, H = 160, step = W / Math.max(1, days.length - 1);
  const max = Math.max(1, ...days.map((d) => Math.max(d.young, d.mature)));
  const line = (key: "young" | "mature") => days.map((d, i) => `${i * step},${H - (d[key] / max) * H}`).join(" ");
  return (
    <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Sự phát triển vốn từ</p>
        <div className="flex gap-3 text-[11px] text-stone-600 dark:text-stone-300">
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-lime-500 dark:bg-lime-400" />Non (&lt; 21 ngày) {last.young.toLocaleString("vi-VN")}</span>
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-green-700 dark:bg-green-500" />Chín (≥ 21 ngày) {last.mature.toLocaleString("vi-VN")}</span>
        </div>
      </div>
      <div className="mt-3 flex gap-1.5">
      {/* Trục y: 0, giữa, đỉnh */}
      <div className="flex h-40 flex-col justify-between text-right text-[10px] leading-none text-stone-400 dark:text-stone-500" aria-hidden>
        {[max, Math.round(max / 2), 0].map((v, i) => <span key={i} className={i === 0 ? "" : i === 2 ? "translate-y-1/2" : ""}>{v.toLocaleString("vi-VN")}</span>)}
      </div>
      <div className="relative min-w-0 flex-1">
      {shown && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md dark:border-stone-700 dark:bg-stone-800"
          style={{ left: `${Math.min(85, Math.max(15, (hover / Math.max(1, days.length - 1)) * 100))}%` }}
        >
          <p className="font-bold">{fmt(shown.day)}</p>
          <p className="text-lime-600 dark:text-lime-400">Non: {shown.young.toLocaleString("vi-VN")}</p>
          <p className="text-green-700 dark:text-green-500">Chín: {shown.mature.toLocaleString("vi-VN")}</p>
          <p className="text-stone-500 dark:text-stone-400">Tổng: {(shown.young + shown.mature).toLocaleString("vi-VN")}</p>
        </div>
      )}
      <svg onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)} viewBox={`0 0 ${W} ${H}`} className="h-40 w-full touch-pan-y cursor-crosshair overflow-visible" preserveAspectRatio="none" role="img" aria-label={`Hôm nay ${last.young} từ non, ${last.mature} từ chín`}>
        {[0, H / 2, H].map((y) => (
          <line key={y} x1={0} x2={W} y1={y} y2={y} strokeWidth={1} vectorEffect="non-scaling-stroke" className={y === H ? "stroke-stone-300 dark:stroke-stone-600" : "stroke-stone-200 dark:stroke-stone-800"} strokeDasharray={y === H ? undefined : "2 4"} />
        ))}
        <line x1={0} x2={0} y1={0} y2={H} strokeWidth={1} vectorEffect="non-scaling-stroke" className="stroke-stone-300 dark:stroke-stone-600" />
        <polygon points={`0,${H} ${line("mature")} ${W},${H}`} className="fill-green-700/15 dark:fill-green-500/15" />
        <polyline points={line("mature")} fill="none" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" className="stroke-green-700 dark:stroke-green-500" />
        <polyline points={line("young")} fill="none" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" className="stroke-lime-500 dark:stroke-lime-400" />
        {shown && hover !== null && (
          <g>
            <line x1={hover * step} x2={hover * step} y1={0} y2={H} strokeWidth={1} vectorEffect="non-scaling-stroke" className="stroke-stone-400 dark:stroke-stone-500" strokeDasharray="3 3" />
          </g>
        )}
      </svg>
      {/* Trục x: ngày đầu, giữa, hôm nay */}
      <div className="mt-1 flex justify-between text-[10px] text-stone-400 dark:text-stone-500" aria-hidden>
        <span>{fmt(days[0].day).slice(0, 5)}</span>
        {days.length > 2 && <span>{fmt(days[Math.floor((days.length - 1) / 2)].day).slice(0, 5)}</span>}
        <span>Hôm nay</span>
      </div>
      </div>
      </div>
    </section>
  );
};
