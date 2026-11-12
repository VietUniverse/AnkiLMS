"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ExternalLink,
  FolderPlus,
  Globe2,
  Layers,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { CURATED_DECKS } from "../../data/curatedDecks";
import { AnkiCard, AnkiDeck } from "../../lib/ankiParser";
import { ApiClient } from "../../lib/apiClient";
import {
  browseLearningDictionary,
  detectDictionarySearchLanguage,
  DictionaryEntry,
  DictionaryLevel,
  naverLookupUrl,
  searchLearningDictionary,
} from "../../lib/dictionarySearch";

type NaverLookup = {
  hangul: string;
  hanja: string;
  pronunciation: string;
  importance: number;
  topik: string;
  partOfSpeech: string;
  meanings: Array<{
    meaning: string;
    english: string;
    korean: string;
    example: string;
    partOfSpeech: string;
  }>;
};

function formatDictionaryGloss(text: string | undefined): string {
  if (!text) return "";
  const parts = text
    .split(/\s*[;；]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const key = part.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }
  return unique.join("; ");
}

function dictionaryEntryToAnkiCard(entry: DictionaryEntry, id: number, deckName: string): AnkiCard {
  const cleanVi = formatDictionaryGloss(entry.vietnamese);
  const cleanEn = formatDictionaryGloss(entry.english);
  const meaning = cleanVi || cleanEn || formatDictionaryGloss(entry.japanese) || "";
  const extraNotes = [
    entry.partOfSpeech ? `[${entry.partOfSpeech}]` : "",
    cleanEn && cleanVi ? `EN: ${cleanEn.slice(0, 180)}` : "",
    entry.hanja ? `Hanja: ${entry.hanja}` : "",
    entry.pronunciation ? `[${entry.pronunciation}]` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id,
    noteId: id,
    deckName,
    frontHtml: entry.hangul,
    backHtml: meaning,
    frontText: entry.hangul,
    backText: meaning,
    fields: [
      entry.hangul,
      meaning,
      entry.romanization || "",
      extraNotes,
      entry.english || "",
    ],
    tags: [entry.topik, entry.level, entry.partOfSpeech, entry.topic].filter(
      (x): x is string => Boolean(x),
    ),
    koreanText: entry.hangul,
    vietnameseMeaning: meaning,
    exampleSentence: extraNotes,
    audioUrls: [],
    imageUrls: [],
    mediaRefs: [],
    dueDate: Date.now(),
    interval: 0,
    reps: 0,
    lapses: 0,
    state: "new",
  };
}

export default function DictionaryPage() {
  const { userDecks, currentUser, handleDeckImported, handleRemoveDeck, handleOpenAuth } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [naverEntry, setNaverEntry] = useState<NaverLookup | null>(null);
  const [naverLoading, setNaverLoading] = useState(false);
  const [naverError, setNaverError] = useState("");
  const [showAllNaver, setShowAllNaver] = useState(false);
  const [level, setLevel] = useState<DictionaryLevel>("all");
  const [page, setPage] = useState(0);

  // Custom Deck Builder & Manager state
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [creatingNewDeck, setCreatingNewDeck] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [newDeckVisibility, setNewDeckVisibility] = useState<"private" | "public">("private");
  const [pendingEntryToAdd, setPendingEntryToAdd] = useState<DictionaryEntry | null>(null);
  const [savingDeck, setSavingDeck] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const customUserDecks = useMemo(
    () => userDecks.filter((d) => d.id.startsWith("custom-dict-")),
    [userDecks],
  );

  const activeCustomDeck = useMemo(
    () =>
      customUserDecks.find((d) => d.id === selectedDeckId) ||
      customUserDecks[0] ||
      null,
    [customUserDecks, selectedDeckId],
  );

  useEffect(() => {
    if (!selectedDeckId && customUserDecks.length > 0) {
      setSelectedDeckId(customUserDecks[0].id);
    }
  }, [customUserDecks, selectedDeckId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const levelFilters: Array<{ value: DictionaryLevel; label: string }> = [
    { value: "all", label: "Tất cả cấp" },
    ...([1, 2, 3, 4, 5, 6] as const).map((rank) => ({
      value: `TOPIK ${rank}` as DictionaryLevel,
      label: `TOPIK ${rank}`,
    })),
  ];

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") || "");
  }, []);

  useEffect(() => {
    if (!query.trim() && level === "all") {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      const lookup = query.trim()
        ? searchLearningDictionary(
            query,
            60,
            controller.signal,
            detectDictionarySearchLanguage(query),
            level,
          )
        : browseLearningDictionary(level, "vi", page * 30, 30);
      void lookup
        .then((found) => {
          if (!cancelled) setResults(found);
        })
        .catch((cause) => {
          if (!cancelled)
            setError(cause instanceof Error ? cause.message : "Không tải được từ điển.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 120);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, level, page]);

  useEffect(() => {
    const term = query.trim();
    if (
      !currentUser ||
      (!/[가-힣]/u.test(term) && !/^[a-z][a-z\s.-]*$/iu.test(term)) ||
      term.length < 2 ||
      term.length > 60
    ) {
      setNaverEntry(null);
      setNaverLoading(false);
      setNaverError("");
      return;
    }
    const controller = new AbortController();
    setNaverLoading(true);
    setNaverError("");
    const timer = window.setTimeout(() => {
      void fetch(`/api/dictionary/naver?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = (await response.json()) as {
            entry?: NaverLookup | null;
            error?: string;
          };
          if (!response.ok) throw new Error(data.error || "Không tra được Naver.");
          setNaverEntry(data.entry || null);
        })
        .catch((cause) => {
          if (!controller.signal.aborted) {
            setNaverEntry(null);
            setNaverError(
              cause instanceof Error ? cause.message : "Không tra được Naver.",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setNaverLoading(false);
        });
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, currentUser]);

  function topicLabel(topic: string) {
    const parts = topic
      .split(" · ")
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 2
      ? `${parts.slice(0, 2).join(", ")} +${parts.length - 2}`
      : parts.join(", ");
  }

  function speak(word: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "ko-KR";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  function studyHref(entry: DictionaryEntry) {
    const curatedDeck = CURATED_DECKS.find((deck) =>
      deck.cards.some(
        (card) => (card.koreanText || card.frontText).trim() === entry.hangul,
      ),
    );
    const deckId = entry.courseId
      ? `curated-course-${entry.courseId}`
      : curatedDeck
      ? `curated-${curatedDeck.id}`
      : "";
    const deckName = curatedDeck?.title || entry.topic || "";
    const alreadyAdded = deckId
      ? userDecks.some(
          (deck) => deck.id === deckId || (deckName && deck.name === deckName),
        )
      : userDecks.some((deck) =>
          deck.cards.some(
            (card) => (card.koreanText || card.frontText).trim() === entry.hangul,
          ),
        );
    if (alreadyAdded) return "/flashcards";
    const exploreId = entry.courseId
      ? `course-${entry.courseId}`
      : curatedDeck?.id;
    return exploreId
      ? `/explore/${exploreId}?word=${encodeURIComponent(entry.hangul)}`
      : `/explore?search=${encodeURIComponent(entry.hangul)}`;
  }

  function isWordInDeck(deck: AnkiDeck | null, hangul: string): boolean {
    if (!deck) return false;
    return deck.cards.some(
      (c) => (c.koreanText || c.frontText || "").trim() === hangul.trim(),
    );
  }

  async function syncDeckToServer(deck: AnkiDeck) {
    if (!currentUser) return;
    try {
      const sharedId = await ApiClient.saveSharedDeck(deck);
      if (sharedId && sharedId !== deck.sharedId) {
        handleDeckImported({ ...deck, sharedId });
      }
    } catch (err) {
      console.error("Failed to sync deck to server:", err);
    }
  }

  async function addWordToDeck(entry: DictionaryEntry, targetDeck: AnkiDeck) {
    if (!currentUser) {
      handleOpenAuth(false);
      return;
    }
    if (isWordInDeck(targetDeck, entry.hangul)) {
      showToast(`"${entry.hangul}" đã có trong bộ thẻ "${targetDeck.name}".`);
      return;
    }
    const nextId =
      targetDeck.cards.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0) + 1;
    const newCard = dictionaryEntryToAnkiCard(entry, nextId, targetDeck.name);
    const updatedCards = [...targetDeck.cards, newCard];
    const updatedDeck: AnkiDeck = {
      ...targetDeck,
      cards: updatedCards,
      cardCount: updatedCards.length,
      author: targetDeck.author || {
        userId: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar_url || undefined,
        bio: currentUser.bio || undefined,
      },
    };
    handleDeckImported(updatedDeck);
    showToast(`Đã thêm "${entry.hangul}" vào bộ thẻ "${updatedDeck.name}"!`);
    void syncDeckToServer(updatedDeck);
  }

  function handleQuickAddWord(entry: DictionaryEntry) {
    if (!currentUser) {
      handleOpenAuth(false);
      return;
    }
    if (activeCustomDeck) {
      void addWordToDeck(entry, activeCustomDeck);
    } else {
      setPendingEntryToAdd(entry);
      setCreatingNewDeck(true);
      setNewDeckTitle("Từ vựng của tôi");
      setNewDeckDesc(`Bộ thẻ tổng hợp bởi ${currentUser.name}`);
      setNewDeckVisibility("private");
      setShowDeckModal(true);
    }
  }

  async function handleCreateDeckSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      handleOpenAuth(false);
      return;
    }
    const title = newDeckTitle.trim();
    if (title.length < 2) return;

    setSavingDeck(true);
    try {
      const deckId = `custom-dict-${Date.now()}`;
      const initialCards = pendingEntryToAdd
        ? [dictionaryEntryToAnkiCard(pendingEntryToAdd, 1, title)]
        : [];
      const newDeck: AnkiDeck = {
        id: deckId,
        name: title,
        description: newDeckDesc.trim(),
        visibility: newDeckVisibility,
        cardCount: initialCards.length,
        cards: initialCards,
        author: {
          userId: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar_url || undefined,
          bio: currentUser.bio || undefined,
        },
      };

      if (initialCards.length > 0) {
        const sharedId = await ApiClient.saveSharedDeck(newDeck).catch(() => undefined);
        if (sharedId) newDeck.sharedId = sharedId;
      }

      handleDeckImported(newDeck);
      setSelectedDeckId(newDeck.id);
      setCreatingNewDeck(false);
      setPendingEntryToAdd(null);
      setNewDeckTitle("");
      setNewDeckDesc("");
      showToast(
        newDeckVisibility === "public"
          ? `Đã tạo bộ thẻ công khai "${title}" (Tác giả: ${currentUser.name})!`
          : `Đã tạo bộ thẻ cá nhân "${title}"!`,
      );
    } finally {
      setSavingDeck(false);
    }
  }

  async function handleToggleDeckVisibility(
    deck: AnkiDeck,
    nextVisibility: "private" | "public",
  ) {
    if (!currentUser) return;
    if (deck.cards.length === 0) {
      showToast("Hãy thêm ít nhất 1 từ vào bộ thẻ trước khi công khai lên /explore.");
      return;
    }
    setSavingDeck(true);
    try {
      const updatedDeck: AnkiDeck = {
        ...deck,
        visibility: nextVisibility,
        author: {
          userId: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar_url || undefined,
          bio: currentUser.bio || undefined,
        },
      };
      const sharedId = await ApiClient.saveSharedDeck(updatedDeck);
      updatedDeck.sharedId = sharedId;
      handleDeckImported(updatedDeck);
      showToast(
        nextVisibility === "public"
          ? `Đã công khai "${deck.name}" lên /explore (Tác giả: ${currentUser.name})!`
          : `Đã chuyển "${deck.name}" về chế độ Lưu cá nhân.`,
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể cập nhật quyền hiển thị.");
    } finally {
      setSavingDeck(false);
    }
  }

  function handleRemoveWordFromDeck(deck: AnkiDeck, hangul: string) {
    const nextCards = deck.cards.filter(
      (c) => (c.koreanText || c.frontText || "").trim() !== hangul.trim(),
    );
    const updated: AnkiDeck = {
      ...deck,
      cards: nextCards,
      cardCount: nextCards.length,
    };
    handleDeckImported(updated);
    if (updated.cards.length > 0) {
      void syncDeckToServer(updated);
    }
  }

  const card =
    "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70";
  const tag = "rounded-md px-1.5 py-0.5 text-[11px] font-bold";
  const browsing = !query.trim() && level === "all";
  const naverMeanings = naverEntry
    ? showAllNaver
      ? naverEntry.meanings
      : naverEntry.meanings.slice(0, 2)
    : [];

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl space-y-4 pb-24 text-stone-900 dark:text-stone-100">
        {/* Toast notification */}
        {toastMsg && (
          <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-900/30 font-bold text-xs animate-slideUp">
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
            <button
              type="button"
              onClick={() => setShowDeckModal(true)}
              className="ml-2 underline font-extrabold hover:text-emerald-100 cursor-pointer"
            >
              Mở bộ thẻ →
            </button>
          </div>
        )}

        {/* Header + My Deck Builder Bar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">Từ điển Hàn – Việt – Anh</h1>
              </div>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                Tra từ bằng tiếng Việt, Hangul hoặc English · Lưu vào bộ thẻ cá nhân hoặc chia sẻ công khai lên /explore.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {currentUser && customUserDecks.length > 1 && (
                <select
                  value={activeCustomDeck?.id || ""}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  aria-label="Chọn bộ thẻ từ điển"
                  className="max-w-[190px] truncate rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-2.5 py-2 text-xs font-bold text-stone-900 dark:text-white outline-none"
                >
                  {customUserDecks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.cards.length})
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    handleOpenAuth(false);
                    return;
                  }
                  if (!activeCustomDeck) {
                    setCreatingNewDeck(true);
                  }
                  setShowDeckModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 px-3.5 py-2 text-xs font-extrabold text-sky-700 dark:text-sky-300 transition cursor-pointer max-w-full"
              >
                <Layers className="h-4 w-4 shrink-0" />
                <span className="max-w-[200px] truncate">
                  {activeCustomDeck
                    ? `${activeCustomDeck.name} (${activeCustomDeck.cards.length})`
                    : "Bộ thẻ của tôi"}
                </span>
                {activeCustomDeck?.visibility === "public" && (
                  <span title="Đang công khai trên /explore" className="shrink-0">
                    <Globe2 className="h-3.5 w-3.5 text-emerald-500" />
                  </span>
                )}
              </button>
            </div>
          </div>

          <label className="flex h-12 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 dark:border-stone-700 dark:bg-stone-900">
            <Search className="h-5 w-5 shrink-0 text-stone-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setQuery("");
              }}
              placeholder="Gõ tiếng Việt, Hangul hoặc English..."
              aria-label="Tìm bằng tiếng Việt, tiếng Hàn hoặc tiếng Anh"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-stone-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Xóa từ khóa"
                className="shrink-0 rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <div
            className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
            aria-label="Lọc theo cấp TOPIK"
          >
            {levelFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setLevel(item.value);
                  setPage(0);
                }}
                aria-pressed={level === item.value}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  level === item.value
                    ? "bg-sky-500 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                }`}
                style={level === item.value ? { color: "#fff" } : undefined}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {browsing ? (
          <section
            className={`${card} px-6 py-10 text-center text-sm text-stone-500 dark:text-stone-400 space-y-4`}
          >
            <BookOpen className="mx-auto h-8 w-8 text-sky-500" />
            <div className="space-y-1.5">
              <p className="max-w-xl mx-auto text-xs sm:text-sm">
                Tra từ bằng tiếng Việt, Hangul hoặc English. Khi tra cứu, bấm <b>+ Thêm vào bộ thẻ</b> để lưu học cá nhân hoặc chuyển sang <b>Public</b> để chia sẻ lên <b>/explore</b>.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-bold text-stone-400">Tra nhanh:</span>
              {["사랑", "은행", "합격하다", "인공지능", "ngân hàng", "hợp đồng", "du học", "khách sạn"].map(
                (sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setQuery(sample)}
                    className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 hover:border-sky-500/50 hover:text-sky-500 px-3 py-1 text-xs font-bold text-stone-700 dark:text-stone-300 transition cursor-pointer"
                  >
                    {sample}
                  </button>
                ),
              )}
            </div>
          </section>
        ) : loading ? (
          <section
            className={`${card} p-8 text-center text-sm text-stone-500 dark:text-stone-400`}
          >
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-sky-500" />
            Đang tra từ điển…
          </section>
        ) : error ? (
          <section className={`${card} p-8 text-center text-sm text-rose-600`}>
            {error}
          </section>
        ) : (
          <section className="space-y-3">
            {naverLoading && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Đang tra Naver…
              </p>
            )}
            {naverError && <p className="text-xs text-amber-600">{naverError}</p>}
            {naverEntry && (
              <article className={`${card} border-emerald-500/40 p-4 sm:p-5`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`${tag} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}
                  >
                    Naver
                  </span>
                  {naverEntry.topik && (
                    <span
                      className={`${tag} bg-sky-500/10 text-sky-700 dark:text-sky-300`}
                    >
                      {naverEntry.topik}
                    </span>
                  )}
                  {naverEntry.importance > 0 && (
                    <span className="text-xs text-amber-500">
                      {"★".repeat(naverEntry.importance)}
                    </span>
                  )}
                </div>
                <h2 className="mt-2 font-noto text-2xl font-black">
                  {naverEntry.hangul}
                  {naverEntry.hanja && (
                    <span className="ml-2 text-base font-semibold text-stone-500 dark:text-stone-400">
                      {naverEntry.hanja}
                    </span>
                  )}
                </h2>
                {naverMeanings.map((meaning, index) => (
                  <div
                    key={`${meaning.meaning}-${index}`}
                    className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800"
                  >
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {meaning.meaning}
                      {meaning.partOfSpeech && (
                        <span className="ml-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                          {meaning.partOfSpeech}
                        </span>
                      )}
                    </p>
                    {meaning.english && (
                      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                        {meaning.english}
                      </p>
                    )}
                    {meaning.example && (
                      <p className="mt-1.5 font-noto text-sm text-sky-700 dark:text-sky-300">
                        {meaning.example}
                      </p>
                    )}
                  </div>
                ))}
                <div className="mt-3 flex items-center justify-between">
                  {naverEntry.meanings.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllNaver(!showAllNaver)}
                      className="text-xs font-bold text-sky-600 hover:underline dark:text-sky-400 cursor-pointer"
                    >
                      {showAllNaver
                        ? "Thu gọn"
                        : `Xem thêm ${naverEntry.meanings.length - 2} nghĩa`}
                    </button>
                  ) : (
                    <span />
                  )}
                  <a
                    href={naverLookupUrl(naverEntry.hangul)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline dark:text-sky-400"
                  >
                    Mở Naver <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </article>
            )}

            <p className="px-1 text-xs font-semibold text-stone-500 dark:text-stone-400">
              {results.length
                ? query.trim()
                  ? `${results.length} kết quả phù hợp`
                  : `${level === "all" ? "Tất cả cấp" : level}, trang ${page + 1}`
                : "Không tìm thấy nghĩa trong dữ liệu hiện có."}
            </p>

            {results.map((entry, index) => {
              const href = studyHref(entry);
              const inActiveDeck = isWordInDeck(activeCustomDeck, entry.hangul);
              return (
                <article key={`${entry.hangul}-${index}`} className={`${card} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <h2 className="font-noto text-xl font-black">{entry.hangul}</h2>
                        {entry.hanja && (
                          <span className="text-sm text-stone-400">{entry.hanja}</span>
                        )}
                        {entry.partOfSpeech && (
                          <span
                            className={`${tag} bg-sky-500/10 text-sky-700 dark:text-sky-300`}
                          >
                            {entry.partOfSpeech}
                          </span>
                        )}
                        {(entry.topik || entry.level) && (
                          <span
                            className={`${tag} bg-violet-500/10 text-violet-700 dark:text-violet-300`}
                          >
                            {entry.topik || entry.level}
                          </span>
                        )}
                        {entry.topic && (
                          <span
                            className={`${tag} bg-amber-500/10 text-amber-700 dark:text-amber-300`}
                          >
                            {topicLabel(entry.topic)}
                          </span>
                        )}
                      </div>
                      {entry.vietnamese ? (
                        <p className="mt-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 line-clamp-3">
                          {formatDictionaryGloss(entry.vietnamese)}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-sm text-amber-600">
                          Chưa có nghĩa tiếng Việt.
                        </p>
                      )}
                      {entry.english && (
                        <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300 line-clamp-2">
                          {formatDictionaryGloss(entry.english)}
                        </p>
                      )}
                      {entry.japanese && (
                        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                          {formatDictionaryGloss(entry.japanese)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => speak(entry.hangul)}
                        aria-label={`Nghe ${entry.hangul}`}
                        title="Nghe phát âm"
                        className="rounded-xl p-2 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400 cursor-pointer"
                      >
                        <Volume2 className="h-5 w-5" />
                      </button>
                      <a
                        href={entry.url || naverLookupUrl(entry.hangul)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Tra ${entry.hangul} trên Naver`}
                        title="Tra Naver"
                        className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 dark:border-stone-800/80 pt-2.5">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleQuickAddWord(entry)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition cursor-pointer max-w-full ${
                          inActiveDeck
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            : "bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30"
                        }`}
                      >
                        {inActiveDeck ? (
                          <>
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-[220px] truncate">
                              Đã lưu trong {activeCustomDeck?.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-[220px] truncate">
                              {activeCustomDeck
                                ? `Thêm vào "${activeCustomDeck.name}"`
                                : "Thêm vào bộ thẻ của tôi"}
                            </span>
                          </>
                        )}
                      </button>

                      {currentUser && (
                        <button
                          type="button"
                          onClick={() => {
                            setPendingEntryToAdd(entry);
                            setCreatingNewDeck(true);
                            setNewDeckTitle("");
                            setNewDeckDesc("");
                            setShowDeckModal(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-stone-200 dark:border-stone-700 px-2.5 py-1.5 text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                        >
                          <FolderPlus className="h-3.5 w-3.5" />
                          Tạo bộ thẻ mới từ từ này
                        </button>
                      )}
                    </div>

                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:underline dark:text-violet-300"
                    >
                      {href === "/flashcards" ? "Mở flashcard" : "Xem bộ thẻ có sẵn"}
                    </Link>
                  </div>
                </article>
              );
            })}

            {!results.length && (
              <a
                href={naverLookupUrl(query.trim())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-sky-600 hover:underline dark:text-sky-400"
              >
                Tra từ này trên Naver <ExternalLink className="h-4 w-4" />
              </a>
            )}

            {!query.trim() && level !== "all" && (
              <div className="flex justify-center gap-3 pt-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  className="rounded-xl border border-stone-200 px-5 py-2.5 text-xs font-bold hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Trước
                </button>
                <button
                  disabled={results.length < 30}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-xl border border-stone-200 px-5 py-2.5 text-xs font-bold hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Tiếp
                </button>
              </div>
            )}
          </section>
        )}

        {/* Modal: Quản lý & Tạo Bộ thẻ Từ điển (Cá nhân hoặc Public lên /explore) */}
        {showDeckModal && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3.5">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-sky-500" />
                    Bộ thẻ Từ điển của {currentUser.name}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Lưu cá nhân để tự học tại /flashcards, hoặc chuyển sang Public để hiện lên /explore kèm tên tác giả. Giáo viên cũng có thể giao trực tiếp bộ thẻ này trong /classes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeckModal(false);
                    setCreatingNewDeck(false);
                    setPendingEntryToAdd(null);
                  }}
                  className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Toggle between choosing an existing custom deck vs creating a new one */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {customUserDecks.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setSelectedDeckId(d.id);
                          setCreatingNewDeck(false);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          !creatingNewDeck && activeCustomDeck?.id === d.id
                            ? "bg-sky-600 text-white"
                            : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200"
                        }`}
                      >
                        {d.visibility === "public" ? (
                          <Globe2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 opacity-70" />
                        )}
                        <span>{d.name}</span>
                        <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-[10px]">
                          {d.cards.length}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreatingNewDeck(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 text-xs font-extrabold text-sky-600 dark:text-sky-300 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tạo bộ thẻ mới
                  </button>
                </div>

                {creatingNewDeck || !activeCustomDeck ? (
                  <form
                    onSubmit={handleCreateDeckSubmit}
                    className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 p-4 space-y-3"
                  >
                    <h3 className="text-sm font-black text-stone-900 dark:text-white">
                      Tạo bộ thẻ mới
                      {pendingEntryToAdd && (
                        <span className="ml-2 text-xs font-bold text-sky-500">
                          (Kèm từ đầu tiên: {pendingEntryToAdd.hangul})
                        </span>
                      )}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-bold">
                        Tên bộ thẻ *
                        <input
                          required
                          minLength={2}
                          maxLength={120}
                          value={newDeckTitle}
                          onChange={(e) => setNewDeckTitle(e.target.value)}
                          placeholder="VD: Từ vựng Thương mại Hàn - Việt"
                          className="mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs outline-none focus:border-sky-500"
                        />
                      </label>
                      <label className="block text-xs font-bold">
                        Chế độ hiển thị
                        <select
                          value={newDeckVisibility}
                          onChange={(e) =>
                            setNewDeckVisibility(e.target.value as "private" | "public")
                          }
                          className="mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs font-bold outline-none focus:border-sky-500"
                        >
                          <option value="private">Lưu cá nhân (Chỉ mình tôi học)</option>
                          <option value="public">
                            Public lên /explore (Mọi người cùng học · Tác giả: {currentUser.name})
                          </option>
                        </select>
                      </label>
                    </div>
                    <label className="block text-xs font-bold">
                      Mô tả bộ thẻ
                      <input
                        maxLength={500}
                        value={newDeckDesc}
                        onChange={(e) => setNewDeckDesc(e.target.value)}
                        placeholder="Ghi chú chủ đề hoặc mục tiêu học tập..."
                        className="mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs outline-none focus:border-sky-500"
                      />
                    </label>
                    <div className="flex justify-end gap-2 pt-1">
                      {customUserDecks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCreatingNewDeck(false);
                            setPendingEntryToAdd(null);
                          }}
                          className="rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-2 text-xs font-bold"
                        >
                          Hủy
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={savingDeck}
                        className="rounded-xl bg-sky-600 hover:bg-sky-500 px-5 py-2 text-xs font-extrabold text-white cursor-pointer disabled:opacity-50"
                      >
                        {savingDeck ? "Đang tạo..." : "Tạo bộ thẻ"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {/* Active Deck Info & Visibility Switch */}
                    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-stone-900 dark:text-white">
                            {activeCustomDeck.name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                              activeCustomDeck.visibility === "public"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                                : "bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                            }`}
                          >
                            {activeCustomDeck.visibility === "public" ? (
                              <>
                                <Globe2 className="h-3 w-3" />
                                Đang Public trên /explore
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                Lưu cá nhân
                              </>
                            )}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                          Tác giả: <b>{currentUser.name}</b> · {activeCustomDeck.cards.length} từ
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={savingDeck}
                          onClick={() =>
                            void handleToggleDeckVisibility(
                              activeCustomDeck,
                              activeCustomDeck.visibility === "public" ? "private" : "public",
                            )
                          }
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
                            activeCustomDeck.visibility === "public"
                              ? "border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white"
                          }`}
                        >
                          <Globe2 className="h-3.5 w-3.5" />
                          {activeCustomDeck.visibility === "public"
                            ? "Chuyển về Cá nhân"
                            : "Chuyển sang Public (/explore)"}
                        </button>

                        <a
                          href={`/flashcards?study=true&deckId=user-${encodeURIComponent(activeCustomDeck.id)}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 px-3.5 py-2 text-xs font-extrabold text-white"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Học bộ thẻ này
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Xóa bộ thẻ "${activeCustomDeck.name}" khỏi thiết bị của bạn?`,
                              )
                            ) {
                              handleRemoveDeck(activeCustomDeck.id);
                              setSelectedDeckId("");
                            }
                          }}
                          className="rounded-xl border border-rose-300 dark:border-rose-800/60 p-2 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title="Xóa bộ thẻ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Words inside the active custom deck */}
                    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-200 dark:divide-stone-800 max-h-72 overflow-y-auto">
                      {activeCustomDeck.cards.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between gap-3 p-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-noto text-sm font-bold text-stone-900 dark:text-white">
                              {c.koreanText || c.frontText}
                            </p>
                            <p className="text-stone-600 dark:text-stone-300 truncate">
                              {c.vietnameseMeaning || c.backText}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveWordFromDeck(
                                activeCustomDeck,
                                c.koreanText || c.frontText,
                              )
                            }
                            className="rounded-lg p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            title="Bỏ từ này khỏi bộ thẻ"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {activeCustomDeck.cards.length === 0 && (
                        <p className="p-6 text-center text-xs text-stone-400">
                          Bộ thẻ chưa có từ nào. Hãy đóng cửa sổ này, tìm từ trên thanh tìm kiếm và bấm <b>+ Thêm vào &quot;{activeCustomDeck.name}&quot;</b>!
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
