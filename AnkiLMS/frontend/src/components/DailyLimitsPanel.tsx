"use client";

import React, { useState } from "react";
import { Pencil, Target } from "lucide-react";
import type { DailyLimits, DailyProgress } from "../lib/dailyLimits";

interface Props {
  limits: DailyLimits;
  progress: DailyProgress;
  onChange: (limits: DailyLimits) => void;
}

type Field = keyof DailyLimits;

const FIELD_LABEL: Record<Field, string> = { newPerDay: "Từ mới", reviewPerDay: "Ôn lại" };

function GoalBar({ done, value, onOpen }: { done: number; value: number; onOpen: () => void }) {
  const pct = value === 0 ? 0 : Math.min(100, Math.round((done / value) * 100));
  const complete = value > 0 && done >= value;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Mục tiêu từ mới hôm nay: đã ${done}${value ? ` trên ${value}` : ", không giới hạn"}. Bấm để đổi`}
      className="group flex w-full items-center gap-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 px-4 py-3 text-left transition hover:border-sky-400 cursor-pointer"
    >
      <Target className={`h-5 w-5 shrink-0 ${complete ? "text-emerald-500" : "text-sky-500"}`} />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-bold text-stone-900 dark:text-white">Từ mới hôm nay</span>
          <span className="text-sm font-black tabular-nums text-stone-900 dark:text-white">
            {done}
            <span className="font-bold text-stone-400">{value === 0 ? " / không giới hạn" : ` / ${value}`}</span>
          </span>
        </span>
        <span className="block h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
          <span className={`block h-full rounded-full transition-all ${complete ? "bg-emerald-500" : "bg-sky-500"}`} style={{ width: `${pct}%` }} />
        </span>
      </span>
      <Pencil className="h-3.5 w-3.5 shrink-0 text-stone-300 transition group-hover:text-sky-500" />
    </button>
  );
}

export const DailyLimitsPanel: React.FC<Props> = ({ limits, progress, onChange }) => {
  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState("");

  const open = (field: Field) => {
    setEditing(field);
    setDraft(limits[field] > 0 ? String(limits[field]) : "");
  };

  const parsed = Number(draft);
  const valid = draft === "" ? false : Number.isInteger(parsed) && parsed >= 1 && parsed <= 9999;

  const save = (value: number) => {
    if (!editing) return;
    onChange({ ...limits, [editing]: value });
    setEditing(null);
  };

  return (
    <section>
      <GoalBar done={progress.newDone} value={limits.newPerDay === 0 ? 0 : limits.newPerDay + progress.extraNew} onOpen={() => open("newPerDay")} />

      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditing(null)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-title"
            className="w-full max-w-xs rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); if (valid) save(parsed); }}
          >
            <div>
              <h3 id="goal-title" className="text-base font-black text-stone-900 dark:text-white">{FIELD_LABEL[editing]} mỗi ngày</h3>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Nhập số từ bạn muốn học tối đa mỗi ngày.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="number"
                inputMode="numeric"
                min={1}
                max={9999}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ví dụ 20"
                aria-label={`Số ${FIELD_LABEL[editing].toLowerCase()} mỗi ngày`}
                className="w-full h-12 rounded-xl border border-stone-300 dark:border-stone-600 bg-transparent px-4 text-center text-xl font-black tabular-nums text-stone-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
              <span className="text-sm text-stone-500 dark:text-stone-400 shrink-0">từ</span>
            </div>
            {draft !== "" && !valid && <p role="alert" className="text-xs text-rose-600">Nhập số nguyên từ 1 đến 9999.</p>}
            <div className="space-y-2">
              <button
                type="submit"
                disabled={!valid}
                className="w-full rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-sky-500 py-2.5 text-sm font-black text-white transition cursor-pointer"
              >
                Lưu
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 rounded-xl py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer">
                  Hủy
                </button>
                <button type="button" onClick={() => save(0)} className="flex-1 rounded-xl py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer">
                  Không giới hạn
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
