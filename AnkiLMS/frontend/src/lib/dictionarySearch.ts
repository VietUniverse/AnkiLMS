import { dictionaryLevelFromTopik, loadCourseVocabulary } from "./courseVocabulary";
import { romanizeKorean } from "./romanization";

export type DictionaryEntry = {
  hangul: string;
  english: string;
  vietnamese: string;
  japanese: string;
  partOfSpeech: string;
  level: string;
  source: "nikl" | "yomichan" | "topic-pdf" | "course-vocabulary";
  topic?: string;
  romanization?: string;
  hanja?: string;
  pronunciation?: string;
  topik?: string;
  courseId?: string;
};

type PackedEntry = [string, string, string, string, string, string, string?, string?, string?, string?, string?, string?, string?];
type TopicVocabularyRow = [string, string, string, string?];
const HANGUL_CHAR = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/u;
let entriesPromise: Promise<PackedEntry[]> | null = null;
type IndexedEntry = { row: PackedEntry; hangul: string; romanization: string; meaning: string; definitions: string[]; tokens: string[] };
type DictionaryIndex = { rows: IndexedEntry[]; hangulKeys: string[]; romanizationKeys: string[]; romanizationRows: Map<string, IndexedEntry[]>; meaningTokens: string[]; tokenRows: Map<string, IndexedEntry[]> };
const indexedEntriesPromises: Partial<Record<SearchLanguage, Promise<DictionaryIndex>>> = {};

async function loadEntries(): Promise<PackedEntry[]> {
  entriesPromise ??= Promise.all([
    fetch("/data/dictionary-ko-multi.json"),
    fetch("/data/dictionary-topic-vocab.json").catch(() => null),
    loadCourseVocabulary(),
  ])
    .then(async ([baseResponse, topicResponse, courseData]) => {
      if (!baseResponse.ok) throw new Error("Không tải được từ điển đa ngôn ngữ.");
      const base = await baseResponse.json() as PackedEntry[];
      // The topic file is additive. Keep the established dictionary usable if
      // the optional PDF index has not been deployed yet.
      const topics = topicResponse?.ok
        ? await topicResponse.json().catch(() => []) as TopicVocabularyRow[]
        : [];
      const byHeadword = new Map(base.map((row) => [row[0], row]));
      for (const [hangul, vietnamese, topic, source] of topics) {
        const existing = byHeadword.get(hangul);
        if (existing) {
          const labels = new Set((existing[6] || "").split(" · ").filter(Boolean));
          if (topic) for (const label of topic.split(" · ")) labels.add(label);
          existing[6] = [...labels].join(" · ");
          continue;
        }
        const added: PackedEntry = [hangul, "", vietnamese || "", "", "", "", topic || "", source || "topic-pdf"];
        base.push(added);
        byHeadword.set(hangul, added);
      }
      for (const deck of courseData?.decks || []) {
        for (const course of deck.courses) {
          for (const unit of course.units) {
            for (const word of unit.words) {
              const [, hangul, vietnamese, romanization, hanja, pronunciation] = word;
              if (!hangul || !vietnamese) continue;
              const existing = byHeadword.get(hangul);
              const topicLabel = course.title;
              if (existing) {
                const currentMeanings = (existing[2] || "").split(/[;；]/).map((meaning) => normalizeDictionaryText(meaning)).filter(Boolean);
                if (!currentMeanings.includes(normalizeDictionaryText(vietnamese))) {
                  existing[2] = existing[2] ? `${existing[2]}; ${vietnamese}` : vietnamese;
                }
                if (!existing[5]) existing[5] = dictionaryLevelFromTopik(course.topik);
                const labels = new Set((existing[6] || "").split(" · ").filter(Boolean));
                if (labels.size < 5) labels.add(course.title);
                existing[6] = [...labels].join(" · ");
                const sources = new Set((existing[7] || "").split(",").filter(Boolean));
                sources.add("course-vocabulary");
                existing[7] = [...sources].join(",");
                existing[8] ||= romanization;
                existing[9] ||= hanja;
                existing[10] ||= pronunciation;
                existing[11] ||= course.topik;
                existing[12] ||= course.id;
                continue;
              }
              const added: PackedEntry = [
                hangul, "", vietnamese, "", "", dictionaryLevelFromTopik(course.topik),
                topicLabel, "course-vocabulary", romanization, hanja, pronunciation, course.topik, course.id,
              ];
              base.push(added);
              byHeadword.set(hangul, added);
            }
          }
        }
      }
      return base;
    })
    .catch((error) => { entriesPromise = null; throw error; });
  return entriesPromise;
}

export async function loadVietnameseVocabulary(): Promise<Array<{ hangul: string; vietnamese: string }>> {
  const rows = await loadEntries();
  return rows.filter((row) => Boolean(row[2])).map((row) => ({ hangul: row[0], vietnamese: row[2] }));
}

function normalize(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase().trim();
}

function yieldToBrowser(): Promise<void> { return new Promise((resolve) => window.setTimeout(resolve, 0)); }

async function loadIndexedEntries(language: SearchLanguage): Promise<DictionaryIndex> {
  // Keep one target-language index in memory at a time on mobile devices.
  for (const cachedLanguage of Object.keys(indexedEntriesPromises) as SearchLanguage[]) {
    if (cachedLanguage !== language) delete indexedEntriesPromises[cachedLanguage];
  }
  indexedEntriesPromises[language] ??= loadEntries().then(async (rows) => {
    const indexed: IndexedEntry[] = [];
    const tokenRows = new Map<string, IndexedEntry[]>();
    const romanizationRows = new Map<string, IndexedEntry[]>();
    const meaningColumn = language === "vi" ? 2 : language === "en" ? 1 : 3;
    // Build a reusable token index in short batches. Input is never blocked by a
    // full 155k-row scan on every keystroke.
    for (let start = 0; start < rows.length; start += 6000) {
      const end = Math.min(start + 6000, rows.length);
      for (let index = start; index < end; index++) {
        const row = rows[index];
        const rawMeaning = row[meaningColumn];
        const entry: IndexedEntry = {
          row,
          hangul: normalize(row[0]),
          romanization: normalize(romanizeKorean(row[0])),
          meaning: normalizeDictionaryText(rawMeaning),
          definitions: rawMeaning.split(/[;；/／|]/).map(normalizeDictionaryText).filter(Boolean),
          tokens: [],
        };
        entry.tokens = [...new Set([...entry.meaning.split(" "), ...entry.romanization.split(" ")].filter((token) => token.length > 1))];
        indexed.push(entry);
        const romanizationBucket = romanizationRows.get(entry.romanization);
        if (romanizationBucket) romanizationBucket.push(entry);
        else romanizationRows.set(entry.romanization, [entry]);
        for (const token of entry.tokens) {
          const bucket = tokenRows.get(token);
          if (bucket) bucket.push(entry);
          else tokenRows.set(token, [entry]);
        }
      }
      if (end < rows.length) await yieldToBrowser();
    }
    indexed.sort((a, b) => a.hangul < b.hangul ? -1 : a.hangul > b.hangul ? 1 : 0);
    return { rows: indexed, hangulKeys: indexed.map((entry) => entry.hangul), romanizationKeys: [...romanizationRows.keys()].sort(), romanizationRows, meaningTokens: [...tokenRows.keys()].sort(), tokenRows };
  }).catch((error) => { delete indexedEntriesPromises[language]; throw error; });
  return indexedEntriesPromises[language]!;
}

export type SearchLanguage = "vi" | "en" | "ja";
export type DictionaryLevel = "all" | "TOPIK 1" | "TOPIK 2" | "TOPIK 3" | "TOPIK 4" | "TOPIK 5" | "TOPIK 6";

/** Select the dictionary column from the input itself; no direction toggle needed. */
export function detectDictionarySearchLanguage(query: string, fallback: SearchLanguage = "vi"): SearchLanguage {
  if (HANGUL_CHAR.test(query)) return fallback;
  if (/[\u3040-\u30ff\u31f0-\u31ff\u4e00-\u9fff]/u.test(query)) return "ja";
  // Vietnamese-specific letters or tone-marked vowels identify Vietnamese input.
  if (/[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/u.test(query)) return "vi";
  return "en";
}

export function normalizeDictionaryText(value: string): string {
  // Preserve Vietnamese tone marks. Folding accents makes distinct queries
  // such as "yêu" (love) and "yếu" (weak) identical and returns wrong entries.
  return value.normalize("NFC").toLocaleLowerCase().replace(/[^a-z0-9\u00c0-\u024f\u1e00-\u1eff가-힣]+/g, " ").trim().replace(/\s+/g, " ");
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

export async function searchLearningDictionary(query: string, limit = 30, signal?: AbortSignal, language: SearchLanguage = "vi", level: DictionaryLevel = "all"): Promise<DictionaryEntry[]> {
  const q = normalizeDictionaryText(query);
  if (!q || (q.length < 2 && !HANGUL_CHAR.test(q))) return [];
  const index = await loadIndexedEntries(language);
  if (signal?.aborted) return [];
  const candidates = new Set<IndexedEntry>();
  const addPrefixMatches = (keys: string[], prefix: string, add: (key: string, position: number) => void) => {
    let low = 0;
    let high = keys.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (keys[middle] < prefix) low = middle + 1;
      else high = middle;
    }
    for (let cursor = low; cursor < keys.length && keys[cursor].startsWith(prefix); cursor += 1) add(keys[cursor], cursor);
  };
  // Hangul headword lookup: binary-search the sorted dictionary keys.
  addPrefixMatches(index.hangulKeys, q, (_key, position) => candidates.add(index.rows[position]));
  // Let learners find Korean entries by Revised Romanization too.
  addPrefixMatches(index.romanizationKeys, q, (key) => {
    for (const entry of index.romanizationRows.get(key) || []) candidates.add(entry);
  });
  // Meaning lookup: get only entries containing a matching first token; full
  // phrase and exact-definition relevance is scored below.
  const firstToken = q.split(" ")[0];
  addPrefixMatches(index.meaningTokens, firstToken, (token) => {
    for (const entry of index.tokenRows.get(token) || []) candidates.add(entry);
  });
  if (signal?.aborted) return [];
  const ranked: Array<{ score: number; entry: DictionaryEntry }> = [];
  for (const { row, hangul, romanization, meaning, definitions, tokens } of candidates) {
    if (level !== "all" && row[11] !== level) continue;
    const score = hangul === q ? 1400 : hangul.startsWith(q) ? 1200 : romanization === q ? 1100 : romanization.startsWith(q) ? 1000 : meaningScore(meaning, definitions, q);
    if (!score) continue;
    // Prefer a whole Vietnamese/English/Japanese meaning over an incidental
    // token occurrence (e.g. "yêu" should rank 사랑하다 above 동성애).
    const queryTokens = q.split(" ");
    const exactTokens = queryTokens.every((token) => tokens.includes(token));
    const lexicalBoost = queryTokens.length === 1 && exactTokens ? 60 : 0;
    const levelBoost = row[5] === "초급" ? 12 : 0;
    const entry = {
      hangul: row[0], english: row[1], vietnamese: row[2], japanese: row[3],
      partOfSpeech: row[4], level: row[5],
      source: (row[7]?.includes("course-vocabulary") ? "course-vocabulary" : row[7]?.includes("topic-pdf") || row[7]?.includes("user-pdf") ? "topic-pdf" : "nikl") as DictionaryEntry["source"],
      topic: row[6] || undefined,
      romanization,
      hanja: row[9] || undefined,
      pronunciation: row[10] || undefined,
      topik: row[11] || undefined,
      courseId: row[12] || undefined,
    };
    ranked.push({ score: score + lexicalBoost + levelBoost, entry });
  }
  ranked.sort((a, b) => b.score - a.score || a.entry.hangul.length - b.entry.hangul.length || a.entry.hangul.localeCompare(b.entry.hangul, "ko"));
  return ranked.slice(0, limit).map(({ entry }) => entry);
}

export async function browseLearningDictionary(level: DictionaryLevel, language: SearchLanguage, offset = 0, limit = 30): Promise<DictionaryEntry[]> {
  const rows = await loadEntries();
  const meaningColumn = language === "vi" ? 2 : language === "en" ? 1 : 3;
  const result: DictionaryEntry[] = [];
  let skipped = 0;
  for (const row of rows) {
    if (!row[meaningColumn] || (level !== "all" && row[11] !== level)) continue;
    if (skipped++ < offset) continue;
    result.push({
      hangul: row[0], english: row[1], vietnamese: row[2], japanese: row[3],
      partOfSpeech: row[4], level: row[5],
      source: row[7]?.includes("course-vocabulary") ? "course-vocabulary" : row[7]?.includes("topic-pdf") || row[7]?.includes("user-pdf") ? "topic-pdf" : "nikl",
      topic: row[6] || undefined,
      romanization: romanizeKorean(row[0]),
      hanja: row[9] || undefined,
      pronunciation: row[10] || undefined,
      topik: row[11] || undefined,
      courseId: row[12] || undefined,
    });
    if (result.length >= limit) break;
  }
  return result;
}

export const naverLookupUrl = (word: string) => `https://ko.dict.naver.com/#/search?query=${encodeURIComponent(word)}`;
