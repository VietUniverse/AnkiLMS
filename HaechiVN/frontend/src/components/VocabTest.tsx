"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { AppShell } from "./AppShell";
import { appendHistory, buildQuestions, evaluate, getUserResultKey, loadSavedResult, saveResult, shouldStopEarly, type TestQuestion, type TestResult } from "../lib/vocabTest";
import type { VocabTestDef } from "../lib/vocabTests";
import { useApp } from "../contexts/AppProvider";

type Phase = "intro" | "loading" | "quiz" | "result" | "error";

const COLORS = { pass: "text-emerald-600 dark:text-emerald-400", almost: "text-amber-600 dark:text-amber-400", fail: "text-rose-600 dark:text-rose-400" } as const;
const card = "mx-auto max-w-xl rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70 p-4 sm:p-8";

export function VocabTest({ test }: { test: VocabTestDef }) {
  const { currentUser } = useApp();
  const resultKey = getUserResultKey(test.resultKey, currentUser?.id);
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [saved, setSaved] = useState<TestResult | null>(null);
  const [historySync, setHistorySync] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const startedAt = useRef(0);

  useEffect(() => { setSaved(loadSavedResult(resultKey)); }, [resultKey]);

  const start = async () => {
    setPhase("loading");
    try {
      const response = await fetch(test.dataUrl);
      if (!response.ok) throw new Error("fetch");
      const built = buildQuestions(test.toCards(await response.json()), test.config);
      if (built.length === 0) throw new Error("empty");
      setQuestions(built);
      setAnswers([]);
      startedAt.current = Date.now();
      setHistorySync("idle");
      setPhase("quiz");
    } catch {
      setPhase("error");
    }
  };

  const answer = (choice: number) => {
    const next = [...answers, choice];
    if (next.length < questions.length && !shouldStopEarly(questions, next, test.config.total)) {
      setAnswers(next);
      return;
    }
    const finished = evaluate(questions, next);
    saveResult(resultKey, finished);
    appendHistory({ ...finished, testSlug: test.slug, testName: test.shortName }, currentUser?.id);
    setSaved(finished);
    setResult(finished);
    setPhase("result");
    if (!currentUser) return; // khách: chỉ lưu kết quả trên máy
    setHistorySync("saving");
    const attemptId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `attempt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const durationSeconds = Math.min(1800, Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)));
    void fetch("/api/placement-tests", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId, testSlug: test.slug, correct: finished.correct, wrong: finished.wrong,
        skipped: finished.skipped, total: finished.total, durationSeconds,
      }),
    }).then((response) => {
      if (!response.ok) throw new Error("sync-failed");
      setHistorySync("saved");
    }).catch(() => setHistorySync("error"));
  };

  const index = answers.length;
  const question = questions[index];
  const shown = phase === "result" ? result : null;
  const verdicts = test.verdicts;

  return (
    <AppShell>
      <div className="pb-20 text-stone-900 dark:text-stone-100 space-y-4">
        <Link href="/placement-test" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-sky-600">
          <ArrowLeft className="w-4 h-4" /> Chọn bài test
        </Link>

        {(phase === "intro" || phase === "loading" || phase === "error") && (
          <section className={`${card} space-y-5 text-center`}>
            <div>
              <h1 className="text-2xl font-black">{test.title}</h1>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                Tối đa {test.config.total} câu (chọn nghĩa Việt và chọn từ Hàn) lấy từ <b>{test.sourceName}</b>, khoảng {test.minutes} phút. Kết quả rõ sớm thì bài tự dừng.
              </p>
            </div>
            <ul className="mx-auto max-w-xs space-y-1.5 text-left text-sm text-stone-600 dark:text-stone-300">
              <li>• Mỗi câu: chọn đáp án đúng.</li>
              <li>• Không biết thì bấm “Chưa biết” (không bị trừ điểm). Chọn sai bị trừ điểm nên đừng đoán.</li>
              <li>• Đạt từ 80% là pass.</li>
            </ul>
            {saved && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Lần trước: <b>{saved.percent}%</b>, {verdicts[saved.verdict].title}
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
                <span>{test.lessonLabel(question.lesson)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
              </div>
            </div>
            <div className="py-4 text-center space-y-2">
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400">
                {question.direction === "ko-vi" ? "Nghĩa của từ này là gì?" : "Chọn từ tiếng Hàn có nghĩa:"}
              </p>
              {question.direction === "ko-vi"
                ? <p className="text-4xl sm:text-5xl font-black" lang="ko">{question.prompt}</p>
                : <p className="text-3xl font-black">{question.prompt}</p>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {question.options.map((option, i) => (
                <button
                  key={`${index}-${option}`}
                  onClick={() => answer(i)}
                  lang={question.direction === "vi-ko" ? "ko" : undefined}
                  className={`min-h-14 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-3 text-left font-bold hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-stone-800 transition cursor-pointer ${question.direction === "vi-ko" ? "text-lg" : "text-sm"}`}
                >
                  {option}
                </button>
              ))}
            </div>
            <button onClick={() => answer(-1)} className="w-full rounded-xl py-3 text-sm font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer">
              Chưa biết
            </button>
          </section>
        )}

        {shown && (
          <section className={`${card} space-y-6`}>
            <div className="text-center">
              <p className="text-5xl font-black tabular-nums">{shown.percent}<span className="text-2xl text-stone-400">%</span></p>
              <h1 className={`mt-2 text-xl font-black ${COLORS[shown.verdict]}`}>{verdicts[shown.verdict].title}</h1>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{verdicts[shown.verdict].text}</p>
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">Đúng {shown.correct}, sai {shown.wrong}, chưa biết {shown.skipped} (trên {shown.total} câu)</p>
              {historySync === "saving" && <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">Đang lưu lịch sử theo tài khoản…</p>}
              {historySync === "saved" && <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Đã lưu kết quả vào lịch sử tài khoản.</p>}
              {historySync === "error" && <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">Kết quả đang chỉ được lưu trên thiết bị này. Đăng nhập rồi thử làm lại để ghi vào lịch sử tài khoản.</p>}
            </div>
            {shown.reviewLessons.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-stone-500 dark:text-stone-400">Bài cần ôn lại</p>
                <div className="flex flex-wrap gap-1.5">
                  {shown.reviewLessons.map((lesson) => (
                    <span key={lesson} className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">{test.lessonLabel(lesson)}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={shown.verdict === "pass" ? test.passCta.href : test.failCta.href} className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-600 px-4 py-3 text-center text-sm font-black text-white transition">
                {shown.verdict === "pass" ? test.passCta.label : test.failCta.label}
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
