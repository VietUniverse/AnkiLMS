import { AnkiCard, AnkiDeck } from "../lib/ankiParser";
import topikCuratedDecksRaw from "./topikCuratedDecks.json";

export interface DeckAuthor {
  userId?: string;
  name: string;
  avatar: string;
  role: string;
  bio: string;
  verified: boolean;
  profileUrl?: string;
}

export interface CuratedDeckItem {
  id: string;
  title: string;
  category: "topik" | "conversation" | "drama" | "hanja" | "travel" | "work" | "food";
  categoryLabel: string;
  level: "Sơ cấp" | "Trung cấp" | "Cao cấp" | "Mọi cấp độ";
  description: string;
  detailedDescription?: string;
  iconName: string;
  badgeColor: string;
  bannerGradient?: string;
  tags: string[];
  cards: AnkiCard[];
  cardCount?: number;
  author: DeckAuthor;
  visibility?: "public" | "private";
  sharedId?: string;
  rating: number;
  downloads: number;
  estimatedMinutes: number;
}

// Các bộ thẻ công khai trên /explore: Chỉ bao gồm từ vựng và ngữ pháp.
// Bộ thẻ luyện viết (Câu 51~54) được bảo mật dành riêng cho Admin, không công khai ra production.
export const CURATED_DECKS: CuratedDeckItem[] = (topikCuratedDecksRaw as unknown as CuratedDeckItem[]).filter(
  (deck) => !deck.id.toLowerCase().includes("writing")
);

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

export type SharedDeckRecord = {
  sharedId: string;
  deckId: string;
  title: string;
  description: string;
  visibility: "public" | "private";
  cardCount: number;
  cards?: AnkiCard[];
  author: { userId: string; name: string; avatar?: string; bio?: string };
};

export function sharedDeckToExploreDeck(record: SharedDeckRecord): CuratedDeckItem {
  const cards = record.cards || [];
  return {
    id: `shared-${record.sharedId}`,
    sharedId: record.sharedId,
    title: record.title,
    category: "conversation",
    categoryLabel: "Cộng đồng",
    level: "Mọi cấp độ",
    description: record.description || "Bộ thẻ được chia sẻ bởi cộng đồng HaechiVN.",
    detailedDescription: record.description || "Bộ thẻ được chia sẻ bởi cộng đồng HaechiVN.",
    iconName: "BookOpen",
    badgeColor: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
    tags: ["Cộng đồng", "Người học biên soạn"],
    cards,
    author: {
      userId: record.author.userId,
      name: record.author.name,
      avatar: record.author.avatar || "/brand/haechivn-mark.webp",
      role: "Tác giả cộng đồng",
      bio: record.author.bio || "Người học chia sẻ bộ thẻ với cộng đồng HaechiVN.",
      verified: false,
      profileUrl: `/profile/${record.author.userId}`,
    },
    visibility: record.visibility,
    cardCount: record.cardCount,
    rating: 0,
    downloads: 0,
    estimatedMinutes: Math.max(1, Math.ceil(record.cardCount / 20)),
  };
}

/**
 * Cấu hình hiển thị bộ thẻ Demo:
 * - Khi build & deploy lên main production (process.env.NODE_ENV === "production"):
 *   Mặc định KHÔNG hiển thị các bộ thẻ demo này (chờ nguồn dữ liệu thực tế).
 * - Ở môi trường dev (NODE_ENV !== "production") hoặc khi set NEXT_PUBLIC_ENABLE_DEMO_DECKS="true":
 *   Cho phép hiển thị để kiểm thử và demo giao diện.
 */
export const IS_DEMO_DECKS_ENABLED: boolean =
  process.env.NEXT_PUBLIC_ENABLE_DEMO_DECKS === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_DEMO_DECKS !== "false");

export function getCuratedDecks(): CuratedDeckItem[] {
  return IS_DEMO_DECKS_ENABLED ? CURATED_DECKS : [];
}

