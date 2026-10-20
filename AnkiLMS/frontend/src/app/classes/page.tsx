"use client";

import React from "react";
import { AppShell } from "../../components/AppShell";
import { ClassroomModule } from "../../components/ClassroomModule";
import { useApp } from "../../contexts/AppProvider";

export default function ClassesPage() {
  const { currentUser } = useApp();

  return (
    <AppShell>
      <ClassroomModule currentUser={currentUser} />
    </AppShell>
  );
}
