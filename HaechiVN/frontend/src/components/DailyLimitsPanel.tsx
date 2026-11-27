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

const LABEL = { newPerDay: "Từ mới", reviewPerDay: "Ôn lại" } as const;
type Field = keyof typeof LABEL;

function ConfigCard({ limits, progress, onOpen }: { limits: DailyLimits; progress: DailyProgress; onOpen: () => void }) {
  const newLimit = limits.newPerDay === 0 ? 0 : limits.newPerDay + progress.extraNew;
  const rows: { field: Field; done: number; value: number; tone: string }[] = [
    { field: "newPerDay", done: progress.newDone, value: newLimit, tone: "text-sky-600 dark:text-sky-400" },
    { field: "reviewPerDay", done: progress.reviewDone, value: limits.reviewPerDay, tone: "text-rose-600 dark:text-rose-400" },
  ];
  return (
    <div className="flex h-full w-full flex-col justify-center gap-0.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 px-3 py-1.5 sm:px-4 sm:py-2">
      {rows.map((row) => (
        <button
          key={row.field}
          type="button"
          onClick={onOpen}
          aria-label={`${LABEL[row.field]} hôm nay: ${row.done} trên ${row.value || "không giới hạn"}. Bấm để đổi cả từ mới và ôn lại`}
          className="flex cursor-pointer items-baseline justify-between gap-2 whitespace-nowrap text-sm font-black tabular-nums hover:opacity-80 sm:text-base"
        >
          <span className={`text-xs font-bold ${row.tone}`}>{LABEL[row.field]}</span>
          <span className={row.tone}>
            {row.done}
            <span className="text-stone-400 dark:text-stone-500">{row.value === 0 ? "/∞" : `/${row.value}`}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Một dòng −/ô nhập/+ dùng chung cho cả hai hạn mức. */
function NumberRow({ label, value, onChange, accent }: { label: string; value: string; onChange: (v: string) => void; accent: string }) {
  const step = (delta: number) =>
    onChange(String(Math.min(9999, Math.max(1, (Number(value) || 0) + delta))));
  return (
    <div className="flex items-center gap-2">
      <span className={`w-14 shrink-0 text-left text-xs font-bold ${accent}`}>{label}</span>
      <button type="button" onClick={() => step(-5)} aria-label={`Giảm 5 ${label.toLowerCase()}`}
        className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-stone-300 text-xl font-black hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800">−</button>
      <input
        type="number" inputMode="numeric" min={1} max={9999} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder="20"
        aria-label={`Số ${label.toLowerCase()} mỗi ngày`}
        className="h-11 min-w-0 flex-1 rounded-xl border border-stone-300 bg-transparent px-2 text-center text-lg font-black tabular-nums [appearance:textfield] focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-stone-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-stone-900 dark:text-white"
      />
      <button type="button" onClick={() => step(5)} aria-label={`Tăng 5 ${label.toLowerCase()}`}
        className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-stone-300 text-xl font-black hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800">+</button>
    </div>
  );
}

export const DailyLimitsPanel: React.FC<Props> = ({ limits, progress, onChange, openRequest = 0, remainingNew = null }) => {
  const [editing, setEditing] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const [draftNew, setDraftNew] = useState("");
  const [draftReview, setDraftReview] = useState("");

  // Một hộp cho cả hai hạn mức: sửa từ mới và ôn lại cùng lúc.
  const open = (fromLimit = false) => {
    setEditing(true);
    setShowRemaining(fromLimit);
    setDraftNew(limits.newPerDay > 0 ? String(limits.newPerDay) : "");
    setDraftReview(limits.reviewPerDay > 0 ? String(limits.reviewPerDay) : "");
  };

  // Có yêu cầu mở mới từ bên ngoài: mở hộp ngay trong lúc render (không cần effect).
  const [handledRequest, setHandledRequest] = useState(openRequest);
  if (openRequest !== handledRequest) {
    setHandledRequest(openRequest);
    if (openRequest > 0) open(true);
  }

  const validOf = (draft: string) => {
    const n = Number(draft);
    return draft !== "" && Number.isInteger(n) && n >= 1 && n <= 9999;
  };
  const valid = validOf(draftNew) && validOf(draftReview);

  const save = () => {
    if (!valid) return;
    onChange({ newPerDay: Number(draftNew), reviewPerDay: Number(draftReview) });
    setEditing(false);
  };

  return (
    <section className="h-full w-full">
      <ConfigCard limits={limits} progress={progress} onOpen={() => open()} />

      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditing(false)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-title"
            className="w-full max-w-sm rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5 space-y-4 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); save(); }}
          >
            <div>
              <h3 id="goal-title" className="text-base font-black text-stone-900 dark:text-white">Hạn mức mỗi ngày</h3>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Số thẻ tối đa mỗi ngày (1–9999).</p>
              {showRemaining && remainingNew && (
                <p className="mt-1 text-xs font-bold text-sky-600 dark:text-sky-400">Số từ mới còn lại: {remainingNew.words} ({remainingNew.cards} thẻ)</p>
              )}
            </div>
            <div className="space-y-3">
              <NumberRow label={LABEL.newPerDay} value={draftNew} onChange={setDraftNew} accent="text-sky-600 dark:text-sky-400" />
              <NumberRow label={LABEL.reviewPerDay} value={draftReview} onChange={setDraftReview} accent="text-rose-600 dark:text-rose-400" />
            </div>
            {(draftNew !== "" || draftReview !== "") && !valid && (
              <p role="alert" className="text-xs text-rose-600">Nhập số nguyên từ 1 đến 9999 cho cả hai ô.</p>
            )}
            <div className="space-y-2">
              <button
                type="submit"
                disabled={!valid}
                className="w-full rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-sky-500 py-2.5 text-sm font-black text-white transition cursor-pointer"
              >
                Lưu
              </button>
              <button type="button" onClick={() => setEditing(false)} className="w-full rounded-xl py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
