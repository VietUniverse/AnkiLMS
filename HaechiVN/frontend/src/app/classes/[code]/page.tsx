import { Suspense } from "react";
import { ClassesScreen } from "../ClassesScreen";

// Mã lớp là dữ liệu người dùng nên không thể biết lúc build. Static export chỉ
// sinh một vỏ /classes/_ ; Cloudflare Pages rewrite /classes/* sang vỏ đó
// (public/_redirects) và ClassesScreen đọc mã lớp thật từ pathname.
export function generateStaticParams() {
  return [{ code: "_" }];
}

export default function ClassRoute() {
  return (
    <Suspense fallback={null}>
      <ClassesScreen />
    </Suspense>
  );
}
