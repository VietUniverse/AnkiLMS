// Xếp hàng đợi một lượt học flashcard (hàm thuần, kiểm bằng scripts/check-study-queue.mjs).
import { ankiScheduleToFSRSState, isFSRSCardDue, type FSRSState } from "./fsrs45.ts";
import { isCardAWritingCard, stateKeyOf, type VocabularyCard } from "./vocabCards.ts";

export type StudyQueue = {
  activeList: VocabularyCard[];
  /** Số từ mới còn lại trong bộ (đếm theo từ, không theo thẻ). */
  newWords: number;
  /** Tổng số thẻ mới của các từ đó (Review + Typing). */
  newWordCards: number;
  dueCount: number;
};

export function buildStudyQueue(
  cards: VocabularyCard[],
  cardStateMap: Record<string, FSRSState>,
  opts: { now: Date; newLeft: number; reviewLeft: number; reviewOnly?: boolean },
): StudyQueue {
  const dueCards: VocabularyCard[] = [];
  // Mỗi từ có 2 thẻ: Review (nhìn chữ đoán nghĩa) và Typing (nhìn nghĩa gõ chữ), lịch ôn riêng từng thẻ.
  // Hạn mức từ mới đếm theo TỪ: mỗi phần tử là các thẻ mới của một từ, theo thứ tự bộ thẻ.
  const newCards: VocabularyCard[][] = [];
  const kinds: (undefined | "typing")[] = cards.some(isCardAWritingCard) ? [undefined] : [undefined, "typing"];
  for (const base of cards) {
    // Anki's suspended queue is intentional; keep it out of the review queue.
    if (base.ankiSchedule?.queue === -1) continue;
    const fresh: VocabularyCard[] = [];
    for (const kind of kinds) {
      const c = kind ? { ...base, sibling: kind } : base;
      const state = cardStateMap[stateKeyOf(c)] || (!kind && c.ankiSchedule ? ankiScheduleToFSRSState(c.ankiSchedule) : undefined);
      if (state && state.state !== "new" && !isFSRSCardDue(state, opts.now)) continue;
      (state && state.state !== "new" ? dueCards : fresh).push(c);
    }
    if (fresh.length) newCards.push(fresh);
  }
  // Đợt từ mới: hết Review của cả đợt rồi mới tới Typing, để không gõ ngay sau khi vừa thấy đáp án.
  const newBatch = newCards.slice(0, opts.newLeft);
  const newSession = [...newBatch.flatMap((g) => g.filter((c) => !c.sibling)), ...newBatch.flatMap((g) => g.filter((c) => c.sibling))];
  // Thẻ đến hạn cũng xếp hết Review rồi mới tới Typing, tránh gõ ngay sau thẻ Review của cùng từ.
  const dueSession = [...dueCards.filter((c) => !c.sibling), ...dueCards.filter((c) => c.sibling)];
  // Ôn tập là phiên riêng: không tính vào hạn mức từ mới, và không cắt theo reviewPerDay
  // (mặc định 0 nên nếu cắt thì luôn ra rỗng). Chỉ lấy thẻ đã đến hạn.
  const activeList = opts.reviewOnly ? dueSession : [...dueSession.slice(0, opts.reviewLeft), ...newSession];
  return { activeList, newWords: newCards.length, newWordCards: newCards.flat().length, dueCount: dueCards.length };
}
