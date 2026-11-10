"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, ChevronUp, Layers, ListChecks, RotateCcw, Search, Sparkles } from "lucide-react";

type Lesson = { id: string; label: string; title?: string; exercise?: boolean };
type Book = { id: string; code: string; title: string; level: string; description: string; lessons: Lesson[]; accent: string };

function lessons(count: number, prefix = "Bài"): Lesson[] {
  return Array.from({ length: count }, (_, index) => ({ id: `bai-${String(index + 1).padStart(2, "0")}`, label: `${prefix} ${index + 1}`, exercise: true }));
}

const BOOKS: Book[] = [
  {
    id: "so-cap-1", code: "QUYỂN 1", title: "Sơ cấp 1", level: "초급", description: "24 bài học + 4 bài ôn tập + bài thi thử. Nền tảng Hangul, giao tiếp và ngữ pháp sơ cấp.",
    accent: "from-sky-100 via-cyan-50 to-white text-slate-900",
    lessons: [
      ...lessons(20),
      { id: "on-tap-1", label: "Ôn tập 1", exercise: true },
      { id: "on-tap-2", label: "Ôn tập 2", exercise: false },
      { id: "on-tap-3", label: "Ôn tập 3", exercise: false },
      { id: "on-tap-4", label: "Ôn tập 4", exercise: true },
      { id: "thi-thu", label: "Thi thử", exercise: false },
    ],
  },
  {
    id: "so-cap-2", code: "QUYỂN 2", title: "Sơ cấp 2", level: "초급", description: "7 bài đầu tiên của Sơ cấp 2. Mở rộng vốn từ, hội thoại và ngữ pháp thường gặp.",
    accent: "from-teal-100 via-emerald-50 to-white text-slate-900",
    lessons: lessons(7),
  },
];

function BookCard({ book, reversed }: { book: Book; reversed: boolean }) {
  const [open, setOpen] = useState(false);
  const ordered = reversed ? [...book.lessons].reverse() : book.lessons;
  return <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className={`bg-gradient-to-br ${book.accent} p-5`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{book.code}</p><h2 className="mt-2 font-noto text-3xl font-black">{book.title}</h2><p className="mt-1 text-sm font-bold opacity-70">{book.level} · {book.lessons.length} mục</p></div><span className="rounded-full border border-black/10 bg-white/40 px-3 py-1 text-[10px] font-black">{book.id}</span></div>
      <p className="mt-4 max-w-xl text-xs leading-5 opacity-75">{book.description}</p>
      <div className="mt-4 flex flex-wrap gap-2"><a href={`/sach/${book.id}/bai-01/`} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-xs font-black text-white hover:brightness-110">Vào bài đầu <ArrowRight className="h-3.5 w-3.5" /></a><button onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white/40 px-4 py-2.5 text-xs font-black hover:bg-white/60">{open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}{open ? "Thu gọn" : `Xem ${book.lessons.length} mục`}</button></div>
    </div>
    {open && <div className="grid gap-2 p-4 sm:grid-cols-2">
      {ordered.map((lesson, index) => <div key={lesson.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black tabular-nums text-stone-400">{reversed ? book.lessons.length - index : index + 1}</span><span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-stone-500">{lesson.label}</span></div>
        <div className="mt-2 flex flex-wrap gap-1.5"><a href={`/sach/${book.id}/${lesson.id}/`} className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-bold text-sky-700 hover:bg-sky-500/20"><BookOpen className="h-3 w-3" /> Giáo trình</a>{lesson.exercise && <a href={`/sach/${book.id}/${lesson.id}/bai-tap/`} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-500/20"><ListChecks className="h-3 w-3" /> Bài tập</a>}</div>
      </div>)}
    </div>}
  </article>;
}

export function SachLibraryModule() {
  const [query, setQuery] = useState("");
  const [reversed, setReversed] = useState(false);
  const books = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = reversed ? [...BOOKS].reverse() : BOOKS;
    if (!q) return list;
    return list.map((book) => ({ ...book, lessons: book.lessons.filter((lesson) => `${lesson.label} ${lesson.id} ${lesson.title || ""}`.toLowerCase().includes(q)) })).filter((book) => book.lessons.length || book.title.toLowerCase().includes(q));
  }, [query, reversed]);

  return <main className="mx-auto max-w-5xl space-y-5 pb-24 animate-fadeIn text-slate-900">
    <header className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-cyan-50 to-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-700">Kệ sách HaechiVN</p><h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900 sm:text-4xl">Bộ sách tiếng Hàn tương tác</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">Nghe, chạm và nói trên từng trang. Sách Sơ cấp 1–2 có giáo trình và bài tập; thứ tự có thể đảo để học theo lộ trình riêng.</p></div><a href="/flashcards" className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-xs font-bold text-stone-700 hover:border-sky-400"><Layers className="h-4 w-4" /> Ôn từ vựng</a></div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row"><label className="flex flex-1 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 focus-within:border-sky-400"><Search className="h-4 w-4 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm bài hoặc mã bài..." className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400" /></label><button onClick={() => setReversed((value) => !value)} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black ${reversed ? "border-sky-300 bg-sky-50 text-sky-700" : "border-stone-300 bg-white text-stone-600"}`}><RotateCcw className={`h-4 w-4 ${reversed ? "rotate-180" : ""}`} />{reversed ? "Đang đảo thứ tự" : "Đảo thứ tự"}</button></div>
    </header>

    <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500"><span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700"><Sparkles className="h-3 w-3" /> Nội dung tương tác</span><span>Bấm “Giáo trình” để mở bài, “Bài tập” để luyện.</span><a href="/topik/archive" className="ml-auto inline-flex items-center gap-1 font-bold text-sky-600 hover:underline">Kho đề TOPIK <ArrowRight className="h-3 w-3" /></a></div>

    <div className="grid gap-4">{books.map((book) => <BookCard key={book.id} book={book} reversed={reversed} />)}</div>
    {!books.length && <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">Không tìm thấy bài phù hợp.</div>}

    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-sky-600" /><h2 className="text-sm font-black text-stone-900">Lộ trình gợi ý</h2></div><p className="mt-1 text-xs leading-5 text-stone-500">Mỗi ngày mở một bài giáo trình, làm bài tập cùng bài, rồi quay lại ôn từ vựng. Khi đã quen, bật “Đảo thứ tự” để bắt đầu từ bài cuối và quay ngược — cách này giúp kiểm tra trí nhớ mà không dựa vào thứ tự quen thuộc.</p><div className="mt-3 flex flex-wrap gap-2"><a href="/sach/so-cap-1/bai-01/" className="rounded-lg bg-sky-600 px-3 py-2 text-[11px] font-black text-white">Bắt đầu Sơ cấp 1</a><a href="/sach/so-cap-2/bai-01/" className="rounded-lg border border-stone-300 px-3 py-2 text-[11px] font-bold text-stone-600">Bắt đầu Sơ cấp 2</a><Link href="/topik/archive" className="rounded-lg border border-stone-300 px-3 py-2 text-[11px] font-bold text-stone-600">Thi thử TOPIK</Link></div></section>

    <a href="/" className="mx-auto flex w-fit items-center gap-1 text-xs font-bold text-slate-500 hover:text-sky-500"><ArrowLeft className="h-3.5 w-3.5" /> Về trang chủ</a>
  </main>;
}
