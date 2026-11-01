"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Flame, Target } from "lucide-react";
import { DEFAULT_LIMITS, loadLimits, loadProgress, type DailyLimits, type DailyProgress } from "../lib/dailyLimits";

type CheckinItem = { checkin_date: string; time_spent_minutes?: number; xp_earned?: number };

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_NAMES = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// getDay(): CN = 0. Đổi sang T2 = 0 ... CN = 6.
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

function GoalRing({ done, goal }: { done: number; goal: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const ratio = goal > 0 ? Math.min(1, done / goal) : done > 0 ? 1 : 0;
  const complete = ratio >= 1;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="8" className="stroke-stone-200 dark:stroke-stone-800" />
        <circle
          cx="40" cy="40" r={radius} fill="none" strokeWidth="8" strokeLinecap="round"
          className={`transition-all duration-700 ${complete ? "stroke-emerald-500" : "stroke-sky-500"}`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {complete ? <Check className="h-7 w-7 text-emerald-500" strokeWidth={3} /> : <Target className="h-6 w-6 text-sky-500" />}
        <span className="mt-0.5 text-[11px] font-black tabular-nums text-stone-700 dark:text-stone-200">{goal > 0 ? `${done}/${goal}` : done}</span>
      </div>
    </div>
  );
}

export function StreakPanel({ data, streak, longestStreak }: { data: CheckinItem[]; streak: number; longestStreak: number }) {
  const [limits, setLimits] = useState<DailyLimits>(DEFAULT_LIMITS);
  const [progress, setProgress] = useState<DailyProgress>({ newDone: 0, reviewDone: 0 });
  const [showMonth, setShowMonth] = useState(false);
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });

  useEffect(() => {
    setLimits(loadLimits());
    setProgress(loadProgress());
  }, []);

  const studied = useMemo(() => {
    const set = new Set<string>();
    for (const item of data) {
      if ((item.time_spent_minutes || 0) > 0 || (item.xp_earned || 0) > 0 || item.checkin_date) set.add(item.checkin_date.slice(0, 10));
    }
    return set;
  }, [data]);

  const today = new Date();
  const todayKey = toKey(today);
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayIndex(today));
  const week = DAY_LABELS.map((label, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = toKey(d);
    return { label, key, date: d.getDate(), done: studied.has(key), isToday: key === todayKey, future: key > todayKey };
  });

  const goal = (limits.newPerDay || 0) + (limits.reviewPerDay || 0);
  const doneToday = progress.newDone + progress.reviewDone;
  const learnedToday = studied.has(todayKey) || doneToday > 0;

  // Lịch tháng: ô trống đầu tháng + các ngày; ngày học liền nhau nối thành một dải.
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (null | { day: number; key: string })[] = [
    ...Array.from({ length: mondayIndex(first) }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, key: toKey(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)) })),
  ];
  const monthStudied = cells.filter((c) => c && studied.has(c.key)).length;
  const isCurrentMonth = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();

  return (
    <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70 p-4 sm:p-6 space-y-5">
      {/* Streak lớn và vòng mục tiêu */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <Flame
            className={`h-14 w-14 shrink-0 sm:h-16 sm:w-16 ${streak > 0 ? "fill-orange-400 text-orange-500 drop-shadow-[0_0_12px_rgba(251,146,60,0.55)]" : "fill-stone-200 text-stone-300 dark:fill-stone-800 dark:text-stone-700"}`}
          />
          <div className="min-w-0">
            <p className="text-5xl font-black leading-none tabular-nums text-stone-900 dark:text-white sm:text-6xl">{streak}</p>
            <p className="mt-1 text-sm font-bold text-orange-600 dark:text-orange-400">ngày liên tiếp</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {streak > 0 ? `Kỷ lục ${Math.max(longestStreak, streak)} ngày` : "Học hôm nay để bắt đầu chuỗi"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <GoalRing done={doneToday} goal={goal} />
          <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">Mục tiêu hôm nay</span>
        </div>
      </div>

      {/* Dải 7 ngày */}
      <div className="grid grid-cols-7 gap-1.5">
        {week.map((d) => (
          <div key={d.key} className="flex flex-col items-center gap-1.5">
            <span className={`text-[11px] font-bold ${d.isToday ? "text-orange-600 dark:text-orange-400" : "text-stone-400"}`}>{d.label}</span>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black transition sm:h-10 sm:w-10 ${
                d.done
                  ? "bg-orange-400 shadow-sm"
                  : d.isToday
                    ? "border-2 border-orange-400 text-orange-500"
                    : d.future
                      ? "border border-dashed border-stone-200 text-stone-300 dark:border-stone-800 dark:text-stone-700"
                      : "bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-600"
              }`}
              style={d.done ? { color: "#fff" } : undefined}
              aria-label={`${d.label} ngày ${d.date}: ${d.done ? "đã học" : d.future ? "chưa tới" : "chưa học"}`}
            >
              {d.done ? <Check className="h-5 w-5" strokeWidth={3.5} /> : d.date}
            </span>
          </div>
        ))}
      </div>

      <p className={`text-center text-xs font-semibold ${learnedToday ? "text-emerald-600 dark:text-emerald-400" : "text-stone-500 dark:text-stone-400"}`}>
        {learnedToday ? "Hôm nay bạn đã học rồi, chuỗi được giữ." : "Hôm nay chưa học. Học một lượt để giữ chuỗi."}
      </p>

      {/* Lịch tháng */}
      <div className="border-t border-stone-100 dark:border-stone-800 pt-3">
        <button
          onClick={() => setShowMonth(!showMonth)}
          aria-expanded={showMonth}
          className="flex w-full items-center justify-between text-sm font-bold text-stone-700 dark:text-stone-200 cursor-pointer"
        >
          Lịch tháng
          <ChevronRight className={`h-4 w-4 text-stone-400 transition-transform ${showMonth ? "rotate-90" : ""}`} />
        </button>
        {showMonth && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Tháng trước" className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="text-sm font-black">{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">{monthStudied} ngày đã học</p>
              </div>
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} disabled={isCurrentMonth} aria-label="Tháng sau" className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-stone-400">
              {DAY_LABELS.map((l) => <span key={l}>{l}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((cell, i) => {
                if (!cell) return <span key={`e${i}`} />;
                const done = studied.has(cell.key);
                const col = i % 7;
                const prevDone = col > 0 && cells[i - 1] && studied.has(cells[i - 1]!.key);
                const nextDone = col < 6 && cells[i + 1] && studied.has(cells[i + 1]!.key);
                const isToday = cell.key === todayKey;
                return (
                  <span key={cell.key} className="flex justify-center">
                    <span
                      style={done ? { color: "#fff" } : undefined}
                      className={`flex h-9 w-full items-center justify-center text-xs font-bold ${
                        done
                          ? `bg-orange-400 ${prevDone ? "rounded-l-none" : "rounded-l-full"} ${nextDone ? "rounded-r-none" : "rounded-r-full"}`
                          : isToday
                            ? "rounded-full border-2 border-orange-400 text-orange-500"
                            : cell.key > todayKey
                              ? "text-stone-300 dark:text-stone-700"
                              : "text-stone-600 dark:text-stone-300"
                      }`}
                    >
                      {cell.day}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
