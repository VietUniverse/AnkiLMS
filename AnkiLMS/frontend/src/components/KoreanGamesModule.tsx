"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "../contexts/AppProvider";
import { ApiClient } from "../lib/apiClient";
import { VOCABULARY_DATA } from "../data/koreanData";
import NIKL_KOREAN_VI from "../data/niklKoreanViVocabulary.json";
import { ArrowRight, Check, Clock3, Gamepad2, RotateCcw, Volume2 } from "lucide-react";

type Word = { korean: string; meaning: string; example?: string };
type Mode = "quiz" | "spell" | "match";

function shuffle<T,>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function KoreanGamesModule() {
  const { userDecks } = useApp();
  const words = useMemo(() => {
    const imported = userDecks.flatMap((deck) => deck.cards.map((card) => ({
      korean: (card.koreanText || card.frontText || "").replace(/<[^>]*>/g, "").trim(),
      meaning: (card.vietnameseMeaning || card.backText || "").replace(/<[^>]*>/g, "").trim(),
      example: card.exampleSentence,
    })));
    const dictionary = NIKL_KOREAN_VI.map((item) => ({ korean: item.hangul, meaning: item.vietnamese }));
    const merged = [...imported, ...VOCABULARY_DATA.map((item) => ({ korean: item.hangul, meaning: item.vietnamese, example: item.exampleSentence })), ...dictionary];
    const unique = new Map<string, Word>();
    merged.filter((item) => item.korean && item.meaning).forEach((item) => {
      const key = item.korean.normalize("NFC").toLocaleLowerCase();
      if (!unique.has(key)) unique.set(key, item);
    });
    return [...unique.values()];
  }, [userDecks]);

  const [mode, setMode] = useState<Mode | null>(null);
  const [round, setRound] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [matched, setMatched] = useState<string[]>([]);
  const [firstTile, setFirstTile] = useState<{ word: Word; face: "ko" | "vi" } | null>(null);
  const [matchMessage, setMatchMessage] = useState("");

  const current = round[index];
  const options = useMemo(() => {
    if (!current) return [];
    return shuffle([current, ...shuffle(words.filter((word) => word.korean !== current.korean)).slice(0, 3)]);
  }, [current, words]);

  function begin(nextMode: Mode) {
    if (words.length < 4) return;
    const nextRound = shuffle(words).slice(0, Math.min(10, words.length));
    setMode(nextMode); setRound(nextRound); setIndex(0); setCorrect(0); setAnswer(""); setSelected(null); setFinished(false); setStartedAt(Date.now()); setMatched([]); setFirstTile(null); setMatchMessage("");
  }

  function recordResult(nextCorrect: number) {
    if (index + 1 >= round.length) {
      setFinished(true);
      const xp = nextCorrect * 2;
      void ApiClient.recordStudySession(`game_${mode || "quiz"}`, round.length, nextCorrect, xp, Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
    } else {
      setIndex((value) => value + 1); setAnswer(""); setSelected(null);
    }
  }

  function submit(isCorrect: boolean) {
    if (selected !== null || !current) return;
    setSelected(isCorrect ? "correct" : "wrong");
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    if (isCorrect) setCorrect(nextCorrect);
    window.setTimeout(() => recordResult(nextCorrect), 650);
  }

  function checkSpelling() {
    if (!current || selected !== null) return;
    const expected = current.korean.normalize("NFC").replace(/[\s\p{P}\p{S}]/gu, "");
    const actual = answer.normalize("NFC").replace(/[\s\p{P}\p{S}]/gu, "");
    submit(actual === expected);
  }

  function handleTile(word: Word, face: "ko" | "vi") {
    if (matched.includes(word.korean) || matchMessage) return;
    if (!firstTile) { setFirstTile({ word, face }); return; }
    if (firstTile.face === face) { setMatchMessage("Hãy chọn thẻ ở phía còn lại để ghép."); window.setTimeout(() => setMatchMessage(""), 1000); return; }
    if (firstTile.word.korean === word.korean) {
      const next = [...matched, word.korean]; setMatched(next); setCorrect((value) => value + 1); setFirstTile(null);
      if (next.length === Math.min(6, round.length)) {
        void ApiClient.recordStudySession("game_match", next.length * 2, next.length, next.length * 2, Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
        setFinished(true);
      }
    } else { setMatchMessage("Chưa đúng, thử cặp khác nhé."); setFirstTile(null); window.setTimeout(() => setMatchMessage(""), 800); }
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "ko-KR"; utterance.rate = 0.85; window.speechSynthesis.speak(utterance);
  }

  const tiles = useMemo(() => mode === "match" ? shuffle([...round.slice(0, 6).flatMap((word) => [{ key: `${word.korean}:ko`, word, text: word.korean }, { key: `${word.korean}:vi`, word, text: word.meaning }])]) : [], [mode, round]);

  return <div className="mx-auto max-w-5xl space-y-6 animate-fadeIn">
    <header className="card-duo flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-fuchsia-300">Học qua trò chơi</p><h1 className="mt-2 text-2xl font-black text-white">Chơi để nhớ từ tiếng Hàn</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Luyện từ trong từ điển học tiếng Hàn và các bộ Anki bạn đã nhập. Kết quả đúng được ghi vào tiến độ học.</p></div><div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">{words.length.toLocaleString("vi-VN")} từ có nghĩa · {userDecks.length} bộ Anki</div></header>
    {!mode ? <div className="grid gap-4 md:grid-cols-3">
      {[{ id: "quiz" as const, title: "Thử thách từ vựng", info: "Chọn nghĩa đúng trong 4 đáp án.", icon: "🎯" }, { id: "spell" as const, title: "Nghe và gõ", info: "Nghe từ tiếng Hàn rồi gõ lại chính xác.", icon: "🎧" }, { id: "match" as const, title: "Ghép cặp nhanh", info: "Ghép từ tiếng Hàn với nghĩa tiếng Việt.", icon: "🧩" }].map((game) => <button key={game.id} onClick={() => begin(game.id)} disabled={words.length < 4} className="card-duo group flex min-h-52 flex-col items-start p-6 text-left transition hover:-translate-y-1 hover:border-fuchsia-500/50 disabled:opacity-50"><span className="text-4xl">{game.icon}</span><h2 className="mt-5 text-lg font-black text-white">{game.title}</h2><p className="mt-2 flex-1 text-sm text-slate-400">{game.info}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-fuchsia-300">Chơi ngay <ArrowRight className="h-4 w-4" /></span></button>)}
    </div> : finished ? <section className="card-duo mx-auto max-w-xl p-8 text-center"><div className="text-5xl">🏆</div><h2 className="mt-4 text-2xl font-black text-white">Hoàn thành lượt chơi!</h2><p className="mt-2 text-sm text-slate-300">Bạn ghép/đúng {correct} từ trong {mode === "match" ? Math.min(6, round.length) : round.length} từ.</p><p className="mt-2 text-xs text-emerald-300">XP từ lượt chơi đã được ghi nếu bạn đăng nhập.</p><div className="mt-6 flex justify-center gap-3"><button onClick={() => begin(mode)} className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-5 py-3 text-xs"><RotateCcw className="h-4 w-4" /> Chơi lại</button><button onClick={() => setMode(null)} className="rounded-xl border border-slate-700 px-5 py-3 text-xs font-bold text-slate-200">Chọn game khác</button></div></section> : mode === "match" ? <section className="card-duo p-5 sm:p-8"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold text-fuchsia-300">GHÉP CẶP</p><h2 className="mt-1 text-lg font-black text-white">Chọn một từ Hàn và nghĩa tương ứng</h2></div><span className="inline-flex items-center gap-1 text-xs text-slate-400"><Clock3 className="h-4 w-4" />{matched.length}/{Math.min(6, round.length)}</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{tiles.map((tile) => { const face = tile.key.endsWith(":ko") ? "ko" as const : "vi" as const; return <button key={tile.key} onClick={() => handleTile(tile.word, face)} disabled={matched.includes(tile.word.korean)} className={`min-h-20 rounded-xl border p-3 text-sm font-bold transition ${matched.includes(tile.word.korean) ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 opacity-60" : firstTile?.word.korean === tile.word.korean && firstTile.face === face ? "border-sky-400 bg-sky-500/15 text-white" : "border-slate-700 bg-slate-950/60 text-slate-200 hover:border-fuchsia-400"}`}>{tile.text}</button>; })}</div><p aria-live="polite" className="mt-4 min-h-5 text-center text-xs text-amber-300">{matchMessage}</p><button onClick={() => setMode(null)} className="mt-4 text-xs font-bold text-slate-500 hover:text-white">Thoát game</button></section> : current ? <section className="card-duo mx-auto max-w-2xl p-6 sm:p-8"><div className="mb-6 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-fuchsia-300">{mode === "quiz" ? "Trắc nghiệm" : "Nghe và gõ"}</span><span className="text-xs font-bold text-slate-400">{index + 1}/{round.length} · {correct} đúng</span></div>{mode === "quiz" ? <><div className="flex items-center justify-center gap-3 py-8"><h2 className="font-noto text-4xl font-black text-white">{current.korean}</h2><button onClick={() => speak(current.korean)} aria-label="Nghe phát âm" className="rounded-lg p-2 text-sky-300 hover:bg-sky-500/10"><Volume2 className="h-5 w-5" /></button></div><div className="grid gap-2 sm:grid-cols-2">{options.map((option) => <button key={option.korean} disabled={selected !== null} onClick={() => submit(option.korean === current.korean)} className={`rounded-xl border p-4 text-left text-sm font-bold transition ${selected === "correct" && option.korean === current.korean ? "border-emerald-500 bg-emerald-500/15 text-emerald-300" : selected === "wrong" && option.korean === current.korean ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-950/50 text-slate-200 hover:border-sky-500"}`}>{option.meaning}{selected && option.korean === current.korean && <Check className="ml-2 inline h-4 w-4" />}</button>)}</div></> : <><div className="py-8 text-center"><button onClick={() => speak(current.korean)} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 hover:bg-sky-500/25" aria-label="Phát từ tiếng Hàn"><Volume2 className="h-8 w-8" /></button><p className="mt-3 text-xs text-slate-400">Bấm để nghe, rồi gõ từ bạn nghe được</p><input value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") checkSpelling(); }} disabled={selected !== null} lang="ko" autoComplete="off" className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 text-center font-noto text-2xl font-bold text-white outline-none focus:border-sky-500" placeholder="한국어" />{selected && <p className={`mt-3 text-sm font-bold ${selected === "correct" ? "text-emerald-300" : "text-rose-300"}`}>{selected === "correct" ? "Chính xác!" : `Đáp án: ${current.korean} · ${current.meaning}`}</p>}<button onClick={checkSpelling} disabled={!answer.trim() || selected !== null} className="btn-duo btn-duo-primary mt-4 px-6 py-3 text-xs disabled:opacity-40">Kiểm tra</button></div></>}</section> : null}
    <footer className="flex flex-wrap gap-3 text-xs"><Link href="/flashcards" className="rounded-xl border border-slate-700 px-4 py-3 font-bold text-slate-300 hover:border-sky-500">Ôn flashcard SRS</Link><Link href="/dictation" className="rounded-xl border border-slate-700 px-4 py-3 font-bold text-slate-300 hover:border-sky-500">Luyện nghe chép</Link><Link href="/shadowing" className="rounded-xl border border-slate-700 px-4 py-3 font-bold text-slate-300 hover:border-sky-500">Shadowing</Link></footer>
  </div>;
}
