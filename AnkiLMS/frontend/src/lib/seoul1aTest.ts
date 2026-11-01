// Bài kiểm tra "đã qua 서울대 한국어 플러스 1A chưa?": 5 từ mỗi bài × 8 bài (01–08) = 40 câu.
// 40 câu cho sai số khoảng ±12% (95%); ngưỡng đạt 80% nên kết quả đủ tin để chọn "học tiếp" hay "ôn lại".
export type Seoul1ACard = { koreanText: string; vietnameseMeaning: string; tags?: string[] };
export type TestQuestion = { hangul: string; meaning: string; options: string[]; lesson: string };
export type LessonScore = { lesson: string; correct: number; total: number };
export type TestResult = {
  correct: number;
  total: number;
  verdict: "pass" | "almost" | "fail";
  lessons: LessonScore[];
  assessedAt: string;
};

export const QUESTIONS_PER_LESSON = 5;
export const PASS_RATIO = 0.8;
export const ALMOST_RATIO = 0.6;
export const RESULT_KEY = "haechivn_seoul1a_result";

const shuffle = <T,>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const lessonOf = (card: Seoul1ACard) => card.tags?.[2] || "";

// Chỉ lấy từ đơn, nghĩa ngắn và rõ (bỏ cụm "라면 네 개", chú thích ngữ pháp, nghĩa có ngoặc/số).
const isTestable = (card: Seoul1ACard) => {
  const ko = card.koreanText?.trim();
  const vi = card.vietnameseMeaning?.trim();
  return !!ko && !!vi && !/\s/.test(ko) && ko.length >= 2 && !/[A-Za-z0-9]/.test(ko)
    && vi.length <= 28 && !/[()/;,\d]|hậu tố|tiền tố/i.test(vi);
};

export function buildQuestions(cards: Seoul1ACard[]): TestQuestion[] {
  const pool = cards.filter(isTestable);
  const lessons = [...new Set(pool.map(lessonOf))].filter((l) => /^0[1-8]\./.test(l)).sort();
  const allMeanings = [...new Set(pool.map((c) => c.vietnameseMeaning.trim()))];
  const questions: TestQuestion[] = [];
  for (const lesson of lessons) {
    const inLesson = pool.filter((c) => lessonOf(c) === lesson);
    const seen = new Set<string>();
    for (const card of shuffle(inLesson)) {
      if (questions.filter((q) => q.lesson === lesson).length >= QUESTIONS_PER_LESSON) break;
      const meaning = card.vietnameseMeaning.trim();
      if (seen.has(meaning)) continue;
      seen.add(meaning);
      const near = shuffle(inLesson.map((c) => c.vietnameseMeaning.trim()).filter((m) => m !== meaning));
      const far = shuffle(allMeanings.filter((m) => m !== meaning));
      const distractors = [...new Set([...near, ...far])].slice(0, 3);
      questions.push({ hangul: card.koreanText.trim(), meaning, options: shuffle([meaning, ...distractors]), lesson });
    }
  }
  return questions;
}

/** answers[i] = chỉ số đáp án đã chọn, hoặc -1 nếu "Chưa biết". */
export function evaluate(questions: TestQuestion[], answers: number[]): TestResult {
  const lessonMap = new Map<string, LessonScore>();
  let correct = 0;
  questions.forEach((q, i) => {
    const row = lessonMap.get(q.lesson) || { lesson: q.lesson, correct: 0, total: 0 };
    row.total += 1;
    if (answers[i] >= 0 && q.options[answers[i]] === q.meaning) { row.correct += 1; correct += 1; }
    lessonMap.set(q.lesson, row);
  });
  const ratio = questions.length ? correct / questions.length : 0;
  return {
    correct,
    total: questions.length,
    verdict: ratio >= PASS_RATIO ? "pass" : ratio >= ALMOST_RATIO ? "almost" : "fail",
    lessons: [...lessonMap.values()],
    assessedAt: new Date().toISOString(),
  };
}

export function loadSavedResult(): TestResult | null {
  try {
    const raw = JSON.parse(localStorage.getItem(RESULT_KEY) || "null");
    return raw && typeof raw.correct === "number" && typeof raw.total === "number" ? raw as TestResult : null;
  } catch {
    return null;
  }
}

export function saveResult(result: TestResult) {
  try { localStorage.setItem(RESULT_KEY, JSON.stringify(result)); } catch { /* bỏ qua nếu bộ nhớ bị chặn */ }
}

// "03. 가게" -> "Bài 3 · 가게"
export const lessonLabel = (lesson: string) => {
  const m = lesson.match(/^0?(\d+)\.\s*(.+)$/);
  return m ? `Bài ${m[1]} · ${m[2]}` : lesson;
};
