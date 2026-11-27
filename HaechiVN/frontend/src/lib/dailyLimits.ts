import { useMemo } from "react";
import { readLocal, useLocalRaw, writeLocal } from "./localStore";

// Giới hạn số thẻ học mỗi ngày (lưu cục bộ trên thiết bị). 0 = không giới hạn.
export type DailyLimits = { newPerDay: number; reviewPerDay: number };
// extraNew: số từ mới người học xin học thêm trong hôm nay (cộng vào giới hạn, hết ngày thì mất).
// newWordIds: từ mới đã tính hôm nay, để thẻ Review và Typing của cùng một từ chỉ trừ 1 suất kể cả khi học ở 2 lượt khác nhau.
export type DailyProgress = { newDone: number; reviewDone: number; extraNew: number; newWordIds?: string[]; reviewedCardIds?: string[] };

const LIMITS_KEY = "haechivn_daily_limits";
const PROGRESS_KEY = "haechivn_daily_progress";
// Mặc định: 5 từ mới/ngày, ôn lại 9999 (thực tế là không chặn). 0 = không giới hạn.
export const DEFAULT_LIMITS: DailyLimits = { newPerDay: 5, reviewPerDay: 9999 };
/** Số thẻ khác nhau cần học trong ngày để được điểm danh. */
export const CARDS_FOR_CHECKIN = 10;

/** Ngày hiện tại theo múi giờ Việt Nam (GMT+7), khớp với API điểm danh. */
export const vietnamToday = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

const today = vietnamToday;

const clamp = (value: unknown, fallback: number) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 9999) : fallback;
};

const parseLimits = (text: string | null): DailyLimits => {
  try {
    const raw = JSON.parse(text || "null");
    // reviewPerDay trước đây bị ép 0 (chưa cho sửa) nên 0 = giá trị cũ, dùng mặc định mới.
    const review = Number(raw?.reviewPerDay);
    return {
      newPerDay: clamp(raw?.newPerDay, DEFAULT_LIMITS.newPerDay),
      reviewPerDay: review > 0 ? clamp(review, DEFAULT_LIMITS.reviewPerDay) : DEFAULT_LIMITS.reviewPerDay,
    };
  } catch {
    return DEFAULT_LIMITS;
  }
};

const parseProgress = (text: string | null): DailyProgress => {
  try {
    const raw = JSON.parse(text || "null");
    if (raw?.date === today()) {
      const newWordIds = Array.isArray(raw.newWordIds) ? raw.newWordIds.filter((id: unknown): id is string => typeof id === "string") : [];
      const reviewedCardIds = Array.isArray(raw.reviewedCardIds) ? raw.reviewedCardIds.filter((id: unknown): id is string => typeof id === "string") : [];
      return { newDone: clamp(raw.newDone, 0), reviewDone: clamp(raw.reviewDone, 0), extraNew: clamp(raw.extraNew, 0), newWordIds, reviewedCardIds };
    }
  } catch { /* dùng giá trị mặc định */ }
  return { newDone: 0, reviewDone: 0, extraNew: 0 };
};

export const loadLimits = (): DailyLimits => parseLimits(readLocal(LIMITS_KEY));
export const loadProgress = (): DailyProgress => parseProgress(readLocal(PROGRESS_KEY));

export function saveLimits(limits: DailyLimits) {
  writeLocal(LIMITS_KEY, JSON.stringify(limits));
}

/** Mục tiêu và tiến độ hôm nay, tự cập nhật khi được ghi (server/hydrate: mặc định). */
export function useDailyLimits(): DailyLimits {
  const raw = useLocalRaw(LIMITS_KEY);
  return useMemo(() => parseLimits(raw), [raw]);
}

export function useDailyProgress(): DailyProgress {
  const raw = useLocalRaw(PROGRESS_KEY);
  return useMemo(() => parseProgress(raw), [raw]);
}

/** Ghi một từ mới (theo id từ); từ đã tính hôm nay thì bỏ qua. */
export function recordNewWord(wordId: string): DailyProgress {
  const p = loadProgress();
  const ids = p.newWordIds || [];
  if (ids.includes(wordId)) return p;
  const next = { ...p, newDone: p.newDone + 1, newWordIds: [...ids, wordId] };
  writeLocal(PROGRESS_KEY, JSON.stringify({ date: today(), ...next }));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("haechivn:daily-progress-updated"));
  return next;
}

export function recordCard(isNew: boolean): DailyProgress {
  const p = loadProgress();
  const next = isNew ? { ...p, newDone: p.newDone + 1 } : { ...p, reviewDone: p.reviewDone + 1 };
  writeLocal(PROGRESS_KEY, JSON.stringify({ date: today(), ...next }));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("haechivn:daily-progress-updated"));
  return next;
}

/** Count each rated SRS card once per Vietnam calendar day for check-in. */
export function recordReviewedCard(cardKey: string): DailyProgress {
  const progress = loadProgress();
  const ids = progress.reviewedCardIds || [];
  if (ids.includes(cardKey)) return progress;
  const next = { ...progress, reviewedCardIds: [...ids, cardKey] };
  writeLocal(PROGRESS_KEY, JSON.stringify({ date: today(), ...next }));
  return next;
}

/** Cho phép học thêm `count` từ mới trong hôm nay. */
export function addExtraNew(count: number): DailyProgress {
  const p = loadProgress();
  const next = { ...p, extraNew: Math.min(9999, p.extraNew + Math.max(0, Math.floor(count))) };
  writeLocal(PROGRESS_KEY, JSON.stringify({ date: today(), ...next }));
  return next;
}

/** Giới hạn từ mới thực tế hôm nay (0 = không giới hạn). */
export const effectiveNewLimit = (limits: DailyLimits, progress: DailyProgress) => (limits.newPerDay === 0 ? 0 : limits.newPerDay + progress.extraNew);

/** Số thẻ còn được học hôm nay (Infinity nếu không giới hạn). */
export const remaining = (limit: number, done: number) => (limit === 0 ? Infinity : Math.max(0, limit - done));
