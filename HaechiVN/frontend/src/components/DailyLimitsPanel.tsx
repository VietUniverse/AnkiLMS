"use client";

import React, { useState } from "react";
import type { DailyLimits, DailyProgress } from "../lib/dailyLimits";

interface Props {
  limits: DailyLimits;
  progress: DailyProgress;
  onChange: (limits: DailyLimits) => void;
  /** Tăng số này để mở hộp "Từ mới mỗi ngày" từ bên ngoài (khi hết hạn mức). */
  openRequest?: number;
  /** Số từ/thẻ mới còn lại của bộ vừa mở, hiện khi hộp được mở do hết hạn mức. */
  remainingNew?: { words: number; cards: number } | null;
}

type Field = keyof DailyLimits;

const FIELD_LABEL: Record<Field, string> = { newPerDay: "Từ mới", reviewPerDay: "Ôn lại" };

function ConfigCard({ limits, progress, onOpen }: { limits: DailyLimits; progress: DailyProgress; onOpen: (field: Field) => void }) {
  const newLimit = limits.newPerDay === 0 ? 0 : limits.newPerDay + progress.extraNew;
  const rows: { field: Field; done: number; value: number; tone: string }[] = [
    { field: "newPerDay", done: progress.newDone, value: newLimit, tone: "text-sky-600 dark:text-sky-400" },
    { field: "reviewPerDay", done: progress.reviewDone, value: limits.reviewPerDay, tone: "text-rose-600 dark:text-rose-400" },
  ];
  return (
    <div className="flex h-full w-full flex-col justify-center rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 px-3 py-2 sm:px-6 sm:py-3">
      <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Cấu hình</span>
      {rows.map((row) => (
        <button
          key={row.field}
          type="button"
          onClick={() => onOpen(row.field)}
          aria-label={`${FIELD_LABEL[row.field]} hôm nay: ${row.done} trên ${row.value || "không giới hạn"}. Bấm để đổi`}
          className="mt-0.5 flex cursor-pointer items-baseline justify-between gap-3 whitespace-nowrap text-base font-black tabular-nums hover:opacity-80 sm:text-lg"
        >
          <span className={`text-xs font-bold ${row.tone}`}>{FIELD_LABEL[row.field]}</span>
          <span className={row.tone}>
            {row.done}
            <span className="text-stone-400 dark:text-stone-500">{row.value === 0 ? "/∞" : `/${row.value}`}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export const DailyLimitsPanel: React.FC<Props> = ({ limits, progress, onChange, openRequest = 0, remainingNew = null }) => {
  const [editing, setEditing] = useState<Field | null>(null);
  const [showRemaining, setShowRemaining] = useState(false);
  const [draft, setDraft] = useState("");

  const open = (field: Field, fromLimit = false) => {
    setEditing(field);
    setShowRemaining(fromLimit);
    setDraft(limits[field] > 0 ? String(limits[field]) : "");
  };

  // Có yêu cầu mở mới từ bên ngoài: mở hộp ngay trong lúc render (không cần effect).
  const [handledRequest, setHandledRequest] = useState(openRequest);
  if (openRequest !== handledRequest) {
    setHandledRequest(openRequest);
    if (openRequest > 0) open("newPerDay", true);
  }

  const parsed = Number(draft);
  const valid = draft === "" ? false : Number.isInteger(parsed) && parsed >= 1 && parsed <= 9999;

  const save = (value: number) => {
    if (!editing) return;
    onChange({ ...limits, [editing]: value });
    setEditing(null);
  };

  return (
    <section className="h-full w-full">
      <ConfigCard limits={limits} progress={progress} onOpen={(field) => open(field)} />

      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditing(null)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-title"
            className="w-full max-w-xs rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5 space-y-4 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); if (valid) save(parsed); }}
          >
            <div>
              <h3 id="goal-title" className="text-base font-black text-stone-900 dark:text-white">{FIELD_LABEL[editing]} mỗi ngày</h3>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Số tối đa mỗi ngày (1–9999).</p>
              {showRemaining && remainingNew && (
                <p className="mt-1 text-xs font-bold text-sky-600 dark:text-sky-400">Số từ mới còn lại: {remainingNew.words} ({remainingNew.cards} thẻ)</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraft(String(Math.max(1, (Number(draft) || 0) - 5)))}
                aria-label="Giảm 5 từ"
                className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-stone-300 text-xl font-black hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
              >
                −
              </button>
              <input
                autoFocus
                type="number"
                inputMode="numeric"
                min={1}
                max={9999}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="20"
                aria-label={`Số ${FIELD_LABEL[editing].toLowerCase()} mỗi ngày`}
                className="h-12 min-w-0 flex-1 rounded-xl border border-stone-300 bg-transparent px-2 text-center text-xl font-black tabular-nums [appearance:textfield] focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-stone-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-stone-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setDraft(String(Math.min(9999, (Number(draft) || 0) + 5)))}
                aria-label="Tăng 5 từ"
                className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-stone-300 text-xl font-black hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
              >
                +
              </button>
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
