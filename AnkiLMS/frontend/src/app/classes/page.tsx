"use client";

import React from "react";
import { AppShell } from "../../components/AppShell";
import { ClassroomModule } from "../../components/ClassroomModule";
import { OpenClassesSection } from "../../components/OpenClassesSection";
import { useApp } from "../../contexts/AppProvider";

export default function ClassesPage() {
  const { currentUser } = useApp();
  const [joinedClassIds, setJoinedClassIds] = React.useState<string[]>([]);
  // Đổi key để danh sách lớp tải lại sau khi vào một lớp mở.
  const [classListVersion, setClassListVersion] = React.useState(0);
  const [focusClassId, setFocusClassId] = React.useState<string | null>(null);
  const classListRef = React.useRef<HTMLDivElement>(null);
  const openClass = (classId: string) => {
    setFocusClassId(classId);
    setClassListVersion((value) => value + 1);
    window.setTimeout(() => classListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <AppShell>
      <div className="space-y-10">
        <OpenClassesSection joinedClassIds={currentUser ? joinedClassIds : []} onJoined={openClass} onOpen={openClass} />
        {currentUser && <div ref={classListRef} className="scroll-mt-4"><ClassroomModule key={classListVersion} currentUser={currentUser} onClassesChange={setJoinedClassIds} initialClassId={focusClassId} /></div>}
      </div>
    </AppShell>
  );
}
