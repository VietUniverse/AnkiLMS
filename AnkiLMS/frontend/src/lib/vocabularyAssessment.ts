import { courseVocabularyToExploreDecks, type CourseVocabularyData } from "./courseVocabulary";
import type { CuratedDeckItem } from "../data/curatedDecks";

export type PlacementGoal = "conversation" | "topik" | "kiip" | "study-abroad" | "culture";
export type SkillRatings = { reading: number; listening: number; speaking: number; grammar: number };
export type PlacementProfile = {
  goal: PlacementGoal;
  skill: string;
  weeklyMinutes: number;
  horizon: string;
  skills: SkillRatings;
};
export type PlacementWord = { hangul: string; meaning: string; level: number };
export type PlacementQuestion = PlacementWord & { options: string[] };
export type LevelAssessment = { level: number; correct: number; total: number; population: number; estimate: number; accuracy: number };
export type PlacementResult = {
  profile: PlacementProfile;
  assessedAt: string;
  levelScores: LevelAssessment[];
  estimatedKnown: number;
  confidenceLow: number;
  confidenceHigh: number;
  startLevel: number;
  provenLevel: number;
  recommendedDeckIds: string[];
};

type PackedWord = [number, string, string, string, string, string, string?];
type CourseVocabularyFile = { decks?: Array<{ courses?: Array<{ topik: string; units?: Array<{ words?: PackedWord[] }> }> }> };
let courseDataPromise: Promise<CourseVocabularyFile> | null = null;

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function normalizeMeaning(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export async function loadPlacementCourseData(): Promise<CourseVocabularyFile> {
  courseDataPromise ??= fetch("/data/course-vocabulary.json")
    .then(async (response) => {
      if (!response.ok) throw new Error("Không tải được kho từ vựng để tạo bài kiểm tra.");
      return await response.json() as CourseVocabularyFile;
    })
    .catch((error) => { courseDataPromise = null; throw error; });
  return courseDataPromise;
}

export async function makePlacementQuestions(samplePerLevel = 10): Promise<{ questions: PlacementQuestion[]; population: Record<number, number>; courseData: CourseVocabularyData }> {
  const data = await loadPlacementCourseData();
  const uniqueWords = new Map<string, PlacementWord>();
  for (const group of data.decks || []) {
    for (const course of group.courses || []) {
      const courseLevel = Number(course.topik.match(/\d+/)?.[0] || 0);
      for (const unit of course.units || []) for (const packed of unit.words || []) {
        const [, rawHangul, rawMeaning, , , , rawLevel] = packed;
        const hangul = (rawHangul || "").normalize("NFC").trim();
        const meaning = (rawMeaning || "").trim();
        const level = Number((rawLevel || course.topik).match(/\d+/)?.[0] || courseLevel);
        if (!hangul || !meaning || level < 1 || level > 6 || !/[\uac00-\ud7a3]/u.test(hangul)) continue;
        const existing = uniqueWords.get(hangul);
        // A headword repeated across books belongs to its earliest TOPIK band.
        if (!existing || level < existing.level) uniqueWords.set(hangul, { hangul, meaning, level });
      }
    }
  }

  const words = [...uniqueWords.values()];
  const population = Object.fromEntries([1, 2, 3, 4, 5, 6].map((level) => [level, words.filter((word) => word.level === level).length]));
  const questions: PlacementQuestion[] = [];
  for (let level = 1; level <= 6; level += 1) {
    const candidates = shuffle(words.filter((word) => word.level === level));
    const selected: PlacementWord[] = [];
    const seenMeaning = new Set<string>();
    for (const word of candidates) {
      const key = normalizeMeaning(word.meaning);
      if (!key || seenMeaning.has(key)) continue;
      selected.push(word);
      seenMeaning.add(key);
      if (selected.length === samplePerLevel) break;
    }
    if (selected.length < samplePerLevel) throw new Error(`Chưa đủ từ TOPIK ${level} để tạo bài kiểm tra.`);

    for (const answer of selected) {
      const used = new Set([normalizeMeaning(answer.meaning)]);
      const choices: string[] = [];
      for (const distractor of shuffle(words)) {
        const normalized = normalizeMeaning(distractor.meaning);
        if (distractor.hangul === answer.hangul || !normalized || used.has(normalized)) continue;
        choices.push(distractor.meaning);
        used.add(normalized);
        if (choices.length === 3) break;
      }
      if (choices.length === 3) questions.push({ ...answer, options: shuffle([answer.meaning, ...choices]) });
    }
  }
  const courseData = data as CourseVocabularyData;
  return { questions, population, courseData };
}

function wilsonInterval(correct: number, total: number): [number, number] {
  if (!total) return [0, 1];
  const z = 1.96;
  const p = correct / total;
  const denominator = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total) / denominator;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export function createPlacementResult(
  profile: PlacementProfile,
  questions: PlacementQuestion[],
  scores: boolean[],
  population: Record<number, number>,
  availableDecks: CuratedDeckItem[],
): PlacementResult {
  const levelScores: LevelAssessment[] = [1, 2, 3, 4, 5, 6].map((level) => {
    const indices = questions.map((question, index) => question.level === level ? index : -1).filter((index) => index >= 0);
    const correct = indices.filter((index) => scores[index]).length;
    const total = indices.length;
    const accuracy = total ? correct / total : 0;
    return { level, correct, total, population: population[level] || 0, estimate: Math.round((population[level] || 0) * accuracy), accuracy };
  });
  let provenLevel = 0;
  for (const row of levelScores) {
    if (row.accuracy >= 0.7) provenLevel = row.level;
    else break;
  }
  const startLevel = Math.min(6, provenLevel + 1);
  const estimatedKnown = levelScores.reduce((sum, row) => sum + row.estimate, 0);
  const [lowFactors, highFactors] = levelScores.reduce<[number, number]>(([low, high], row) => {
    const [l, h] = wilsonInterval(row.correct, row.total);
    return [low + row.population * l, high + row.population * h];
  }, [0, 0]);
  const available = new Map(availableDecks.map((deck) => [deck.id, deck]));
  const recommendations: string[] = [];
  const add = (id: string | undefined) => { if (id && available.has(id) && !recommendations.includes(id)) recommendations.push(id); };

  // A learner starts at the first level that is not yet consistently recognized.
  const levelDeck: Record<number, string[]> = {
    1: ["course-1100", "curriculum-sejong"],
    2: ["course-1200", "curriculum-sejong"],
    3: ["course-1300", "curriculum-sejong"],
    4: ["course-1400", "curriculum-sejong"],
    5: ["course-1500", "curriculum-sejong"],
    6: ["course-1600", "curriculum-sejong"],
  };
  for (const id of levelDeck[startLevel] || []) add(id);
  if (profile.goal === "kiip") add("curriculum-kiip");
  if (profile.goal === "conversation") add("course-2600");
  if (profile.goal === "topik") add(startLevel <= 2 ? "course-1700" : startLevel <= 4 ? "course-1800" : "course-1900");
  if (profile.goal === "study-abroad") add("curriculum-sejong");
  if (profile.goal === "culture") add("course-topic-vocabulary");
  if (recommendations.length < 3) add(startLevel <= 2 ? "curriculum-sejong" : "course-topic-vocabulary");
  if (recommendations.length < 3 && profile.goal !== "kiip") add("curriculum-kiip");

  return {
    profile,
    assessedAt: new Date().toISOString(),
    levelScores,
    estimatedKnown,
    confidenceLow: Math.round(lowFactors),
    confidenceHigh: Math.round(highFactors),
    startLevel,
    provenLevel,
    recommendedDeckIds: recommendations.slice(0, 4),
  };
}

export function getRecommendedDecks(result: PlacementResult, data: CourseVocabularyData): CuratedDeckItem[] {
  const decks = courseVocabularyToExploreDecks(data);
  return result.recommendedDeckIds.map((id) => decks.find((deck) => deck.id === id)).filter((deck): deck is CuratedDeckItem => Boolean(deck));
}
