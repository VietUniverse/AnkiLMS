"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/AppShell";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Clock3, Compass, GraduationCap, Headphones, Mic2, RotateCcw, Target } from "lucide-react";
import { courseVocabularyToExploreDecks } from "../../lib/courseVocabulary";
import {
  createPlacementResult,
  getRecommendedDecks,
  makePlacementQuestions,
  shuffle,
  type PlacementGoal,
  type PlacementProfile,
  type PlacementQuestion,
  type PlacementResult,
  type SkillRatings,
} from "../../lib/vocabularyAssessment";

type Phase = "intro" | "profile" | "loading" | "quiz" | "result" | "error";
type QuizState = { questions: PlacementQuestion[]; population: Record<number, number>; profile: PlacementProfile; scores: boolean[]; index: number; selected: number | null; confidence: boolean | null };

const goalOptions: { id: PlacementGoal; title: string; detail: string }[] = [
  { id: "conversation", title: "Giao tiếp tự nhiên", detail: "Nghe hiểu, trò chuyện và xử lý tình huống hằng ngày." },
  { id: "topik", title: "Thi TOPIK", detail: "Xây nền từ vựng theo cấp để chuẩn bị TOPIK I hoặc II." },
  { id: "kiip", title: "KIIP và định cư", detail: "Học ngôn ngữ, đời sống và nội dung hội nhập xã hội." },
  { id: "study-abroad", title: "Du học / học thuật", detail: "Theo giáo trình có hệ thống và tăng dần độ khó." },
  { id: "culture", title: "Văn hóa và nội dung Hàn", detail: "Hiểu phim, tin tức, đời sống và các chủ đề chuyên sâu." },
];
const skillNames: { id: keyof SkillRatings; title: string; icon: typeof BookOpen; detail: string }[] = [
  { id: "reading", title: "Đọc Hangul", icon: BookOpen, detail: "Đọc từ, câu và đoạn văn tiếng Hàn." },
  { id: "listening", title: "Nghe hiểu", icon: Headphones, detail: "Bắt từ khóa và ý chính khi nghe." },
  { id: "speaking", title: "Nói", icon: Mic2, detail: "Diễn đạt ý và duy trì hội thoại." },
  { id: "grammar", title: "Ngữ pháp", icon: GraduationCap, detail: "Dùng cấu trúc câu và đuôi câu." },
];
const skillLabels = ["Chưa học", "Mới bắt đầu", "Cơ bản", "Khá", "Tốt"];
const levelNames = ["", "TOPIK 1 · Nền tảng", "TOPIK 2 · Sơ cấp mở rộng", "TOPIK 3 · Trung cấp", "TOPIK 4 · Trung cao cấp", "TOPIK 5 · Cao cấp", "TOPIK 6 · Nâng cao"];
const levelColors = ["", "bg-emerald-500", "bg-lime-500", "bg-sky-500", "bg-blue-500", "bg-violet-500", "bg-fuchsia-500"];

const initialProfile: PlacementProfile = { goal: "conversation", skill: "beginner", weeklyMinutes: 120, horizon: "6 tháng", skills: { reading: 0, listening: 0, speaking: 0, grammar: 0 } };

function savedResult(): PlacementResult | null {
  try { const raw = localStorage.getItem("haechivn_placement_result"); return raw ? JSON.parse(raw) as PlacementResult : null; } catch { return null; }
}

function formatMinutes(minutes: number) { return minutes < 60 ? `${minutes} phút` : `${Math.round(minutes / 60)} giờ`; }

export default function PlacementTestPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [profile, setProfile] = useState<PlacementProfile>(initialProfile);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [courseData, setCourseData] = useState<Awaited<ReturnType<typeof makePlacementQuestions>>["courseData"] | null>(null);
  const [restoreChecked, setRestoreChecked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const previous = savedResult();
    if (previous) setResult(previous);
    setRestoreChecked(true);
  }, []);

  useEffect(() => {
    if (!result || courseData || !restoreChecked) return;
    let active = true;
    void makePlacementQuestions(1).then(({ courseData: data }) => { if (active) setCourseData(data); }).catch(() => undefined);
    return () => { active = false; };
  }, [result, courseData, restoreChecked]);

  const recommendations = useMemo(() => result && courseData ? getRecommendedDecks(result, courseData) : [], [result, courseData]);

  const beginQuiz = async () => {
    setPhase("loading"); setError("");
    try {
      const { questions, population, courseData: data } = await makePlacementQuestions(10);
      setCourseData(data);
      setQuiz({ questions, population, profile, scores: Array(questions.length).fill(false), index: 0, selected: null, confidence: null });
      setPhase("quiz");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tạo được bài kiểm tra. Vui lòng thử lại."); setPhase("error");
    }
  };

  const selectAnswer = (choiceIndex: number) => {
    if (!quiz || quiz.confidence !== null) return;
    const question = quiz.questions[quiz.index];
    const correct = question.options[choiceIndex] === question.meaning;
    setQuiz({ ...quiz, selected: choiceIndex, confidence: correct ? null : false, scores: quiz.scores.map((score, index) => index === quiz.index ? false : score) });
  };

  const setKnownConfidence = (known: boolean) => {
    if (!quiz || quiz.selected === null || quiz.selected < 0) return;
    const question = quiz.questions[quiz.index];
    const correct = question.options[quiz.selected] === question.meaning;
    setQuiz({ ...quiz, confidence: known, scores: quiz.scores.map((score, index) => index === quiz.index ? correct && known : score) });
  };

  const finishOrContinue = () => {
    if (!quiz || quiz.confidence === null) return;
    if (quiz.index === quiz.questions.length - 1) {
      const decks = courseVocabularyToExploreDecks(courseData!);
      const assessment = createPlacementResult(quiz.profile, quiz.questions, quiz.scores, quiz.population, decks);
      localStorage.setItem("haechivn_placement_result", JSON.stringify(assessment));
      setResult(assessment); setPhase("result"); return;
    }
    setQuiz({ ...quiz, index: quiz.index + 1, selected: null, confidence: null });
  };

  const restart = () => { setProfile(initialProfile); setQuiz(null); setResult(null); setPhase("profile"); };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5 pb-24">
        <Link href="/explore" className="inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100"><ArrowLeft className="h-4 w-4" /> Quay lại Khám phá</Link>

        {phase === "intro" && !result && <section className="overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-white via-sky-50 to-indigo-100 p-6 shadow-sm dark:border-sky-900 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white"><Target /></div>
          <p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-sky-700 dark:text-sky-300">HaechiVN · Đánh giá đầu vào</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">Tìm đúng điểm bắt đầu cho tiếng Hàn của bạn</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 dark:text-slate-300">Bài đánh giá kết hợp mục tiêu, mức tự tin ở bốn kỹ năng và 60 câu nhận diện từ vựng từ TOPIK 1 đến TOPIK 6. Kết quả giúp chọn bộ thẻ và thứ tự học phù hợp, thay vì bắt đầu từ một cấp cố định.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[ ["01", "Cho biết mục tiêu", "Giao tiếp, TOPIK, KIIP, du học hoặc văn hóa."], ["02", "Đánh giá nền tảng", "Tự xếp kỹ năng và nhận diện từ theo sáu cấp."], ["03", "Nhận lộ trình", "Bộ thẻ thật trong Explore, có thể mở để xem và thêm." ] ].map(([number, title, detail]) => <div key={number} className="rounded-2xl border border-sky-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60"><span className="text-xs font-black text-sky-600 dark:text-sky-300">{number}</span><h2 className="mt-2 text-sm font-extrabold text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{detail}</p></div> )}
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3"><button onClick={() => setPhase("profile")} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-extrabold text-white shadow hover:bg-sky-700">Thiết lập bài đánh giá <ArrowRight className="h-4 w-4" /></button><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Khoảng 8–12 phút · Lưu kết quả trên thiết bị này</span></div>
        </section>}

        {phase === "profile" && <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
          <div><p className="text-xs font-black uppercase tracking-widest text-sky-700 dark:text-sky-300">Bước 1 / 2 · Hồ sơ học tập</p><h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Bạn học tiếng Hàn để làm gì?</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Thông tin này dùng để chọn bộ thẻ gợi ý và lên lịch phù hợp với thời gian của bạn.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">{goalOptions.map((goal) => <button key={goal.id} onClick={() => setProfile({ ...profile, goal: goal.id })} className={`rounded-2xl border p-4 text-left transition ${profile.goal === goal.id ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200 dark:bg-sky-950/40 dark:ring-sky-900" : "border-slate-200 hover:border-sky-300 dark:border-slate-700 dark:hover:border-sky-700"}`}><span className="flex items-center justify-between text-sm font-extrabold text-slate-900 dark:text-white">{goal.title}{profile.goal === goal.id && <CheckCircle2 className="h-4 w-4 text-sky-600" />}</span><span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">{goal.detail}</span></button>)}</div>
          <div className="grid gap-5 md:grid-cols-2">
            <fieldset><legend className="text-sm font-extrabold text-slate-900 dark:text-white">Bạn tự đánh giá trình độ tổng thể</legend><div className="mt-2 grid grid-cols-2 gap-2">{[{ value: "beginner", label: "Mới bắt đầu" }, { value: "basic", label: "Đã học căn bản" }, { value: "intermediate", label: "Giao tiếp được" }, { value: "advanced", label: "Đã học nâng cao" }].map((option) => <button key={option.value} onClick={() => setProfile({ ...profile, skill: option.value })} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${profile.skill === option.value ? "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200" : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"}`}>{option.label}</button>)}</div></fieldset>
            <fieldset><legend className="text-sm font-extrabold text-slate-900 dark:text-white">Thời gian có thể học mỗi tuần</legend><div className="mt-2 grid grid-cols-2 gap-2">{[60, 120, 240, 420].map((minutes) => <button key={minutes} onClick={() => setProfile({ ...profile, weeklyMinutes: minutes })} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${profile.weeklyMinutes === minutes ? "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200" : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"}`}>{minutes === 60 ? "1 giờ" : minutes === 120 ? "2 giờ" : minutes === 240 ? "4 giờ" : "7 giờ trở lên"}</button>)}</div></fieldset>
          </div>
          <div><p className="text-sm font-extrabold text-slate-900 dark:text-white">Mức tự tin hiện tại ở từng kỹ năng</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Đây là phần tự đánh giá riêng; kết quả từ vựng không thay thế bài thi năng lực chính thức.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{skillNames.map(({ id, title, detail, icon: Icon }) => <div key={id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-sky-600 dark:text-sky-300"/><div><p className="text-xs font-extrabold text-slate-900 dark:text-white">{title}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">{detail}</p></div></div><div className="mt-3 flex flex-wrap gap-1.5">{skillLabels.map((label, value) => <button key={label} onClick={() => setProfile({ ...profile, skills: { ...profile.skills, [id]: value } })} className={`rounded-lg px-2 py-1.5 text-[10px] font-bold ${profile.skills[id] === value ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{label}</button>)}</div></div>)}</div></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800"><button onClick={() => setPhase("intro")} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Quay lại</button><button onClick={beginQuiz} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-sky-700">Bắt đầu 60 câu từ vựng <ArrowRight className="h-4 w-4"/></button></div>
        </section>}

        {phase === "loading" && <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-950"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600"/><h2 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Đang chuẩn bị câu hỏi</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Chọn mẫu từ thật trong kho học liệu TOPIK 1–6.</p></section>}
        {phase === "error" && <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950/30"><h2 className="font-extrabold text-rose-900 dark:text-rose-200">Chưa mở được bài đánh giá</h2><p className="mt-2 text-sm text-rose-800 dark:text-rose-300">{error}</p><button onClick={() => setPhase("profile")} className="mt-4 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">Quay lại thử lại</button></section>}

        {phase === "quiz" && quiz && (() => {
          const question = quiz.questions[quiz.index];
          const selectedCorrect = quiz.selected !== null && question.options[quiz.selected] === question.meaning;
          const levelIndexes = quiz.questions.map((item, index) => item.level === question.level ? index : -1).filter((index) => index >= 0);
          const completedInLevel = levelIndexes.filter((index) => index < quiz.index).length;
          return <section className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-sky-700 dark:text-sky-300">Bài đánh giá từ vựng</p><h1 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Câu {quiz.index + 1} / {quiz.questions.length}</h1></div><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold text-white ${levelColors[question.level]}`}>{levelNames[question.level]}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${((quiz.index + 1) / quiz.questions.length) * 100}%` }}/></div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nhóm cấp này: {completedInLevel} / 10 câu đã trả lời</p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-9 text-center dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Bạn hiểu từ này là gì?</p><p className="mt-4 text-4xl font-black text-slate-950 dark:text-white sm:text-5xl" lang="ko">{question.hangul}</p></div>
            <div className="grid gap-2.5 sm:grid-cols-2">{question.options.map((option, index) => { const isSelected = quiz.selected === index; const isRight = option === question.meaning; const reveal = quiz.selected !== null; const style = reveal && isRight ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : isSelected ? "border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200" : "border-slate-200 bg-white text-slate-800 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"; return <button disabled={quiz.selected !== null} onClick={() => selectAnswer(index)} key={`${option}-${index}`} className={`min-h-14 rounded-xl border px-4 py-3 text-left text-sm font-bold transition disabled:cursor-default ${style}`}>{option}{reveal && isRight && <Check className="float-right h-4 w-4"/>}</button>; })}</div>
            {quiz.selected === null && <button onClick={() => { setQuiz({ ...quiz, selected: -1, confidence: false }); }} className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Tôi chưa biết từ này</button>}
            {quiz.selected !== null && <div className={`rounded-2xl p-4 ${selectedCorrect ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-amber-50 dark:bg-amber-950/30"}`}>
              {selectedCorrect ? <><p className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">Đúng. Bạn đã biết nghĩa này từ trước chưa?</p><p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">Chọn “Đã biết” chỉ khi bạn có thể tự nhớ nghĩa, không phải vừa đoán trúng.</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setKnownConfidence(true)} className={`rounded-xl px-4 py-2 text-xs font-extrabold ${quiz.confidence === true ? "bg-emerald-700 text-white" : "bg-white text-emerald-900 ring-1 ring-emerald-300 dark:bg-slate-900 dark:text-emerald-200"}`}>Đã biết trước</button><button onClick={() => setKnownConfidence(false)} className={`rounded-xl px-4 py-2 text-xs font-extrabold ${quiz.confidence === false ? "bg-amber-700 text-white" : "bg-white text-amber-900 ring-1 ring-amber-300 dark:bg-slate-900 dark:text-amber-200"}`}>Vừa đoán / mới biết</button></div></> : <><p className="text-sm font-extrabold text-amber-950 dark:text-amber-200">Đáp án: {question.meaning}</p><p className="mt-1 text-xs text-amber-900 dark:text-amber-300">Câu này không được tính là từ đã biết.</p></>}
              {quiz.confidence !== null && <button onClick={finishOrContinue} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-sky-700">{quiz.index === quiz.questions.length - 1 ? "Xem kết quả và lộ trình" : "Câu tiếp theo"}<ArrowRight className="h-4 w-4"/></button>}
            </div>}
            <p className="text-center text-[11px] leading-5 text-slate-500 dark:text-slate-400">Không tính tốc độ trả lời. Câu đoán đúng cần xác nhận riêng để ước tính thận trọng hơn.</p>
          </section>;
        })()}

        {result && (phase === "result" || phase === "intro") ? <div className="space-y-5">
          <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-6 dark:border-emerald-900 dark:from-slate-950 dark:to-emerald-950/40 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Đánh giá đầu vào hoàn tất</p><h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Điểm bắt đầu phù hợp: TOPIK {result.startLevel}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700 dark:text-slate-300">Bạn nhận diện vững đến TOPIK {result.provenLevel}. Lộ trình đề xuất bắt đầu từ cấp kế tiếp để củng cố nền tảng mà không bỏ qua khoảng trống.</p></div><button onClick={restart} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200"><RotateCcw className="h-4 w-4"/> Làm lại / cập nhật mục tiêu</button></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-emerald-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70"><p className="text-xs font-bold text-slate-600 dark:text-slate-300">Ước tính từ đã biết</p><p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">~{result.estimatedKnown.toLocaleString("vi-VN")}</p><p className="text-[11px] text-slate-500 dark:text-slate-400">trong kho từ vựng được kiểm tra</p></div><div className="rounded-2xl border border-emerald-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70"><p className="text-xs font-bold text-slate-600 dark:text-slate-300">Khoảng ước lượng 95%</p><p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{result.confidenceLow.toLocaleString("vi-VN")}–{result.confidenceHigh.toLocaleString("vi-VN")}</p><p className="text-[11px] text-slate-500 dark:text-slate-400">ước lượng dựa trên mẫu câu đã làm</p></div><div className="rounded-2xl border border-emerald-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70"><p className="text-xs font-bold text-slate-600 dark:text-slate-300">Quỹ thời gian</p><p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{formatMinutes(result.profile.weeklyMinutes)} / tuần</p><p className="text-[11px] text-slate-500 dark:text-slate-400">Mục tiêu: {goalOptions.find((goal) => goal.id === result.profile.goal)?.title}</p></div></div>
            <p className="mt-4 text-[11px] leading-5 text-slate-600 dark:text-slate-400">Đây là ước tính định hướng từ mẫu từ vựng trong kho HaechiVN, không phải chứng chỉ hay phép đo toàn bộ vốn từ tiếng Hàn. Kết quả được lưu trên trình duyệt này.</p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-7"><div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950 dark:text-white">Kết quả theo cấp TOPIK</h2><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Số câu đúng trên 10 câu mỗi cấp; 70% trở lên được xem là đã nhận diện tương đối vững.</p></div><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Làm ngày {new Date(result.assessedAt).toLocaleDateString("vi-VN")}</span></div><div className="mt-5 space-y-3">{result.levelScores.map((row) => <div key={row.level} className="grid grid-cols-[130px_1fr_74px] items-center gap-3"><span className="text-xs font-bold text-slate-800 dark:text-slate-100">TOPIK {row.level}</span><div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${levelColors[row.level]}`} style={{ width: `${Math.round(row.accuracy * 100)}%` }}/></div><span className="text-right text-xs font-extrabold text-slate-700 dark:text-slate-200">{row.correct}/{row.total}</span></div>)}</div></section>

          <section className="rounded-3xl border border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-900 dark:bg-indigo-950/20 sm:p-7"><div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-indigo-600 dark:text-indigo-300"/><h2 className="text-lg font-black text-slate-950 dark:text-white">Lộ trình học gợi ý</h2></div><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Dựa trên cấp bắt đầu, mục tiêu và {formatMinutes(result.profile.weeklyMinutes)} bạn dành mỗi tuần.</p><div className="mt-5 grid gap-3 md:grid-cols-3">{[{ n: "Tuần 1–2", t: `Củng cố TOPIK ${result.startLevel}`, d: "Bắt đầu với từ vựng và bài học nền tảng ở cấp khuyến nghị; học theo lượt ngắn, ôn lại bằng SRS." }, { n: "Tuần 3–4", t: "Thêm ngữ cảnh theo mục tiêu", d: result.profile.goal === "topik" ? "Bổ sung từ theo dạng bài TOPIK và luyện nhận diện từ trong câu." : result.profile.goal === "kiip" ? "Bổ sung từ theo chủ đề đời sống và giáo trình KIIP." : result.profile.goal === "conversation" ? "Bổ sung chủ đề giao tiếp và mẫu câu ứng dụng." : "Bổ sung nội dung giáo trình và chủ đề đúng hướng học của bạn." }, { n: "Cuối tuần 4", t: "Đánh giá lại và tăng cấp", d: "Làm lại bài đánh giá sau khi học đều; tăng độ khó nếu điểm nhận diện của cấp hiện tại ổn định." }].map((step) => <div key={step.n} className="rounded-2xl border border-indigo-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300">{step.n}</p><h3 className="mt-2 text-sm font-extrabold text-slate-950 dark:text-white">{step.t}</h3><p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{step.d}</p></div>)}</div></section>

          <section className="space-y-4"><div><p className="text-xs font-black uppercase tracking-widest text-sky-700 dark:text-sky-300">Bộ thẻ trong Explore</p><h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Bắt đầu với những bộ phù hợp</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Mở bộ thẻ để xem thông tin và bản xem trước, rồi tự chọn thêm vào Flashcards.</p></div>{recommendations.length ? <div className="grid gap-3 md:grid-cols-2">{recommendations.map((deck, index) => <article key={deck.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-extrabold text-sky-800 dark:bg-sky-950 dark:text-sky-200">{index === 0 ? "Ưu tiên bắt đầu" : "Bổ trợ"}</span><h3 className="mt-2 text-base font-black text-slate-950 dark:text-white">{deck.title}</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{deck.description}</p></div><BookOpen className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-300"/></div><p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-200">{(deck.cardCount ?? deck.cards.length).toLocaleString("vi-VN")} thẻ · {deck.categoryLabel}</p><Link href={`/explore/${deck.id}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-sky-700">Xem bộ thẻ và thêm để học <ArrowRight className="h-4 w-4"/></Link></article>)}</div> : <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Chưa tải được danh sách bộ thẻ gợi ý. Bạn có thể mở Explore để duyệt thư viện.</p>}<Link href="/explore" className="inline-flex items-center gap-2 text-sm font-extrabold text-sky-700 dark:text-sky-300"><Compass className="h-4 w-4"/> Xem toàn bộ Explore</Link></section>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"><div><p className="text-sm font-extrabold text-slate-900 dark:text-white">Đánh giá lại sau khi đã học thêm</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Kết quả mới sẽ thay thế kết quả đã lưu trên thiết bị này.</p></div><button onClick={restart} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900">Làm bài mới</button></div>
        </div> : null}
      </div>
    </AppShell>
  );
}
