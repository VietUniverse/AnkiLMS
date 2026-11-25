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
  /** countedToday: id từ (stateKeyOf thẻ Review) đã trừ hạn mức hôm nay, học tiếp không trừ thêm. */
  opts: { now: Date; newLeft: number; reviewLeft: number; reviewOnly?: boolean; countedToday?: ReadonlySet<string> },
): StudyQueue {
  const dueCards: VocabularyCard[] = [];
  // Mỗi từ có 2 thẻ: Review (nhìn chữ đoán nghĩa) và Typing (nhìn nghĩa gõ chữ), lịch ôn riêng từng thẻ.
  // Hạn mức từ mới đếm theo TỪ: mỗi phần tử là các thẻ mới của một từ, theo thứ tự bộ thẻ.
  const newCards: VocabularyCard[][] = [];
  // Từ đã bắt đầu hôm nay (vd đã học Review, còn Typing): không tốn thêm suất.
  const continuing: VocabularyCard[][] = [];
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
    if (fresh.length) (opts.countedToday?.has(stateKeyOf(base)) ? continuing : newCards).push(fresh);
  }
  // Đợt từ mới: hết Review của cả đợt rồi mới tới Typing, để không gõ ngay sau khi vừa thấy đáp án.
  const newBatch = [...continuing, ...newCards.slice(0, opts.newLeft)];
  const newSession = [...newBatch.flatMap((g) => g.filter((c) => !c.sibling)), ...newBatch.flatMap((g) => g.filter((c) => c.sibling))];
  // Thẻ đến hạn cũng xếp hết Review rồi mới tới Typing, tránh gõ ngay sau thẻ Review của cùng từ.
  const dueSession = [...dueCards.filter((c) => !c.sibling), ...dueCards.filter((c) => c.sibling)];
  // Ôn tập là phiên riêng: không tính vào hạn mức từ mới, và không cắt theo reviewPerDay
  // (mặc định 0 nên nếu cắt thì luôn ra rỗng). Chỉ lấy thẻ đã đến hạn.
  const activeList = opts.reviewOnly ? dueSession : [...dueSession.slice(0, opts.reviewLeft), ...newSession];
  return { activeList, newWords: newCards.length, newWordCards: newCards.flat().length, dueCount: dueCards.length };
}

/**
 * % thanh tiến độ của lượt học. `segment` là điểm bắt đầu đoạn hiện tại: khi nối thêm thẻ (learn ahead)
 * thì thanh chạy tiếp từ % đang có tới 100%, không tụt lại.
 */
export function sessionProgress(index: number, length: number, segment: { index: number; percent: number }): number {
  if (length <= segment.index) return segment.percent;
  return Math.round(segment.percent + ((100 - segment.percent) * (index - segment.index)) / (length - segment.index));
}

/** Giống "learn ahead limit" của Anki: hết thẻ thì học luôn thẻ đang học dở sắp đến hạn (mặc định trong 20 phút). */
export const LEARN_AHEAD_MINUTES = 20;

export function learnAheadCards(
  sessionCards: VocabularyCard[],
  cardStateMap: Record<string, FSRSState>,
  now: Date,
  limitMinutes = LEARN_AHEAD_MINUTES,
  /** Thẻ vừa chấm: nếu còn thẻ khác thì xếp nó sau cùng, tránh gặp lại ngay lập tức. */
  justAnsweredKey?: string,
): VocabularyCard[] {
  const limit = now.getTime() + limitMinutes * 60_000;
  const seen = new Set<string>();
  const ahead: { card: VocabularyCard; due: number }[] = [];
  for (const card of sessionCards) {
    const key = stateKeyOf(card);
    if (seen.has(key)) continue;
    seen.add(key);
    const state = cardStateMap[key];
    // Thẻ đang học/học lại có giờ đến hạn cụ thể (dueAt); thẻ lên lịch theo ngày sẽ nằm ngoài giới hạn.
    if (!state?.dueAt) continue;
    const due = new Date(state.dueAt).getTime();
    if (due <= limit) ahead.push({ card, due });
  }
  const ordered = ahead.sort((a, b) => a.due - b.due).map((x) => x.card);
  const justIdx = justAnsweredKey ? ordered.findIndex((c) => stateKeyOf(c) === justAnsweredKey) : -1;
  if (justIdx >= 0 && ordered.length > 1) ordered.push(...ordered.splice(justIdx, 1));
  return ordered;
}
