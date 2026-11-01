"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import {
  buildQuestions,
  evaluate,
  lessonLabel,
  loadSavedResult,
  PASS_RATIO,
  saveResult,
  type TestQuestion,
  type TestResult,
} from "../../lib/seoul1aTest";

type Phase = "intro" | "loading" | "quiz" | "result" | "error";

const VERDICT = {
  pass: { title: "Bạn đã qua 1A 🎉", text: "Bạn nắm vững từ vựng của 1A. Có thể học tiếp bộ khác trong Khám phá.", color: "text-emerald-600 dark:text-emerald-400" },
  almost: { title: "Gần đạt", text: "Bạn biết phần lớn từ vựng 1A. Ôn lại các bài còn yếu rồi làm lại.", color: "text-amber-600 dark:text-amber-400" },
  fail: { title: "Chưa đạt 1A", text: "Hãy bắt đầu học bộ 1A, sau đó quay lại làm bài này.", color: "text-rose-600 dark:text-rose-400" },
} as const;

const card = "mx-auto max-w-xl rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70 p-6 sm:p-8";

export default function PlacementTestPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [saved, setSaved] = useState<TestResult | null>(null);

  useEffect(() => { setSaved(loadSavedResult()); }, []);

  const start = async () => {
    setPhase("loading");
    try {
      const response = await fetch("/data/seoul-1a.json");
      if (!response.ok) throw new Error("fetch");
      const data = await response.json();
      const built = buildQuestions(data.cards);
      if (built.length === 0) throw new Error("empty");
      setQuestions(built);
      setAnswers([]);
      setPhase("quiz");
    } catch {
      setPhase("error");
    }
  };

  const answer = (choice: number) => {
    const next = [...answers, choice];
    if (next.length < questions.length) {
      setAnswers(next);
      return;
    }
    const finished = evaluate(questions, next);
    saveResult(finished);
    setSaved(finished);
    setResult(finished);
    setPhase("result");
  };

  const index = answers.length;
  const question = questions[index];
  const shown = phase === "result" ? result : null;

  return (
    <AppShell>
      <div className="pb-24 text-stone-900 dark:text-stone-100 space-y-4">
        <Link href="/explore" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-sky-600">
          <ArrowLeft className="w-4 h-4" /> Khám phá
        </Link>

        {(phase === "intro" || phase === "loading" || phase === "error") && (
          <section className={`${card} space-y-5 text-center`}>
            <div>
              <h1 className="text-2xl font-black">Bạn đã qua 1A chưa?</h1>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                Trả lời 40 từ lấy từ bộ <b>서울대 한국어 플러스 1A</b> (bài 1–8). Mất khoảng 4 phút.
              </p>
            </div>
            <ul className="mx-auto max-w-xs space-y-1.5 text-left text-sm text-stone-600 dark:text-stone-300">
              <li>• Mỗi câu: chọn nghĩa đúng của từ tiếng Hàn.</li>
              <li>• Không biết thì bấm “Chưa biết”, đừng đoán.</li>
              <li>• Đúng từ {Math.round(PASS_RATIO * 40)}/40 trở lên là đã qua 1A.</li>
            </ul>
            {saved && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Lần trước: <b>{saved.correct}/{saved.total}</b> — {VERDICT[saved.verdict].title}
              </p>
            )}
            {phase === "error" && <p role="alert" className="text-sm text-rose-600">Không tải được bộ từ. Thử lại sau.</p>}
            <button
              onClick={start}
              disabled={phase === "loading"}
              className="w-full rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 px-4 py-3 text-sm font-black text-white transition cursor-pointer"
            >
              {phase === "loading" ? "Đang chuẩn bị…" : saved ? "Làm lại" : "Bắt đầu"}
            </button>
          </section>
        )}

        {phase === "quiz" && question && (
          <section className={`${card} space-y-6`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>Câu {index + 1} / {questions.length}</span>
                <span>{lessonLabel(question.lesson)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
              </div>
            </div>
            <p className="py-6 text-center text-5xl font-black" lang="ko">{question.hangul}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {question.options.map((option, i) => (
                <button
                  key={`${index}-${option}`}
                  onClick={() => answer(i)}
                  className="rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-3 text-left text-sm font-bold hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  {option}
                </button>
              ))}
            </div>
            <button onClick={() => answer(-1)} className="w-full rounded-xl py-2.5 text-xs font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer">
              Chưa biết
            </button>
          </section>
        )}

        {shown && (
          <section className={`${card} space-y-6`}>
            <div className="text-center">
              <p className="text-5xl font-black tabular-nums">{shown.correct}<span className="text-2xl text-stone-400">/{shown.total}</span></p>
              <h1 className={`mt-2 text-xl font-black ${VERDICT[shown.verdict].color}`}>{VERDICT[shown.verdict].title}</h1>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{VERDICT[shown.verdict].text}</p>
            </div>
            <div className="space-y-2">
              {shown.lessons.map((row) => (
                <div key={row.lesson} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-xs">
                  <span className="truncate font-semibold">{lessonLabel(row.lesson)}</span>
                  <span className="h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                    <span className={`block h-full rounded-full ${row.correct / row.total >= PASS_RATIO ? "bg-emerald-500" : row.correct / row.total >= 0.6 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${(row.correct / row.total) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-stone-500 dark:text-stone-400">{row.correct}/{row.total}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={shown.verdict === "pass" ? "/explore" : "/explore/seoul-1a"} className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-600 px-4 py-3 text-center text-sm font-black text-white transition">
                {shown.verdict === "pass" ? "Chọn bộ tiếp theo" : "Học bộ 1A"}
              </Link>
              <button onClick={start} className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-3 text-sm font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer">
                <RotateCcw className="w-4 h-4" /> Làm lại
              </button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
