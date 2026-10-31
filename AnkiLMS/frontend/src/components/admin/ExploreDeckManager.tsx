"use client";

import { useEffect, useMemo, useState } from "react";
import { CURATED_DECKS, CuratedDeckItem } from "../../data/curatedDecks";
import { courseToExploreDeck, loadCourseVocabulary, loadSeoul1AExploreDeck } from "../../lib/courseVocabulary";
import { AnkiCard } from "../../lib/ankiParser";
import { Loader2, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";

type DeckRow = { sharedId: string; deckId: string; title: string; description: string; visibility: "public" | "private"; cardCount: number; updatedAt: string; ownerName?: string; ownerEmail?: string };
type EditableDeck = { id: string; deckId?: string; sharedId?: string; title: string; description: string; visibility: "public" | "private"; cards: AnkiCard[]; source: "catalog" | "shared" };
type Props = { request: <T>(path: string, init?: RequestInit) => Promise<T>; onError: (message: string) => void };

const fieldCls = "w-full rounded-xl border border-stone-200 dark:border-transparent bg-white dark:bg-[#132247] px-3.5 py-2 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner";
const labelCls = "block text-xs font-bold text-stone-700 dark:text-slate-300";
const ghostBtnCls = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-100 hover:bg-stone-200 dark:bg-[#132247] dark:hover:bg-[#1a2f60] px-3 py-2 text-xs font-bold text-stone-700 dark:text-slate-200 transition-colors";
const dangerBtnCls = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-700/50 bg-rose-50/50 hover:bg-rose-100 dark:bg-transparent dark:hover:bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 transition-colors disabled:opacity-50";

function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function normalizeCard(raw: Record<string, unknown>, index: number, title: string): AnkiCard {
  const fields = Array.isArray(raw.fields) ? raw.fields.map(text) : [];
  const front = text(raw.koreanText) || text(raw.frontText) || fields[0] || "";
  const back = text(raw.vietnameseMeaning) || text(raw.backText) || fields[1] || "";
  return { ...(raw as unknown as AnkiCard), id: Number(raw.id) || index + 1, noteId: Number(raw.noteId) || index + 1, deckName: title,
    frontHtml: text(raw.frontHtml) || front, backHtml: text(raw.backHtml) || back, frontText: front, backText: back,
    koreanText: front, vietnameseMeaning: back, fields, tags: Array.isArray(raw.tags) ? raw.tags.map(text) : [],
    audioUrls: Array.isArray(raw.audioUrls) ? raw.audioUrls.map(text) : [], imageUrls: Array.isArray(raw.imageUrls) ? raw.imageUrls.map(text) : [], mediaRefs: [],
    dueDate: Number(raw.dueDate) || 0, interval: Number(raw.interval) || 0, reps: Number(raw.reps) || 0, lapses: Number(raw.lapses) || 0,
    state: raw.state === "review" || raw.state === "learning" ? raw.state : "new" };
}
function setCardSide(card: AnkiCard, side: "front" | "back", value: string): AnkiCard {
  const fields = [...(card.fields || [])];
  if (side === "front") { fields[0] = value; return { ...card, frontText: value, frontHtml: value, koreanText: value, fields }; }
  fields[1] = value; return { ...card, backText: value, backHtml: value, vietnameseMeaning: value, fields };
}

export function ExploreDeckManager({ request, onError }: Props) {
  const [catalog, setCatalog] = useState<CuratedDeckItem[]>(CURATED_DECKS);
  const [shared, setShared] = useState<DeckRow[]>([]);
  const [overrides, setOverrides] = useState<DeckRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<EditableDeck | null>(null);
  const [cardQuery, setCardQuery] = useState("");
  const [page, setPage] = useState(0);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const perPage = 25;

  async function refresh() {
    setLoading(true);
    try {
      const [remote, courses, seoul, overrideResponse] = await Promise.all([
        request<{ decks: DeckRow[] }>("/api/admin/content-decks"),
        loadCourseVocabulary(), loadSeoul1AExploreDeck(),
        fetch("/api/explore/deck-overrides", { cache: "no-store" }).then((r) => r.json() as Promise<{ overrides?: DeckRow[] }>),
      ]);
      const generated = courses?.decks.flatMap((group) => group.courses.map(courseToExploreDeck)) || [];
      setCatalog([...CURATED_DECKS, ...generated, ...(seoul ? [seoul] : [])]);
      setShared(remote.decks.filter((item) => !item.deckId.startsWith("catalog:")));
      setOverrides((overrideResponse.overrides || []).map((item) => ({ ...item, deckId: item.deckId.slice("catalog:".length) })));
    } catch (cause) { onError(cause instanceof Error ? cause.message : "Không tải được thư viện Explore."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  const rows = useMemo(() => {
    const overrideMap = new Map(overrides.map((row) => [row.deckId, row]));
    const bases = catalog.map((deck) => {
      const override = overrideMap.get(deck.id);
      return { id: deck.id, title: override?.title || deck.title, description: override?.description ?? deck.description,
        cardCount: override?.cardCount ?? deck.cards.length, visibility: override?.visibility || "public" as const,
        kind: "catalog" as const, hidden: override?.visibility === "private", author: "HaechiVN" };
    });
    const community = shared.map((row) => ({ id: row.sharedId, title: row.title, description: row.description, cardCount: row.cardCount,
      visibility: row.visibility, kind: "shared" as const, hidden: false, author: row.ownerName || "Người học" }));
    const q = query.trim().toLocaleLowerCase();
    return [...bases, ...community].filter((row) => !q || `${row.title} ${row.description} ${row.id} ${row.author}`.toLocaleLowerCase().includes(q));
  }, [catalog, overrides, shared, query]);

  async function openDeck(row: (typeof rows)[number]) {
    setSaving(true); setCardQuery(""); setPage(0); onError("");
    try {
      if (row.kind === "catalog") {
        const base = catalog.find((deck) => deck.id === row.id);
        if (!base) throw new Error("Không tìm thấy bộ gốc.");
        const override = overrides.find((item) => item.deckId === row.id);
        const record = override ? (await request<{ deck: EditableDeck }>(`/api/admin/content-decks?id=${encodeURIComponent(override.sharedId)}`)).deck : null;
        setSelected({ id: row.id, sharedId: record?.sharedId || override?.sharedId, title: record?.title || base.title,
          description: record?.description ?? base.description, visibility: record?.visibility || "public",
          cards: (record?.cards || base.cards).map((card, i) => normalizeCard(card as unknown as Record<string, unknown>, i, row.title)), source: "catalog" });
      } else {
        const record = (await request<{ deck: EditableDeck }>(`/api/admin/content-decks?id=${encodeURIComponent(row.id)}`)).deck;
        setSelected({ ...record, id: row.id, sharedId: record.sharedId, cards: record.cards.map((card, i) => normalizeCard(card as unknown as Record<string, unknown>, i, record.title)), source: "shared" });
      }
    } catch (cause) { onError(cause instanceof Error ? cause.message : "Không mở được bộ thẻ."); }
    finally { setSaving(false); }
  }

  async function save() {
    if (!selected) return;
    setSaving(true); onError("");
    try {
      const deckId = selected.source === "catalog" ? `catalog:${selected.id}` : selected.deckId || selected.id;
      const result = await request<{ sharedId: string }>("/api/admin/content-decks", { method: "POST", body: JSON.stringify({
        sharedId: selected.sharedId, deckId, title: selected.title, description: selected.description,
        visibility: selected.visibility, cards: selected.cards,
      }) });
      setSelected({ ...selected, sharedId: result.sharedId });
      await refresh();
    } catch (cause) { onError(cause instanceof Error ? cause.message : "Không lưu được thay đổi."); }
    finally { setSaving(false); }
  }

  async function removeDeck() {
    if (!selected) return;
    if (selected.source === "catalog") {
      if (!window.confirm(`Ẩn bộ “${selected.title}” khỏi Explore? Có thể khôi phục bằng cách đổi lại thành công khai.`)) return;
      setSelected({ ...selected, visibility: "private" });
      return;
    }
    if (!selected.sharedId || !window.confirm(`Xóa bộ “${selected.title}” khỏi Explore và xóa dữ liệu trên máy chủ?`)) return;
    setSaving(true);
    try { await request(`/api/admin/content-decks?id=${encodeURIComponent(selected.sharedId)}`, { method: "DELETE" }); setSelected(null); await refresh(); }
    catch (cause) { onError(cause instanceof Error ? cause.message : "Không xóa được bộ thẻ."); }
    finally { setSaving(false); }
  }

  const filteredCards = selected?.cards.filter((card) => `${card.frontText} ${card.backText}`.toLocaleLowerCase().includes(cardQuery.trim().toLocaleLowerCase())) || [];
  const visibleCards = filteredCards.slice(page * perPage, (page + 1) * perPage);
  return (
    <section className="card-duo rounded-2xl space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-base font-bold text-stone-900 dark:text-white">Quản lý toàn bộ thư viện Explore</h2>
        <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-slate-400">
          Sửa bộ gốc, bộ cộng đồng và từng thẻ. Bản cập nhật của bộ gốc được lưu trên máy chủ rồi áp dụng cho trang Explore.
        </p>
      </div>

      {!selected ? (
        <>
          <label className="flex items-center gap-2 rounded-xl border border-stone-200 dark:border-transparent bg-white dark:bg-[#132247] px-3.5 shadow-inner">
            <Search className="h-4 w-4 text-stone-400 dark:text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm bộ thẻ theo tên hoặc tác giả"
              className="w-full bg-transparent py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-400 outline-none"
            />
          </label>
          <div className="max-h-[70vh] divide-y divide-stone-200 dark:divide-slate-800 overflow-y-auto rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
            {loading ? (
              <p className="p-4 text-sm text-stone-500 dark:text-slate-400">Đang tải thư viện…</p>
            ) : (
              rows.map((row) => (
                <article
                  key={`${row.kind}:${row.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 transition hover:bg-stone-50 dark:hover:bg-slate-900/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-stone-900 dark:text-white">{row.title}</p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                      {row.cardCount.toLocaleString("vi-VN")} thẻ · {row.kind === "catalog" ? "Bộ gốc HaechiVN" : `Cộng đồng · ${row.author}`} ·{" "}
                      {row.visibility === "public" ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-300">Công khai</span>
                      ) : (
                        <span className="font-bold text-amber-600 dark:text-amber-300">Riêng tư</span>
                      )}
                    </p>
                  </div>
                  <button
                    disabled={saving}
                    onClick={() => void openDeck(row)}
                    className={`${ghostBtnCls} h-8 px-3 text-xs`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Mở chỉnh sửa
                  </button>
                </article>
              ))
            )}
            {!loading && !rows.length && (
              <p className="p-4 text-sm text-stone-400 dark:text-slate-500">Không có bộ thẻ khớp.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">Đang sửa: {selected.title}</h3>
              <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                {selected.cards.length.toLocaleString("vi-VN")} thẻ · {selected.source === "catalog" ? "Bộ gốc" : "Bộ cộng đồng"}
              </p>
            </div>
            <button onClick={() => setSelected(null)} className={`${ghostBtnCls} h-8 px-3 text-xs`}>
              <X className="h-4 w-4" />
              Đóng
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelCls}>
              Tên bộ
              <input
                value={selected.title}
                maxLength={120}
                onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                className={`mt-1.5 ${fieldCls}`}
              />
            </label>
            <label className={labelCls}>
              Quyền truy cập
              <select
                value={selected.visibility}
                onChange={(e) => setSelected({ ...selected, visibility: e.target.value as "public" | "private" })}
                className={`mt-1.5 ${fieldCls}`}
              >
                <option value="public">Công khai</option>
                <option value="private">Riêng tư / ẩn khỏi Explore</option>
              </select>
            </label>
          </div>

          <label className={labelCls}>
            Mô tả
            <textarea
              value={selected.description}
              maxLength={1000}
              rows={2}
              onChange={(e) => setSelected({ ...selected, description: e.target.value })}
              className={`mt-1.5 ${fieldCls}`}
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <h4 className="text-sm font-bold text-stone-900 dark:text-white">
              Thẻ trong bộ ({selected.cards.length.toLocaleString("vi-VN")})
            </h4>
            <input
              value={cardQuery}
              onChange={(e) => {
                setCardQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Lọc thẻ"
              className="rounded-xl border border-stone-200 dark:border-transparent bg-white dark:bg-[#132247] px-3 py-1.5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-400 outline-none shadow-inner"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={newFront}
              onChange={(e) => setNewFront(e.target.value)}
              placeholder="Mặt trước · Hangul"
              className={fieldCls}
            />
            <input
              value={newBack}
              onChange={(e) => setNewBack(e.target.value)}
              placeholder="Mặt sau · Nghĩa"
              className={fieldCls}
            />
            <button
              onClick={() => {
                if (!newFront.trim() || !newBack.trim() || !selected) return;
                const card = normalizeCard(
                  {
                    frontText: newFront.trim(),
                    backText: newBack.trim(),
                    koreanText: newFront.trim(),
                    vietnameseMeaning: newBack.trim(),
                    fields: [newFront.trim(), newBack.trim()],
                  },
                  selected.cards.length,
                  selected.title
                );
                setSelected({ ...selected, cards: [...selected.cards, card] });
                setNewFront("");
                setNewBack("");
              }}
              className="btn-duo btn-duo-primary inline-flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              Thêm thẻ
            </button>
          </div>

          <div className="max-h-[48vh] divide-y divide-stone-200 dark:divide-slate-800 overflow-y-auto rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
            {visibleCards.map((card) => {
              const index = selected.cards.indexOf(card);
              return (
                <article
                  key={`${card.id}:${index}`}
                  className="grid gap-2 p-3 sm:grid-cols-[1fr_1fr_auto] transition hover:bg-stone-50 dark:hover:bg-slate-900/40"
                >
                  <input
                    aria-label="Mặt trước"
                    value={card.frontText}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        cards: selected.cards.map((item, i) => (i === index ? setCardSide(item, "front", e.target.value) : item)),
                      })
                    }
                    className={fieldCls}
                  />
                  <input
                    aria-label="Mặt sau"
                    value={card.backText}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        cards: selected.cards.map((item, i) => (i === index ? setCardSide(item, "back", e.target.value) : item)),
                      })
                    }
                    className={fieldCls}
                  />
                  <button
                    aria-label="Xóa thẻ"
                    onClick={() => setSelected({ ...selected, cards: selected.cards.filter((_, i) => i !== index) })}
                    className="self-center rounded-xl border border-rose-300 dark:border-rose-900/50 bg-rose-50/50 hover:bg-rose-100 dark:bg-transparent dark:hover:bg-rose-950/40 p-2 text-rose-600 dark:text-rose-300 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </article>
              );
            })}
            {!visibleCards.length && <p className="p-4 text-sm text-stone-500 dark:text-slate-400">Không có thẻ khớp.</p>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Hiển thị {filteredCards.length ? page * perPage + 1 : 0}–
              {Math.min((page + 1) * perPage, filteredCards.length)} / {filteredCards.length.toLocaleString("vi-VN")}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className={`${ghostBtnCls} h-8 px-3 text-xs disabled:opacity-40`}
              >
                Trước
              </button>
              <button
                disabled={(page + 1) * perPage >= filteredCards.length}
                onClick={() => setPage(page + 1)}
                className={`${ghostBtnCls} h-8 px-3 text-xs disabled:opacity-40`}
              >
                Sau
              </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-2 border-t border-stone-200 dark:border-slate-800 pt-4">
            <button
              onClick={() => void removeDeck()}
              disabled={saving}
              className={`${dangerBtnCls} h-9 px-4 text-xs font-bold`}
            >
              <Trash2 className="h-4 w-4" />
              {selected.source === "catalog" ? "Ẩn khỏi Explore" : "Xóa bộ"}
            </button>
            <button
              onClick={() => void save()}
              disabled={saving || selected.cards.length < 1 || selected.title.trim().length < 2}
              className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu bộ và thẻ lên máy chủ
            </button>
          </div>
        </>
      )}
    </section>
  );
}
