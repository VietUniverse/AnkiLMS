import { createEmptyCard, fsrs, Rating, State } from "ts-fsrs";

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
  const lastReview = current.lastReview ? new Date(current.lastReview) : undefined;
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

/** Schedule the next review using the official ts-fsrs 5.4.2 scheduler. */
export function calculateFSRS45(
  rating: FSRSRating,
  current: Partial<FSRSState> = {},
  now = new Date(),
  desiredRetention = FSRS45_DEFAULTS.desiredRetention,
): FSRSState {
  const retention = Math.min(0.99, Math.max(0.7, desiredRetention));
  const activeScheduler = retention === FSRS45_DEFAULTS.desiredRetention
    ? scheduler
    : fsrs({
      request_retention: retention,
      maximum_interval: FSRS45_DEFAULTS.maxInterval,
      enable_fuzz: false,
      enable_short_term: true,
    });
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
  };
}
