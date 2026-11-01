// Bài kiểm tra vốn từ theo giáo trình (Seoul 1A, Tiếng Hàn Tổng Hợp 1...).
// Câu hỏi chia theo kích thước từng bài, làm 2 giai đoạn (nửa đầu rồi nửa sau) và dừng sớm khi kết quả đã rõ.
// Chấm điểm: đúng +1, sai −1/3, "Chưa biết" 0 → đoán mò không có lợi, người trung thực không bị thiệt.
export type TestCard = { koreanText: string; vietnameseMeaning: string; tags?: string[] };
// ko-vi: thấy từ Hàn, chọn nghĩa Việt (nhận biết). vi-ko: thấy nghĩa Việt, chọn từ Hàn (nhớ chủ động).
export type TestQuestion = { direction: "ko-vi" | "vi-ko"; prompt: string; answer: string; options: string[]; lesson: string };
export type TestResult = {
  correct: number;
  wrong: number;
  skipped: number;
  total: number; // số câu đã trả lời (có thể < 60 nếu dừng sớm)
  percent: number; // điểm đã trừ câu sai, 0–100
  verdict: "pass" | "almost" | "fail";
  reviewLessons: string[]; // bài có từ 2 câu sai/chưa biết trở lên
  assessedAt: string;
};

export type TestConfig = {
  total: number;
  minPerLesson: number;
  maxPerLesson: number;
  minLesson: number;
  maxLesson: number;
};
export const DEFAULT_CONFIG: TestConfig = { total: 60, minPerLesson: 5, maxPerLesson: 12, minLesson: 1, maxLesson: 8 };
export const EARLY_PASS = 0.93;
export const EARLY_FAIL = 0.55;
export const PASS_RATIO = 0.8;
export const ALMOST_RATIO = 0.7;
const ACTIVE_RATIO = 0.2; // ~12/60 câu Việt→Hàn

const BRANDS = new Set(["스타벅스", "에디야커피", "메가커피", "컴포즈커피", "이디야", "맥도날드", "롯데리아"]);

const shuffle = <T,>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const lessonOf = (card: TestCard) => card.tags?.[2] || "";
const lessonNo = (lesson: string) => Number(lesson.match(/^(\d+)\./)?.[1] ?? -1);
const isPredicate = (ko: string) => ko.endsWith("다");

// Từ đơn, nghĩa ngắn và rõ; bỏ từ vay mượn dễ đoán, tên riêng, thương hiệu, câu hỏi/ngữ pháp.
const isTestable = (card: TestCard) => {
  const ko = card.koreanText?.trim();
  const vi = card.vietnameseMeaning?.trim();
  if (!ko || !vi) return false;
  return !/\s/.test(ko) && ko.length >= 2 && !/[A-Za-z0-9]/.test(ko)
    && !BRANDS.has(ko) && !/[?요로]$/.test(ko)
    && vi.length <= 28 && !/[()/;,\d]|hậu tố|tiền tố/i.test(vi)
    && vi === vi.toLowerCase() // loại tên riêng (Nga, Hàn Quốc...)
    && !/^[a-z]{4,}$/i.test(vi); // loại phiên âm giống hệt (email, yoga...)
};

// Phân số câu theo kích thước pool, mỗi bài tối thiểu 5, tối đa 12, tổng đúng total.
function allocate(sizes: number[], total: number, minPer: number, maxPer: number): number[] {
  const sum = sizes.reduce((a, b) => a + b, 0) || 1;
  const quota = sizes.map((s) => Math.min(s, Math.max(minPer, Math.min(maxPer, Math.round((s / sum) * total)))));
  const cap = (i: number) => Math.min(sizes[i], maxPer);
  let diff = total - quota.reduce((a, b) => a + b, 0);
  for (let guard = 0; diff !== 0 && guard < 500; guard++) {
    const order = sizes.map((_, i) => i).sort((a, b) => (diff > 0 ? sizes[b] - sizes[a] : sizes[a] - sizes[b]));
    const i = order.find((k) => (diff > 0 ? quota[k] < cap(k) : quota[k] > Math.min(sizes[k], minPer)));
    if (i === undefined) break;
    quota[i] += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
  }
  return quota;
}

export function buildQuestions(cards: TestCard[], config: TestConfig = DEFAULT_CONFIG): TestQuestion[] {
  // Từ Hàn xuất hiện ở nhiều thẻ thì bỏ (khó gắn đúng một bài, nghĩa có thể mơ hồ).
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c.koreanText?.trim(), (counts.get(c.koreanText?.trim()) || 0) + 1);
  const pool = cards.filter((c) => isTestable(c) && counts.get(c.koreanText.trim()) === 1 && lessonNo(lessonOf(c)) >= config.minLesson && lessonNo(lessonOf(c)) <= config.maxLesson);
  const lessons = [...new Set(pool.map(lessonOf))].sort();
  const byLesson = new Map(lessons.map((l) => [l, pool.filter((c) => lessonOf(c) === l)]));
  const quota = allocate(lessons.map((l) => byLesson.get(l)!.length), config.total, config.minPerLesson, config.maxPerLesson);

  // Meaning xuất hiện ở nhiều thẻ thì không dùng cho câu Việt→Hàn (có nhiều đáp án đúng).
  const meaningCounts = new Map<string, number>();
  for (const c of cards) meaningCounts.set(c.vietnameseMeaning?.trim().toLowerCase(), (meaningCounts.get(c.vietnameseMeaning?.trim().toLowerCase()) || 0) + 1);

  // Chọn 3 đáp án nhiễu cùng từ loại, ưu tiên cùng bài rồi bài kề, độ dài gần nhau, không là chuỗi con của nhau.
  const distractorsFor = (card: TestCard, lesson: string, direction: TestQuestion["direction"]): string[] => {
    const text = (c: TestCard) => (direction === "ko-vi" ? c.vietnameseMeaning.trim() : c.koreanText.trim());
    const answer = text(card);
    const pred = isPredicate(card.koreanText.trim());
    const idx = lessons.indexOf(lesson);
    const lower = answer.toLowerCase();
    const bad = (m: string) => m === answer || m.toLowerCase().includes(lower) || lower.includes(m.toLowerCase());
    const ranked = (maxDist: number, tol: number) =>
      shuffle(pool.filter((c) => {
        const m = text(c);
        const tolerance = direction === "ko-vi" ? Math.max(3, answer.length * tol) : 2;
        return isPredicate(c.koreanText.trim()) === pred
          && Math.abs(lessons.indexOf(lessonOf(c)) - idx) <= maxDist
          && Math.abs(m.length - answer.length) <= tolerance
          && c.vietnameseMeaning.trim() !== card.vietnameseMeaning.trim()
          && !bad(m);
      }).map(text));
    const picked: string[] = [];
    for (const [maxDist, tol] of [[0, 0.4], [1, 0.4], [8, 0.4], [8, 1]] as const) {
      for (const m of ranked(maxDist, tol)) {
        if (picked.length === 3) break;
        if (!picked.includes(m) && !picked.some((p) => p.includes(m) || m.includes(p))) picked.push(m);
      }
      if (picked.length === 3) break;
    }
    return picked;
  };

  const perLesson = lessons.map((lesson, li) => {
    const made: TestQuestion[] = [];
    const usedMeanings = new Set<string>();
    const wantActive = Math.round(quota[li] * ACTIVE_RATIO);
    for (const card of shuffle(byLesson.get(lesson)!)) {
      if (made.length >= quota[li]) break;
      const meaning = card.vietnameseMeaning.trim();
      if (usedMeanings.has(meaning)) continue;
      const activeSoFar = made.filter((q) => q.direction === "vi-ko").length;
      const canActive = meaningCounts.get(meaning.toLowerCase()) === 1;
      const direction: TestQuestion["direction"] = activeSoFar < wantActive && canActive ? "vi-ko" : "ko-vi";
      const distractors = distractorsFor(card, lesson, direction);
      if (distractors.length < 3) continue;
      usedMeanings.add(meaning);
      const prompt = direction === "ko-vi" ? card.koreanText.trim() : meaning;
      const answer = direction === "ko-vi" ? meaning : card.koreanText.trim();
      made.push({ direction, prompt, answer, options: shuffle([answer, ...distractors]), lesson });
    }
    return made;
  });
  // Giai đoạn 1 đúng STAGE_ONE câu, lấy luân phiên giữa các bài để phủ đều.
  const stageOne = Math.round(config.total / 2);
  const first: TestQuestion[] = [];
  const second: TestQuestion[] = [];
  const cursors = perLesson.map(() => 0);
  for (let round = 0; first.length < stageOne; round++) {
    let took = false;
    perLesson.forEach((made, i) => {
      if (first.length < stageOne && cursors[i] < made.length) { first.push(made[cursors[i]++]); took = true; }
    });
    if (!took) break;
  }
  perLesson.forEach((made, i) => second.push(...made.slice(cursors[i])));
  return [...shuffle(first), ...shuffle(second)];
}

/** answers[i] = chỉ số đáp án đã chọn, hoặc -1 nếu "Chưa biết". Chỉ chấm các câu đã trả lời. */
export function evaluate(questions: TestQuestion[], answers: number[]): TestResult {
  let correct = 0, wrong = 0, skipped = 0;
  const mistakes = new Map<string, number>();
  answers.forEach((choice, i) => {
    const q = questions[i];
    if (choice < 0) { skipped += 1; mistakes.set(q.lesson, (mistakes.get(q.lesson) || 0) + 1); }
    else if (q.options[choice] === q.answer) correct += 1;
    else { wrong += 1; mistakes.set(q.lesson, (mistakes.get(q.lesson) || 0) + 1); }
  });
  const total = answers.length;
  const ratio = total ? Math.max(0, correct - wrong / 3) / total : 0;
  return {
    correct, wrong, skipped, total,
    percent: Math.round(ratio * 100),
    verdict: ratio >= PASS_RATIO ? "pass" : ratio >= ALMOST_RATIO ? "almost" : "fail",
    reviewLessons: [...mistakes].filter(([, n]) => n >= 2).map(([l]) => l).sort(),
    assessedAt: new Date().toISOString(),
  };
}

/** Sau giai đoạn 1: dừng sớm khi kết quả đã rõ (rất tốt hoặc rất yếu). */
export function shouldStopEarly(questions: TestQuestion[], answers: number[], total: number): boolean {
  if (answers.length !== Math.round(total / 2)) return false;
  const r = evaluate(questions, answers);
  return r.percent / 100 >= EARLY_PASS || r.percent / 100 <= EARLY_FAIL;
}

export function loadSavedResult(resultKey: string): TestResult | null {
  try {
    const raw = JSON.parse(localStorage.getItem(resultKey) || "null");
    return raw && typeof raw.percent === "number" && typeof raw.total === "number" ? raw as TestResult : null;
  } catch {
    return null;
  }
}

export function saveResult(resultKey: string, result: TestResult) {
  try { localStorage.setItem(resultKey, JSON.stringify(result)); } catch { /* bỏ qua nếu bộ nhớ bị chặn */ }
}

// "03. 가게" -> "Bài 3: 가게"
export const lessonLabel = (lesson: string) => {
  const m = lesson.match(/^0?(\d+)\.\s*(.+)$/);
  return m ? `Bài ${m[1]}: ${m[2]}` : lesson;
};
