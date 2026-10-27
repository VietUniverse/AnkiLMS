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

export async function searchLearningDictionary(query: string, limit = 30): Promise<DictionaryEntry[]> {
  const q = normalize(query);
  if (!q) return [];
  const rows = await loadEntries();
  const koreanExact: DictionaryEntry[] = [];
  const koreanPrefix: DictionaryEntry[] = [];
  const meaningExact: DictionaryEntry[] = [];
  const meaningPrefix: DictionaryEntry[] = [];
  const meaningContains: DictionaryEntry[] = [];
  for (const row of rows) {
    const word = normalize(row[0]);
    const meanings = [row[1], row[2], row[3]].map(normalize);
    const match = word === q ? koreanExact : word.startsWith(q) ? koreanPrefix
      : meanings.some((meaning) => meaning === q) ? meaningExact
      : meanings.some((meaning) => meaning.startsWith(q)) ? meaningPrefix
      : meanings.some((meaning) => meaning.includes(q)) ? meaningContains : null;
    if (!match) continue;
    match.push({ hangul: row[0], english: row[1], vietnamese: row[2], japanese: row[3], partOfSpeech: row[4], level: row[5], source: row[1] || row[2] || row[3] ? "nikl" : "yomichan" });
  }
  return [...koreanExact, ...koreanPrefix, ...meaningExact, ...meaningPrefix, ...meaningContains].slice(0, limit);
}

export const naverLookupUrl = (word: string) => `https://ko.dict.naver.com/#/search?query=${encodeURIComponent(word)}`;
