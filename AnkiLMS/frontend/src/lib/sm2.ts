export type SM2Rating = "again" | "hard" | "good" | "easy";

export interface SM2State {
  interval: number; // in days
  easeFactor: number; // default 2.5
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review";
  dueDate: string; // YYYY-MM-DD
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateSM2(
  rating: SM2Rating,
  current: Partial<SM2State> = {}
): SM2State {
  let interval = current.interval || 1;
  let easeFactor = current.easeFactor || 2.5;
  let reps = current.reps || 0;
  let lapses = current.lapses || 0;

  // Rating to quality mapping (0 - 5 scale)
  // again = 1, hard = 3, good = 4, easy = 5
  let quality = 4;
  if (rating === "again") quality = 1;
  else if (rating === "hard") quality = 3;
  else if (rating === "good") quality = 4;
  else if (rating === "easy") quality = 5;

  // Calculate new Ease Factor (min 1.3)
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  if (quality < 3) {
    // Failed recall
    reps = 0;
    lapses += 1;
    interval = 1;
  } else {
    // Successful recall
    reps += 1;
    if (reps === 1) {
      interval = 1;
    } else if (reps === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Calculate Due Date
  const due = new Date();
  due.setDate(due.getDate() + interval);
  const dueDate = formatLocalDate(due);

  const state = reps > 2 ? "review" : reps > 0 ? "learning" : "new";

  return {
    interval,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    reps,
    lapses,
    state,
    dueDate,
  };
}
