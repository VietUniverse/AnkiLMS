export type DictionaryEntry = {
  hangul: string;
  english: string;
  vietnamese: string;
  japanese: string;
  partOfSpeech: string;
  level: string;
  source: "nikl" | "yomichan";
};

type PackedEntry = [string, string, string, string, string, string];
let entriesPromise: Promise<PackedEntry[]> | null = null;
type IndexedEntry = { row: PackedEntry; hangul: string; meaning: string; definitions: string[] };
const indexedEntriesPromises: Partial<Record<SearchLanguage, Promise<IndexedEntry[]>>> = {};

async function loadEntries(): Promise<PackedEntry[]> {
  entriesPromise ??= fetch("/data/dictionary-ko-multi.json")
    .then((response) => {
      if (!response.ok) throw new Error("Không tải được từ điển đa ngôn ngữ.");
      return response.json() as Promise<PackedEntry[]>;
    })
    .catch((error) => { entriesPromise = null; throw error; });
  return entriesPromise;
}

export async function loadVietnameseVocabulary(): Promise<Array<{ hangul: string; vietnamese: string }>> {
  const rows = await loadEntries();
  return rows.filter((row) => Boolean(row[2])).map((row) => ({ hangul: row[0], vietnamese: row[2] }));
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/đ/g, "d").trim();
}

function yieldToBrowser(): Promise<void> { return new Promise((resolve) => window.setTimeout(resolve, 0)); }

async function loadIndexedEntries(language: SearchLanguage): Promise<IndexedEntry[]> {
  indexedEntriesPromises[language] ??= loadEntries().then(async (rows) => {
    const indexed: IndexedEntry[] = [];
    const meaningColumn = language === "vi" ? 2 : language === "en" ? 1 : 3;
    // Prepare searchable text in short batches so first use does not lock typing.
    for (let start = 0; start < rows.length; start += 6000) {
      const end = Math.min(start + 6000, rows.length);
      for (let index = start; index < end; index++) {
        const row = rows[index];
        const rawMeaning = row[meaningColumn];
        indexed.push({
          row,
          hangul: normalize(row[0]),
          meaning: normalizeDictionaryText(rawMeaning),
          definitions: rawMeaning.split(/[;；/／|]/).map(normalizeDictionaryText).filter(Boolean),
        });
      }
      if (end < rows.length) await yieldToBrowser();
    }
    return indexed;
  }).catch((error) => { delete indexedEntriesPromises[language]; throw error; });
  return indexedEntriesPromises[language]!;
}

type SearchLanguage = "vi" | "en" | "ja";

export function normalizeDictionaryText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9가-힣]+/g, " ").trim().replace(/\s+/g, " ");
}

function meaningScore(meaning: string, definitions: string[], query: string): number {
  if (!meaning) return 0;
  if (meaning === query) return 900;
  if (meaning.startsWith(`${query} `)) return 760;

  // NIKL joins equivalent definitions with semicolons; score a whole definition
  // more highly than an incidental occurrence inside a longer definition.
  if (definitions.some((definition) => definition === query)) return 850;
  if (definitions.some((definition) => definition.startsWith(`${query} `))) return 740;

  const queryWords = query.split(" ");
  const words = meaning.split(" ");
  if (queryWords.length === 1 && words.includes(query)) return 650;
  if (queryWords.length === 1 && words.some((word) => word.startsWith(query))) return 500;
  if (queryWords.length > 1 && meaning.split(" ").some((_, index) => words.slice(index, index + queryWords.length).join(" ") === query)) return 680;
  return 0;
}

export function matchesDictionarySearchText(text: string, query: string): boolean {
  const q = normalizeDictionaryText(query);
  const value = normalizeDictionaryText(text);
  if (!q || !value) return false;
  const definitions = text.split(/[;；/／|]/).map(normalizeDictionaryText).filter(Boolean);
  return value === q || value.startsWith(`${q} `) || meaningScore(value, definitions, q) > 0;
}

export async function searchLearningDictionary(query: string, limit = 30, signal?: AbortSignal, language: SearchLanguage = "vi"): Promise<DictionaryEntry[]> {
  const q = normalizeDictionaryText(query);
  if (!q) return [];
  const rows = await loadIndexedEntries(language);
  if (signal?.aborted) return [];
  const ranked: Array<{ score: number; entry: DictionaryEntry }> = [];
  for (let start = 0; start < rows.length; start += 6000) {
    const end = Math.min(start + 6000, rows.length);
    for (let index = start; index < end; index++) {
      const { row, hangul, meaning, definitions } = rows[index];
      const score = hangul === q ? 1200 : hangul.startsWith(q) ? 1000 : meaningScore(meaning, definitions, q);
      if (!score) continue;
      const levelBoost = row[5] === "초급" ? 12 : 0;
      const entry = { hangul: row[0], english: row[1], vietnamese: row[2], japanese: row[3], partOfSpeech: row[4], level: row[5], source: "nikl" as const };
      ranked.push({ score: score + levelBoost, entry });
      if (ranked.length >= limit * 8) {
        ranked.sort((a, b) => b.score - a.score || a.entry.hangul.length - b.entry.hangul.length || a.entry.hangul.localeCompare(b.entry.hangul, "ko"));
        ranked.length = limit * 2;
      }
    }
    if (signal?.aborted) return [];
    if (end < rows.length) await yieldToBrowser();
  }
  ranked.sort((a, b) => b.score - a.score || a.entry.hangul.length - b.entry.hangul.length || a.entry.hangul.localeCompare(b.entry.hangul, "ko"));
  return ranked.slice(0, limit).map(({ entry }) => entry);
}

export const naverLookupUrl = (word: string) => `https://ko.dict.naver.com/#/search?query=${encodeURIComponent(word)}`;
