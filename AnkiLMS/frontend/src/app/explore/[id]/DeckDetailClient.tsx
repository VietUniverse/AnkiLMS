"use client";

import React, { useState, useMemo, useEffect } from "react";
import { AppShell } from "../../../components/AppShell";
import { useApp } from "../../../contexts/AppProvider";
import { CURATED_DECKS, curatedDeckToAnkiDeck, IS_DEMO_DECKS_ENABLED } from "../../../data/curatedDecks";
import { DeckIcon } from "../../../components/DeckIcon";
import { speakKorean } from "../../../lib/koreanSpeech";
import { courseToExploreDeck, loadCourseVocabulary } from "../../../lib/courseVocabulary";
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
} from "lucide-react";

export default function DeckDetailClient({ id }: { id: string }) {
  const { userDecks, handleDeckImported, handleRemoveDeck } = useApp();
  const [courseDeck, setCourseDeck] = useState<CuratedDeckItem | null>(null);
  const [courseLoaded, setCourseLoaded] = useState(!id.startsWith("course-"));

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

  const deck = useMemo(() => {
    return CURATED_DECKS.find((d) => d.id === id) || courseDeck;
  }, [id, courseDeck]);
  const isDemoDeck = CURATED_DECKS.some((item) => item.id === id);

  const [cardSearch, setCardSearch] = useState("");
  const [visibleCardCount, setVisibleCardCount] = useState(50);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [isPreviewFlipped, setIsPreviewFlipped] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!deck) return;
    const requestedWord = new URLSearchParams(window.location.search).get("word");
    if (!requestedWord) return;
    const target = deck.cards.findIndex((card) =>
      (card.koreanText || card.frontText || "").trim() === requestedWord,
    );
    if (target >= 0) setActivePreviewIndex(target);
  }, [deck]);

  const isAdded = useMemo(() => {
    if (!deck) return false;
    const target = curatedDeckToAnkiDeck(deck);
    return userDecks.some(
      (ud) => ud.id === target.id || ud.name === target.name
    );
  }, [deck, userDecks]);

  const deckCards = deck?.cards ?? [];
  const filteredCards = useMemo(() => deckCards.filter((c) => {
    const q = cardSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.koreanText || "").toLowerCase().includes(q) ||
      (c.vietnameseMeaning || "").toLowerCase().includes(q)
    );
  }), [deckCards, cardSearch]);
  const visibleCards = filteredCards.slice(0, visibleCardCount);
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
                {IS_DEMO_DECKS_ENABLED && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    Dữ liệu Demo
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
                    Xem Thử Thẻ Flashcard (Mẫu {activePreviewIndex + 1}/{deck.cards.length})
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
                {deck.cards.slice(0, 10).map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActivePreviewIndex(i);
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

            {/* DANH SÁCH CHI TIẾT TẤT CẢ CÁC THẺ TRONG BỘ */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                    Nội dung bộ thẻ ({deck.cards.length} thẻ)
                  </h2>
                  <p className="text-xs text-stone-400">
                    Toàn bộ từ vựng và câu mẫu có trong bộ thẻ này
                  </p>
                </div>

                <input
                  type="text"
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  placeholder="Lọc từ vựng..."
                  className="text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-sky-400 w-44"
                />
              </div>

              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 overflow-hidden shadow-xs divide-y divide-stone-100 dark:divide-stone-800/80">
                {visibleCards.map((card, idx) => (
                  <div
                    key={card.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-xs font-mono text-stone-400 pt-0.5 w-6 shrink-0">
                        {(idx + 1).toString().padStart(2, "0")}
                      </span>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base font-noto text-stone-900 dark:text-white">
                            {card.koreanText}
                          </span>
                        </div>
                        <div className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                          {card.vietnameseMeaning}
                        </div>
                        {card.exampleSentence && (
                          <div className="text-[11px] text-stone-400 italic truncate max-w-md pt-0.5">
                            {card.exampleSentence}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => speakKorean(card.koreanText || "")}
                      className="p-2 rounded-xl text-stone-400 hover:text-sky-500 hover:bg-sky-500/10 transition shrink-0"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {visibleCards.length < filteredCards.length && (
                <button
                  type="button"
                  onClick={() => setVisibleCardCount((count) => count + 50)}
                  className="w-full rounded-xl border border-sky-500/30 px-4 py-3 text-sm font-bold text-sky-600 transition hover:bg-sky-500/10 dark:text-sky-400"
                >
                  Hiện thêm {Math.min(50, filteredCards.length - visibleCards.length)} / {filteredCards.length - visibleCards.length} từ
                </button>
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
                    Đã Có Trong Kho Thẻ (Học Ngay)
                  </a>
                  <button
                    onClick={handleRemove}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Gỡ khỏi /flashcards
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-black bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-900/30 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Thêm vào /flashcard
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
                Thông tin người biên soạn
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
