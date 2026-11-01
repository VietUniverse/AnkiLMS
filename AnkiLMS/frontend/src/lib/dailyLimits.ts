// Giới hạn số thẻ học mỗi ngày (lưu cục bộ trên thiết bị). 0 = không giới hạn.
export type DailyLimits = { newPerDay: number; reviewPerDay: number };
export type DailyProgress = { newDone: number; reviewDone: number };

const LIMITS_KEY = "haechivn_daily_limits";
const PROGRESS_KEY = "haechivn_daily_progress";
// Chỉ giới hạn từ mới. Từ đến hạn ôn lại luôn không giới hạn (0): có bao nhiêu phải ôn hết bấy nhiêu.
export const DEFAULT_LIMITS: DailyLimits = { newPerDay: 20, reviewPerDay: 0 };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const clamp = (value: unknown, fallback: number) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 9999) : fallback;
};

export function loadLimits(): DailyLimits {
  try {
    const raw = JSON.parse(localStorage.getItem(LIMITS_KEY) || "null");
    return { newPerDay: clamp(raw?.newPerDay, DEFAULT_LIMITS.newPerDay), reviewPerDay: 0 };
  } catch {
    return DEFAULT_LIMITS;
  }
}

export function saveLimits(limits: DailyLimits) {
  try { localStorage.setItem(LIMITS_KEY, JSON.stringify(limits)); } catch { /* bộ nhớ bị chặn: bỏ qua */ }
}

export function loadProgress(): DailyProgress {
  try {
    const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
    if (raw?.date === today()) return { newDone: clamp(raw.newDone, 0), reviewDone: clamp(raw.reviewDone, 0) };
  } catch { /* dùng giá trị mặc định */ }
  return { newDone: 0, reviewDone: 0 };
}

export function recordCard(isNew: boolean): DailyProgress {
  const p = loadProgress();
  const next = isNew ? { ...p, newDone: p.newDone + 1 } : { ...p, reviewDone: p.reviewDone + 1 };
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ date: today(), ...next })); } catch { /* bỏ qua */ }
  return next;
}

/** Số thẻ còn được học hôm nay (Infinity nếu không giới hạn). */
export const remaining = (limit: number, done: number) => (limit === 0 ? Infinity : Math.max(0, limit - done));
