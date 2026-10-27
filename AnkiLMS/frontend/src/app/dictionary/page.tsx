"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, Search, Volume2 } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { DictionaryEntry, naverLookupUrl, searchLearningDictionary } from "../../lib/dictionarySearch";
import { useTranslationLanguage } from "../../lib/translationPreference";

export default function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [translationLanguage] = useTranslationLanguage();

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") || "");
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      void searchLearningDictionary(query, 60, controller.signal, translationLanguage).then((found) => {
        if (!cancelled) setResults(found);
      }).catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Không tải được từ điển.");
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, 120);
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timer); };
  }, [query, translationLanguage]);

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
      <p className="text-xs font-bold uppercase tracking-widest text-sky-300">Tra cứu tiếng Hàn</p>
      <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Từ điển học tiếng Hàn</h1>
      <p className="mt-2 text-sm text-slate-300">155.186 dạng từ Hàn đã loại trùng: 48.620 nghĩa Việt, 48.780 nghĩa Anh và 47.679 nghĩa Nhật. Tìm bằng Hangul hoặc nghĩa theo ngôn ngữ đã chọn.</p>
      <label className="mt-5 flex items-center gap-3 rounded-2xl border border-sky-500/40 bg-[#091630] px-4 py-3">
        <Search className="h-5 w-5 shrink-0 text-sky-300" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }} placeholder={translationLanguage === "vi" ? "Nhập Hangul hoặc nghĩa tiếng Việt…" : translationLanguage === "en" ? "Nhập Hangul hoặc nghĩa tiếng Anh…" : "Nhập Hangul hoặc nghĩa tiếng Nhật…"} aria-label="Tìm từ trong từ điển tiếng Hàn" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
        <span>Nguồn: <a className="text-sky-300 underline" href="https://huggingface.co/datasets/binjang/NIKL-korean-english-dictionary" target="_blank" rel="noopener noreferrer">NIKL Korean–English</a></span>
        <span>·</span>
        <span>Biến thể: <a className="text-sky-300 underline" href="https://github.com/Lyroxide/yomichan-ko-dic" target="_blank" rel="noopener noreferrer">Yomichan Korean</a></span>
      </div>
    </section>

    {!query.trim() ? <section className="card-duo p-8 text-center text-slate-300"><BookOpen className="mx-auto mb-3 h-8 w-8 text-sky-300" />Nhập từ để bắt đầu tra cứu.</section>
      : loading ? <section className="card-duo p-8 text-center text-slate-300">Đang tìm từ…</section>
      : error ? <section className="card-duo p-8 text-center text-rose-300">{error}</section>
      : <section className="space-y-3">
        <p className="text-sm font-bold text-slate-300">{results.length ? `Hiển thị ${results.length} kết quả đầu tiên` : "Không tìm thấy nghĩa trong dữ liệu hiện có."}</p>
        {results.map((entry, index) => <article key={`${entry.hangul}-${index}`} className="card-duo p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-noto text-xl font-black text-white">{entry.hangul}</h2>
                {entry.partOfSpeech && <span className="rounded-lg bg-sky-500/15 px-2 py-1 text-[11px] font-bold text-sky-300">{entry.partOfSpeech}</span>}
                {entry.level && <span className="rounded-lg bg-violet-500/15 px-2 py-1 text-[11px] font-bold text-violet-300">{entry.level}</span>}
              </div>
              {(translationLanguage === "vi" ? entry.vietnamese : translationLanguage === "en" ? entry.english : entry.japanese)
                ? <p className="mt-2 text-sm text-emerald-200"><strong>{translationLanguage.toUpperCase()}</strong> · {translationLanguage === "vi" ? entry.vietnamese : translationLanguage === "en" ? entry.english : entry.japanese}</p>
                : <p className="mt-2 text-sm text-amber-300">Chưa có mục từ nghĩa {translationLanguage.toUpperCase()} trong nguồn dữ liệu này.</p>}
              {entry.vietnamese && translationLanguage !== "vi" && <p className="mt-1 text-sm text-slate-200"><strong>VI</strong> · {entry.vietnamese}</p>}
              {entry.english && translationLanguage !== "en" && <p className="mt-1 text-sm text-slate-200"><strong>EN</strong> · {entry.english}</p>}
              {entry.japanese && translationLanguage !== "ja" && <p className="mt-1 text-sm text-slate-200"><strong>JA</strong> · {entry.japanese}</p>}
              {entry.source === "yomichan" && <p className="mt-2 text-sm text-slate-300">Có trong chỉ mục Hàn–Nhật. Mở từ điển nguồn để xem nghĩa.</p>}
            </div>
            <button onClick={() => speak(entry.hangul)} aria-label={`Nghe ${entry.hangul}`} className="shrink-0 rounded-xl bg-sky-500/15 p-2 text-sky-300"><Volume2 className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
            <a href={naverLookupUrl(entry.hangul)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-300 hover:underline">Tra Naver <ExternalLink className="h-3.5 w-3.5" /></a>
            <Link href="/flashcards" className="text-violet-300 hover:underline">Ôn tập từ vựng</Link>
          </div>
        </article>)}
        {!results.length && <a href={naverLookupUrl(query.trim())} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-sky-300 hover:underline">Tra từ này trên Naver <ExternalLink className="h-4 w-4" /></a>}
      </section>}
  </main></AppShell>;
}
