"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { getUserResultKey, loadSavedResult, type TestResult } from "../../lib/vocabTest";
import { VOCAB_TESTS } from "../../lib/vocabTests";
import { useApp } from "../../contexts/AppProvider";

export default function PlacementTestHub() {
  const { currentUser } = useApp();
  const [saved, setSaved] = useState<Record<string, TestResult | null>>({});
  useEffect(() => {
    setSaved(Object.fromEntries(VOCAB_TESTS.map((t) => [t.slug, loadSavedResult(getUserResultKey(t.resultKey, currentUser?.id))])));
  }, [currentUser?.id]);

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 pb-20 text-stone-900 dark:text-stone-100">
        <div>
          <h1 className="text-2xl font-black">Kiểm tra vốn từ</h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">Chọn giáo trình bạn đang học để xem đã đủ vốn từ để lên tiếp chưa.</p>
        </div>
        {VOCAB_TESTS.map((test) => {
          const last = saved[test.slug];
          return (
            <Link
              key={test.slug}
              href={`/placement-test/${test.slug}`}
              className="flex items-center gap-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70 p-4 transition hover:border-sky-400"
            >
              <span className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0"><ClipboardCheck className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{test.shortName}</span>
                <span className="block text-xs text-stone-500 dark:text-stone-400">{test.hubDescription}</span>
                {last && <span className="mt-1 block text-xs font-semibold text-emerald-600 dark:text-emerald-400">Lần trước: {last.percent}%, {test.verdicts[last.verdict].title}</span>}
              </span>
              <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
