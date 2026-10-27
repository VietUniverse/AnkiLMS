export type FSRSRating = "again" | "hard" | "good" | "easy";

export interface FSRSState {
  interval: number;
  /** Legacy compatibility field; FSRS schedules from stability and difficulty. */
  easeFactor: number;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review";
  dueDate: string;
  dueAt?: string;
  stability: number;
  difficulty: number;
  lastReview: string | null;
  fsrsVersion?: string;
}

export const FSRS45_DEFAULTS = {
  version: "FSRS-4.5",
  desiredRetention: 0.9,
  weights: [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755],
  maxInterval: 36_500,
} as const;

const DECAY = -0.5;
const FACTOR = 19 / 81;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((dateOnly(to).getTime() - dateOnly(from).getTime()) / 86_400_000));
}

function getLegacyLastReview(current: Partial<FSRSState>, today: Date): string | null {
  if (current.lastReview) return current.lastReview;
  if (!current.reps || !current.interval || !current.dueDate) return null;
  const inferred = new Date(`${current.dueDate}T12:00:00`);
  inferred.setDate(inferred.getDate() - current.interval);
  return formatLocalDate(inferred > today ? today : inferred);
}

function intervalForRetention(stability: number, desiredRetention: number): number {
  const raw = stability / FACTOR * (Math.pow(desiredRetention, 1 / DECAY) - 1);
  return Math.round(clamp(raw, 1, FSRS45_DEFAULTS.maxInterval));
}

/** Schedule a review using FSRS-4.5's DSR equations and its published default weights. Zero external dependencies. */
export function calculateFSRS45(
  rating: FSRSRating,
  current: Partial<FSRSState> = {},
  now = new Date(),
  desiredRetention = FSRS45_DEFAULTS.desiredRetention,
): FSRSState {
  const w = FSRS45_DEFAULTS.weights;
  const grade = ({ again: 1, hard: 2, good: 3, easy: 4 } as const)[rating];
  const reps = (current.reps || 0) + 1;
  const lapses = (current.lapses || 0) + (rating === "again" && current.state === "review" ? 1 : 0);
  const lastReview = formatLocalDate(now);
  const normalizedRetention = clamp(desiredRetention, 0.7, 0.97);

  let stability: number;
  let difficulty: number;
  const hasFSRSState = Number.isFinite(current.stability) && (current.stability || 0) > 0 && Number.isFinite(current.difficulty);

  if (!hasFSRSState) {
    // Upgrade old SM-2 state without losing its review history or current interval.
    const oldInterval = (current.reps || 0) > 0 ? Math.max(0.1, current.interval || 1) : 0;
    stability = oldInterval || w[grade - 1];
    const easeFactor = current.easeFactor || 2.5;
    difficulty = oldInterval
      ? clamp(5 + (2.5 - easeFactor) * 2, 1, 10)
      : clamp(w[4] - (grade - 3) * w[5], 1, 10);
  } else {
    stability = current.stability as number;
    difficulty = current.difficulty as number;
  }

  const inferredLastReview = getLegacyLastReview(current, now);
  const elapsedDays = inferredLastReview
    ? daysBetween(new Date(`${inferredLastReview}T12:00:00`), now)
    : Math.max(0, current.interval || 0);
  const retrievability = Math.pow(1 + FACTOR * elapsedDays / stability, DECAY);

  if ((current.reps || 0) > 0 || hasFSRSState) {
    const initialDifficultyForGood = w[4];
    difficulty = clamp(
      w[7] * initialDifficultyForGood + (1 - w[7]) * (difficulty - w[6] * (grade - 3)),
      1,
      10,
    );

    if (rating === "again") {
      stability = w[11]
        * Math.pow(difficulty, -w[12])
        * (Math.pow(stability + 1, w[13]) - 1)
        * Math.exp(w[14] * (1 - retrievability));
    } else {
      const gradeModifier = rating === "hard" ? w[15] : rating === "easy" ? w[16] : 1;
      const increase = Math.exp(w[8])
        * (11 - difficulty)
        * Math.pow(stability, -w[9])
        * (Math.exp(w[10] * (1 - retrievability)) - 1)
        * gradeModifier;
      stability = stability * (increase + 1);
    }
  } else {
    stability = w[grade - 1];
    difficulty = clamp(w[4] - (grade - 3) * w[5], 1, 10);
  }

  stability = clamp(Number.isFinite(stability) ? stability : 1, 0.1, FSRS45_DEFAULTS.maxInterval);
  difficulty = clamp(Number.isFinite(difficulty) ? difficulty : 5, 1, 10);

  const interval = intervalForRetention(stability, normalizedRetention);
  const due = new Date(now);
  due.setDate(due.getDate() + interval);

  return {
    interval,
    easeFactor: current.easeFactor || 2.5,
    reps,
    lapses,
    state: (current.reps || 0) === 0 || (rating === "again" && interval <= 1) ? "learning" : "review",
    dueDate: formatLocalDate(due),
    dueAt: due.toISOString(),
    stability: Number(stability.toFixed(4)),
    difficulty: Number(difficulty.toFixed(4)),
    lastReview,
    fsrsVersion: FSRS45_DEFAULTS.version,
  };
}
