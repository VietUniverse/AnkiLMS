import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (name) => JSON.parse(await readFile(path.join(root, "public", "data", name), "utf8"));

const [dictionary, topicRows, courseData, seoulDeck] = await Promise.all([
  readJson("dictionary-ko-multi.json"),
  readJson("dictionary-topic-vocab.json").catch(() => []),
  readJson("course-vocabulary.json"),
  readJson("seoul-1a.json").catch(() => ({ cards: [] })),
]);

const uniqueWords = new Map(dictionary.map((row) => [row[0], {
  vietnamese: Boolean(row[2]), english: Boolean(row[1]), japanese: Boolean(row[3]),
}]));
for (const row of topicRows) {
  const [hangul, vietnamese] = row;
  if (!hangul) continue;
  const existing = uniqueWords.get(hangul);
  if (existing) existing.vietnamese ||= Boolean(vietnamese);
  else uniqueWords.set(hangul, { vietnamese: Boolean(vietnamese), english: false, japanese: false });
}

const levelCounts = Object.fromEntries([1, 2, 3, 4, 5, 6].map((level) => [`TOPIK ${level}`, new Set()]));
const courseWords = new Set();
let courseEntries = 0;
const topicCourseWords = new Set();
for (const group of courseData.decks || []) {
  for (const course of group.courses || []) {
    for (const unit of course.units || []) {
      for (const word of unit.words || []) {
        const [, hangul, vietnamese, , , , explicitTopik] = word;
        if (!hangul || !vietnamese) continue;
        courseEntries += 1;
        courseWords.add(hangul);
        if (course.id === "topic-vocabulary") topicCourseWords.add(hangul);
        const match = (explicitTopik || course.topik || "").match(/(?:TOPIK\s*)?(\d)/i);
        if (match && levelCounts[`TOPIK ${match[1]}`]) levelCounts[`TOPIK ${match[1]}`].add(hangul);
        const existing = uniqueWords.get(hangul);
        if (existing) existing.vietnamese ||= Boolean(vietnamese);
        else uniqueWords.set(hangul, { vietnamese: true, english: false, japanese: false });
      }
    }
  }
}

const countWith = (key) => [...uniqueWords.values()].filter((entry) => entry[key]).length;
const summary = {
  generatedAt: new Date().toISOString(),
  dictionaryUnique: uniqueWords.size,
  translations: {
    vietnamese: countWith("vietnamese"),
    english: countWith("english"),
    japanese: countWith("japanese"),
  },
  courseEntries,
  courseUnique: courseWords.size,
  topicCourseUnique: topicCourseWords.size,
  topicIndexUnique: new Set(topicRows.map((row) => row[0]).filter(Boolean)).size,
  seoul1ACards: Array.isArray(seoulDeck.cards) ? seoulDeck.cards.length : 0,
  levels: Object.fromEntries(Object.entries(levelCounts).map(([level, words]) => [level, words.size])),
};

await writeFile(path.join(root, "public", "data", "vocabulary-stats.json"), `${JSON.stringify(summary)}\n`, "utf8");
console.log(`Generated admin vocabulary summary for ${summary.dictionaryUnique.toLocaleString("en-US")} unique Korean forms.`);
