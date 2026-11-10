import type { MetadataRoute } from "next";
import { CURATED_DECKS } from "../data/curatedDecks";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = "https://lms.ankivn.com";
  // Chỉ liệt kê trang khách mở được; trang bắt đăng nhập (kể cả /topik/archive) và bộ thẻ khoá học (dữ liệu riêng) không cho máy tìm kiếm.
  const pages = ["", "/classes", "/placement-test", "/dictionary", "/explore"];
  const deckIds = CURATED_DECKS.map((deck) => deck.id);
  return [...pages, ...deckIds.map((id) => `/explore/${id}`)].map((route) => ({
    url: `${origin}${route}`,
    changeFrequency: route ? "monthly" : "weekly",
    priority: route ? (route.startsWith("/explore/") ? 0.5 : 0.8) : 1,
  }));
}
