import { Suspense } from "react";
import { ClassesScreen } from "../../../ClassesScreen";

export function generateStaticParams() {
  return [{ code: "_", id: "_" }];
}

export default function ClassAssignmentEditRoute() {
  return (
    <Suspense fallback={null}>
      <ClassesScreen />
    </Suspense>
  );
}
