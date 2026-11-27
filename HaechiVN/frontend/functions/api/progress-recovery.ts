import { Env, authenticateRequest, errorResponse, isSameOriginRequest, jsonResponse } from "./_utils";

type SavedState = {
  key: string;
  interval: number;
  easeFactor: number;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review";
  dueDate: string;
  dueAt?: string;
  stability: number;
  difficulty: number;
  learningSteps?: number;
  lastReview?: string | null;
  updatedAt?: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function normalizedDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))) return value;
  if (!Number.isNaN(Date.parse(value))) return new Date(value).toISOString().slice(0, 10);
  return null;
}

function parseState(input: unknown): (SavedState & { deckId: string; cardId: number; timestamp: string | null }) | null {
  if (!input || typeof input !== "object") return null;
  const state = input as SavedState;
  if (typeof state.key !== "string") return null;
  const match = /^(.*)_([1-9]\d*)(_typing)?$/.exec(state.key);
  if (!match || !match[1] || match[1].length > 120) return null;
  const cardId = Number(match[2]) * (match[3] ? -1 : 1);
  if (!Number.isSafeInteger(cardId)) return null;
  const interval = state.interval ?? 0;
  const easeFactor = state.easeFactor ?? 2.5;
  const reps = state.reps ?? 0;
  const lapses = state.lapses ?? 0;
  if (!Number.isInteger(interval) || interval < 0 || interval > 36_500) return null;
  if (!Number.isFinite(easeFactor) || easeFactor < 1.3 || easeFactor > 5) return null;
  if (!Number.isInteger(reps) || reps < 0 || reps > 100_000) return null;
  if (!Number.isInteger(lapses) || lapses < 0 || lapses > 100_000) return null;
  if (!["new", "learning", "review"].includes(state.state)) return null;
  const dueDate = normalizedDate(state.dueDate) || normalizedDate(state.dueAt);
  if (!dueDate) return null;
  if (state.dueAt !== undefined && (typeof state.dueAt !== "string" || Number.isNaN(Date.parse(state.dueAt)))) return null;
  const stability = state.stability ?? Math.max(0, interval);
  const difficulty = state.difficulty === 0 || state.difficulty == null ? 5 : state.difficulty;
  if (!Number.isFinite(stability) || stability < 0 || stability > 36_500) return null;
  if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 10) return null;
  if (state.learningSteps !== undefined && (!Number.isInteger(state.learningSteps) || state.learningSteps < 0 || state.learningSteps > 50)) return null;
  const lastReview = state.lastReview == null ? null : normalizedDate(state.lastReview);
  if (state.lastReview != null && !lastReview) return null;
  const timestamp = typeof state.updatedAt === "string" && !Number.isNaN(Date.parse(state.updatedAt))
    ? new Date(state.updatedAt).toISOString().slice(0, 19).replace("T", " ") : null;
  if (timestamp && Date.parse(state.updatedAt!) > Date.now() + 5 * 60_000) return null;
  return { ...state, interval, easeFactor, reps, lapses, dueDate, stability, difficulty, lastReview, deckId: match[1], cardId, timestamp };
}

/** Merge old browser schedules into the signed-in account without replacing newer server schedules. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await authenticateRequest(request, env);
  if (!user) return errorResponse("Vui lòng đăng nhập ở haechivn.com trước.", 401);
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") return errorResponse("Cần gửi JSON.", 415);
  if (Number(request.headers.get("Content-Length") || 0) > 150_000) return errorResponse("Lô dữ liệu quá lớn.", 413);
  const body = await request.json().catch(() => null) as { accountId?: string; states?: unknown[] } | null;
  if (!body || body.accountId !== user.id) return errorResponse("Tài khoản cũ và tài khoản đang đăng nhập không khớp.", 403);
  if (!Array.isArray(body.states) || body.states.length < 1 || body.states.length > 80) return errorResponse("Mỗi lô phải có từ 1 đến 80 thẻ.");
  const parsed = body.states.map(parseState);
  const seen = new Set<string>();
  const valid = [] as NonNullable<ReturnType<typeof parseState>>[];
  const skippedKeys: string[] = [];
  for (let index = 0; index < parsed.length; index++) {
    const state = parsed[index];
    const identity = state ? `${state.deckId}\u0000${state.cardId}` : "";
    if (!state || seen.has(identity)) {
      const key = (body.states[index] as { key?: unknown } | null)?.key;
      if (skippedKeys.length < 5) skippedKeys.push(typeof key === "string" ? key.slice(0, 120) : `#${index + 1}`);
      continue;
    }
    seen.add(identity);
    valid.push(state);
  }
  const statements = valid.map((state) => env.DB.prepare(
    `INSERT INTO card_states
       (id,user_id,deck_id,card_id,interval,ease_factor,due_date,due_at,reps,lapses,state,stability,difficulty,learning_steps,last_review,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?,CURRENT_TIMESTAMP))
     ON CONFLICT(user_id,deck_id,card_id) DO UPDATE SET
       interval=excluded.interval,ease_factor=excluded.ease_factor,due_date=excluded.due_date,
       due_at=excluded.due_at,reps=excluded.reps,lapses=excluded.lapses,state=excluded.state,
       stability=excluded.stability,difficulty=excluded.difficulty,
       learning_steps=excluded.learning_steps,last_review=excluded.last_review,updated_at=excluded.updated_at
     WHERE ? IS NOT NULL AND excluded.updated_at > card_states.updated_at`,
  ).bind(
    `cs_${user.id}_${state.deckId}_${state.cardId}`,
    user.id, state.deckId, state.cardId, state.interval, state.easeFactor,
    state.dueDate, state.dueAt || null, state.reps, state.lapses, state.state,
    state.stability, state.difficulty, state.learningSteps ?? 0,
    state.lastReview, state.timestamp, state.timestamp,
  ));
  try {
    const results = statements.length ? await env.DB.batch(statements) : [];
    return jsonResponse({ restored: results.reduce((sum, result) => sum + (result.meta?.changes || 0), 0), received: parsed.length, skipped: parsed.length - valid.length, skippedKeys });
  } catch {
    return errorResponse("Chưa lưu được lô này. Vui lòng thử lại.", 503);
  }
};
