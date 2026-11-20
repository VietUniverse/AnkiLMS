"use client";

import React from "react";
import { AppShell } from "../../components/AppShell";
import { KoreanTopicsModule } from "../../components/KoreanTopicsModule";
import { Compass } from "lucide-react";

export default function TopicsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">Học Từ Vựng Tiếng Hàn Theo Chủ Đề</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                BETA
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tính năng đang thử nghiệm (Beta). Khám phá từ vựng và câu đàm thoại tiếng Hàn theo các tình huống giao tiếp thực tế.
            </p>
          </div>
        </div>

        <KoreanTopicsModule />
      </div>
    </AppShell>
  );
}
