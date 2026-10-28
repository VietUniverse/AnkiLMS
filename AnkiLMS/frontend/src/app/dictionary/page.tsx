"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, Search, Volume2 } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { browseLearningDictionary, detectDictionarySearchLanguage, DictionaryEntry, DictionaryLevel, naverLookupUrl, searchLearningDictionary } from "../../lib/dictionarySearch";

type NaverLookup = {
  hangul: string;
  hanja: string;
  pronunciation: string;
  importance: number;
  topik: string;
  partOfSpeech: string;
  meanings: Array<{ meaning: string; english: string; korean: string; example: string; partOfSpeech: string }>;
};

export default function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [naverEntry, setNaverEntry] = useState<NaverLookup | null>(null);
  const [naverLoading, setNaverLoading] = useState(false);
  const [naverError, setNaverError] = useState("");
  const [level, setLevel] = useState<DictionaryLevel>("all");
  const [page, setPage] = useState(0);
  const levelFilters: Array<{ value: DictionaryLevel; label: string }> = [
    { value: "all", label: "Tất cả cấp" },
    ...([1, 2, 3, 4, 5, 6] as const).map((rank) => ({ value: `TOPIK ${rank}` as DictionaryLevel, label: `TOPIK ${rank}` })),
  ];

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") || "");
  }, []);

  useEffect(() => {
    if (!query.trim() && level === "all") { setResults([]); setLoading(false); return; }
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      const lookup = query.trim()
        ? searchLearningDictionary(query, 60, controller.signal, detectDictionarySearchLanguage(query), level)
        : browseLearningDictionary(level, "vi", page * 30, 30);
      void lookup.then((found) => {
        if (!cancelled) setResults(found);
      }).catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Không tải được từ điển.");
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, 100);
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timer); };
  }, [query, level, page]);

  useEffect(() => {
    const term = query.trim();
    if ((!/[가-힣]/u.test(term) && !/^[a-z][a-z\s.-]*$/iu.test(term)) || term.length < 2 || term.length > 60) {
      setNaverEntry(null);
      setNaverLoading(false);
      setNaverError("");
      return;
    }
    const controller = new AbortController();
    setNaverLoading(true);
    setNaverError("");
    const timer = window.setTimeout(() => {
      void fetch(`/api/dictionary/naver?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then(async (response) => {
          const data = await response.json() as { entry?: NaverLookup | null; error?: string };
          if (!response.ok) throw new Error(data.error || "Không tra được Naver.");
          setNaverEntry(data.entry || null);
        })
        .catch((cause) => {
          if (!controller.signal.aborted) {
            setNaverEntry(null);
            setNaverError(cause instanceof Error ? cause.message : "Không tra được Naver.");
          }
        })
        .finally(() => { if (!controller.signal.aborted) setNaverLoading(false); });
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);

  function speak(word: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "ko-KR";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  return <AppShell><main className="mx-auto max-w-5xl space-y-5 pb-12">
    <section className="card-duo p-5 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-sky-300">Tra cứu từ điển đa ngôn ngữ</p>
      <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Từ điển Hàn · Việt · Anh</h1>
      <p className="mt-2 text-sm text-slate-300">Gõ tiếng Việt, Hangul hoặc tiếng Anh trong cùng một ô. Hệ thống tự nhận biết ngôn ngữ và tìm nghĩa tương ứng.</p>
      <label className="mt-5 flex items-center gap-3 rounded-2xl border border-sky-500/40 bg-[#091630] px-4 py-3">
        <Search className="h-5 w-5 shrink-0 text-sky-300" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }} placeholder="Nhập tiếng Việt, Hangul hoặc English…" aria-label="Tìm bằng tiếng Việt, tiếng Hàn hoặc tiếng Anh" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400" />
      </label>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Lọc theo cấp từ điển">
        {levelFilters.map((item) => <button key={item.value} type="button" onClick={() => { setLevel(item.value); setPage(0); }} aria-pressed={level === item.value} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${level === item.value ? "border-sky-400 bg-sky-500/20 text-sky-200" : "border-slate-700 text-slate-300 hover:border-sky-500/50"}`}>{item.label}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
        <span>Nguồn từ điển: <a className="text-sky-300 underline" href="https://huggingface.co/datasets/binjang/NIKL-korean-english-dictionary" target="_blank" rel="noopener noreferrer">NIKL Korean–English</a></span>
        <span>·</span>
        <span>Biến thể: <a className="text-sky-300 underline" href="https://github.com/Lyroxide/yomichan-ko-dic" target="_blank" rel="noopener noreferrer">Yomichan Korean</a></span>
        <span>·</span>
        <span>Khóa học tiếng Hàn · 6 cấp TOPIK</span>
      </div>
    </section>

    {!query.trim() && level === "all" ? <section className="card-duo p-8 text-center text-slate-300"><BookOpen className="mx-auto mb-3 h-8 w-8 text-sky-300" />Nhập tiếng Việt, Hangul hoặc English để tra cứu.</section>
      : loading ? <section className="card-duo p-8 text-center text-slate-300">Đang tìm từ…</section>
      : error ? <section className="card-duo p-8 text-center text-rose-300">{error}</section>
      : <section className="space-y-3">
        {naverLoading && <article className="card-duo p-4 text-sm text-slate-300">Đang tra cứu trực tiếp trên Naver…</article>}
        {naverError && <article className="card-duo p-4 text-sm text-amber-300">{naverError}</article>}
        {naverEntry && <article className="card-duo border border-emerald-500/30 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-300">NAVER DICTIONARY · TRA CỨU TRỰC TIẾP</span>{naverEntry.topik && <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-300">{naverEntry.topik}</span>}{naverEntry.importance > 0 && <span className="text-amber-300">{"★".repeat(naverEntry.importance)}</span>}</div>
          <h2 className="mt-3 font-noto text-2xl font-black text-white">{naverEntry.hangul}{naverEntry.hanja && <span className="ml-2 text-base font-semibold text-slate-300">{naverEntry.hanja}</span>}</h2>
          {naverEntry.pronunciation && <p className="mt-1 text-sm text-slate-300">{naverEntry.pronunciation}</p>}
          {naverEntry.meanings.map((meaning, index) => <div key={`${meaning.meaning}-${index}`} className="mt-3 border-t border-slate-700/70 pt-3">
            <p className="text-sm font-bold text-emerald-200">{meaning.meaning}{meaning.partOfSpeech && <span className="ml-2 text-xs font-medium text-slate-300">{meaning.partOfSpeech}</span>}</p>
            {meaning.english && <p className="mt-1 text-sm text-slate-200">{meaning.english}</p>}
            {meaning.korean && <p className="mt-1 text-sm text-slate-300">{meaning.korean}</p>}
            {meaning.example && <p className="mt-2 font-noto text-sm text-sky-200">예: {meaning.example}</p>}
          </div>)}
          <a href={naverLookupUrl(naverEntry.hangul)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-sky-300 hover:underline">Naver에서 원문 보기 <ExternalLink className="h-3.5 w-3.5" /></a>
        </article>}
        <p className="text-sm font-bold text-slate-300">{results.length ? `${query.trim() ? `Tìm thấy ${results.length} kết quả phù hợp` : `Danh sách ${level === "all" ? "tất cả cấp" : level} · trang ${page + 1}`}` : "Không tìm thấy nghĩa trong dữ liệu hiện có."}</p>
        {results.map((entry, index) => <article key={`${entry.hangul}-${index}`} className="card-duo p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-noto text-xl font-black text-white">{entry.hangul}</h2>
                {entry.partOfSpeech && <span className="rounded-lg bg-sky-500/15 px-2 py-1 text-[11px] font-bold text-sky-300">{entry.partOfSpeech}</span>}
                {entry.level && <span className="rounded-lg bg-violet-500/15 px-2 py-1 text-[11px] font-bold text-violet-300">{entry.level}</span>}
                {entry.topik && <span className="rounded-lg bg-violet-500/15 px-2 py-1 text-[11px] font-bold text-violet-300">{entry.topik}</span>}
                {entry.topic && <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-300">{entry.topic}</span>}
              </div>
              {(entry.romanization || entry.hanja || entry.pronunciation) && <p className="mt-1 text-xs text-slate-400">{[entry.romanization, entry.hanja, entry.pronunciation].filter(Boolean).join(" · ")}</p>}
              {entry.vietnamese ? <p className="mt-2 text-sm text-emerald-200"><strong>VI</strong> · {entry.vietnamese}</p> : <p className="mt-2 text-sm text-amber-300">Mục này chưa có nghĩa tiếng Việt.</p>}
              {entry.english && <p className="mt-1 text-sm text-slate-200"><strong>EN</strong> · {entry.english}</p>}
              {entry.japanese && <p className="mt-1 text-sm text-slate-200"><strong>JA</strong> · {entry.japanese}</p>}
              {entry.source === "yomichan" && <p className="mt-2 text-sm text-slate-300">Có trong chỉ mục Hàn–Nhật. Mở từ điển nguồn để xem nghĩa.</p>}
              {entry.source === "topic-pdf" && <p className="mt-2 text-xs text-slate-400">Từ đầu mục trong danh sách TOPIK theo chủ đề; nghĩa hiển thị khi có trong dữ liệu từ điển HaechiVN.</p>}
              {entry.source === "course-vocabulary" && <p className="mt-2 text-xs text-slate-400">Có trong bộ từ theo khóa học; mở mục Ôn từ vựng rồi chọn cấp TOPIK tương ứng để học bằng SRS.</p>}
            </div>
            <button onClick={() => speak(entry.hangul)} aria-label={`Nghe ${entry.hangul}`} className="shrink-0 rounded-xl bg-sky-500/15 p-2 text-sky-300"><Volume2 className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
            <a href={naverLookupUrl(entry.hangul)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-300 hover:underline">Tra Naver <ExternalLink className="h-3.5 w-3.5" /></a>
            <Link href="/flashcards" className="text-violet-300 hover:underline">Ôn tập từ vựng</Link>
          </div>
        </article>)}
        {!results.length && <a href={naverLookupUrl(query.trim())} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-sky-300 hover:underline">Tra từ này trên Naver <ExternalLink className="h-4 w-4" /></a>}
        {!query.trim() && level !== "all" && <div className="flex justify-center gap-3 pt-3"><button disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 disabled:opacity-40">Trước</button><button disabled={results.length < 30} onClick={() => setPage((current) => current + 1)} className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 disabled:opacity-40">Tiếp</button></div>}
      </section>}
  </main></AppShell>;
}
