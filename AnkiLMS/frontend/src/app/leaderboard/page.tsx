"use client";

import { AppShell } from "../../components/AppShell";
import { LeaderboardModule } from "../../components/LeaderboardModule";
import { useApp } from "../../contexts/AppProvider";

export default function LeaderboardPage() {
  const { currentUser } = useApp();
  return (
    <AppShell>
      <LeaderboardModule currentUser={currentUser} />
    </AppShell>
  );
}
