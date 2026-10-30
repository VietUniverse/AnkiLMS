import type { AnkiCard } from "./ankiParser";
import type { CuratedDeckItem } from "../data/curatedDecks";

export type CoursePackedWord = [number, string, string, string, string, string];
export type VocabularyUnit = { number: number; title: string; words: CoursePackedWord[] };
export type VocabularyCourse = {
  id: string;
  title: string;
  level: string;
  topik: string;
  topic: string;
  wordCount: number;
  units: VocabularyUnit[];
};
export type TopikDeck = {
  id: string;
  title: string;
  subtitle: string;
  courses: VocabularyCourse[];
};
export type CourseVocabularyData = {
  version: number;
  source: string;
  courseCount: number;
  wordCount: number;
  decks: TopikDeck[];
};

export function courseToExploreDeck(course: VocabularyCourse): CuratedDeckItem {
  const topik = course.topik.match(/\d+/)?.[0] || "1";
  const cards: AnkiCard[] = course.units.flatMap((unit) => unit.words.map(([id, korean, meaning, , hanja, pronunciation]) => ({
    id,
    noteId: id,
    deckName: course.title,
    frontHtml: korean,
    backHtml: meaning,
    frontText: korean,
    backText: meaning,
    fields: [korean, meaning, "", hanja, pronunciation, unit.title],
    tags: [course.level, course.topik, course.topic, unit.title],
    koreanText: korean,
    vietnameseMeaning: meaning,
    exampleSentence: "",
    audioUrls: [],
    imageUrls: [],
    mediaRefs: [],
    dueDate: 0,
    interval: 0,
    reps: 0,
    lapses: 0,
    state: "new" as const,
  })).filter((card) => card.koreanText && card.vietnameseMeaning));
  const level = Number(topik) <= 2 ? "Sơ cấp" : Number(topik) <= 4 ? "Trung cấp" : "Cao cấp";
  return {
    id: `course-${course.id}`,
    title: course.title,
    category: "topik",
    categoryLabel: course.topik,
    level,
    description: `${course.topic} · ${course.level}`,
    detailedDescription: `Bộ từ vựng theo ${course.topik}, gồm ${cards.length.toLocaleString("vi-VN")} từ và cụm từ được chia theo bài học.`,
    iconName: "BookOpen",
    badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30",
    tags: [course.topik, course.level, course.topic],
    cards,
    author: { name: "HaechiVN", avatar: "/brand/haechivn-mark.webp", role: "Biên soạn", bio: "Kho học liệu HaechiVN", verified: true },
    visibility: "public",
    rating: 0,
    downloads: 0,
    estimatedMinutes: Math.max(1, Math.ceil(cards.length / 20)),
  };
}

type Seoul1AData = {
  id: string;
  title: string;
  description: string;
  topik: string;
  cards: AnkiCard[];
};

let seoul1ADeckPromise: Promise<CuratedDeckItem | null> | null = null;

export function loadSeoul1AExploreDeck(): Promise<CuratedDeckItem | null> {
  seoul1ADeckPromise ??= fetch("/data/seoul-1a.json")
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json() as Seoul1AData;
      return {
        id: "seoul-1a",
        title: data.title,
        category: "topik",
        categoryLabel: "TOPIK 1",
        level: "Sơ cấp",
        description: data.description,
        detailedDescription: `Bộ từ vựng Seoul Korean Plus 1A gồm ${data.cards.length.toLocaleString("vi-VN")} thẻ, từ Hangul cơ bản đến các bài 01–08.`,
        iconName: "BookOpen",
        badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30",
        tags: ["TOPIK 1", "Seoul Korean Plus", "1A"],
        cards: data.cards,
        cardCount: data.cards.length,
        author: {
          name: "Seoul Korean Plus",
          avatar: "/brand/haechivn-mark.webp",
          role: "Giáo trình · Quyển 1A",
          bio: "Bộ thẻ Seoul Korean Plus 1A được phân loại theo từng bài học.",
          verified: false,
        },
        visibility: "public",
        rating: 0,
        downloads: 0,
        estimatedMinutes: Math.max(1, Math.ceil(data.cards.length / 20)),
      } satisfies CuratedDeckItem;
    })
    .catch(() => null);
  return seoul1ADeckPromise;
}

let dataPromise: Promise<CourseVocabularyData | null> | null = null;

export function loadCourseVocabulary(): Promise<CourseVocabularyData | null> {
  dataPromise ??= fetch("/data/course-vocabulary.json")
    .then(async (response) => {
      if (!response.ok) return null;
      return await response.json() as CourseVocabularyData;
    })
    .catch(() => null);
  return dataPromise;
}

export function dictionaryLevelFromTopik(topik: string): "초급" | "중급" | "고급" | "" {
  const level = Number(topik.match(/\d+/)?.[0] || 0);
  if (level >= 1 && level <= 2) return "초급";
  if (level >= 3 && level <= 4) return "중급";
  if (level >= 5 && level <= 6) return "고급";
  return "";
}

