import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Dev chạy server bình thường để route động /classes/<mã lớp> hoạt động;
  // lúc build mới export tĩnh cho Cloudflare Pages.
  ...(isDev ? {} : { output: "export" as const }),
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    // Đánh dấu app đã nhận bản vá bảo mật qua `next upgrade --agent=security`.
    agentUpgrade: "security",
  },
  // Chỉ dùng khi chạy `next dev`: chuyển tiếp /api sang máy chủ Pages local
  // (wrangler pages dev) để xem giao diện với dữ liệu D1 thật. Khi export/build
  // không có rewrite nào nên bản production giữ nguyên API cùng origin.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const apiOrigin = process.env.LOCAL_API_ORIGIN || "http://127.0.0.1:8788";
    return [
      { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
    ];
  },
};

export default nextConfig;
