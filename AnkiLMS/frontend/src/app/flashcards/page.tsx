"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "../../components/AppShell";
import { VocabularySRSModule } from "../../components/VocabularySRSModule";
import { useApp } from "../../contexts/AppProvider";

function FlashcardsContent() {
  const { userDecks } = useApp();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isCompleted = searchParams.get("completed") === "true";
  const initialViewMode = mode === "study" || searchParams.get("study") === "true" || searchParams.get("resume") === "true" ? "study" : "dashboard";

  return <VocabularySRSModule userDecks={userDecks} initialViewMode={initialViewMode} initialEmptyCards={isCompleted} />;
}

export default function FlashcardsPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <FlashcardsContent />
      </Suspense>
    </AppShell>
  );
}
