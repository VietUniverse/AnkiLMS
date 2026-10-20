"use client";

import { AppShell } from "../../components/AppShell";
import { AchievementsModule } from "../../components/AchievementsModule";
import { useApp } from "../../contexts/AppProvider";

export default function AchievementsPage() {
  const { currentUser } = useApp();
  return (
    <AppShell>
      <AchievementsModule currentUser={currentUser} />
    </AppShell>
  );
}
