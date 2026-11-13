"use client";

import Link from "next/link";
import { AppShell } from "../../components/AppShell";
import { ClassroomModule } from "../../components/ClassroomModule";
import { useApp } from "../../contexts/AppProvider";

export default function ClassesPage() {
  const { currentUser } = useApp();

  return (
    <AppShell>
      {currentUser ? <ClassroomModule currentUser={currentUser} /> : (
        <div className="card-duo mx-auto max-w-md p-6 text-center">
          <p className="text-sm font-bold text-white">Đăng nhập để xem và tham gia lớp học</p>
          <p className="mt-1 text-xs text-slate-400">Nếu bạn được mời qua link, hãy mở lại link đó sau khi đăng nhập.</p>
          <Link href="/login" className="btn-duo btn-duo-primary mt-4 inline-block px-5 py-3 text-xs">Đăng nhập</Link>
        </div>
      )}
    </AppShell>
  );
}
