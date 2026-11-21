"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "../../../components/AppShell";
import { TopikExamModule } from "../../../components/TopikExamModule";
import "../topik-apple.css";

/** Trang riêng cho bộ luyện "Từ vựng & ngữ pháp" (220+ câu trắc nghiệm). */
export default function TopikGrammarPage() {
  const router = useRouter();
  return (
    <AppShell>
      <TopikExamModule initialSetId="grammar" onExit={() => router.push("/topik")} />
    </AppShell>
  );
}
