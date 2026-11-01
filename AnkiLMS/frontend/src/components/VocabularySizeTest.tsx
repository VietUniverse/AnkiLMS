"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { loadSavedResult, type TestResult } from "../lib/seoul1aTest";

const LABEL = { pass: "đã qua 1A", almost: "gần đạt 1A", fail: "chưa đạt 1A" } as const;

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
        <span className="block text-sm font-bold text-stone-900 dark:text-white">Bạn đã qua 1A chưa?</span>
        <span className="block text-xs text-stone-500 dark:text-stone-400 truncate">
          {saved ? `Lần trước: ${saved.correct}/${saved.total} — ${LABEL[saved.verdict]}` : "Kiểm tra nhanh 40 từ, khoảng 4 phút"}
        </span>
      </span>
      <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
    </Link>
  );
}
