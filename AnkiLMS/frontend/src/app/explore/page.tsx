"use client";

import React, { useState, useMemo, useEffect } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { CURATED_DECKS, curatedDeckToAnkiDeck, CuratedDeckItem, IS_DEMO_DECKS_ENABLED, sharedDeckToExploreDeck } from "../../data/curatedDecks";
import { DeckIcon } from "../../components/DeckIcon";
import { courseToExploreDeck, loadCourseVocabulary, loadSeoul1AExploreDeck } from "../../lib/courseVocabulary";
import type { TopikDeck } from "../../lib/courseVocabulary";
import { ApiClient } from "../../lib/apiClient";
import {
  Layers,
  Search,
  Check,
  Plus,
  BookOpen,
  Sparkles,
  Eye,
  Trash2,
  Clock,
  Star,
  ShieldCheck,
} from "lucide-react";

// Điều hướng dùng <a> thay vì next/link vì app build static export.
const CATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "Tất cả chủ đề" },
  { id: "food", label: "Quán ăn & Ẩm thực" },
  { id: "conversation", label: "Giao tiếp đời sống" },
  { id: "drama", label: "Phim ảnh & tiếng lóng" },
  { id: "hanja", label: "Gốc từ Hán Hàn" },
  { id: "travel", label: "Du lịch" },
  { id: "work", label: "Công việc & EPS" },
];

const matchCategory = (deck: CuratedDeckItem, id: string) =>
  id === "all" || deck.category === id;

export default function ExplorePage() {
  const { userDecks, handleDeckImported, handleRemoveDeck } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTopikLevel, setSelectedTopikLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const [courseDecks, setCourseDecks] = useState<TopikDeck[]>([]);
  const [seoul1ADeck, setSeoul1ADeck] = useState<CuratedDeckItem | null>(null);
  const [sharedDecks, setSharedDecks] = useState<CuratedDeckItem[]>([]);
  const [deckOverrides, setDeckOverrides] = useState<Array<{ sharedId: string; deckId: string; title: string; description: string; visibility: "public" | "private"; cardCount: number }>>([]);

  useEffect(() => {
    let mounted = true;
    void loadCourseVocabulary().then((data) => {
      if (mounted) setCourseDecks(data?.decks || []);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadSeoul1AExploreDeck().then((deck) => {
      if (mounted) setSeoul1ADeck(deck);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    void ApiClient.getPublicSharedDecks().then((decks) => {
      if (mounted) setSharedDecks(decks.map(sharedDeckToExploreDeck));
    });
    void fetch("/api/explore/deck-overrides", { cache: "no-store" }).then((r) => r.ok ? r.json() : null)
      .then((data) => { if (mounted) setDeckOverrides(data?.overrides || []); }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const baseDecks = useMemo(() => [
    ...(IS_DEMO_DECKS_ENABLED ? CURATED_DECKS : []),
    ...courseDecks.flatMap((group) => group.courses.map(courseToExploreDeck)),
    ...(seoul1ADeck ? [seoul1ADeck] : []),
    ...sharedDecks,
  ], [courseDecks, seoul1ADeck, sharedDecks]);
  const exploreDecks = useMemo(() => {
    const overrideMap = new Map(deckOverrides.map((item) => [item.deckId.replace(/^catalog:/, ""), item]));
    return baseDecks.flatMap((deck) => {
      const override = overrideMap.get(deck.id);
      if (override?.visibility === "private") return [];
      if (!override) return [deck];
      return [{ ...deck, title: override.title, description: override.description, cardCount: override.cardCount, sharedId: override.sharedId }];
    });
  }, [baseDecks, deckOverrides]);

  const topikLevelsByDeck = useMemo(() => new Map(exploreDecks.map((deck) => {
    const levels = new Set<string>();
    const collect = (value?: string) => {
      const match = value?.match(/\bTOPIK\s*([1-6])\b/i);
      if (match) levels.add(match[1]);
    };
    collect(deck.categoryLabel);
    deck.tags.forEach(collect);
    deck.cards.forEach((card) => card.tags?.forEach(collect));
    return [deck.id, levels] as const;
  })), [exploreDecks]);

  const deckHref = (deck: CuratedDeckItem) => deck.id.startsWith("shared-")
    ? `/explore/shared?id=${encodeURIComponent(deck.id.slice("shared-".length))}`
    : `/explore/${deck.id}`;

  // Check if a curated deck is already inside userDecks
  const isDeckAdded = (deck: CuratedDeckItem) => {
    const targetAnkiDeck = curatedDeckToAnkiDeck(deck);
    return userDecks.some(
      (ud) => ud.id === targetAnkiDeck.id || ud.name === targetAnkiDeck.name
    );
  };

  const handleAddDeck = async (deck: CuratedDeckItem) => {
    let currentDeck = deck;
    const override = deckOverrides.find((item) => item.deckId.replace(/^catalog:/, "") === deck.id);
    if (override) {
      const response = await fetch(`/api/explore/deck-overrides?id=${encodeURIComponent(deck.id)}`, { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json() as { deck?: { cards?: CuratedDeckItem["cards"] } };
        if (payload.deck?.cards) currentDeck = { ...deck, cards: payload.deck.cards };
      }
    }
    handleDeckImported(curatedDeckToAnkiDeck(currentDeck));
    setAddedNotice(`Đã thêm bộ thẻ "${currentDeck.title}" vào Kho thẻ!`);
    setTimeout(() => setAddedNotice(null), 3500);
  };

  const handleRemoveCurated = (deck: CuratedDeckItem) => {
    const ankiDeck = curatedDeckToAnkiDeck(deck);
    handleRemoveDeck(ankiDeck.id);
  };

  // Chỉ hiện chủ đề có bộ thẻ; TOPIK được lọc riêng để không trộn hai loại bộ lọc.
  const categories = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        ...cat,
        count: exploreDecks.filter((d) => matchCategory(d, cat.id)).length,
      })).filter((cat) => cat.id === "all" || cat.count > 0),
    [exploreDecks]
  );

  const filteredDecks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return exploreDecks.filter(
      (deck) =>
        matchCategory(deck, selectedCategory) &&
        (selectedTopikLevel === "all" || topikLevelsByDeck.get(deck.id)?.has(selectedTopikLevel)) &&
        (!q ||
          deck.title.toLowerCase().includes(q) ||
          deck.description.toLowerCase().includes(q) ||
          deck.author.name.toLowerCase().includes(q) ||
          deck.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [exploreDecks, selectedCategory, selectedTopikLevel, searchQuery, topikLevelsByDeck]);

  return (
    <AppShell>
      <div className="space-y-6 pb-20 animate-fadeIn">
        {/* Toast thông báo khi thêm thẻ (nằm trên BottomNav ở mobile) */}
        {addedNotice && (
          <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-900/30 font-medium text-xs animate-slideUp whitespace-nowrap">
            <Check className="w-4 h-4 shrink-0" />
            <span>{addedNotice}</span>
            <a href="/flashcards" className="ml-2 underline font-bold hover:text-emerald-100">
              Xem ngay →
            </a>
          </div>
        )}

        {/* Đầu trang gọn: tiêu đề + tìm kiếm */}
        <div className="card-duo p-4 sm:p-5 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                  Khám phá bộ thẻ
                </h1>
                {IS_DEMO_DECKS_ENABLED && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Demo
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate sm:whitespace-normal">
                Kho bộ thẻ tiếng Hàn chất lượng cao ôn tập cùng thuật toán FSRS.
              </p>
            </div>

            <a
              href="/flashcards"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-700/80 border border-stone-200 dark:border-stone-700 transition cursor-pointer shrink-0"
            >
              <BookOpen className="w-4 h-4 text-sky-500" />
              <span>Kho thẻ của tôi</span>
            </a>
          </div>

          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bộ thẻ, chủ đề hoặc tác giả…"
              aria-label="Tìm bộ thẻ"
              className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
        </div>

        {exploreDecks.length === 0 ? (
          <div className="card-duo p-8 text-center space-y-3 max-w-md mx-auto border-dashed border-2 border-stone-300 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Kho bộ thẻ đang được biên soạn
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Các bộ thẻ chính thức sẽ sớm có mặt. Bạn vẫn có thể tạo và ôn tập flashcard cá nhân.
            </p>
            <div className="pt-1">
              <a
                href="/flashcards"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-900/20 transition cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                Đến kho thẻ của tôi
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Tách chủ đề và cấp TOPIK thành hai bộ lọc rõ ràng, không lặp lựa chọn. */}
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[220px] flex-1 text-[11px] font-bold text-stone-500 dark:text-stone-400">
                Chủ đề
                <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="mt-1 block w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-800 outline-none focus:border-sky-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.label} · {category.count}</option>)}
                </select>
              </label>
              <label className="min-w-[180px] flex-1 text-[11px] font-bold text-stone-500 dark:text-stone-400">
                Cấp độ
                <select value={selectedTopikLevel} onChange={(event) => setSelectedTopikLevel(event.target.value)} className="mt-1 block w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-800 outline-none focus:border-sky-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
                  <option value="all">Tất cả cấp độ</option>
                  {[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={String(level)}>TOPIK {level}</option>)}
                </select>
              </label>
              <p className="pb-2 text-xs font-medium text-stone-500 dark:text-stone-400">{filteredDecks.length} bộ thẻ</p>
            </div>

            {/* Lưới bộ thẻ */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDecks.map((deck) => {
                const added = isDeckAdded(deck);
                const isShared = deck.id.startsWith("shared-");

                return (
                  <div
                    key={deck.id}
                    className="card-duo p-4 sm:p-5 flex flex-col justify-between border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70 hover:border-sky-400/50 dark:hover:border-sky-500/50 transition duration-200 shadow-sm"
                  >
                    <div className="space-y-2.5">
                      {/* Icon + tiêu đề + cấp độ */}
                      <div className="flex items-start justify-between gap-3">
                        <a href={deckHref(deck)} className="flex items-center gap-3 min-w-0 group cursor-pointer flex-1">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                            <DeckIcon name={deck.iconName} className="w-5 h-5" />
                          </div>
                          <h3 className="text-base font-bold text-stone-900 dark:text-white leading-snug group-hover:text-sky-500 transition line-clamp-2">
                            {deck.title}
                          </h3>
                        </a>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700/60 shrink-0">
                          {deck.level}
                        </span>
                      </div>

                      <a
                        href={deckHref(deck)}
                        className="block text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed hover:text-stone-700 dark:hover:text-stone-300 transition cursor-pointer"
                      >
                        {deck.description}
                      </a>

                      {/* Tác giả */}
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 min-w-0">
                        <span className="truncate">{deck.author.name}</span>
                        {deck.author.verified && (
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-sky-500" aria-label="Tác giả đã xác minh" />
                        )}
                      </div>

                      {/* Meta: số thẻ · thời lượng · đánh giá */}
                      <div className="flex items-center gap-2 text-[11px] text-stone-400">
                        <span className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                          <Layers className="w-3.5 h-3.5" />
                          {deck.cardCount ?? deck.cards.length} thẻ
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          ~{deck.estimatedMinutes} phút
                        </span>
                        {deck.rating > 0 && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {deck.rating.toFixed(1)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Một hành động chính */}
                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80">
                      {added ? (
                        <div className="flex items-center gap-2">
                          <a
                            href="/flashcards"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Học ngay
                          </a>
                          <button
                            onClick={() => handleRemoveCurated(deck)}
                            title="Gỡ bộ thẻ khỏi kho thẻ"
                            aria-label="Gỡ bộ thẻ khỏi kho thẻ"
                            className="p-2 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : isShared ? (
                        <a
                          href={deckHref(deck)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-900/20 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Xem & thêm
                        </a>
                      ) : (
                        <button
                          onClick={() => handleAddDeck(deck)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-900/20 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Thêm vào kho thẻ
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredDecks.length === 0 && (
              <div className="text-center py-14 space-y-3">
                <Layers className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
                <h3 className="text-base font-bold text-stone-700 dark:text-stone-300">
                  Không tìm thấy bộ thẻ phù hợp
                </h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  Thử tìm kiếm với từ khóa khác hoặc chuyển sang danh mục khác.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white transition cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
