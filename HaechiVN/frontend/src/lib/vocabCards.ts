// Kiểu thẻ từ vựng và hàm thuần dùng chung cho trang /flashcards (không phụ thuộc React).
import DOMPurify from "dompurify";
import type { AnkiReviewEvent, AnkiScheduleMetadata } from "./ankiParser";
import { ankiScheduleToFSRSState, formatLocalDate, type FSRSState } from "./fsrs45.ts";

export type AssignedDeckItem = {
  id: string; classId: string; className: string; title: string;
  /** Tên bộ thẻ giáo viên chọn khi giao (vd "Tiếng Hàn Tổng Hợp 1 · Bài 1"), khác tên bài tập. */
  deckName: string;
  totalCards: number; reviewedCards: number; completed: boolean;
  dueLabel: string;
};

export type AssignmentCardJson = {
  id?: number | string; word?: string; korean?: string; meaning?: string; pos?: string;
  transliteration?: string; pronunciation?: string; explain?: string; image?: string; mediaHtml?: string;
  example?: string; example_translated?: string; collocation?: string; synonym?: string; antonym?: string;
  audio_word?: string; audio_meaning?: string; audio_example?: string;
  /** Đường dẫn deck gốc của thẻ ("A::B::C"), để học viên thấy đúng cấu trúc bộ thẻ được giao. */
  deckPath?: string;
};

export type AssignmentPayload = {
  id: string;
  classId: string;
  title: string;
  deckName?: string;
  deckCards?: AssignmentCardJson[];
};

export type AssignedDeckClassJson = {
  id: string;
  name?: string;
  ownerId?: string;
  members?: Array<{ id: string; role?: string }>;
  assignments?: Array<{ id: string; title: string; deckName?: string; totalCards?: number; reviewedCards?: number; completed?: boolean; dueDate?: string }>;
};

/** Tên bộ thẻ được giao → các tầng deck: "A::B" (Anki) hoặc "A · B" (bộ có sẵn), bỏ hậu tố "(Trọn bài)". */
export function deckPathOf(name: string): string[] {
  const sep = name.includes("::") ? "::" : " · ";
  const parts = name.split(sep).map((p) => p.trim()).filter(Boolean);
  if (parts.length) parts[parts.length - 1] = parts[parts.length - 1].replace(/\s*\(Trọn bài\)$/, "");
  return parts.length ? parts : [name.trim()];
}

/**
 * Cây bài tập lớp theo cấu trúc bộ thẻ gốc: deck mẹ (gom các bài chung deck mẹ) → deck được giao → deck con
 * (lấy từ deckPath của từng thẻ, bỏ phần chung). Nút deck mẹ chỉ mở/đóng; deck được giao và deck con thì học được.
 */
export function buildAssignedTree(items: AssignedDeckItem[], payloads: Record<string, AssignmentPayload>): DeckTreeNode[] {
  const roots: DeckTreeNode[] = [];
  const childOf = (list: DeckTreeNode[], id: string, title: string, extra: Partial<DeckTreeNode>) => {
    let node = list.find((n) => n.id === id);
    if (!node) list.push((node = { id, title, cards: [], children: [], ...extra }));
    return node;
  };
  for (const item of items) {
    const path = deckPathOf(item.deckName || item.title);
    const payload = payloads[item.id];
    const cards = payload ? assignmentCardsOf(payload) : [];
    let level = roots;
    path.slice(0, -1).forEach((seg, i) => {
      const group = childOf(level, `asg-group:${path.slice(0, i + 1).join("::")}`, seg, { groupOnly: true });
      group.cards.push(...cards);
      level = group.children!;
    });
    const root: DeckTreeNode = { id: `assignment-${item.id}`, title: path[path.length - 1], cards, children: [], assignment: item };
    level.push(root);
    // deckCards và cards cùng thứ tự (assignmentCardsOf map 1-1).
    const paths = (payload?.deckCards || []).map((c) => (c.deckPath || "").split("::").map((p) => p.trim()).filter(Boolean));
    const withPath = paths.filter((p) => p.length);
    let common = withPath.length ? Math.min(...withPath.map((p) => p.length)) : 0;
    while (common > 0 && !withPath.every((p) => p.slice(0, common).join("::") === withPath[0].slice(0, common).join("::"))) common -= 1;
    cards.forEach((card, i) => {
      const rel = paths[i].slice(common);
      let sub = root.children!;
      rel.forEach((seg, j) => {
        const node = childOf(sub, `${root.id}::${rel.slice(0, j + 1).join("::")}`, seg, { assignment: item });
        node.cards.push(card);
        sub = node.children!;
      });
    });
  }
  return roots;
}

// Chuyển thẻ của bài tập lớp sang dạng thẻ SRS dùng chung.
export const assignmentCardsOf = (asg: AssignmentPayload): VocabularyCard[] =>
  (asg.deckCards || []).map((c, idx: number) => ({
    id: c.id ?? idx + 1,
    word: c.word || c.korean || "",
    meaning: c.meaning || "",
    pos: c.pos || "Bài tập lớp",
    transliteration: c.transliteration || c.pronunciation || "",
    explain: c.explain || "",
    image: c.image || (c.mediaHtml && c.mediaHtml.includes("<img") ? c.mediaHtml : ""),
    example: c.example || "",
    example_translated: c.example_translated || "",
    collocation: c.collocation || "",
    synonym: c.synonym || "",
    antonym: c.antonym || "",
    audio_word: c.audio_word || (c.mediaHtml && c.mediaHtml.includes("<audio") ? c.mediaHtml : ""),
    audio_meaning: c.audio_meaning || "",
    audio_example: c.audio_example || "",
    deckName: asg.deckName || asg.title,
  }));

export interface VocabularyCard {
  writingData?: {
    cardType: "fill_blank" | "essay" | "choice" | "cloze" | "generic";
    questionNo: number;
    qid?: string;
    source?: string;
    category?: string;
    levelStyle?: string;
    promptHtml?: string;
    blankA_answer?: string;
    blankB_answer?: string;
    blankA_variants?: string[];
    blankB_variants?: string[];
    translationHtml?: string;
    explainA_Html?: string;
    explainB_Html?: string;
    grammarHtml?: string;
    vocabHtml?: string;
    pitfallsHtml?: string;
    notesHtml?: string;
    figureSvg?: string;
    modelEssay?: string;
    minChars?: number;
    maxChars?: number;
    choiceOpts?: string[];
    choiceCorrect?: number;
    keyPhrasesHtml?: string;
    explainHtml?: string;
    backHtml?: string;
    extraDe?: string;
  };
  id: number | string;
  /** Thẻ anh em của cùng một note: "typing" = nhìn nghĩa gõ chữ, có lịch ôn riêng. Không có = thẻ Review (nhìn chữ đoán nghĩa). */
  sibling?: "typing";
  code?: string;
  word: string;
  meaning: string;
  pos?: string;
  transliteration?: string;
  explain?: string;
  image?: string;
  example?: string;
  example_translated?: string;
  collocation?: string;
  synonym?: string;
  antonym?: string;
  audio_word?: string;
  audio_meaning?: string;
  audio_example?: string;
  tag_1?: string;
  tag_2?: string;
  tag_3?: string;
  tag_4?: string;
  deckName?: string;
  ankiSchedule?: AnkiScheduleMetadata;
  reviewHistory?: AnkiReviewEvent[];
}

export interface DeckTreeNode {
  id: string;
  title: string;
  cards: VocabularyCard[];
  children?: DeckTreeNode[];
  /** Thuộc bài tập lớp: bấm vào thì học thẻ của nút này dưới bài tập đó. */
  assignment?: AssignedDeckItem;
  /** Nút deck mẹ gom các bài tập: bấm chỉ mở/đóng. */
  groupOnly?: boolean;
}

// Clean image string helper
export const stateKeyOf = (c: VocabularyCard) => `${c.deckName || "deck"}_${c.id}${c.sibling ? "_typing" : ""}`;

export const normalizeKoreanText = (str?: string): string => {
  if (!str) return "";
  return str
    .normalize("NFC")
    .replace(/[.,?!~'"·\s]/g, "")
    .trim()
    .toLowerCase();
};

export const checkWritingVariantMatch = (typed: string, variants: string[]): boolean => {
  const normTyped = normalizeKoreanText(typed);
  if (!normTyped) return false;
  return variants.some((v) => {
    const normV = normalizeKoreanText(v);
    return normV === normTyped || (normTyped.length >= 4 && (normV.includes(normTyped) || normTyped.includes(normV)));
  });
};

export const isCardAWritingCard = (c?: VocabularyCard | null) => Boolean(
  c && (
    c.writingData ||
    c.deckName?.toLowerCase().includes("writing") ||
    c.pos?.toLowerCase().includes("viết") ||
    c.word?.startsWith("Câu 51") ||
    c.word?.startsWith("Câu 52") ||
    c.word?.startsWith("Câu 53") ||
    c.word?.startsWith("Câu 54")
  )
);
// Lịch Anki cũ chỉ thuộc thẻ Review; thẻ Typing luôn bắt đầu từ mới.
export const cardStateFor = (map: Record<string, FSRSState>, key: string, card: VocabularyCard): FSRSState =>
  map[key] || (card.ankiSchedule && !card.sibling ? ankiScheduleToFSRSState(card.ankiSchedule) : undefined) || {
    interval: 1,
    reps: 0,
    lapses: 0,
    state: "new",
    dueDate: formatLocalDate(new Date()),
    stability: 0,
    difficulty: 5,
    lastReview: null,
    easeFactor: 2.5,
    learningSteps: 0,
  };

/** Anki-style label for the next review gap, e.g. "10 phút", "5 ngày". */
export const formatNextReview = (state: FSRSState, now = new Date()): string => {
  const minutes = Math.max(1, Math.round((new Date(state.dueAt || `${state.dueDate}T00:00:00`).getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} phút`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} giờ`;
  const days = Math.max(1, state.interval || Math.round(minutes / 1440));
  if (days < 30) return `${days} ngày`;
  if (days < 365) return `${Math.round(days / 30)} tháng`;
  return `${Math.round(days / 36.5) / 10} năm`;
};

export const toThthMediaUrl = (rawPath: string): string => {
  const trimmed = rawPath.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/api/")) return trimmed;
  const cleanName = trimmed.replace(/^\/+/, "");
  if (!cleanName.includes("/")) {
    return `/api/thth-media?file=${encodeURIComponent(cleanName)}`;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

export const extractImageSrc = (imgStr?: string): string | null => {
  if (!imgStr) return null;
  const match = imgStr.match(/src=["']([^"']+)["']/i);
  if (match) {
    return toThthMediaUrl(match[1]) || null;
  }
  if (imgStr.includes("<img")) return null;
  return toThthMediaUrl(imgStr) || null;
};

export const extractAudioSrc = (audioField?: string): string | null => {
  if (!audioField) return null;
  const soundMatch = audioField.match(/\[sound:([^\]]+)\]/i);
  if (soundMatch?.[1]) {
    return toThthMediaUrl(soundMatch[1]) || null;
  }
  const srcMatch = audioField.match(/src=["']([^"']+)["']/i);
  if (srcMatch?.[1]) {
    return toThthMediaUrl(srcMatch[1]) || null;
  }
  const trimmed = audioField.trim();
  if (/\.(mp3|ogg|wav|m4a)(\?|$)/i.test(trimmed) || trimmed.startsWith("/api/thth-media")) {
    return toThthMediaUrl(trimmed) || null;
  }
  return null;
};

// Clean HTML text helper
export const cleanHtmlText = (htmlContent?: string): string => {
  if (!htmlContent) return "";
  const withoutAudio = htmlContent.replace(/\[sound:.*?\]/gi, "").trim();
  if (typeof window !== "undefined" && DOMPurify && typeof DOMPurify.sanitize === "function") {
    return DOMPurify.sanitize(withoutAudio, { USE_PROFILES: { html: true } });
  }
  return withoutAudio;
};

// Dấu câu trong đáp án chế độ gõ: hiện sẵn trên dải gợi ý, không bắt người học gõ.
export const TYPING_PUNCTUATION = /[\p{P}~]/u;
export const stripTypingPunctuation = (str: string): string =>
  str.normalize("NFC").replace(/[\p{P}~]/gu, "").replace(/\s+/g, " ").trim();

export const cleanTextOnly = (str?: string): string => {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").replace(/\[sound:.*?\]/gi, "").trim();
};

export const toSlug = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Recursive search for node by id
export const findNodeById = (nodes: DeckTreeNode[], id: string): DeckTreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Filter tree recursively for search query
export const filterTree = (nodes: DeckTreeNode[], q: string): DeckTreeNode[] => {
  return nodes
    .map((node) => {
      const matchSelf =
        node.title.toLowerCase().includes(q) ||
        (!node.children?.length && node.cards.some(
          (c) =>
            c.word.toLowerCase().includes(q) ||
            c.meaning.toLowerCase().includes(q)
        ));

      if (node.children && node.children.length > 0) {
        const filteredChildren = filterTree(node.children, q);
        if (filteredChildren.length > 0 || matchSelf) {
          return { ...node, children: filteredChildren };
        }
        return null;
      }

      return matchSelf ? node : null;
    })
    .filter(Boolean) as DeckTreeNode[];
};

/** Màu theo từ loại (dữ liệu dùng nhãn tiếng Việt: "Danh từ", "Cụm động từ", "Cụm ĐT"…). Không khớp thì null. */
export function posTone(pos?: string): { bar: string; chip: string; tintLight: string; tintDark: string } | null {
  const p = (pos || "").toLowerCase();
  if (!p) return null;
  if (p.includes("động") || p.includes("đt")) return { bar: "bg-rose-500", chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300", tintLight: "#fff1f2", tintDark: "#26131a" };
  if (p.includes("tính")) return { bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", tintLight: "#ecfdf5", tintDark: "#0c1f1a" };
  if (p.includes("phó")) return { bar: "bg-violet-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300", tintLight: "#f5f3ff", tintDark: "#171327" };
  if (p.includes("danh") || p.includes("số")) return { bar: "bg-sky-500", chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300", tintLight: "#f0f9ff", tintDark: "#0b1a26" };
  return { bar: "bg-amber-500", chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", tintLight: "#fffbeb", tintDark: "#241c0b" };
}
