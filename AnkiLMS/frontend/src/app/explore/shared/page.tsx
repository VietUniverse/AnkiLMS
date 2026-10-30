"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DeckDetailClient from "../[id]/DeckDetailClient";

function SharedDeckContent() {
  const searchParams = useSearchParams();
  const sharedId = searchParams.get("id") || "";
  if (!sharedId) return <div className="p-12 text-center text-sm">Thiếu mã bộ thẻ.</div>;
  return <DeckDetailClient id={`shared-${sharedId}`} />;
}

export default function SharedDeckPage() {
  return <Suspense fallback={<div className="p-12 text-center text-sm">Đang tải bộ thẻ…</div>}><SharedDeckContent /></Suspense>;
}
