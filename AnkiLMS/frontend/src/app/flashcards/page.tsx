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
      <FlashcardsContent />
    </AppShell>
  );
}
