"use client";

import { AppShell } from "../../components/AppShell";
import { VocabularySRSModule } from "../../components/VocabularySRSModule";
import { useApp } from "../../contexts/AppProvider";

export default function FlashcardsPage() {
  const { userDecks } = useApp();
  return (
    <AppShell>
      <VocabularySRSModule userDecks={userDecks} />
    </AppShell>
  );
}
