import type { MetadataRoute } from "next";
import { CURATED_DECKS } from "../data/curatedDecks";
import { readFileSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = "https://lms.ankivn.com";
  const pages = ["", "/hangul", "/dictionary", "/explore", "/flashcards", "/dictation", "/shadowing", "/listen", "/games"];
  const deckIds = CURATED_DECKS.map((deck) => deck.id);
  try {
    const data = JSON.parse(readFileSync(path.join(process.cwd(), "public/data/course-vocabulary.json"), "utf8"));
    for (const group of data.decks || []) for (const course of group.courses || []) deckIds.push(`course-${course.id}`);
  } catch { /* Optional course catalog. */ }
  return [...pages, ...deckIds.map((id) => `/explore/${id}`)].map((route) => ({
    url: `${origin}${route}`,
    changeFrequency: route ? "monthly" : "weekly",
    priority: route ? (route.startsWith("/explore/") ? 0.5 : 0.8) : 1,
  }));
}
