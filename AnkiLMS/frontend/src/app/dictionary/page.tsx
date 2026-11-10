"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, Search, Volume2, X } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { CURATED_DECKS } from "../../data/curatedDecks";
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
  const { userDecks, currentUser } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [naverEntry, setNaverEntry] = useState<NaverLookup | null>(null);
  const [naverLoading, setNaverLoading] = useState(false);
  const [naverError, setNaverError] = useState("");
  const [showAllNaver, setShowAllNaver] = useState(false);
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
    // Tra Naver cần đăng nhập (máy chủ chặn khách), nên khách chỉ thấy kết quả NIKL.
    if (!currentUser || (!/[가-힣]/u.test(term) && !/^[a-z][a-z\s.-]*$/iu.test(term)) || term.length < 2 || term.length > 60) {
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
  }, [query, currentUser]);

  // Chủ đề có thể gồm nhiều nhãn nối bằng " · ": chỉ hiện 2 nhãn đầu, còn lại ghi "+N".
  function topicLabel(topic: string) {
    const parts = topic.split(" · ").map((part) => part.trim()).filter(Boolean);
    return parts.length > 2 ? `${parts.slice(0, 2).join(", ")} +${parts.length - 2}` : parts.join(", ");
  }

  function speak(word: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "ko-KR";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  function studyHref(entry: DictionaryEntry) {
    const curatedDeck = CURATED_DECKS.find((deck) => deck.cards.some((card) =>
      (card.koreanText || card.frontText).trim() === entry.hangul,
    ));
    const deckId = entry.courseId ? `curated-course-${entry.courseId}` : curatedDeck ? `curated-${curatedDeck.id}` : "";
    const deckName = curatedDeck?.title || entry.topic || "";
    const alreadyAdded = deckId
      ? userDecks.some((deck) => deck.id === deckId || (deckName && deck.name === deckName))
      : userDecks.some((deck) => deck.cards.some((card) => (card.koreanText || card.frontText).trim() === entry.hangul));
    if (alreadyAdded) return "/flashcards";
    const exploreId = entry.courseId ? `course-${entry.courseId}` : curatedDeck?.id;
    return exploreId
      ? `/explore/${exploreId}?word=${encodeURIComponent(entry.hangul)}`
      : `/explore?search=${encodeURIComponent(entry.hangul)}`;
  }

  const card = "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70";
  const tag = "rounded-md px-1.5 py-0.5 text-[11px] font-bold";
  const browsing = !query.trim() && level === "all";
  const naverMeanings = naverEntry ? (showAllNaver ? naverEntry.meanings : naverEntry.meanings.slice(0, 2)) : [];

  return <AppShell><main className="mx-auto max-w-3xl space-y-4 pb-20 text-stone-900 dark:text-stone-100">
    <div className="space-y-3">
      <h1 className="text-2xl font-black tracking-tight">Từ điển</h1>
      <label className="flex h-12 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 dark:border-stone-700 dark:bg-stone-900">
        <Search className="h-5 w-5 shrink-0 text-stone-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }} placeholder="Gõ tiếng Việt, Hangul hoặc English" aria-label="Tìm bằng tiếng Việt, tiếng Hàn hoặc tiếng Anh" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-stone-400" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Xóa từ khóa" className="shrink-0 rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"><X className="h-4 w-4" /></button>}
      </label>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Lọc theo cấp TOPIK">
        {levelFilters.map((item) => <button key={item.value} type="button" onClick={() => { setLevel(item.value); setPage(0); }} aria-pressed={level === item.value} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${level === item.value ? "bg-sky-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"}`} style={level === item.value ? { color: "#fff" } : undefined}>{item.label}</button>)}
      </div>
    </div>

    {browsing ? <section className={`${card} px-6 py-12 text-center text-sm text-stone-500 dark:text-stone-400`}><BookOpen className="mx-auto mb-3 h-8 w-8 text-sky-500" />Tra từ bằng tiếng Việt, Hangul hoặc English.<br />Hoặc chọn một cấp TOPIK để duyệt danh sách.</section>
      : loading ? <section className={`${card} p-8 text-center text-sm text-stone-500 dark:text-stone-400`}>Đang tìm từ…</section>
      : error ? <section className={`${card} p-8 text-center text-sm text-rose-600`}>{error}</section>
      : <section className="space-y-3">
        {naverLoading && <p className="text-xs text-stone-500 dark:text-stone-400">Đang tra Naver…</p>}
        {naverError && <p className="text-xs text-amber-600">{naverError}</p>}
        {naverEntry && <article className={`${card} border-emerald-500/40 p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`${tag} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>Naver</span>
            {naverEntry.topik && <span className={`${tag} bg-sky-500/10 text-sky-700 dark:text-sky-300`}>{naverEntry.topik}</span>}
            {naverEntry.importance > 0 && <span className="text-xs text-amber-500">{"★".repeat(naverEntry.importance)}</span>}
          </div>
          <h2 className="mt-2 font-noto text-2xl font-black">{naverEntry.hangul}{naverEntry.hanja && <span className="ml-2 text-base font-semibold text-stone-500 dark:text-stone-400">{naverEntry.hanja}</span>}</h2>
          {naverMeanings.map((meaning, index) => <div key={`${meaning.meaning}-${index}`} className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{meaning.meaning}{meaning.partOfSpeech && <span className="ml-2 text-xs font-medium text-stone-500 dark:text-stone-400">{meaning.partOfSpeech}</span>}</p>
            {meaning.english && <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{meaning.english}</p>}
            {meaning.example && <p className="mt-1.5 font-noto text-sm text-sky-700 dark:text-sky-300">{meaning.example}</p>}
          </div>)}
          <div className="mt-3 flex items-center justify-between">
            {naverEntry.meanings.length > 2 ? <button type="button" onClick={() => setShowAllNaver(!showAllNaver)} className="text-xs font-bold text-sky-600 hover:underline dark:text-sky-400 cursor-pointer">{showAllNaver ? "Thu gọn" : `Xem thêm ${naverEntry.meanings.length - 2} nghĩa`}</button> : <span />}
            <a href={naverLookupUrl(naverEntry.hangul)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline dark:text-sky-400">Mở Naver <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>
        </article>}

        <p className="px-1 text-xs font-semibold text-stone-500 dark:text-stone-400">{results.length ? (query.trim() ? `${results.length} kết quả` : `${level === "all" ? "Tất cả cấp" : level}, trang ${page + 1}`) : "Không tìm thấy nghĩa trong dữ liệu hiện có."}</p>
        {results.map((entry, index) => {
          const href = studyHref(entry);
          return <article key={`${entry.hangul}-${index}`} className={`${card} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h2 className="font-noto text-xl font-black">{entry.hangul}</h2>
                {entry.hanja && <span className="text-sm text-stone-400">{entry.hanja}</span>}
                {entry.partOfSpeech && <span className={`${tag} bg-sky-500/10 text-sky-700 dark:text-sky-300`}>{entry.partOfSpeech}</span>}
                {(entry.topik || entry.level) && <span className={`${tag} bg-violet-500/10 text-violet-700 dark:text-violet-300`}>{entry.topik || entry.level}</span>}
                {entry.topic && <span className={`${tag} bg-amber-500/10 text-amber-700 dark:text-amber-300`}>{topicLabel(entry.topic)}</span>}
              </div>
              {entry.vietnamese ? <p className="mt-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{entry.vietnamese}</p> : <p className="mt-1.5 text-sm text-amber-600">Chưa có nghĩa tiếng Việt.</p>}
              {entry.english && <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">{entry.english}</p>}
              {entry.japanese && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{entry.japanese}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => speak(entry.hangul)} aria-label={`Nghe ${entry.hangul}`} title="Nghe phát âm" className="rounded-xl p-2 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400 cursor-pointer"><Volume2 className="h-5 w-5" /></button>
              <a href={naverLookupUrl(entry.hangul)} target="_blank" rel="noopener noreferrer" aria-label={`Tra ${entry.hangul} trên Naver`} title="Tra Naver" className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"><ExternalLink className="h-5 w-5" /></a>
            </div>
          </div>
          <Link href={href} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:underline dark:text-violet-300">{href === "/flashcards" ? "Mở flashcard" : "Xem bộ thẻ để học"}</Link>
        </article>;
        })}
        {!results.length && <a href={naverLookupUrl(query.trim())} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-sky-600 hover:underline dark:text-sky-400">Tra từ này trên Naver <ExternalLink className="h-4 w-4" /></a>}
        {!query.trim() && level !== "all" && <div className="flex justify-center gap-3 pt-2"><button disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="rounded-xl border border-stone-200 px-5 py-2.5 text-xs font-bold hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800 cursor-pointer">Trước</button><button disabled={results.length < 30} onClick={() => setPage((current) => current + 1)} className="rounded-xl border border-stone-200 px-5 py-2.5 text-xs font-bold hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800 cursor-pointer">Tiếp</button></div>}
      </section>}
  </main></AppShell>;
}
