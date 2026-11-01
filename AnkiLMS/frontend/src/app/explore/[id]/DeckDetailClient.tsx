"use client";

import React, { useState, useMemo, useEffect } from "react";
import { AppShell } from "../../../components/AppShell";
import { useApp } from "../../../contexts/AppProvider";
import { CURATED_DECKS, curatedDeckToAnkiDeck, IS_DEMO_DECKS_ENABLED, sharedDeckToExploreDeck } from "../../../data/curatedDecks";
import { DeckIcon } from "../../../components/DeckIcon";
import { speakKorean } from "../../../lib/koreanSpeech";
import { courseToExploreDeck, curriculumToExploreDeck, loadCourseVocabulary, loadSeoul1AExploreDeck } from "../../../lib/courseVocabulary";
import { ApiClient } from "../../../lib/apiClient";
import type { CuratedDeckItem } from "../../../data/curatedDecks";
import {
  ArrowLeft,
  Check,
  Plus,
  BookOpen,
  Volume2,
  Star,
  Download,
  Layers,
  ShieldCheck,
  Trash2,
  RotateCcw,
  Globe2,
} from "lucide-react";

const HEADER_LEVEL: Record<string, string> = {
  "Sơ cấp": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Trung cấp": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Cao cấp": "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default function DeckDetailClient({ id }: { id: string }) {
  const { userDecks, handleDeckImported, handleRemoveDeck } = useApp();
  const [courseDeck, setCourseDeck] = useState<CuratedDeckItem | null>(null);
  const [catalogOverride, setCatalogOverride] = useState<Partial<CuratedDeckItem> | null>(null);
  const [catalogHidden, setCatalogHidden] = useState(false);
  const [courseLoaded, setCourseLoaded] = useState(!id.startsWith("course-") && !id.startsWith("curriculum-") && !id.startsWith("shared-") && id !== "seoul-1a");

  useEffect(() => {
    if (id !== "seoul-1a") return;
    let active = true;
    void loadSeoul1AExploreDeck().then((loadedDeck) => {
      if (active) {
        setCourseDeck(loadedDeck);
        setCourseLoaded(true);
      }
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!id.startsWith("course-") && !id.startsWith("curriculum-")) return;
    let active = true;
    void loadCourseVocabulary().then((data) => {
      const courses = data?.decks.flatMap((group) => group.courses) || [];
      const course = id.startsWith("course-")
        ? courses.find((item) => `course-${item.id}` === id)
        : null;
      const curriculum = id === "curriculum-sejong"
        ? curriculumToExploreDeck(courses, "sejong")
        : id === "curriculum-kiip"
          ? curriculumToExploreDeck(courses, "kiip")
          : null;
      if (active) {
        setCourseDeck(course ? courseToExploreDeck(course) : curriculum);
        setCourseLoaded(true);
      }
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!id.startsWith("shared-")) return;
    let active = true;
    void ApiClient.getSharedDeck(id.slice("shared-".length)).then((record) => {
      if (active) {
        setCourseDeck(record ? sharedDeckToExploreDeck(record) : null);
        setCourseLoaded(true);
      }
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (id.startsWith("shared-")) return;
    let active = true;
    void fetch("/api/explore/deck-overrides", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ overrides?: Array<{ deckId: string; visibility: "public" | "private" }> }> : null)
      .then(async (index) => {
        if (!active) return;
        const entry = index?.overrides?.find((item) => item.deckId === `catalog:${id}`);
        if (entry?.visibility === "private") { setCatalogHidden(true); return; }
        if (!entry) return;
        const response = await fetch(`/api/explore/deck-overrides?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json() as { deck?: { title: string; description: string; visibility: "public" | "private"; cardCount: number; cards: CuratedDeckItem["cards"] } };
          if (active && payload.deck) setCatalogOverride(payload.deck);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [id]);

  const sourceDeck = useMemo(() => CURATED_DECKS.find((d) => d.id === id) || courseDeck, [id, courseDeck]);
  const deck = useMemo(() => sourceDeck && catalogOverride ? { ...sourceDeck, ...catalogOverride, id: sourceDeck.id, cards: catalogOverride.cards || sourceDeck.cards } : sourceDeck, [sourceDeck, catalogOverride]);
  const isDemoDeck = CURATED_DECKS.some((item) => item.id === id);

  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [requestedPreviewCardId, setRequestedPreviewCardId] = useState<number | null>(null);
  const [isPreviewFlipped, setIsPreviewFlipped] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!deck) return;
    const requestedWord = new URLSearchParams(window.location.search).get("word");
    if (!requestedWord) return;
    const target = deck.cards.findIndex((card) =>
      (card.koreanText || card.frontText || "").trim() === requestedWord,
    );
    if (target >= 0) {
      setRequestedPreviewCardId(target >= 10 ? deck.cards[target].id : null);
      setActivePreviewIndex(Math.min(target, 9));
    }
  }, [deck]);

  const isAdded = useMemo(() => {
    if (!deck) return false;
    const target = curatedDeckToAnkiDeck(deck);
    return userDecks.some(
      (ud) => ud.id === target.id || ud.name === target.name
    );
  }, [deck, userDecks]);

  const deckCards = deck?.cards ?? [];
  const previewCards = useMemo(() => {
    const samples = deckCards.slice(0, 10);
    if (!requestedPreviewCardId) return samples;
    const requested = deckCards.find((card) => card.id === requestedPreviewCardId);
    if (!requested || samples.some((card) => card.id === requested.id)) return samples;
    return [...samples.slice(0, 9), requested];
  }, [deckCards, requestedPreviewCardId]);
  const curriculumSections = useMemo(() => {
    if (!deck || (!deck.id.startsWith("curriculum-") && deck.id !== "course-topic-vocabulary")) return [];
    const sections = new Map<string, { count: number; children: Set<string>; levels: Set<string> }>();
    for (const card of deck.cards) {
      const parts = card.deckName?.split("::").slice(1).map((part) => part.trim()).filter(Boolean) || [];
      const section = parts[0];
      if (!section) continue;
      const item = sections.get(section) || { count: 0, children: new Set<string>(), levels: new Set<string>() };
      item.count += 1;
      if (parts[1]) item.children.add(parts[1]);
      for (const tag of card.tags || []) if (/^TOPIK [1-6]$/.test(tag)) item.levels.add(tag);
      sections.set(section, item);
    }
    return [...sections.entries()].map(([name, info]) => [name, { count: info.count, childCount: info.children.size }] as const)
      .sort(([left], [right]) => left.localeCompare(right, "ko", { numeric: true }));
  }, [deck]);
  const currentPreviewCard = deckCards[activePreviewIndex] || deckCards[0];

  const handleAdd = () => {
    if (!deck) return;
    const ankiDeck = curatedDeckToAnkiDeck(deck);
    handleDeckImported(ankiDeck);
    setToastMessage(`Đã thêm bộ thẻ "${deck.title}" vào Kho thẻ thành công!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRemove = () => {
    if (!deck) return;
    const ankiDeck = curatedDeckToAnkiDeck(deck);
    handleRemoveDeck(ankiDeck.id);
  };

  if (!courseLoaded) {
    return <AppShell><div className="py-20 text-center text-sm text-sky-500">Đang tải bộ từ vựng…</div></AppShell>;
  }

  if (!deck || catalogHidden || (isDemoDeck && !IS_DEMO_DECKS_ENABLED)) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
          <Layers className="w-12 h-12 text-stone-400 mx-auto" />
          <h1 className="text-xl font-bold text-stone-900 dark:text-white">
            {catalogHidden ? "Bộ thẻ không còn được chia sẻ" : isDemoDeck && !IS_DEMO_DECKS_ENABLED ? "Bộ thẻ mẫu tạm ẩn trên Production" : "Không tìm thấy bộ thẻ yêu cầu"}
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            {isDemoDeck && !IS_DEMO_DECKS_ENABLED
              ? "Dữ liệu mẫu thử nghiệm đã được tự động tắt trên môi trường chính thức (Production). Tính năng sẽ hiển thị khi kết nối dữ liệu thực tế."
              : "Bộ thẻ này có thể đã được gỡ bỏ hoặc đường dẫn không chính xác."}
          </p>
          <a
            href="/explore"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại trang Khám phá
          </a>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6 pb-44 lg:pb-24 animate-fadeIn">
        {/* Toast Thông Báo */}
        {toastMessage && (
          <div className="fixed bottom-40 left-3 right-3 lg:bottom-6 lg:left-auto lg:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-900/30 font-medium text-xs animate-slideUp">
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
            <a
              href="/flashcards"
              className="ml-2 underline font-bold hover:text-emerald-100"
            >
              Học ngay →
            </a>
          </div>
        )}

        {/* Điều hướng */}
        <a
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-sky-600 dark:hover:text-sky-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Khám phá
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 lg:gap-8 items-start">
          {/* Cột trái: giới thiệu, xem thử, nội dung */}
          <div className="space-y-6 min-w-0">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex w-11 h-11 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 items-center justify-center shrink-0">
                  <DeckIcon name={deck.iconName} className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight leading-tight">
                  {deck.title}
                </h1>
              </div>

              {/* Một hàng nhãn gọn: cấp độ, số thẻ, đánh giá (nếu đã có), quyền xem */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs font-semibold">
                <span className={`rounded-full px-2.5 py-1 ${HEADER_LEVEL[deck.level] || "bg-stone-500/10 text-stone-600 dark:text-stone-300"}`}>{deck.level}</span>
                {deck.categoryLabel && deck.categoryLabel !== deck.level && (
                  <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-1 text-stone-600 dark:text-stone-300">{deck.categoryLabel}</span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-1 text-stone-600 dark:text-stone-300">
                  <Layers className="w-3 h-3" /> {deck.cards.length.toLocaleString("vi-VN")} thẻ
                </span>
                {deck.rating > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-600 dark:text-amber-400">
                    <Star className="w-3 h-3 fill-current" /> {deck.rating.toFixed(1)}
                  </span>
                )}
                {deck.visibility === "private" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-1 text-stone-600 dark:text-stone-300">
                    <Globe2 className="w-3 h-3" /> Riêng tư
                  </span>
                )}
              </div>

              <p className="max-w-2xl text-sm text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-3 sm:line-clamp-none">
                {deck.detailedDescription || deck.description}
              </p>
            </div>

            {/* Xem thử thẻ */}
            <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">
                  Xem thử {activePreviewIndex + 1}/{previewCards.length}
                </h2>
                <button
                  onClick={() => setIsPreviewFlipped(!isPreviewFlipped)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isPreviewFlipped ? "Mặt trước" : "Lật thẻ"}
                </button>
              </div>

              <div
                onClick={() => setIsPreviewFlipped(!isPreviewFlipped)}
                className="relative cursor-pointer min-h-[140px] rounded-xl bg-stone-50 dark:bg-stone-800/70 px-6 py-8 flex flex-col items-center justify-center text-center gap-2 transition hover:bg-sky-50 dark:hover:bg-stone-800"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speakKorean(currentPreviewCard.koreanText || currentPreviewCard.frontText);
                  }}
                  title="Nghe phát âm tiếng Hàn"
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <div className="text-3xl font-black text-stone-900 dark:text-white font-noto tracking-tight">
                  {currentPreviewCard.koreanText || currentPreviewCard.frontText}
                </div>
                {isPreviewFlipped ? (
                  <div className="animate-fadeIn space-y-1">
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {currentPreviewCard.vietnameseMeaning || currentPreviewCard.backText}
                    </div>
                    {currentPreviewCard.exampleSentence && (
                      <div className="text-xs text-stone-500 dark:text-stone-400 italic">{currentPreviewCard.exampleSentence}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-400">Bấm để xem nghĩa</div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1">
                {previewCards.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActivePreviewIndex(i);
                      setRequestedPreviewCardId(null);
                      setIsPreviewFlipped(false);
                    }}
                    className={`min-w-6 px-1.5 sm:min-w-7 sm:px-2 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                      activePreviewIndex === i
                        ? "bg-sky-500 text-white"
                        : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </section>

            {/* Nội dung bộ thẻ */}
            {curriculumSections.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                  {deck.id === "course-topic-vocabulary" ? "Chủ đề" : "Nội dung"} <span className="font-normal text-stone-400">({curriculumSections.length})</span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 divide-stone-200/70 dark:divide-stone-800/70">
                  {curriculumSections.map(([section, info]) => (
                    <li key={section} className="flex items-baseline justify-between gap-3 py-2.5 sm:border-b border-stone-200/70 dark:border-stone-800/70">
                      <span className="min-w-0 text-sm font-semibold text-stone-800 dark:text-stone-200">
                        {section} <span className="font-normal text-stone-500 dark:text-stone-400 tabular-nums">({info.count.toLocaleString("vi-VN")})</span>
                      </span>
                      {info.childCount > 0 && deck.id !== "course-topic-vocabulary" && (
                        <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">{info.childCount} bài</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-stone-400">
                  Thêm vào Flashcards để chọn {deck.id === "course-topic-vocabulary" ? "chủ đề" : "nội dung"} hoặc học toàn bộ.
                </p>
              </section>
            ) : (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Đây là bản xem thử. Thêm bộ thẻ vào Flashcard để xem và học toàn bộ {deck.cards.length.toLocaleString("vi-VN")} thẻ.
              </p>
            )}
          </div>

          {/* Cột phải: hành động + tác giả */}
          <div className="space-y-4 lg:sticky lg:top-20">
            <div className="hidden lg:block card-duo p-5 bg-white dark:bg-stone-900/80 space-y-3">
              <div>
                <div className="text-2xl font-black text-stone-900 dark:text-white tabular-nums">
                  {deck.cards.length.toLocaleString("vi-VN")} <span className="text-sm font-bold text-stone-400">thẻ</span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">Ôn tập hàng ngày với FSRS sau khi thêm vào kho thẻ.</p>
              </div>
              {isAdded ? (
                <div className="space-y-1">
                  <a
                    href="/flashcards?study=true"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white transition cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    Học ngay
                  </a>
                  <button
                    onClick={handleRemove}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Gỡ khỏi kho thẻ
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black bg-sky-500 hover:bg-sky-600 text-white transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Thêm vào kho thẻ
                </button>
              )}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Lượt học</span>
                <span className="font-bold text-stone-700 dark:text-stone-200">{deck.downloads}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1">
              <img src={deck.author.avatar} alt={deck.author.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-stone-900 dark:text-white truncate">{deck.author.name}</span>
                  {deck.author.verified && (
                    <span title="Tác giả được xác minh bởi HaechiVN" aria-label="Tác giả được xác minh bởi HaechiVN">
                      <ShieldCheck className="w-4 h-4 text-sky-500" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-400 truncate">{deck.author.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh hành động cố định trên điện thoại, nằm ngay trên thanh điều hướng dưới */}
        <div className="lg:hidden fixed left-0 right-[4.75rem] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 pl-3">
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white/95 dark:bg-stone-900/95 backdrop-blur px-3 py-2.5 shadow-lg">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black tabular-nums text-stone-900 dark:text-white">{deck.cards.length.toLocaleString("vi-VN")} thẻ</p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">{isAdded ? "Đã có trong kho thẻ" : "Chưa thêm vào kho thẻ"}</p>
            </div>
            {isAdded ? (
              <>
                <button onClick={handleRemove} aria-label="Gỡ khỏi kho thẻ" title="Gỡ khỏi kho thẻ" className="h-10 w-10 rounded-xl text-rose-500 hover:bg-rose-500/10 flex items-center justify-center cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
                <a href="/flashcards?study=true" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition">
                  <BookOpen className="w-4 h-4" /> Học ngay
                </a>
              </>
            ) : (
              <button onClick={handleAdd} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 px-4 py-2.5 text-sm font-black text-white transition cursor-pointer">
                <Plus className="w-4 h-4 stroke-[3]" /> Thêm
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
