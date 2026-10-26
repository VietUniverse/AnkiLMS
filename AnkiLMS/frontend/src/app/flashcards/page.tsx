"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "../../components/AppShell";
import { VocabularySRSModule } from "../../components/VocabularySRSModule";
import { KoreanTopicsModule } from "../../components/KoreanTopicsModule";
import { useApp } from "../../contexts/AppProvider";
import { Brain, Compass } from "lucide-react";

function VocabularyTabsContent() {
  const { userDecks } = useApp();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "topics" ? "topics" : "srs";
  const [activeTab, setActiveTab] = useState<"srs" | "topics">(initialTab);

  return (
    <div className="space-y-6">
      {/* Tab Switcher - Gộp Ôn thẻ SRS Anki & Học theo chủ đề thành 1 khối Từ Vựng */}
      <div className="flex items-center justify-center p-1.5 rounded-2xl bg-[#090f1e] max-w-sm sm:max-w-md mx-auto shadow-xl border-0">
        <button
          onClick={() => setActiveTab("srs")}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${
            activeTab === "srs"
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
              : "text-slate-400 hover:text-white hover:bg-[#111c38]"
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>Ôn Thẻ FSRS Anki</span>
        </button>

        <button
          onClick={() => setActiveTab("topics")}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${
            activeTab === "topics"
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
              : "text-slate-400 hover:text-white hover:bg-[#111c38]"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Học Theo Chủ Đề</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "srs" ? (
        <VocabularySRSModule userDecks={userDecks} />
      ) : (
        <KoreanTopicsModule />
      )}
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Đang tải từ vựng...</div>}>
        <VocabularyTabsContent />
      </Suspense>
    </AppShell>
  );
}
