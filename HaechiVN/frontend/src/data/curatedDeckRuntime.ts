import type { AnkiDeck } from "../lib/ankiParser";
import type { CuratedDeckItem } from "./curatedDecks";

// Bản runtime của curatedDecks.ts: không import topikCuratedDecks.json tĩnh,
// nhờ vậy AppProvider (mount ở mọi route) không kéo 7.7 MB JSON vào bundle.
// Các trang cần dữ liệu đồng bộ (explore/vocabulary/dictionary/sitemap) vẫn
// dùng CURATED_DECKS trong curatedDecks.ts; riêng AppProvider fetch bản trong
// public/data/curated-decks.json.

export function curatedDeckToAnkiDeck(deck: CuratedDeckItem): AnkiDeck {
  const isCommunityDeck = deck.id.startsWith("shared-");
  const sharedId = deck.sharedId || (isCommunityDeck ? deck.id.slice("shared-".length) : undefined);
  return {
    id: isCommunityDeck ? `community-copy-${sharedId}` : `curated-${deck.id}`,
    name: deck.title,
    cardCount: deck.cardCount || deck.cards.length,
    cards: deck.cards,
    visibility: isCommunityDeck ? "private" : deck.visibility || "public",
    sharedId: isCommunityDeck ? undefined : deck.sharedId,
    author: isCommunityDeck ? undefined : {
      userId: deck.author.userId,
      name: deck.author.name,
      avatar: deck.author.avatar,
      bio: deck.author.bio,
    },
  };
}

let curatedDecksPromise: Promise<CuratedDeckItem[]> | null = null;

export function loadCuratedDecks(): Promise<CuratedDeckItem[]> {
  if (!curatedDecksPromise) {
    curatedDecksPromise = fetch("/data/curated-decks.json", { cache: "force-cache" })
      .then((response) => (response.ok ? response.json() : []))
      .then((decks: CuratedDeckItem[]) => decks.filter((deck) => !deck.id.toLowerCase().includes("writing")))
      .catch(() => []);
  }
  return curatedDecksPromise;
}
