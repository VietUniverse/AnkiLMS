"use client";

import { useState } from "react";
import { ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";

type SizeWord = { hangul: string; meaning: string; level: number };
type SizeQuestion = SizeWord & { options: string[] };
type PackedWord = [number, string, string, string, string, string, string?];
type CourseData = { decks?: Array<{ courses?: Array<{ topik: string; units?: Array<{ words?: PackedWord[] }> }> }> };
type TestState = "intro" | "loading" | "quiz" | "result" | "error";

const SAMPLE_PER_LEVEL = 8;
const LEVELS = [1, 2, 3, 4, 5, 6];
let courseDataPromise: Promise<CourseData> | null = null;

function randomize<T>(items: T[]): T[] {
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

async function loadCourseData(): Promise<CourseData> {
  courseDataPromise ??= fetch("/data/course-vocabulary.json")
    .then(async (response) => {
      if (!response.ok) throw new Error("Không tải được kho từ vựng để tạo bài kiểm tra.");
      return await response.json() as CourseData;
    })
    .catch((error) => {
      courseDataPromise = null;
      throw error;
    });
  return courseDataPromise;
}

async function makeQuestions(): Promise<{ questions: SizeQuestion[]; poolSizes: Record<number, number> }> {
  const data = await loadCourseData();
  const uniqueWords = new Map<string, SizeWord>();
  for (const group of data.decks || []) {
    for (const course of group.courses || []) {
      const courseLevel = Number(course.topik.match(/\d+/)?.[0] || 0);
      for (const unit of course.units || []) {
        for (const packed of unit.words || []) {
          const [, rawHangul, rawMeaning, , , , rawLevel] = packed;
          const hangul = (rawHangul || "").normalize("NFC").trim();
          const meaning = (rawMeaning || "").trim();
          const level = Number((rawLevel || course.topik).match(/\d+/)?.[0] || courseLevel);
          if (!hangul || !meaning || level < 1 || level > 6 || !/[\uac00-\ud7a3]/u.test(hangul)) continue;
          const existing = uniqueWords.get(hangul);
          if (!existing || level < existing.level || (!existing.meaning && meaning)) uniqueWords.set(hangul, { hangul, meaning, level });
        }
      }
    }
  }

  const pools = new Map<number, SizeWord[]>(LEVELS.map((level) => [level, []]));
  for (const word of uniqueWords.values()) pools.get(word.level)?.push(word);
  const poolSizes = Object.fromEntries(LEVELS.map((level) => [level, pools.get(level)?.length || 0]));
  const allWords = [...uniqueWords.values()];
  const questions: SizeQuestion[] = [];

  for (const level of LEVELS) {
    const pool = pools.get(level) || [];
    const chosen: SizeWord[] = [];
    const seenMeanings = new Set<string>();
    for (const word of randomize(pool)) {
      const normalized = normalizeMeaning(word.meaning);
      if (!normalized || seenMeanings.has(normalized)) continue;
      chosen.push(word);
      seenMeanings.add(normalized);
      if (chosen.length === SAMPLE_PER_LEVEL) break;
    }
    if (chosen.length < SAMPLE_PER_LEVEL) throw new Error(`Chưa đủ từ TOPIK ${level} để tạo bài kiểm tra.`);

    for (const answer of chosen) {
      const answerMeaning = normalizeMeaning(answer.meaning);
      const distractors: string[] = [];
      const usedMeanings = new Set([answerMeaning]);
      for (const word of randomize(allWords)) {
        const meaningKey = normalizeMeaning(word.meaning);
        if (word.hangul === answer.hangul || !meaningKey || usedMeanings.has(meaningKey)) continue;
        distractors.push(word.meaning);
        usedMeanings.add(meaningKey);
        if (distractors.length === 3) break;
      }
      if (distractors.length < 3) continue;
      questions.push({ ...answer, options: randomize([answer.meaning, ...distractors]) });
    }
  }

  return { questions, poolSizes };
}

function wilsonInterval(correct: number, total: number): [number, number] {
  if (total === 0) return [0, 1];
  const z = 1.96;
  const p = correct / total;
  const denominator = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total) / denominator;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export function VocabularySizeTest() {
  const [state, setState] = useState<TestState>("intro");
  const [questions, setQuestions] = useState<SizeQuestion[]>([]);
  const [poolSizes, setPoolSizes] = useState<Record<number, number>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [scores, setScores] = useState<boolean[]>([]);
  const [error, setError] = useState("");

  const startTest = async () => {
    setState("loading");
    setError("");
    try {
      const result = await makeQuestions();
      setQuestions(result.questions);
      setPoolSizes(result.poolSizes);
      setQuestionIndex(0);
      setScores([]);
      setAnswer(null);
      setState("quiz");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo bài kiểm tra.");
      setState("error");
    }
  };

  const current = questions[questionIndex];
  const scoreByLevel = LEVELS.map((level) => {
    const indices = questions.map((question, index) => question.level === level ? index : -1).filter((index) => index >= 0);
    const correct = indices.filter((index) => scores[index]).length;
    return { level, correct, total: indices.length, size: poolSizes[level] || 0 };
  });
  const estimate = scoreByLevel.reduce((sum, row) => sum + (row.total ? row.size * row.correct / row.total : 0), 0);
  const interval = scoreByLevel.reduce<[number, number]>((range, row) => {
    const [low, high] = wilsonInterval(row.correct, row.total);
    range[0] += row.size * low;
    range[1] += row.size * high;
    return range;
  }, [0, 0]);

  const chooseAnswer = (optionIndex: number) => {
    if (answer !== null || !current) return;
    setAnswer(optionIndex);
    setScores((previous) => [...previous, optionIndex >= 0 && current.options[optionIndex] === current.meaning]);
  };

  const nextQuestion = () => {
    if (questionIndex + 1 >= questions.length) {
      setState("result");
      return;
    }
    setQuestionIndex((previous) => previous + 1);
    setAnswer(null);
  };

  return (
    <section className="rounded-2xl border border-sky-500/25 bg-sky-50/70 p-4 dark:bg-sky-950/25 sm:p-5" aria-label="Kiểm tra cỡ vốn từ tiếng Hàn">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Kiểm tra cỡ vốn từ tiếng Hàn</span>
          </div>
          <p className="mt-1 text-sm font-bold text-stone-900 dark:text-white">Ước tính vốn từ theo 6 cấp TOPIK</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-300">48 câu trắc nghiệm ngắn · 8 từ mỗi cấp · khoảng 4–6 phút. Câu hỏi lấy ngẫu nhiên từ kho giáo trình HaechiVN.</p>
        </div>
        {state === "intro" || state === "error" ? (
          <button type="button" onClick={() => void startTest()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-sky-500">
            Bắt đầu kiểm tra <ArrowRight className="h-4 w-4" />
          </button>
        ) : state === "loading" ? (
          <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">Đang lấy mẫu từ vựng…</span>
        ) : state === "result" ? (
          <button type="button" onClick={() => void startTest()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-500/40 px-4 py-2.5 text-xs font-bold text-sky-700 dark:text-sky-300 transition hover:bg-sky-500/10">
            <RotateCcw className="h-4 w-4" /> Làm bài mới
          </button>
        ) : null}
      </div>

      {state === "error" && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-300">{error}</p>}

      {state === "quiz" && current && (
        <div className="mt-5 border-t border-sky-500/15 pt-4">
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-stone-500 dark:text-stone-400">
            <span>Câu {questionIndex + 1}/{questions.length} · TOPIK {current.level}</span>
            <span>{Math.round((questionIndex / questions.length) * 100)}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-950/10 dark:bg-slate-800">
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
          </div>
          <h3 className="mt-5 text-center text-3xl font-black text-stone-900 dark:text-white" lang="ko">{current.hangul}</h3>
          <p className="mt-1 text-center text-xs text-stone-500 dark:text-stone-400">Chọn nghĩa tiếng Việt phù hợp nhất</p>
          <div className="mx-auto mt-4 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
            {current.options.map((option, index) => {
              const isCorrect = option === current.meaning;
              const isSelected = answer === index;
              const style = answer === null
                ? "border-stone-200 bg-white text-stone-800 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                : isCorrect
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                  : isSelected
                    ? "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                    : "border-stone-200 bg-white/60 text-stone-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400";
              return <button key={`${index}-${option}`} type="button" disabled={answer !== null} onClick={() => chooseAnswer(index)} className={`min-h-12 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition disabled:cursor-default ${style}`}>{answer !== null && isCorrect && <Check className="mr-1 inline h-3.5 w-3.5" />}{option}</button>;
            })}
          </div>
          <div className="mt-3 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <button type="button" disabled={answer !== null} onClick={() => chooseAnswer(-1)} className="self-start text-xs font-semibold text-stone-500 underline decoration-dotted underline-offset-4 disabled:no-underline dark:text-stone-400">Không biết từ này</button>
            {answer !== null && (
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <p className={`text-xs font-bold ${current.options[answer] === current.meaning ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                  {current.options[answer] === current.meaning ? "Chính xác" : `Đáp án: ${current.meaning}`}
                </p>
                <button type="button" onClick={nextQuestion} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-500">Tiếp <ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {state === "result" && (
        <div className="mt-5 border-t border-sky-500/15 pt-4">
          <p className="text-center text-[11px] font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-300">Kết quả ước tính</p>
          <p className="mt-1 text-center text-3xl font-black text-stone-900 dark:text-white">~{Math.round(estimate).toLocaleString("vi-VN")} từ</p>
          <p className="text-center text-xs text-stone-600 dark:text-stone-300">Khoảng tham khảo: {Math.round(interval[0]).toLocaleString("vi-VN")}–{Math.round(interval[1]).toLocaleString("vi-VN")} từ trong kho đã phân cấp TOPIK</p>
          <div className="mx-auto mt-4 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {scoreByLevel.map((row) => (
              <div key={row.level} className="rounded-xl border border-stone-200 bg-white/70 p-3 text-center dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-[10px] font-bold text-sky-700 dark:text-sky-300">TOPIK {row.level}</p>
                <p className="mt-1 text-sm font-black text-stone-900 dark:text-white">~{Math.round(row.size * row.correct / Math.max(1, row.total)).toLocaleString("vi-VN")}</p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">{row.correct}/{row.total} đúng</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">Đây là ước tính thống kê từ các từ/cụm từ trong kho giáo trình HaechiVN, không phải số từ chính xác bạn biết hoặc tổng vốn từ của toàn bộ tiếng Hàn.</p>
        </div>
      )}
    </section>
  );
}
