"use client";

import { Suspense } from "react";
import { ClassesScreen } from "./ClassesScreen";

export default function ClassesPage() {
  return (
    <Suspense fallback={null}>
      <ClassesScreen />
    </Suspense>
  );
}
