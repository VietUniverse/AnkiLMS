"use client";

import React from "react";
import { Target } from "lucide-react";
import type { DailyLimits, DailyProgress } from "../lib/dailyLimits";

interface Props {
  limits: DailyLimits;
  progress: DailyProgress;
  onChange: (limits: DailyLimits) => void;
}

const NEW_OPTIONS = [5, 10, 20, 30, 50];
const REVIEW_OPTIONS = [50, 100, 200, 300];

function Goal({ label, done, value, options, onChange }: { label: string; done: number; value: number; options: number[]; onChange: (v: number) => void }) {
  const list = value === 0 || options.includes(value) ? options : [...options, value].sort((a, b) => a - b);
  const pct = value === 0 ? 0 : Math.min(100, Math.round((done / value) * 100));
  return (
    <label className="flex-1 min-w-36 space-y-1.5">
      <span className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
        {label}
        <span className="tabular-nums"><b className="text-stone-900 dark:text-white">{done}</b>{value === 0 ? "" : ` / ${value}`}</span>
      </span>
      <span className="block h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
        <span className={`block h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-sky-500"}`} style={{ width: `${pct}%` }} />
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`Giới hạn ${label.toLowerCase()} mỗi ngày`}
        className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-2 py-1.5 text-xs font-bold text-stone-900 dark:text-white cursor-pointer"
      >
        {list.map((n) => <option key={n} value={n}>{n} từ / ngày</option>)}
        <option value={0}>Không giới hạn</option>
      </select>
    </label>
  );
}

export const DailyLimitsPanel: React.FC<Props> = ({ limits, progress, onChange }) => (
  <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-4">
    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-white">
      <Target className="w-4 h-4 text-sky-500" /> Mục tiêu hôm nay
    </h2>
    <div className="flex flex-wrap gap-4">
      <Goal label="Từ mới" done={progress.newDone} value={limits.newPerDay} options={NEW_OPTIONS} onChange={(v) => onChange({ ...limits, newPerDay: v })} />
      <Goal label="Ôn lại" done={progress.reviewDone} value={limits.reviewPerDay} options={REVIEW_OPTIONS} onChange={(v) => onChange({ ...limits, reviewPerDay: v })} />
    </div>
  </section>
);
