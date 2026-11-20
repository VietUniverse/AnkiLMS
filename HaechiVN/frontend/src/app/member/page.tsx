"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "../../components/AppShell";
import { PublicProfileModule } from "../../components/PublicProfileModule";

function MemberPageContent() {
  const searchParams = useSearchParams();
  return <AppShell><PublicProfileModule profileId={searchParams.get("id") || ""} /></AppShell>;
}

export default function MemberPage() {
  return <Suspense fallback={<AppShell><p className="p-8 text-center text-sm text-slate-300">Đang tải trang cá nhân…</p></AppShell>}><MemberPageContent /></Suspense>;
}
