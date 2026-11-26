// Xếp hàng đợi một lượt học flashcard (hàm thuần, kiểm bằng scripts/check-study-queue.mjs).
import { ankiScheduleToFSRSState, formatLocalDate, isFSRSCardDue, type FSRSState } from "./fsrs45.ts";
import { isCardAWritingCard, stateKeyOf, type VocabularyCard } from "./vocabCards.ts";

export type StudyQueue = {
  activeList: VocabularyCard[];
  /** Số từ mới còn lại trong bộ (đếm theo từ, không theo thẻ). */
  newWords: number;
  /** Tổng số thẻ mới của các từ đó (Review + Typing). */
  newWordCards: number;
  dueCount: number;
};

// Thẻ đang học/học lại có giờ đến hạn trong giới hạn học trước: coi như đến hạn (giống learn ahead của Anki).
const dueWithinLearnAhead = (state: FSRSState, now: Date) =>
  state.state === "learning" && Boolean(state.dueAt) && new Date(state.dueAt!).getTime() <= now.getTime() + LEARN_AHEAD_MINUTES * 60_000;

export function buildStudyQueue(
  cards: VocabularyCard[],
  cardStateMap: Record<string, FSRSState>,
  /** countedToday: id từ (stateKeyOf thẻ Review) đã trừ hạn mức hôm nay, học tiếp không trừ thêm. */
  opts: { now: Date; newLeft: number; reviewLeft: number; reviewOnly?: boolean; countedToday?: ReadonlySet<string> },
): StudyQueue {
  const dueCards: { card: VocabularyCard; state: FSRSState }[] = [];
  const today = formatLocalDate(opts.now);
  // Mỗi từ có 2 thẻ: Review (nhìn chữ đoán nghĩa) và Typing (nhìn nghĩa gõ chữ), lịch ôn riêng từng thẻ.
  // Hạn mức từ mới đếm theo TỪ: mỗi phần tử là các thẻ mới của một từ, theo thứ tự bộ thẻ.
  const newCards: VocabularyCard[][] = [];
  // Từ đã bắt đầu hôm nay (vd đã học Review, còn Typing): không tốn thêm suất.
  const continuing: VocabularyCard[][] = [];
  // Bộ Writing không có thẻ Typing. Xét theo từng bộ (deckName), vì lượt "Ôn tập thư viện" trộn nhiều bộ:
  // trước đây xét cả danh sách nên chỉ cần có một bộ Writing là mất hết thẻ Typing của các bộ khác.
  const writingDecks = new Set(cards.filter(isCardAWritingCard).map((c) => c.deckName));
  for (const base of cards) {
    const kinds: (undefined | "typing")[] = writingDecks.has(base.deckName) ? [undefined] : [undefined, "typing"];
    // Anki's suspended queue is intentional; keep it out of the review queue.
    if (base.ankiSchedule?.queue === -1) continue;
    const fresh: VocabularyCard[] = [];
    const due: { card: VocabularyCard; state: FSRSState }[] = [];
    let siblingReviewedToday = false;
    for (const kind of kinds) {
      const c = kind ? { ...base, sibling: kind } : base;
      const state = cardStateMap[stateKeyOf(c)] || (!kind && c.ankiSchedule ? ankiScheduleToFSRSState(c.ankiSchedule) : undefined);
      if (state?.lastReview?.slice(0, 10) === today) siblingReviewedToday = true;
      if (state && state.state !== "new" && !isFSRSCardDue(state, opts.now) && !dueWithinLearnAhead(state, opts.now)) continue;
      if (state && state.state !== "new") due.push({ card: c, state });
      else fresh.push(c);
    }
    // Bury thẻ anh em (như Anki): ôn thẻ Review thì thẻ Typing của cùng từ để mai, và ngược lại,
    // để thẻ này không lộ đáp án cho thẻ kia. Thẻ đang học/học lại (learning) thì không bury.
    const learning = due.filter((d) => d.state.state === "learning");
    const reviews = due.filter((d) => d.state.state !== "learning");
    const keepReview = learning.length || siblingReviewedToday ? [] : reviews.slice(0, 1);
    dueCards.push(...learning, ...keepReview);
    if (fresh.length) (opts.countedToday?.has(stateKeyOf(base)) ? continuing : newCards).push(fresh);
  }
  // Đợt từ mới: hết Review của cả đợt rồi mới tới Typing, để không gõ ngay sau khi vừa thấy đáp án.
  const newBatch = [...continuing, ...newCards.slice(0, opts.newLeft)];
  const newSession = [...newBatch.flatMap((g) => g.filter((c) => !c.sibling)), ...newBatch.flatMap((g) => g.filter((c) => c.sibling))];
  // Thứ tự ôn: descending intervals (khoảng ôn dài trước, như tùy chọn của Anki); bằng nhau giữ thứ tự bộ thẻ.
  // Thẻ anh em đã bị bury ở trên nên không cần xếp Review trước Typing.
  const sorted = [...dueCards].sort((a, b) => (Number(b.state.interval) || 0) - (Number(a.state.interval) || 0)).map((d) => d.card);
  // Thẻ đang học không bị bury nên có thể cả hai thẻ anh em cùng có mặt: thẻ thứ hai dời xuống cuối lượt.
  const seenWords = new Set<string>();
  const firsts: VocabularyCard[] = [];
  const seconds: VocabularyCard[] = [];
  for (const c of sorted) {
    const word = stateKeyOf({ ...c, sibling: undefined });
    (seenWords.has(word) ? seconds : firsts).push(c);
    seenWords.add(word);
  }
  const dueSession = [...firsts, ...seconds];
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
  const percent = Math.round(segment.percent + ((100 - segment.percent) * (index - segment.index)) / (length - segment.index));
  // Còn thẻ thì chưa báo 100% (bấm Again liên tục làm thẻ nối mãi, thanh tiệm cận 100).
  return index < length ? Math.min(99, percent) : percent;
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
