"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Sparkles } from "lucide-react";

type SavedPlacement = { estimatedKnown?: number; assessedAt?: string };

export function VocabularySizeTest() {
  const [saved, setSaved] = useState<SavedPlacement | null>(null);
  useEffect(() => {
    try {
      const value = localStorage.getItem("haechivn_placement_result");
      if (value) setSaved(JSON.parse(value) as SavedPlacement);
    } catch { /* Ignore unavailable or invalid local storage. */ }
  }, []);

  return (
    <section className="rounded-2xl border border-sky-500/25 bg-sky-50/70 p-4 dark:bg-sky-950/25 sm:p-5" aria-label="Kiểm tra đầu vào tiếng Hàn">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Lộ trình bắt đầu từ đúng trình độ</span>
          </div>
          <p className="mt-1 text-sm font-bold text-stone-900 dark:text-white">Kiểm tra đầu vào & nhận gợi ý bộ thẻ</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-300">Chia sẻ mục tiêu, tự đánh giá 4 kỹ năng và làm bài từ vựng theo TOPIK. HaechiVN sẽ gợi ý điểm bắt đầu cùng bộ thẻ phù hợp.</p>
          {saved?.assessedAt && <p className="mt-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Lần kiểm tra gần nhất: ước tính {Number(saved.estimatedKnown || 0).toLocaleString("vi-VN")} từ đã biết</p>}
        </div>
        <Link href="/placement-test" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-sky-500">
          <ClipboardCheck className="h-4 w-4" /> {saved ? "Xem lộ trình của tôi" : "Bắt đầu kiểm tra"} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
