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
type IndexedEntry = { row: PackedEntry; hangul: string; meanings: [string, string, string] };
let indexedEntriesPromise: Promise<IndexedEntry[]> | null = null;

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

async function loadIndexedEntries(): Promise<IndexedEntry[]> {
  indexedEntriesPromise ??= loadEntries().then(async (rows) => {
    const indexed: IndexedEntry[] = [];
    // Prepare searchable text in short batches so first use does not lock typing.
    for (let start = 0; start < rows.length; start += 6000) {
      const end = Math.min(start + 6000, rows.length);
      for (let index = start; index < end; index++) {
        const row = rows[index];
        indexed.push({ row, hangul: normalize(row[0]), meanings: [normalize(row[1]), normalize(row[2]), normalize(row[3])] });
      }
      if (end < rows.length) await yieldToBrowser();
    }
    return indexed;
  }).catch((error) => { indexedEntriesPromise = null; throw error; });
  return indexedEntriesPromise;
}

export async function searchLearningDictionary(query: string, limit = 30, signal?: AbortSignal): Promise<DictionaryEntry[]> {
  const q = normalize(query);
  if (!q) return [];
  const rows = await loadIndexedEntries();
  if (signal?.aborted) return [];
  const koreanExact: DictionaryEntry[] = [];
  const koreanPrefix: DictionaryEntry[] = [];
  const meaningExact: DictionaryEntry[] = [];
  const meaningPrefix: DictionaryEntry[] = [];
  const meaningContains: DictionaryEntry[] = [];
  for (let start = 0; start < rows.length; start += 6000) {
    const end = Math.min(start + 6000, rows.length);
    for (let index = start; index < end; index++) {
      const { row, hangul, meanings } = rows[index];
      const match = hangul === q ? koreanExact : hangul.startsWith(q) ? koreanPrefix
        : meanings.some((meaning) => meaning === q) ? meaningExact
        : meanings.some((meaning) => meaning.startsWith(q)) ? meaningPrefix
        : meanings.some((meaning) => meaning.includes(q)) ? meaningContains : null;
      if (!match || match.length >= limit) continue;
      match.push({ hangul: row[0], english: row[1], vietnamese: row[2], japanese: row[3], partOfSpeech: row[4], level: row[5], source: row[1] || row[2] || row[3] ? "nikl" : "yomichan" });
    }
    if (signal?.aborted) return [];
    if (end < rows.length) await yieldToBrowser();
  }
  return [...koreanExact, ...koreanPrefix, ...meaningExact, ...meaningPrefix, ...meaningContains].slice(0, limit);
}

export const naverLookupUrl = (word: string) => `https://ko.dict.naver.com/#/search?query=${encodeURIComponent(word)}`;
