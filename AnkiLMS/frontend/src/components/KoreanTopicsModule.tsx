"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VOCABULARY_DATA } from "../data/koreanData";
import { SEJONG_TOPIC_VOCABULARY, TOPIK_LEVEL_GUIDE } from "../data/sejongTopicVocabulary";
import { BookOpen, Check, ChevronLeft, ChevronRight, Compass, Headphones, Layers, Search, Sparkles, Volume2 } from "lucide-react";
import { useApp } from "../contexts/AppProvider";
import { KoreanPractice, KoreanPracticePrompt } from "./KoreanPractice";
import { speakKorean, stopKoreanSpeech } from "../lib/koreanSpeech";
import { inferTopikLevel } from "../lib/studyRanks";

type TopicItem = { korean: string; meaning: string; topic: string; level: string; example: string; translation: string; source: "HaechiVN" | "Anki" };
const LEVEL_FILTERS = ["Tất cả", ...TOPIK_LEVEL_GUIDE.map((item) => item.level), "Anki"];

export function KoreanTopicsModule() {
  const { userDecks } = useApp();
  const [topic, setTopic] = useState("Tất cả chủ đề");
  const [level, setLevel] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [practicePrompt, setPracticePrompt] = useState<KoreanPracticePrompt[] | null>(null);

  const allItems = useMemo(() => {
    const legacy = VOCABULARY_DATA.map((item, index) => ({
      korean: item.hangul, meaning: item.vietnamese, topic: item.topic,
      level: index < 6 ? "TOPIK 1" : "TOPIK 2", example: item.exampleSentence, translation: item.exampleTranslation, source: "HaechiVN" as const,
    }));
    const original = SEJONG_TOPIC_VOCABULARY.map((item) => ({ ...item, example: item.example, translation: item.translation, source: "HaechiVN" as const }));
    const imported = userDecks.flatMap((deck) => deck.cards.map((card) => ({
      korean: (card.koreanText || card.frontText || "").replace(/<[^>]*>/g, " ").trim(),
      meaning: (card.vietnameseMeaning || card.backText || "").replace(/<[^>]*>/g, " ").trim(),
      topic: deck.name,
      level: inferTopikLevel(deck.name, ...(card.tags || [])) ? `TOPIK ${inferTopikLevel(deck.name, ...(card.tags || []))}` : "Anki",
      example: card.exampleSentence || "",
      translation: "",
      source: "Anki" as const,
    })));
    const unique = new Map<string, TopicItem>();
    [...legacy, ...original, ...imported].filter((item) => item.korean && item.meaning).forEach((item) => {
      const key = item.korean.toLocaleLowerCase();
      if (!unique.has(key) || item.source === "HaechiVN") unique.set(key, item);
    });
    return [...unique.values()];
  }, [userDecks]);

  const topics = useMemo(() => ["Tất cả chủ đề", ...new Set(allItems.filter((item) => item.source !== "Anki").map((item) => item.topic)), ...new Set(userDecks.map((deck) => deck.name))], [allItems, userDecks]);
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return allItems.filter((item) => (level === "Tất cả" || item.level === level)
      && (topic === "Tất cả chủ đề" || item.topic === topic)
      && (!normalized || `${item.korean} ${item.meaning} ${item.example} ${item.translation}`.toLocaleLowerCase().includes(normalized)));
  }, [allItems, level, topic, query]);
  const visibleItems = filteredItems.slice(0, visibleCount);
  const levelCounts = useMemo(() => Object.fromEntries(TOPIK_LEVEL_GUIDE.map((entry) => [entry.level, allItems.filter((item) => item.level === entry.level).length])), [allItems]);

  function selectLevel(nextLevel: string) { setLevel(nextLevel); setVisibleCount(12); }
  function selectTopic(nextTopic: string) { setTopic(nextTopic); setVisibleCount(12); }
  function speak(text: string) { speakKorean(text); }

  if (practicePrompt) return <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
    <button onClick={() => { stopKoreanSpeech(); setPracticePrompt(null); }} className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white"><ChevronLeft className="h-4 w-4" />Danh sách từ</button>
    <KoreanPractice title="Luyện từ và câu" prompts={practicePrompt} autoPlay />
  </main>;

  return <div className="mx-auto max-w-6xl space-y-6 pb-24 animate-fadeIn">
    <header className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#102b36] via-[#122746] to-[#191c40] p-6 sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300"><Compass className="h-3.5 w-3.5" />Học theo ngữ cảnh · Lộ trình Sejong</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Chủ đề tiếng Hàn</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Học từ và mẫu câu theo chủ điểm thực tế, tăng dần từ TOPIK 1 đến TOPIK 6. Nội dung HaechiVN được biên soạn mới, tham chiếu cách phân cấp và chủ điểm giao tiếp của Sejong Hakdang.</p></div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3"><div className="rounded-xl bg-emerald-400/10 p-2 text-emerald-300"><BookOpen className="h-5 w-5" /></div><div><div className="text-xl font-black text-white">{allItems.length}</div><div className="text-[10px] text-slate-400">từ và cụm từ</div></div></div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {TOPIK_LEVEL_GUIDE.map((entry, index) => <button key={entry.level} onClick={() => selectLevel(entry.level)} aria-pressed={level === entry.level} className={`group rounded-2xl border p-3 text-left transition ${level === entry.level ? "border-emerald-400/60 bg-emerald-400/10" : "border-white/10 bg-slate-950/25 hover:border-white/25 hover:bg-slate-900/50"}`}><div className="flex items-center justify-between gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${level === entry.level ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>{index + 1}</span><span className="text-[10px] font-bold text-slate-500">{levelCounts[entry.level] || 0} từ</span></div><span className="mt-3 block text-xs font-black text-white">{entry.level}</span><span className="mt-0.5 block text-[10px] font-semibold text-emerald-300/80">{entry.course}</span><span className="mt-2 block text-[10px] leading-4 text-slate-400">{entry.description}</span></button>)}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2"><span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Lọc cấp độ</span>{LEVEL_FILTERS.map((item) => <button key={item} onClick={() => selectLevel(item)} aria-pressed={level === item} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${level === item ? "border-sky-400/60 bg-sky-400/10 text-sky-200" : "border-slate-700/80 bg-slate-950/20 text-slate-400 hover:border-slate-500 hover:text-white"}`}>{item}</button>)}</div>
      </div>
    </header>

    <section className="card-duo p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black text-white">Chọn chủ điểm</h2><p className="mt-1 text-xs text-slate-500">Lọc theo tình huống hoặc tìm từ bằng Hangul và nghĩa.</p></div><span className="rounded-full bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-slate-300">{filteredItems.length} kết quả</span></div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{topics.map((item) => <button key={item} onClick={() => selectTopic(item)} aria-pressed={topic === item} className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition ${topic === item ? "border-violet-400/50 bg-violet-400/10 text-violet-200" : "border-slate-700 bg-slate-950/40 text-slate-400 hover:text-white"}`}>{item}</button>)}</div>
      <label className="mt-4 flex max-w-xl items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 focus-within:border-sky-500"><Search className="h-4 w-4 shrink-0 text-slate-500" /><input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(12); }} className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600" placeholder="Tìm Hangul, nghĩa hoặc câu ví dụ…" /><kbd className="hidden rounded border border-slate-700 px-1.5 py-1 text-[10px] text-slate-500 sm:block">⌕</kbd></label>
    </section>

    {practicePrompt && <KoreanPractice title="Nghe chép & shadowing · Chủ đề tiếng Hàn" prompts={practicePrompt} />}

    <section aria-label="Từ vựng theo chủ đề" className="grid gap-3 lg:grid-cols-2">
      {visibleItems.length ? visibleItems.map((item) => <article key={`${item.source}-${item.korean}`} role="button" tabIndex={0} onClick={() => setPracticePrompt([{ korean: item.example || item.korean, translation: item.translation || item.meaning, label: `${item.topic} · câu ví dụ` }, ...(item.example ? [{ korean: item.korean, translation: item.meaning, label: `${item.topic} · từ trọng tâm` }] : [])])} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setPracticePrompt([{ korean: item.example || item.korean, translation: item.translation || item.meaning, label: `${item.topic} · câu ví dụ` }, ...(item.example ? [{ korean: item.korean, translation: item.meaning, label: `${item.topic} · từ trọng tâm` }] : [])]); } }} className="card-duo group cursor-pointer overflow-hidden p-5 transition hover:border-sky-500/50 hover:bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-sky-500/60">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-400/10 px-2.5 py-1 text-[10px] font-bold text-violet-200">{item.topic}</span><span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-[10px] font-bold text-sky-200">{item.level}</span>{item.source === "Anki" && <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold text-amber-200">Bộ Anki của bạn</span>}</div><h2 className="mt-3 break-words font-noto text-2xl font-black text-white">{item.korean}</h2></div><button onClick={(event) => { event.stopPropagation(); speak(item.korean); }} aria-label={`Nghe ${item.korean} bằng giọng trình duyệt`} className="shrink-0 rounded-xl border border-slate-700 bg-slate-950/30 p-3 text-sky-300 transition hover:border-sky-400 hover:bg-sky-400/10"><Volume2 className="h-5 w-5" /></button></div>
        <p className="mt-3 text-sm font-bold text-slate-100">{item.meaning}</p>
        {item.example && <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/45 p-3.5"><p className="font-noto text-sm leading-6 text-slate-100">{item.example}</p>{item.translation && <p className="mt-1.5 border-t border-slate-800 pt-2 text-xs leading-5 text-slate-400">{item.translation}</p>}</div>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><a onClick={(event) => event.stopPropagation()} href={`https://ko.dict.naver.com/#/search?query=${encodeURIComponent(item.korean)}`} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-slate-400 underline underline-offset-2 hover:text-white">Tra cứu Naver Dictionary ↗</a><span className="flex items-center gap-2 text-[11px] font-bold text-emerald-200"><Headphones className="h-4 w-4" />Chạm để học</span></div>
      </article>) : <div className="card-duo col-span-full p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400"><Search className="h-5 w-5" /></div><p className="mt-3 text-sm font-bold text-slate-200">Chưa tìm thấy từ phù hợp</p><p className="mt-1 text-xs text-slate-500">Thử chủ đề, cấp độ hoặc từ khóa khác.</p><button onClick={() => { setLevel("Tất cả"); setTopic("Tất cả chủ đề"); setQuery(""); }} className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-sky-300">Xóa bộ lọc</button></div>}
    </section>
    {filteredItems.length > visibleItems.length && <div className="text-center"><button onClick={() => setVisibleCount((count) => count + 12)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3 text-xs font-bold text-slate-200 hover:border-sky-500">Xem thêm {Math.min(12, filteredItems.length - visibleItems.length)} từ <ChevronRight className="h-4 w-4" /></button></div>}

    <section className="rounded-3xl border border-sky-500/15 bg-gradient-to-r from-[#111d38] to-[#171a3b] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-sky-300"><Sparkles className="h-3.5 w-3.5" />Học tiếp theo cách của bạn</p><h2 className="mt-2 text-lg font-black text-white">Biến từ mới thành phản xạ</h2><p className="mt-1 text-xs text-slate-400">Ôn lại, nghe nhận diện rồi luyện nói thành tiếng.</p></div><span className="rounded-full border border-slate-700 px-3 py-1.5 text-[10px] font-bold text-slate-400">{allItems.filter((item) => item.source === "Anki").length} thẻ Anki đã nhập</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Link href="/flashcards" className="group flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/35 p-4 transition hover:border-sky-400/60"><span className="rounded-xl bg-sky-400/10 p-2.5 text-sky-300"><Layers className="h-5 w-5" /></span><span className="flex-1"><span className="block text-xs font-black text-white">Flashcard SRS</span><span className="mt-1 block text-[10px] text-slate-500">Ôn đúng lúc, nhớ lâu hơn</span></span><ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-sky-300" /></Link><Link href="/dictation" className="group flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/35 p-4 transition hover:border-violet-400/60"><span className="rounded-xl bg-violet-400/10 p-2.5 text-violet-300"><Headphones className="h-5 w-5" /></span><span className="flex-1"><span className="block text-xs font-black text-white">Nghe chép</span><span className="mt-1 block text-[10px] text-slate-500">Nghe và nhận diện câu</span></span><ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-violet-300" /></Link><Link href="/shadowing" className="group flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/35 p-4 transition hover:border-emerald-400/60"><span className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300"><Check className="h-5 w-5" /></span><span className="flex-1"><span className="block text-xs font-black text-white">Shadowing</span><span className="mt-1 block text-[10px] text-slate-500">Bắt chước nhịp và ngữ điệu</span></span><ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-emerald-300" /></Link></div></section>
  </div>;
}
