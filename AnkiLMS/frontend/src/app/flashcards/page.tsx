"use client";

import React, { Suspense } from "react";
import { AppShell } from "../../components/AppShell";
import { VocabularySRSModule } from "../../components/VocabularySRSModule";
import { useApp } from "../../contexts/AppProvider";

function FlashcardsContent() {
  const { userDecks } = useApp();
  return <VocabularySRSModule userDecks={userDecks} />;
}

export default function FlashcardsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Đang tải từ vựng...</div>}>
        <FlashcardsContent />
      </Suspense>
    </AppShell>
  );
}
