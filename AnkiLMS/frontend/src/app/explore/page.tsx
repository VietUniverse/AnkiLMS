"use client";

import React, { useState, useMemo, useEffect } from "react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { CURATED_DECKS, curatedDeckToAnkiDeck, CuratedDeckItem, IS_DEMO_DECKS_ENABLED, sharedDeckToExploreDeck } from "../../data/curatedDecks";
import { DeckIcon } from "../../components/DeckIcon";
import { courseVocabularyToExploreDecks, loadCourseVocabulary, loadSeoul1AExploreDeck } from "../../lib/courseVocabulary";
import type { TopikDeck } from "../../lib/courseVocabulary";
import { ApiClient } from "../../lib/apiClient";
import {
  ChevronDown,
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
// Sơ cấp 1–2, Trung cấp 3–4, Cao cấp 5–6
const LEVEL_DECK_IDS = ["course-1100", "course-1200", "course-1300", "course-1400", "course-1500", "course-1600"];

const COURSE_BOOK_IDS = ["course-2000", "course-2100", "course-2200", "course-2300", "course-2400", "course-2500", "course-3000", "course-3100", "course-3200", "course-3300"];


type SortKey = "name" | "level" | "cards";
const LEVEL_ORDER: Record<string, number> = { "Sơ cấp": 0, "Trung cấp": 1, "Cao cấp": 2, "Mọi cấp độ": 3 };
const deckCardCount = (d: CuratedDeckItem) => d.cardCount ?? d.cards.length;
// Desktop: bảng 4 cột (tên | cấp độ | số thẻ | hành động). Mobile: danh sách một cột, cấp độ và số thẻ nằm dưới tên.
const ROW_GRID = "sm:grid sm:grid-cols-[minmax(0,1fr)_6rem_4.5rem_6.5rem] items-center gap-3";

export default function ExplorePage() {
  const { userDecks, handleDeckImported, handleRemoveDeck, currentUser, handleOpenAuth } = useApp();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
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
    ...CURATED_DECKS,
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
    if (!currentUser) return handleOpenAuth(true);
    let currentDeck = deck;
    if (deck.id.startsWith("shared-") && (!deck.cards || deck.cards.length === 0)) {
      const sharedId = deck.sharedId || deck.id.slice("shared-".length);
      const record = await ApiClient.getSharedDeck(sharedId);
      if (record && record.cards?.length) {
        currentDeck = sharedDeckToExploreDeck(record);
      }
    } else {
      const override = deckOverrides.find((item) => item.deckId.replace(/^catalog:/, "") === deck.id);
      if (override) {
        const response = await fetch(`/api/explore/deck-overrides?id=${encodeURIComponent(deck.id)}`, { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json() as { deck?: { cards?: CuratedDeckItem["cards"] } };
          if (payload.deck?.cards) currentDeck = { ...deck, cards: payload.deck.cards };
        }
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

  const filteredDecks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return exploreDecks.filter(
      (deck) =>
        (!q ||
          deck.title.toLowerCase().includes(q) ||
          deck.description.toLowerCase().includes(q) ||
          deck.author.name.toLowerCase().includes(q) ||
          deck.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [exploreDecks, searchQuery]);

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
    const isLevel = (d: CuratedDeckItem) => LEVEL_DECK_IDS.includes(d.id);
    const isCourse = (d: CuratedDeckItem) => d.id.startsWith("curriculum-") || d.id === "seoul-1a" || COURSE_BOOK_IDS.includes(d.id);
    const isTopik = (d: CuratedDeckItem) => !isLevel(d) && !isCourse(d) && d.category === "topik" && d.id !== "course-topic-vocabulary";
    const isCommunity = (d: CuratedDeckItem) => d.id.startsWith("shared-");
    // Mỗi bộ luôn nằm đúng mục; sắp xếp chỉ đổi thứ tự bên trong từng mục.
    const levels = sortedDecks.filter(isLevel);
    if (!sort) levels.sort((a, b) => LEVEL_DECK_IDS.indexOf(a.id) - LEVEL_DECK_IDS.indexOf(b.id));
    const courses = sortedDecks.filter(isCourse);
    const topik = sortedDecks.filter(isTopik);
    const community = sortedDecks.filter(isCommunity);
    const themes = sortedDecks.filter((d) => !isLevel(d) && !isCourse(d) && !isTopik(d) && !isCommunity(d));
    const groups: { label: string; decks: CuratedDeckItem[] }[] = [];
    if (levels.length > 0) groups.push({ label: "Cấp độ", decks: levels });
    if (courses.length > 0) groups.push({ label: "Giáo trình", decks: courses });
    if (topik.length > 0) groups.push({ label: "TOPIK", decks: topik });
    if (themes.length > 0) groups.push({ label: "Chủ đề", decks: themes });
    if (community.length > 0) groups.push({ label: "Cộng đồng chia sẻ", decks: community });
    return groups;
  }, [sortedDecks, sort]);

  const iconAction = "relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer shrink-0";
  const LEVEL_PILL: Record<string, string> = {
    "Sơ cấp": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    "Trung cấp": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    "Cao cấp": "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  const renderDeckRow = (deck: CuratedDeckItem) => {
    const added = isDeckAdded(deck);
    const isCommunity = deck.id.startsWith("shared-");
    // Tên đã có cấp độ (Từ vựng Sơ cấp 1...) thì không cần nhãn cấp độ nữa.
    const showLevel = !deck.title.toLowerCase().includes(deck.level.toLowerCase());
    return (
      <li key={deck.id} className={`${ROW_GRID} relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-2 -mx-2 py-2.5 sm:py-3 rounded-xl transition-colors hover:bg-stone-100 dark:hover:bg-stone-800/60`}>
        <a href={deckHref(deck)} className="flex items-center gap-3 min-w-0 group cursor-pointer after:absolute after:inset-0 after:content-['']">
          <DeckIcon name={deck.iconName} className="w-5 h-5 shrink-0 text-stone-400 group-hover:text-sky-500 transition" />
          <div className="min-w-0">
            <h3 className="min-w-0 text-sm font-semibold text-stone-900 dark:text-white line-clamp-2 sm:line-clamp-1 group-hover:text-sky-500 transition">
              {deck.title}
              <span className="sm:hidden font-normal text-stone-500 dark:text-stone-400"> ({deckCardCount(deck).toLocaleString("vi-VN")})</span>
              {showLevel && <span className={`sm:hidden ml-1.5 align-middle rounded-full px-1.5 py-0.5 text-[10px] font-bold ${LEVEL_PILL[deck.level] || "bg-stone-500/10 text-stone-500"}`}>{deck.level}</span>}
            </h3>
            {isCommunity && deck.author?.name && (
              <p className="mt-0.5 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                Tác giả: <span className="font-bold text-sky-600 dark:text-sky-400">{deck.author.name}</span>
                {deck.description && <span className="ml-1.5 text-stone-400 dark:text-stone-500">· {deck.description}</span>}
              </p>
            )}
          </div>
        </a>
        <span className="hidden sm:block text-xs text-stone-500 dark:text-stone-400 truncate">
          {isCommunity && deck.author?.name ? `bởi ${deck.author.name}` : deck.level}
        </span>
        <span className="hidden sm:block text-xs text-stone-500 dark:text-stone-400 tabular-nums text-right">{deckCardCount(deck)}</span>

        {added ? (
          <div className="relative z-10 flex items-center justify-end gap-0.5 shrink-0">
            <a href="/flashcards" title="Học bộ thẻ này" aria-label="Học bộ thẻ này" className={`${iconAction} text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10`}>
              <Check className="w-4 h-4" />
            </a>
            <button
              onClick={() => handleRemoveCurated(deck)}
              title="Gỡ bộ thẻ khỏi kho thẻ"
              aria-label="Gỡ bộ thẻ khỏi kho thẻ"
              className={`${iconAction} text-stone-400 hover:text-rose-500 hover:bg-rose-500/10`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : isCommunity ? (
          <div className="relative z-10 flex items-center justify-end gap-0.5 shrink-0">
            <a href={deckHref(deck)} title="Xem bộ thẻ" aria-label="Xem bộ thẻ" className={`${iconAction} text-stone-500 dark:text-stone-400 hover:bg-stone-500/10`}>
              <Eye className="w-4 h-4" />
            </a>
            <button
              onClick={() => void handleAddDeck(deck)}
              title="Thêm vào kho thẻ"
              aria-label={`Thêm ${deck.title} vào kho thẻ`}
              className={`${iconAction} text-sky-600 dark:text-sky-400 hover:bg-sky-500/10`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => void handleAddDeck(deck)}
            title="Thêm vào kho thẻ"
            aria-label={`Thêm ${deck.title} vào kho thẻ`}
            className={`${iconAction} justify-self-end text-sky-600 dark:text-sky-400 hover:bg-sky-500/10`}
          >
            <Plus className="w-5 h-5" />
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

        {/* Chỉ còn ô tìm kiếm */}
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
                setSearchQuery("");
              }}
              className="text-sm font-semibold text-sky-500 hover:text-sky-600 cursor-pointer"
            >
              Xóa tìm kiếm
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
                <h2>
                  <button
                    type="button"
                    aria-expanded={!collapsed[group.label]}
                    onClick={() => setCollapsed((c) => ({ ...c, [group.label]: !c[group.label] }))}
                    className="flex items-center gap-1 w-full text-left text-[11px] uppercase tracking-wider text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 font-semibold px-0.5 py-1 cursor-pointer"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsed[group.label] ? "-rotate-90" : ""}`} />
                    {group.label} <span className="font-normal">({group.decks.length})</span>
                  </button>
                </h2>
                {!collapsed[group.label] && (
                  <ul className="divide-y divide-stone-200/70 dark:divide-stone-800/70">
                    {group.decks.map((deck) => renderDeckRow(deck))}
                  </ul>
                )}
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
