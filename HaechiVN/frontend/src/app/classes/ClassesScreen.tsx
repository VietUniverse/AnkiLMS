"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useCallback } from "react";
import { AppShell } from "../../components/AppShell";
import { ClassroomModule } from "../../components/ClassroomModule";
import { useApp } from "../../contexts/AppProvider";
import type { UserProfile } from "../../lib/apiClient";

const DEMO_TEACHER: UserProfile = {
  id: "u-teacher",
  email: "hana@haechivn.com",
  name: "Cô Hana",
  streak: 12,
  xp: 4820,
  gems: 120,
  level: 9,
  role: "teacher",
};

/** Màn hình lớp học dùng chung cho /classes và /classes/<mã lớp>. */
export function ClassesScreen() {
  const { currentUser, isAuthReady } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const demoMode = useSearchParams().get("demo") === "1";
  // ?demo=1 phải luôn dùng dữ liệu mẫu, kể cả khi đang có phiên đăng nhập thật.
  const viewer = demoMode ? DEMO_TEACHER : currentUser;

  // /classes/B79FB08A → "B79FB08A"; /classes → undefined
  const segments = (pathname || "").split("/").filter(Boolean);
  const initialCode = segments[0] === "classes" && segments[1] ? decodeURIComponent(segments[1]) : undefined;
  // /classes/<mã>/assign là trang giao bài riêng.
  const assignPage = segments[2] === "assign";

  const goBack = () => {
    if (assignPage && initialCode) {
      router.push(`/classes/${encodeURIComponent(initialCode)}`);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  // Mỗi lớp có URL riêng: chọn lớp → /classes/<mã>, về danh sách → /classes.
  const handleSelectedClassChange = useCallback(
    (code: string | null) => {
      // Trang giao bài giữ nguyên URL /classes/<mã>/assign.
      if (assignPage) return;
      const target = code ? `/classes/${encodeURIComponent(code)}` : "/classes";
      if ((pathname || "").split("?")[0] === target) return;
      router.push(target);
    },
    [pathname, router, assignPage],
  );

  return (
    <AppShell>
      {viewer ? (
        <ClassroomModule
          currentUser={viewer}
          demo={demoMode}
          onBack={goBack}
          initialClassCode={initialCode}
          onSelectedClassChange={handleSelectedClassChange}
          assignPage={assignPage}
        />
      ) : !isAuthReady ? (
        <div className="mx-auto max-w-5xl" aria-hidden />
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
            <Link href="/classes?demo=1" className="mt-3 block text-xs font-bold text-sky-300 underline-offset-4 hover:text-white hover:underline">
              Xem giao diện với dữ liệu mẫu
            </Link>
          </div>
        </>
      )}
    </AppShell>
  );
}
