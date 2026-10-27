export type DictionaryEntry = {
  hangul: string;
  english: string;
  vietnamese: string;
  partOfSpeech: string;
  level: string;
  source: "nikl" | "yomichan";
};

type PackedEntry = [string, string, string, string, string];

let entriesPromise: Promise<PackedEntry[]> | null = null;
let formsPromise: Promise<string[]> | null = null;

async function loadEntries(): Promise<PackedEntry[]> {
  entriesPromise ??= fetch("/data/nikl-ko-en-vi.json")
    .then((response) => {
      if (!response.ok) throw new Error("Không tải được từ điển NIKL.");
      return response.json() as Promise<PackedEntry[]>;
    })
    .catch((error) => {
      entriesPromise = null;
      throw error;
    });
  return entriesPromise;
}

export async function loadVietnameseVocabulary(): Promise<Array<{ hangul: string; vietnamese: string }>> {
  const rows = await loadEntries();
  return rows.filter((row) => Boolean(row[2])).map((row) => ({ hangul: row[0], vietnamese: row[2] }));
}

async function loadForms(): Promise<string[]> {
  formsPromise ??= fetch("/data/yomichan-headwords.json")
    .then((response) => {
      if (!response.ok) throw new Error("Không tải được chỉ mục biến thể.");
      return response.json() as Promise<string[]>;
    })
    .catch((error) => {
      formsPromise = null;
      throw error;
    });
  return formsPromise;
}

function normalize(value: string): string {
  return value.normalize("NFC").trim().toLocaleLowerCase();
}

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
      : word.includes(q) || normalize(row[2]).includes(q) || normalize(row[1]).includes(q) ? other : null;
    if (!match) continue;
    match.push({
      hangul: row[0],
      english: row[1],
      vietnamese: row[2],
      partOfSpeech: row[3],
      level: row[4],
      source: "nikl",
    });
  }
  const found = [...exact, ...prefix, ...other].slice(0, limit);
  if (found.length || !/[가-힣]/u.test(q)) return found;

  // The Yomichan archive contributes only headwords. Its Japanese/Naver
  // definitions are not included because the archive has no reuse license.
  const forms = await loadForms();
  return forms.filter((word) => normalize(word).includes(q)).slice(0, limit).map((word) => ({
    hangul: word,
    english: "",
    vietnamese: "",
    partOfSpeech: "",
    level: "",
    source: "yomichan" as const,
  }));
}

export const naverLookupUrl = (word: string) =>
  `https://ko.dict.naver.com/#/search?query=${encodeURIComponent(word)}`;
