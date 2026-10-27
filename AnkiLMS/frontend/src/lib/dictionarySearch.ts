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

function normalize(value: string): string { return value.normalize("NFC").trim().toLocaleLowerCase(); }

export async function searchLearningDictionary(query: string, limit = 30): Promise<DictionaryEntry[]> {
  const q = normalize(query);
  if (!q) return [];
  const rows = await loadEntries();
  const exact: DictionaryEntry[] = [];
  const prefix: DictionaryEntry[] = [];
  const other: DictionaryEntry[] = [];
  for (const row of rows) {
    const word = normalize(row[0]);
    const match = word === q ? exact : word.startsWith(q) ? prefix
      : [row[1], row[2], row[3]].some((meaning) => normalize(meaning).includes(q)) ? other : null;
    if (!match) continue;
    match.push({ hangul: row[0], english: row[1], vietnamese: row[2], japanese: row[3], partOfSpeech: row[4], level: row[5], source: row[1] || row[2] || row[3] ? "nikl" : "yomichan" });
  }
  return [...exact, ...prefix, ...other].slice(0, limit);
}

export const naverLookupUrl = (word: string) => `https://ko.dict.naver.com/#/search?query=${encodeURIComponent(word)}`;
