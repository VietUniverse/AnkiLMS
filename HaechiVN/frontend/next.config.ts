import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Chỉ dùng khi chạy `next dev`: chuyển tiếp /api sang máy chủ Pages local
  // (wrangler pages dev) để xem giao diện với dữ liệu D1 thật. Khi export/build
  // không có rewrite nào nên bản production giữ nguyên API cùng origin.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const apiOrigin = process.env.LOCAL_API_ORIGIN || "http://127.0.0.1:8788";
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
