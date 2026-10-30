"use client";

import React, { useState, useMemo, useEffect } from "react";
import { AppShell } from "../../../components/AppShell";
import { useApp } from "../../../contexts/AppProvider";
import { CURATED_DECKS, curatedDeckToAnkiDeck, IS_DEMO_DECKS_ENABLED, sharedDeckToExploreDeck } from "../../../data/curatedDecks";
import { DeckIcon } from "../../../components/DeckIcon";
import { speakKorean } from "../../../lib/koreanSpeech";
import { courseToExploreDeck, loadCourseVocabulary, loadSeoul1AExploreDeck } from "../../../lib/courseVocabulary";
import { ApiClient } from "../../../lib/apiClient";
import type { CuratedDeckItem } from "../../../data/curatedDecks";
import {
  ArrowLeft,
  Check,
  Plus,
  BookOpen,
  Sparkles,
  Volume2,
  Star,
  Download,
  Clock,
  Layers,
  ShieldCheck,
  Trash2,
  ChevronRight,
  RotateCcw,
  Globe2,
} from "lucide-react";

export default function DeckDetailClient({ id }: { id: string }) {
  const { userDecks, handleDeckImported, handleRemoveDeck } = useApp();
  const [courseDeck, setCourseDeck] = useState<CuratedDeckItem | null>(null);
  const [courseLoaded, setCourseLoaded] = useState(!id.startsWith("course-") && !id.startsWith("shared-") && id !== "seoul-1a");

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
    if (!id.startsWith("course-")) return;
    let active = true;
    void loadCourseVocabulary().then((data) => {
      const course = data?.decks.flatMap((group) => group.courses).find((item) => `course-${item.id}` === id);
      if (active) {
        setCourseDeck(course ? courseToExploreDeck(course) : null);
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

  const deck = useMemo(() => {
    return CURATED_DECKS.find((d) => d.id === id) || courseDeck;
  }, [id, courseDeck]);
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
  const topicSubdecks = useMemo(() => {
    if (deck?.id !== "course-topic-vocabulary") return [];
    const topics = new Map<string, { count: number; levels: Set<string> }>();
    for (const card of deck.cards) {
      const topic = card.deckName?.split("::").slice(1).join("::").trim();
      if (!topic) continue;
      const item = topics.get(topic) || { count: 0, levels: new Set<string>() };
      item.count += 1;
      for (const tag of card.tags || []) if (/^TOPIK [1-6]$/.test(tag)) item.levels.add(tag);
      topics.set(topic, item);
    }
    return [...topics.entries()].sort(([left], [right]) => left.localeCompare(right, "ko"));
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

  if (!deck || (isDemoDeck && !IS_DEMO_DECKS_ENABLED)) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
          <Layers className="w-12 h-12 text-stone-400 mx-auto" />
          <h1 className="text-xl font-bold text-stone-900 dark:text-white">
            {isDemoDeck && !IS_DEMO_DECKS_ENABLED ? "Bộ thẻ mẫu tạm ẩn trên Production" : "Không tìm thấy bộ thẻ yêu cầu"}
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
      <div className="space-y-6 pb-24 animate-fadeIn">
        {/* Toast Thông Báo */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-900/30 font-medium text-xs animate-slideUp">
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

        {/* Nút Quay Lại */}
        <div className="flex items-center justify-between">
          <a
            href="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 dark:text-stone-400 hover:text-sky-600 dark:hover:text-sky-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại Thư viện Khám phá
          </a>

          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span>Khám phá</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-stone-600 dark:text-stone-300">
              {deck.categoryLabel}
            </span>
          </div>
        </div>

        {/* BỐ CỤC CHÍNH 2 CỘT TRÊN DESKTOP */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI: TIÊU ĐỀ, PREVIEW HÌNH ẢNH / THẺ, NỘI DUNG CHI TIẾT (8 CỘT) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header Bộ Thẻ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                  <DeckIcon name={deck.iconName} className="w-6 h-6" />
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${deck.badgeColor}`}>
                  {deck.categoryLabel}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                  {deck.level}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Globe2 className="h-3 w-3" /> {deck.visibility === "private" ? "Riêng tư" : "Công khai"}
                </span>
                {IS_DEMO_DECKS_ENABLED && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    Demo
                  </span>
                )}
                <div className="flex items-center gap-1 text-xs font-bold text-amber-500 ml-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{deck.rating.toFixed(1)}</span>
                  <span className="text-stone-400 font-normal">({deck.downloads} học viên)</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight leading-snug">
                {deck.title}
              </h1>

              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                {deck.detailedDescription || deck.description}
              </p>

              {/* Tags */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {deck.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs font-mono text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800/80 px-2 py-0.5 rounded-md"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* KHỐI HÌNH ẢNH & THẺ PREVIEW INTERACTIVE */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-gradient-to-br from-stone-50 via-white to-sky-50/30 dark:from-stone-900/90 dark:via-stone-900/60 dark:to-slate-900/80 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-500" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Xem Thử Thẻ Flashcard (Mẫu {activePreviewIndex + 1}/{previewCards.length})
                  </span>
                </div>
                <button
                  onClick={() => setIsPreviewFlipped(!isPreviewFlipped)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isPreviewFlipped ? "Xem mặt trước" : "Lật xem đáp án"}
                </button>
              </div>

              {/* Khối Thẻ Lật Xem Thử */}
              <div
                onClick={() => setIsPreviewFlipped(!isPreviewFlipped)}
                className="cursor-pointer min-h-[190px] rounded-xl border border-stone-200 dark:border-stone-700/70 bg-white dark:bg-stone-800/90 p-6 flex flex-col justify-between transition hover:border-sky-400 dark:hover:border-sky-500 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider">
                      {isPreviewFlipped ? "Mặt sau (Giải nghĩa)" : "Mặt trước (Tiếng Hàn)"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakKorean(currentPreviewCard.koreanText || currentPreviewCard.frontText);
                      }}
                      title="Nghe phát âm tiếng Hàn"
                      className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-center py-4 space-y-2">
                    <div className="text-3xl font-black text-stone-900 dark:text-white font-noto tracking-tight">
                      {currentPreviewCard.koreanText || currentPreviewCard.frontText}
                    </div>
                    {isPreviewFlipped && (
                      <div className="pt-2 animate-fadeIn space-y-1">
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {currentPreviewCard.vietnameseMeaning || currentPreviewCard.backText}
                        </div>
                        {currentPreviewCard.exampleSentence && (
                          <div className="text-xs text-stone-500 dark:text-stone-400 italic">
                            {currentPreviewCard.exampleSentence}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center text-[11px] text-stone-400">
                  {isPreviewFlipped
                    ? "Bấm vào thẻ để lật lại mặt trước"
                    : "Bấm vào thẻ để xem nghĩa tiếng Việt & câu ví dụ"}
                </div>
              </div>

              {/* Selector chuyển các thẻ mẫu */}
              <div className="flex items-center justify-center gap-1.5 pt-1 overflow-x-auto">
                {previewCards.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActivePreviewIndex(i);
                      setRequestedPreviewCardId(null);
                      setIsPreviewFlipped(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activePreviewIndex === i
                        ? "bg-sky-500 text-white"
                        : "bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-700"
                    }`}
                  >
                    #{i + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {topicSubdecks.length > 0 ? (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                      Chủ đề học ({topicSubdecks.length})
                    </h2>
                    <p className="text-xs text-stone-400">
                      Một bộ thẻ duy nhất gồm {deck.cards.length.toLocaleString("vi-VN")} từ. Khi thêm vào Flashcard, mở bộ này để chọn một chủ đề hoặc học toàn bộ.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {topicSubdecks.map(([topic, info]) => (
                      <div key={topic} className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 px-4 py-3 flex items-center justify-between gap-3">
                        <span className="font-semibold text-sm text-stone-800 dark:text-stone-200">{topic}</span>
                        <span className="text-xs text-sky-600 dark:text-sky-400 shrink-0">{info.count} thẻ</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-4">
                  <h2 className="text-lg font-bold text-stone-900 dark:text-white">Bộ thẻ gồm {deck.cards.length.toLocaleString("vi-VN")} thẻ</h2>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Đây là bản xem thử. Thêm bộ thẻ vào Flashcard để xem và học toàn bộ nội dung.</p>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN TÁC GIẢ & NÚT THÊM BỘ THẺ (4 CỘT - STICKY) */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
            {/* Hộp Hành Động Thêm Bộ Thẻ */}
            <div className="card-duo p-6 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 shadow-md space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Học Tập Với FSRS SRS
                </span>
                <h3 className="text-xl font-black text-stone-900 dark:text-white">
                  {deck.cards.length} Thẻ Từ Vựng
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Sau khi thêm vào Kho thẻ, bạn có thể ôn tập hàng ngày với thuật toán lặp lại ngắt quãng hiện đại nhất.
                </p>
              </div>

              {/* Nút Hành Động Chính */}
              {isAdded ? (
                <div className="space-y-2">
                  <a
                    href="/flashcards?study=true"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-900/20 transition cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    Đã có trong kho thẻ (Học ngay)
                  </a>
                  <button
                    onClick={handleRemove}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Gỡ khỏi kho thẻ
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-black bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-900/30 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Thêm vào kho thẻ
                </button>
              )}

              {/* Quick Specs */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Thời gian ước tính
                  </span>
                  <span className="font-bold text-stone-700 dark:text-stone-200">
                    ~{deck.estimatedMinutes} phút
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Lượt thêm học
                  </span>
                  <span className="font-bold text-stone-700 dark:text-stone-200">
                    {deck.downloads} lượt
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Đánh giá
                  </span>
                  <span className="font-bold text-amber-500">
                    {deck.rating.toFixed(1)} / 5.0
                  </span>
                </div>
              </div>
            </div>

            {/* HỘP THÔNG TIN TÁC GIẢ */}
            <div className="card-duo p-5 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 space-y-3.5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">
                Tác giả bộ thẻ
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={deck.author.avatar}
                  alt={deck.author.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-sky-400/30 shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                      {deck.author.name}
                    </h4>
                    {deck.author.verified && (
                      <span title="Tác giả được xác minh bởi HaechiVN" aria-label="Tác giả được xác minh bởi HaechiVN">
                        <ShieldCheck className="w-4 h-4 text-sky-500" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 leading-tight">
                    {deck.author.role}
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed border-t border-stone-100 dark:border-stone-800/80 pt-2.5">
                {deck.author.bio}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
