"use client";

import React, { useMemo, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { CURATED_DECKS, curatedDeckToAnkiDeck, type CuratedDeckItem } from "../../data/curatedDecks";
import { Check, Plus } from "lucide-react";

type DeckKind = "all" | "vocab" | "grammar";

const kindOf = (deck: CuratedDeckItem): "vocab" | "grammar" =>
  /grammar|ngữ pháp/i.test(`${deck.id} ${deck.title} ${deck.categoryLabel}`) ? "grammar" : "vocab";

const cardCountOf = (deck: CuratedDeckItem) => deck.cardCount || deck.cards.length;

/** Thư viện bộ thẻ TOPIK: xem nhanh, thêm/bỏ khỏi kho thẻ của mình. */
export default function VocabularyLibraryPage() {
  const { userDecks, handleDeckImported, handleRemoveDeck, currentUser, handleOpenAuth } = useApp();
  const [kind, setKind] = useState<DeckKind>("all");

  const decks = useMemo(() => CURATED_DECKS.filter((deck) => kind === "all" || kindOf(deck) === kind), [kind]);
  const totalCards = useMemo(() => decks.reduce((sum, deck) => sum + cardCountOf(deck), 0), [decks]);

  const isAdded = (deck: CuratedDeckItem) => {
    const target = curatedDeckToAnkiDeck(deck);
    return userDecks.some((owned) => owned.id === target.id || owned.name === target.name);
  };

  const toggleDeck = (deck: CuratedDeckItem) => {
    if (!currentUser) return handleOpenAuth(true);
    const target = curatedDeckToAnkiDeck(deck);
    if (isAdded(deck)) handleRemoveDeck(target.id);
    else handleDeckImported(target);
  };

  const chips: Array<{ key: DeckKind; label: string }> = [
    { key: "all", label: "Tất cả" },
    { key: "vocab", label: "Từ vựng" },
    { key: "grammar", label: "Ngữ pháp" },
  ];

  return (
    <AppShell>
      <main className="mx-auto w-full min-w-0 max-w-4xl flex-1 px-4 pb-16 pt-2 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">Thư viện thẻ</p>
            <h1 className="mt-1 text-2xl font-black text-stone-900 dark:text-white sm:text-3xl">Từ vựng &amp; ngữ pháp</h1>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
              Chọn bộ thẻ để thêm vào kho thẻ của bạn rồi ôn tập trong mục Từ vựng.
            </p>
          </div>
          <p className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
            {decks.length} bộ thẻ · {totalCards.toLocaleString("vi-VN")} thẻ
          </p>
        </header>

        <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Lọc bộ thẻ">
          {chips.map((chip) => {
            const active = kind === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setKind(chip.key)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                  active
                    ? "border-stone-900 bg-stone-900 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-stone-950"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300 dark:hover:bg-stone-800/60"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
          <span className="ml-auto text-[11px] font-mono text-stone-500 dark:text-stone-400">
            {`Kho thẻ: ${userDecks.length} bộ`}
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs dark:border-stone-800 dark:bg-stone-900/60">
          {decks.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-stone-500 dark:text-stone-400">Chưa có bộ thẻ nào trong mục này.</p>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
              {decks.map((deck) => {
                const added = isAdded(deck);
                return (
                  <li key={deck.id} className="flex items-center gap-3 px-4 py-4 sm:px-5">
                    <span className="w-14 shrink-0 text-right text-sm font-black text-stone-900 dark:text-white">
                      {cardCountOf(deck).toLocaleString("vi-VN")}
                      <span className="block text-[10px] font-medium text-stone-500 dark:text-stone-400">thẻ</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={`/explore/${deck.id}`}
                        className="block truncate text-xs font-bold text-stone-900 hover:underline dark:text-stone-100 sm:text-sm"
                      >
                        {deck.title}
                      </a>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-stone-500 dark:text-stone-400">{deck.description}</p>
                    </div>
                    <span className="hidden shrink-0 rounded-full border border-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-500 dark:border-stone-700 dark:text-stone-400 sm:inline">
                      {kindOf(deck) === "grammar" ? "Ngữ pháp" : "Từ vựng"}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleDeck(deck)}
                      aria-pressed={added}
                      aria-label={`${added ? "Bỏ" : "Thêm"} ${deck.title}`}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition ${
                        added
                          ? "border-stone-200 bg-stone-100 text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                          : "border-stone-900 bg-stone-900 text-white hover:bg-stone-800 dark:border-emerald-500 dark:bg-emerald-500 dark:text-stone-950 dark:hover:bg-emerald-400"
                      }`}
                    >
                      {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {added ? "Đã thêm" : "Thêm"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </AppShell>
  );
}
