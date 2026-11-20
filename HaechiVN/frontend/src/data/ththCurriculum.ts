import { THTH_DECKS } from "./ththDecks";
import { THTH_BOOK2_DECKS } from "./ththDecksBook2";

const allDecks = [...THTH_DECKS, ...THTH_BOOK2_DECKS];

export const THTH_CURRICULUM_DECKS = allDecks.map((deck) => {
  const book = Number(deck.name.match(/Quyển\s+(\d+)/)?.[1] || 1);
  return {
    ...deck,
    // Vol. 2 text is bundled for practice; its 5,724 referenced media files remain
    // in the teacher's original .apkg so the app does not publish broken asset links.
    cards: book === 2 ? deck.cards.map((card) => ({ ...card, image: "", audio_word: "", audio_meaning: "", audio_example: "" })) : deck.cards,
    book,
    topic: deck.name.split("::").at(-1)?.replace(/^\d+\.\s*/, "") || deck.name,
    difficulty: book === 1 ? "Sơ cấp 1 · TOPIK 1–2" : "Sơ cấp 2 · TOPIK 2–3",
  };
});
