import { Suspense } from "react";
import { ClassesScreen } from "../../ClassesScreen";

// Cùng lý do như /classes/<mã>: mã lớp chỉ biết lúc chạy nên static export sinh
// vỏ /classes/_/assign, Cloudflare Pages rewrite /classes/*/assign sang vỏ đó.
export function generateStaticParams() {
  return [{ code: "_" }];
}

export default function ClassAssignRoute() {
  return (
    <Suspense fallback={null}>
      <ClassesScreen />
    </Suspense>
  );
}
