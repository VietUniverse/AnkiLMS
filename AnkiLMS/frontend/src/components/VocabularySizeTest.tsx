"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { loadSavedResult, type TestResult } from "../lib/seoul1aTest";

const LABEL = { pass: "đủ vốn từ học 1B", almost: "gần đạt", fail: "chưa đạt" } as const;

export function VocabularySizeTest() {
  const [saved, setSaved] = useState<TestResult | null>(null);
  useEffect(() => { setSaved(loadSavedResult()); }, []);

  return (
    <Link
      href="/placement-test"
      className="flex items-center gap-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 px-4 py-3 transition hover:border-sky-400"
    >
      <span className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0"><ClipboardCheck className="w-5 h-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-stone-900 dark:text-white">Bạn đủ vốn từ để học 1B chưa?</span>
        <span className="block text-xs text-stone-500 dark:text-stone-400 truncate">
          {saved ? `Lần trước: ${saved.percent}% — ${LABEL[saved.verdict]}` : "Kiểm tra vốn từ 1A, khoảng 7 phút"}
        </span>
      </span>
      <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
    </Link>
  );
}
