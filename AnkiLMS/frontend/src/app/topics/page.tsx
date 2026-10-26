"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TopicsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/flashcards?tab=topics");
  }, [router]);

  return null;
}
