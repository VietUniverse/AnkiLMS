"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { CURATED_DECKS, curatedDeckToAnkiDeck, CuratedDeckItem } from "../../data/curatedDecks";
import { DeckIcon } from "../../components/DeckIcon";
import {
  Layers,
  Search,
  Check,
  Plus,
  BookOpen,
  Sparkles,
  ArrowRight,
  Eye,
  Trash2,
} from "lucide-react";

export default function ExplorePage() {
  const { userDecks, handleDeckImported, handleRemoveDeck } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [previewDeckId, setPreviewDeckId] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  // Check if a curated deck is already inside userDecks
  const isDeckAdded = (deck: CuratedDeckItem) => {
    const targetAnkiDeck = curatedDeckToAnkiDeck(deck);
    return userDecks.some(
      (ud) => ud.id === targetAnkiDeck.id || ud.name === targetAnkiDeck.name
    );
  };

  const handleAddDeck = (deck: CuratedDeckItem) => {
    const ankiDeck = curatedDeckToAnkiDeck(deck);
    handleDeckImported(ankiDeck);
    setAddedNotice(`Đã thêm bộ thẻ "${deck.title}" vào Kho thẻ!`);
    setTimeout(() => setAddedNotice(null), 3500);
  };

  const handleRemoveCurated = (deck: CuratedDeckItem) => {
    const ankiDeck = curatedDeckToAnkiDeck(deck);
    handleRemoveDeck(ankiDeck.id);
  };

  const categories = [
    { id: "all", label: "Tất cả bộ thẻ" },
    { id: "food", label: "Quán ăn & Ẩm thực" },
    { id: "topik", label: "TOPIK I/II" },
    { id: "conversation", label: "Giao tiếp đời sống" },
    { id: "drama", label: "K-Drama & Slang" },
    { id: "hanja", label: "Gốc từ Hán Hàn" },
    { id: "travel", label: "Du lịch & Sân bay" },
    { id: "work", label: "Nhà xưởng EPS" },
  ];

  const filteredDecks = useMemo(() => {
    return CURATED_DECKS.filter((deck) => {
      const matchCat = selectedCategory === "all" || deck.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        deck.title.toLowerCase().includes(q) ||
        deck.description.toLowerCase().includes(q) ||
        deck.tags.some((t) => t.toLowerCase().includes(q)) ||
        deck.cards.some(
          (c) =>
            (c.koreanText || "").toLowerCase().includes(q) ||
            (c.vietnameseMeaning || "").toLowerCase().includes(q)
        );
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <AppShell>
      <div className="space-y-6 pb-20 animate-fadeIn">
        {/* Toast Thông Báo Khi Thêm Thẻ */}
        {addedNotice && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-900/30 font-medium text-xs animate-slideUp">
            <Check className="w-4 h-4 shrink-0" />
            <span>{addedNotice}</span>
            <Link
              href="/flashcards"
              className="ml-2 underline font-bold hover:text-emerald-100"
            >
              Xem ngay →
            </Link>
          </div>
        )}

        {/* Banner Header */}
        <div className="card-duo p-6 sm:p-8 bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border-sky-500/30 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Thư Viện Bộ Thẻ Mở Rộng
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Khám Phá Bộ Thẻ Tiếng Hàn
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Lựa chọn các bộ thẻ chất lượng cao (TOPIK, giao tiếp đời sống, từ lóng phim ảnh, gốc từ Hán Hàn) và thêm ngay vào Kho thẻ flashcard của bạn để luyện tập cùng thuật toán FSRS.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/flashcards"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              Đến Kho Thẻ (/flashcards)
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Thanh Tìm Kiếm & Tabs Phân Loại */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-sky-500 text-white shadow-md shadow-sky-900/30"
                    : "bg-white dark:bg-stone-900/60 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bộ thẻ, từ vựng..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-sky-400 transition"
            />
          </div>
        </div>

        {/* Danh Sách Bộ Thẻ Tuyển Chọn */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDecks.map((deck) => {
            const added = isDeckAdded(deck);
            const isPreviewing = previewDeckId === deck.id;

            return (
              <div
                key={deck.id}
                className="card-duo p-5 flex flex-col justify-between border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70 hover:border-sky-400/50 dark:hover:border-sky-500/50 transition duration-200 shadow-sm"
              >
                <div>
                  {/* Top Meta */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                      <DeckIcon name={deck.iconName} className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${deck.badgeColor}`}>
                        {deck.categoryLabel}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700/60">
                        {deck.level}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <Link
                    href={`/explore/${deck.id}`}
                    className="block group cursor-pointer"
                  >
                    <h3 className="text-base font-bold text-stone-900 dark:text-white leading-snug group-hover:text-sky-500 transition">
                      {deck.title}
                    </h3>
                  </Link>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {deck.description}
                  </p>

                  {/* Tags & Count */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100 dark:border-stone-800/80 text-[11px] text-stone-400">
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {deck.cards.length} thẻ học
                    </span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      {deck.tags.map((t) => (
                        <span key={t} className="text-stone-400 font-mono text-[10px]">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Xem Trước Thẻ Mẫu (Preview) */}
                  {isPreviewing && (
                    <div className="mt-3.5 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 space-y-2 animate-fadeIn">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                        Xem trước thẻ mẫu:
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {deck.cards.slice(0, 5).map((card) => (
                          <div
                            key={card.id}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white dark:bg-stone-900/60 border border-stone-200/50 dark:border-stone-800"
                          >
                            <span className="font-bold font-noto text-stone-900 dark:text-white">
                              {card.koreanText}
                            </span>
                            <span className="text-stone-500 dark:text-stone-400 truncate max-w-[55%] text-right">
                              {card.vietnameseMeaning}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-2">
                  <Link
                    href={`/explore/${deck.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-sky-600 dark:text-stone-300 dark:hover:text-sky-400 transition py-1.5 px-2 rounded-lg cursor-pointer"
                  >
                    <span>Chi tiết</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    {added ? (
                      <>
                        <Link
                          href="/flashcards"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Đã thêm (Học ngay)
                        </Link>
                        <button
                          onClick={() => handleRemoveCurated(deck)}
                          title="Gỡ bộ thẻ khỏi /flashcards"
                          className="p-1.5 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleAddDeck(deck)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-900/20 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm vào /flashcard
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trạng Thái Trống Khi Tìm Kiếm */}
        {filteredDecks.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <Layers className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
            <h3 className="text-base font-bold text-stone-700 dark:text-stone-300">
              Không tìm thấy bộ thẻ phù hợp
            </h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Thử tìm kiếm với từ khóa khác hoặc chuyển sang danh mục "Tất cả bộ thẻ".
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
