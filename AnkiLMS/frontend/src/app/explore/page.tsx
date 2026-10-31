"use client";

import React, { useState, useMemo, useEffect } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { CURATED_DECKS, curatedDeckToAnkiDeck, CuratedDeckItem, IS_DEMO_DECKS_ENABLED, sharedDeckToExploreDeck } from "../../data/curatedDecks";
import { DeckIcon } from "../../components/DeckIcon";
import { VocabularySizeTest } from "../../components/VocabularySizeTest";
import { courseVocabularyToExploreDecks, loadCourseVocabulary, loadSeoul1AExploreDeck } from "../../lib/courseVocabulary";
import type { TopikDeck } from "../../lib/courseVocabulary";
import { ApiClient } from "../../lib/apiClient";
import {
  Search,
  Check,
  Plus,
  BookOpen,
  Sparkles,
  Eye,
  Trash2,
  ArrowUp,
  ArrowDown,
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


type SortKey = "name" | "level" | "cards";
const LEVEL_ORDER: Record<string, number> = { "Sơ cấp": 0, "Trung cấp": 1, "Cao cấp": 2, "Mọi cấp độ": 3 };
const deckCardCount = (d: CuratedDeckItem) => d.cardCount ?? d.cards.length;
// Desktop: bảng 4 cột (tên | cấp độ | số thẻ | hành động). Mobile: danh sách một cột, cấp độ và số thẻ nằm dưới tên.
const ROW_GRID = "sm:grid sm:grid-cols-[minmax(0,1fr)_6rem_4.5rem_6.5rem] items-center gap-3";

const THEME_CATEGORIES = new Set(["food", "conversation", "drama", "hanja", "travel", "work"]);

export default function ExplorePage() {
  const { userDecks, handleDeckImported, handleRemoveDeck } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTopikLevel, setSelectedTopikLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
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
    ...courseVocabularyToExploreDecks({ version: 1, source: "", courseCount: 0, wordCount: 0, decks: courseDecks }),
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

  const sortedDecks = useMemo(() => {
    if (!sort) return filteredDecks;
    const sign = sort.dir === "asc" ? 1 : -1;
    const cmp = (a: CuratedDeckItem, b: CuratedDeckItem) =>
      sort.key === "name"
        ? a.title.localeCompare(b.title, "vi")
        : sort.key === "level"
          ? (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9)
          : deckCardCount(a) - deckCardCount(b);
    return [...filteredDecks].sort((a, b) => sign * cmp(a, b));
  }, [filteredDecks, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const groupedDecks = useMemo(() => {
    if (sort || selectedCategory !== "all" || selectedTopikLevel !== "all" || searchQuery.trim()) {
      return null;
    }
    const themes = filteredDecks.filter((d) => THEME_CATEGORIES.has(d.category));
    const coursesAndTopik = filteredDecks.filter((d) => !THEME_CATEGORIES.has(d.category));
    const groups: { label: string; decks: CuratedDeckItem[] }[] = [];
    if (themes.length > 0) groups.push({ label: "Chủ đề", decks: themes });
    if (coursesAndTopik.length > 0) groups.push({ label: "Giáo trình & TOPIK", decks: coursesAndTopik });
    return groups;
  }, [filteredDecks, sort, selectedCategory, selectedTopikLevel, searchQuery]);

  const rowAction = "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer self-start sm:self-auto sm:justify-self-end shrink-0";

  const renderDeckRow = (deck: CuratedDeckItem) => {
    const added = isDeckAdded(deck);
    return (
      <li key={deck.id} className={`${ROW_GRID} flex flex-col items-stretch sm:flex-row sm:items-center gap-1.5 py-3`}>
        <a href={deckHref(deck)} className="flex items-center gap-3 min-w-0 flex-1 group cursor-pointer">
          <DeckIcon name={deck.iconName} className="w-5 h-5 shrink-0 text-stone-400 group-hover:text-sky-500 transition" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-white line-clamp-2 sm:line-clamp-1 group-hover:text-sky-500 transition">
              {deck.title}
            </h3>
            <p className="text-xs text-stone-400 sm:hidden">{deck.level} · {deckCardCount(deck)} thẻ</p>
          </div>
        </a>
        <span className="hidden sm:block text-xs text-stone-500 dark:text-stone-400 truncate">{deck.level}</span>
        <span className="hidden sm:block text-xs text-stone-500 dark:text-stone-400 tabular-nums text-right">{deckCardCount(deck)}</span>

        {added ? (
          <div className="flex items-center justify-start sm:justify-end gap-1 shrink-0 pl-[22px] sm:pl-0">
            <a href="/flashcards" className={`${rowAction} text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10`}>
              <Check className="w-3.5 h-3.5" /> Học
            </a>
            <button
              onClick={() => handleRemoveCurated(deck)}
              title="Gỡ bộ thẻ khỏi kho thẻ"
              aria-label="Gỡ bộ thẻ khỏi kho thẻ"
              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : deck.id.startsWith("shared-") ? (
          <a href={deckHref(deck)} className={`${rowAction} ml-[22px] sm:ml-0 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10`}>
            <Eye className="w-3.5 h-3.5" /> Xem
          </a>
        ) : (
          <button
            onClick={() => handleAddDeck(deck)}
            aria-label={`Thêm ${deck.title} vào kho thẻ`}
            className={`${rowAction} ml-[22px] sm:ml-0 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10`}
          >
            <Plus className="w-3.5 h-3.5" /> Thêm
          </button>
        )}
      </li>
    );
  };

  const sortHeader = (key: SortKey, label: string, className = "") => {
    const active = sort?.key === key;
    const Arrow = sort?.dir === "desc" ? ArrowDown : ArrowUp;
    return (
      <button
        onClick={() => toggleSort(key)}
        aria-label={`Sắp xếp theo ${label}`}
        className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold cursor-pointer transition ${
          active ? "text-sky-500" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
        } ${className}`}
      >
        {label}
        {active && <Arrow className="w-3 h-3" />}
      </button>
    );
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5 pb-20 animate-fadeIn">
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

        <VocabularySizeTest />

        {/* Một hàng duy nhất: tìm kiếm + danh mục */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="relative basis-full sm:basis-0 flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bộ thẻ…"
              aria-label="Tìm bộ thẻ"
              className="w-full h-10 text-sm pl-9 pr-3 rounded-xl bg-transparent border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Danh mục"
            className="h-10 text-sm pl-3 pr-2 rounded-xl bg-transparent border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 cursor-pointer flex-1 sm:flex-none sm:max-w-[220px] [color-scheme:light] dark:[color-scheme:dark]"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                {cat.label} ({cat.count})
              </option>
            ))}
          </select>
          <select
            value={selectedTopikLevel}
            onChange={(e) => setSelectedTopikLevel(e.target.value)}
            aria-label="Cấp độ TOPIK"
            className="h-10 text-sm pl-3 pr-2 rounded-xl bg-transparent border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 cursor-pointer flex-1 sm:flex-none sm:max-w-[140px] [color-scheme:light] dark:[color-scheme:dark]"
          >
            <option value="all" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">Mọi cấp</option>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <option key={level} value={String(level)} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">TOPIK {level}</option>
            ))}
          </select>
        </div>

        {exploreDecks.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Sparkles className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Kho bộ thẻ đang được biên soạn.
            </p>
            <a href="/flashcards" className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-500 hover:text-sky-600">
              <BookOpen className="w-4 h-4" /> Đến kho thẻ của tôi
            </a>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-sm text-stone-500 dark:text-stone-400">Không tìm thấy bộ thẻ phù hợp.</p>
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSelectedTopikLevel("all");
                setSearchQuery("");
              }}
              className="text-sm font-semibold text-sky-500 hover:text-sky-600 cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-4 pb-2 border-b border-stone-200 dark:border-stone-800 sm:hidden">
              <span className="text-[11px] uppercase tracking-wider text-stone-400">Sắp xếp</span>
              {sortHeader("name", "Tên")}
              {sortHeader("level", "Cấp độ")}
              {sortHeader("cards", "Thẻ")}
            </div>
            <div className={`${ROW_GRID} hidden pb-2 border-b border-stone-200 dark:border-stone-800`}>
              <div className="pl-8">{sortHeader("name", "Tên")}</div>
              <div>{sortHeader("level", "Cấp độ")}</div>
              <div className="text-right">{sortHeader("cards", "Thẻ", "justify-end w-full")}</div>
              <span />
            </div>
            {groupedDecks ? (
          <div className="space-y-6">
            {groupedDecks.map((group) => (
              <div key={group.label} className="space-y-1">
                <h2 className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold px-0.5">
                  {group.label}
                </h2>
                <ul className="divide-y divide-stone-200/70 dark:divide-stone-800/70">
                  {group.decks.map((deck) => renderDeckRow(deck))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-stone-200/70 dark:divide-stone-800/70">
            {sortedDecks.map((deck) => renderDeckRow(deck))}
          </ul>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
