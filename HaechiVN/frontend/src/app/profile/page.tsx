"use client";

import { AppShell } from "../../components/AppShell";
import { ProfileModule } from "../../components/ProfileModule";
import { useApp } from "../../contexts/AppProvider";

export default function ProfilePage() {
  const { currentUser, handleOpenAuth, handleLogout } = useApp();
  return (
    <AppShell>
      <ProfileModule currentUser={currentUser} onOpenAuth={handleOpenAuth} onLogout={handleLogout} />
    </AppShell>
  );
}
