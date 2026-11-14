"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { ClassroomModule } from "../../components/ClassroomModule";
import { useApp } from "../../contexts/AppProvider";

export default function ClassesPage() {
  const { currentUser } = useApp();
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  return (
    <AppShell>
      {currentUser ? (
        <ClassroomModule currentUser={currentUser} onBack={goBack} />
      ) : (
        <>
          <div className="mx-auto max-w-5xl">
            <button
              type="button"
              onClick={goBack}
              className="classes-back-btn mb-3 inline-flex items-center gap-1.5 rounded-2xl border border-[#1e3466] bg-[#0f1b38] px-3.5 py-2 text-xs font-bold text-slate-200 transition-colors hover:border-sky-400/60 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Trở về</span>
            </button>
          </div>
          <div className="card-duo mx-auto max-w-md p-6 text-center">
            <p className="text-sm font-bold text-white">Đăng nhập để xem và tham gia lớp học</p>
            <p className="mt-1 text-xs text-slate-400">Nếu bạn được mời qua link, hãy mở lại link đó sau khi đăng nhập.</p>
            <Link href="/login" className="btn-duo btn-duo-primary mt-4 inline-block px-5 py-3 text-xs">Đăng nhập</Link>
          </div>
        </>
      )}
    </AppShell>
  );
}
