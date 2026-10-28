import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/data/", "/admin", "/login", "/member", "/profile", "/classes", "/missions", "/chat"] }],
    sitemap: "https://lms.ankivn.com/sitemap.xml",
    host: "https://lms.ankivn.com",
  };
}
