import { createEmptyCard, default_w, fsrs, Rating, State } from "ts-fsrs";
import type { AnkiScheduleMetadata } from "./ankiParser";

export type FSRSRating = "again" | "hard" | "good" | "easy";

/** Persisted adapter shape kept stable so existing local and server review data migrates in place. */
export interface FSRSState {
  interval: number;
  easeFactor: number;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review";
  dueDate: string;
  stability: number;
  difficulty: number;
  lastReview: string | null;
  dueAt?: string;
  fsrsVersion?: string;
  /** Original Anki preset retained for subsequent scheduling after import. */
  schedulerConfig?: Record<string, unknown>;
}

export const FSRS45_DEFAULTS = {
  version: "ts-fsrs@5.4.2",
  desiredRetention: 0.9,
  maxInterval: 36_500,
} as const;

const scheduler = fsrs({
  request_retention: FSRS45_DEFAULTS.desiredRetention,
  maximum_interval: FSRS45_DEFAULTS.maxInterval,
  enable_fuzz: false,
  enable_short_term: true,
});

const ratingMap = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const;

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function legacyStateToFsrs(state: FSRSState["state"] | undefined): State {
  if (state === "review") return State.Review;
  if (state === "learning") return State.Learning;
  return State.New;
}

function toFsrsCard(current: Partial<FSRSState>, now: Date) {
  const emptyCard = createEmptyCard(now);
  // lastReview thường là chuỗi ngày "YYYY-MM-DD". new Date() hiểu nó là 00:00 UTC, tức là có thể nằm SAU "bây giờ"
  // ở múi giờ lệch về phía đông (ví dụ GMT+9 rạng sáng), làm ts-fsrs báo "Invalid delta_t -1". Đọc theo giờ địa phương và không cho vượt quá now.
  const parsedReview = current.lastReview
    ? /^\d{4}-\d{2}-\d{2}$/.test(current.lastReview)
      ? new Date(Number(current.lastReview.slice(0, 4)), Number(current.lastReview.slice(5, 7)) - 1, Number(current.lastReview.slice(8, 10)))
      : new Date(current.lastReview)
    : undefined;
  const lastReview = parsedReview && parsedReview.getTime() > now.getTime() ? new Date(now) : parsedReview;
  const due = current.dueAt
    ? new Date(current.dueAt)
    : current.dueDate
      ? new Date(`${current.dueDate}T23:59:00`)
      : now;

  return {
    ...emptyCard,
    due: Number.isNaN(due.getTime()) ? now : due,
    stability: Number.isFinite(current.stability) && (current.stability ?? 0) > 0
      ? current.stability!
      : Math.max(0, current.interval || 0),
    difficulty: Number.isFinite(current.difficulty) && (current.difficulty ?? 0) > 0
      ? current.difficulty!
      : 5,
    elapsed_days: lastReview && !Number.isNaN(lastReview.getTime())
      ? Math.max(0, Math.floor((now.getTime() - lastReview.getTime()) / 86_400_000))
      : Math.max(0, current.interval || 0),
    scheduled_days: Math.max(0, current.interval || 0),
    learning_steps: 0,
    reps: Math.max(0, current.reps || 0),
    lapses: Math.max(0, current.lapses || 0),
    state: legacyStateToFsrs(current.state),
    ...(lastReview && !Number.isNaN(lastReview.getTime()) ? { last_review: lastReview } : {}),
  };
}

function presetNumber(config: Record<string, unknown> | undefined, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = Number(config?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return fallback;
}

function presetSteps(config: Record<string, unknown> | undefined, key: "new" | "lapse"): string[] | undefined {
  const section = config?.[key] as Record<string, unknown> | undefined;
  const raw = section?.delays;
  if (!Array.isArray(raw)) return undefined;
  return raw.map((value) => {
    const minutes = Math.max(1, Number(value) || 1);
    if (minutes % 1440 === 0) return `${minutes / 1440}d`;
    if (minutes % 60 === 0) return `${minutes / 60}h`;
    return `${minutes}m`;
  });
}

/** Convert Anki's collection-day / learning-second scheduler values to this app's date shape. */
export function ankiScheduleToFSRSState(schedule: AnkiScheduleMetadata, now = new Date()): FSRSState {
  const latestReviewDate = schedule.data ? parseFsrsData(schedule.data) : undefined;
  const preset = schedule.schedulerConfig;
  const nestedFsrs = (preset?.config as Record<string, unknown> | undefined) || (preset?.fsrs as Record<string, unknown> | undefined) || preset;
  const presetConfig = (preset?.config as Record<string, unknown> | undefined) || preset;
  const rawData = schedule.data ? safeJson(schedule.data) : undefined;
  const stability = finitePositive(rawData?.s) || Math.max(0, schedule.interval);
  const difficulty = finitePositive(rawData?.d) || 5;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const collectionDay = schedule.collectionCreatedAt
    ? Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(new Date(schedule.collectionCreatedAt).getFullYear(), new Date(schedule.collectionCreatedAt).getMonth(), new Date(schedule.collectionCreatedAt).getDate())) / 86_400_000)
    : schedule.due;
  const effectiveDue = schedule.queue < 0 ? schedule.originalDue || schedule.due : schedule.due;
  let dueAt: Date;
  if ((schedule.queue === 1 || schedule.queue < 0 && schedule.cardType === 1) && effectiveDue > 0) dueAt = new Date(effectiveDue * 1000);
  else if (schedule.queue === 2 || schedule.queue === 3 || schedule.queue < 0 && schedule.cardType === 2) {
    dueAt = new Date(today);
    dueAt.setDate(dueAt.getDate() + Math.max(-36500, Math.min(36500, effectiveDue - collectionDay)));
    dueAt.setHours(23, 59, 0, 0);
  } else dueAt = today;
  const history = (schedule as AnkiScheduleMetadata & { lastReview?: string }).lastReview;
  const retention = Number(nestedFsrs?.desired_retention ?? nestedFsrs?.desiredRetention ?? nestedFsrs?.requestRetention ?? nestedFsrs?.request_retention ?? preset?.desiredRetention ?? preset?.request_retention);
  const maxInterval = presetNumber(presetConfig, ["maximum_review_interval", "maximum_interval", "maxInterval"], presetNumber(presetConfig?.rev as Record<string, unknown> | undefined, ["maxIvl"], FSRS45_DEFAULTS.maxInterval));
  const params = nestedFsrs?.fsrs_params_5 ?? nestedFsrs?.fsrs_params_4 ?? nestedFsrs?.fsrs_params_6 ?? nestedFsrs?.parameters ?? nestedFsrs?.params ?? nestedFsrs?.w;
  const learningSteps = Array.isArray(presetConfig?.learn_steps)
    ? presetConfig.learn_steps.map((step) => `${Math.max(1, Number(step) || 1)}m`)
    : presetSteps(presetConfig, "new");
  const relearningSteps = Array.isArray(presetConfig?.relearn_steps)
    ? presetConfig.relearn_steps.map((step) => `${Math.max(1, Number(step) || 1)}m`)
    : presetSteps(presetConfig, "lapse");
  const schedulerConfig: Record<string, unknown> = {
    ...(Number.isFinite(retention) && retention > 0 ? { desiredRetention: retention } : {}),
    maximum_interval: maxInterval,
    ...(Array.isArray(params) && params.length === default_w.length ? { w: params } : {}),
    ...(learningSteps ? { learning_steps: learningSteps } : {}),
    ...(relearningSteps ? { relearning_steps: relearningSteps } : {}),
  };
  return {
    interval: schedule.queue === 1
      ? Math.max(0, (effectiveDue * 1000 - now.getTime()) / 86_400_000)
      : Math.max(0, Math.abs(schedule.interval)),
    easeFactor: schedule.factor > 0 ? schedule.factor / 1000 : 2.5,
    reps: Math.max(0, schedule.reps),
    lapses: Math.max(0, schedule.lapses),
    state: schedule.queue === 0 || schedule.cardType === 0 ? "new" : schedule.queue === 1 || schedule.queue === 3 || schedule.cardType === 1 ? "learning" : "review",
    dueDate: formatLocalDate(dueAt),
    dueAt: dueAt.toISOString(),
    stability,
    difficulty,
    lastReview: history || latestReviewDate || null,
    schedulerConfig,
    fsrsVersion: FSRS45_DEFAULTS.version,
  };
}

function safeJson(raw: string): Record<string, unknown> | undefined {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return undefined; }
}

function finitePositive(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function parseFsrsData(raw: string): string | undefined {
  const value = safeJson(raw);
  const timestamp = Number(value?.lr ?? value?.lastReview ?? value?.last_review);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    const date = new Date(timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp);
    if (!Number.isNaN(date.getTime())) return formatLocalDate(date);
  }
  return undefined;
}

/** Schedule the next review using the official ts-fsrs 5.4.2 scheduler. */
export function calculateFSRS45(
  rating: FSRSRating,
  current: Partial<FSRSState> = {},
  now = new Date(),
  desiredRetention = FSRS45_DEFAULTS.desiredRetention,
): FSRSState {
  const retention = Math.min(0.99, Math.max(0.7, desiredRetention));
  const importedConfig = current.schedulerConfig;
  const desiredRetentionFromPreset = Number(importedConfig?.desiredRetention ?? importedConfig?.request_retention);
  const effectiveRetention = Number.isFinite(desiredRetentionFromPreset) && desiredRetentionFromPreset > 0
    ? Math.min(0.99, Math.max(0.7, desiredRetentionFromPreset))
    : retention;
  const schedulerOptions: Record<string, unknown> = {
    request_retention: effectiveRetention,
    maximum_interval: presetNumber(importedConfig, ["maximum_interval", "maxInterval"], FSRS45_DEFAULTS.maxInterval),
    enable_fuzz: false,
    enable_short_term: true,
  };
  if (Array.isArray(importedConfig?.w) && importedConfig.w.every((value) => Number.isFinite(Number(value)))) schedulerOptions.w = importedConfig.w;
  if (Array.isArray(importedConfig?.learning_steps)) schedulerOptions.learning_steps = importedConfig.learning_steps;
  if (Array.isArray(importedConfig?.relearning_steps)) schedulerOptions.relearning_steps = importedConfig.relearning_steps;
  const activeScheduler = !importedConfig && effectiveRetention === FSRS45_DEFAULTS.desiredRetention
    ? scheduler
    : fsrs(schedulerOptions as Parameters<typeof fsrs>[0]);
  const { card } = activeScheduler.next(toFsrsCard(current, now), now, ratingMap[rating]);
  const interval = Math.max(0, card.scheduled_days);

  return {
    interval,
    easeFactor: current.easeFactor || 2.5,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state === State.Review || card.state === State.Relearning ? "review" : "learning",
    dueDate: formatLocalDate(card.due),
    dueAt: card.due.toISOString(),
    stability: Number(card.stability.toFixed(4)),
    difficulty: Number(card.difficulty.toFixed(4)),
    lastReview: formatLocalDate(now),
    fsrsVersion: FSRS45_DEFAULTS.version,
    ...(importedConfig ? { schedulerConfig: importedConfig } : {}),
  };
}
