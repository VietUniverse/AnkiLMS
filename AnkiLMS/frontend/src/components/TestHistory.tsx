"use client";

import React from "react";
import Link from "next/link";
import { clearHistory, useTestHistory, type HistoryEntry } from "../lib/vocabTest";
import { useApp } from "../contexts/AppProvider";
import { VOCAB_TESTS } from "../lib/vocabTests";

const VERDICT_CHIP = {
  pass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  almost: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  fail: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
} as const;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const verdictText = (entry: HistoryEntry) => {
  const def = VOCAB_TESTS.find((t) => t.slug === entry.testSlug);
  return def ? def.verdicts[entry.verdict].title : { pass: "Đạt", almost: "Gần đạt", fail: "Chưa đạt" }[entry.verdict];
};

/** Lịch sử làm bài kiểm tra vốn từ. `limit` giới hạn số dòng (dùng cho trang hồ sơ). */
export function TestHistory({ limit, showMoreLink = false }: { limit?: number; showMoreLink?: boolean }) {
  const { currentUser } = useApp();
  const all = useTestHistory(currentUser?.id);
  const entries = limit ? all.slice(0, limit) : all;

  return (
    <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-stone-900 dark:text-white">Lịch sử kiểm tra vốn từ</h2>
        {showMoreLink ? (
          <Link href="/placement-test" className="text-xs font-bold text-sky-600 hover:underline dark:text-sky-400">Làm bài</Link>
        ) : all.length > 0 ? (
          <button type="button" onClick={() => { if (window.confirm("Xóa toàn bộ lịch sử kiểm tra trên thiết bị này?")) clearHistory(currentUser?.id); }} className="text-xs font-semibold text-stone-400 hover:text-rose-500 cursor-pointer">Xóa lịch sử</button>
        ) : null}
      </div>
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">Chưa có lần làm bài nào.</p>
      ) : (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {entries.map((entry, index) => (
            <li key={`${entry.assessedAt}-${index}`} className="flex items-center gap-3 py-2.5">
              <span className="w-14 shrink-0 text-right text-xl font-black tabular-nums text-stone-900 dark:text-white">{entry.percent}<span className="text-xs text-stone-400">%</span></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-bold text-stone-900 dark:text-white">{entry.testName}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${VERDICT_CHIP[entry.verdict]}`}>{verdictText(entry)}</span>
                </span>
                <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                  {formatDate(entry.assessedAt)}, đúng {entry.correct}, sai {entry.wrong}, chưa biết {entry.skipped}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
