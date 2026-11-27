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
  lastReview: string | null;
  updatedAt?: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseState(input: unknown): (SavedState & { deckId: string; cardId: number; timestamp: string | null }) | null {
  if (!input || typeof input !== "object") return null;
  const state = input as SavedState;
  if (typeof state.key !== "string") return null;
  const match = /^(.*)_([1-9]\d*)(_typing)?$/.exec(state.key);
  if (!match || !match[1] || match[1].length > 120) return null;
  const cardId = Number(match[2]) * (match[3] ? -1 : 1);
  if (!Number.isSafeInteger(cardId)) return null;
  if (!Number.isInteger(state.interval) || state.interval < 0 || state.interval > 36_500) return null;
  if (!Number.isFinite(state.easeFactor) || state.easeFactor < 1.3 || state.easeFactor > 5) return null;
  if (!Number.isInteger(state.reps) || state.reps < 0 || state.reps > 100_000) return null;
  if (!Number.isInteger(state.lapses) || state.lapses < 0 || state.lapses > 100_000) return null;
  if (!["new", "learning", "review"].includes(state.state)) return null;
  if (!datePattern.test(state.dueDate)) return null;
  if (state.dueAt !== undefined && (typeof state.dueAt !== "string" || Number.isNaN(Date.parse(state.dueAt)))) return null;
  if (!Number.isFinite(state.stability) || state.stability < 0 || state.stability > 36_500) return null;
  if (!Number.isFinite(state.difficulty) || state.difficulty < 1 || state.difficulty > 10) return null;
  if (state.learningSteps !== undefined && (!Number.isInteger(state.learningSteps) || state.learningSteps < 0 || state.learningSteps > 50)) return null;
  if (state.lastReview !== null && (typeof state.lastReview !== "string" || !datePattern.test(state.lastReview))) return null;
  const timestamp = typeof state.updatedAt === "string" && !Number.isNaN(Date.parse(state.updatedAt))
    ? new Date(state.updatedAt).toISOString().slice(0, 19).replace("T", " ") : null;
  if (timestamp && Date.parse(state.updatedAt!) > Date.now() + 5 * 60_000) return null;
  return { ...state, deckId: match[1], cardId, timestamp };
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
  if (parsed.some((state) => !state)) return errorResponse("Có trạng thái thẻ không hợp lệ. Chưa ghi dữ liệu.");
  const seen = new Set<string>();
  for (const state of parsed) {
    const identity = `${state!.deckId}\u0000${state!.cardId}`;
    if (seen.has(identity)) return errorResponse("Lô có thẻ trùng. Chưa ghi dữ liệu.");
    seen.add(identity);
  }
  const statements = parsed.map((state) => env.DB.prepare(
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
    `cs_${user.id}_${state!.deckId}_${state!.cardId}`,
    user.id, state!.deckId, state!.cardId, state!.interval, state!.easeFactor,
    state!.dueDate, state!.dueAt || null, state!.reps, state!.lapses, state!.state,
    state!.stability, state!.difficulty, state!.learningSteps ?? 0,
    state!.lastReview, state!.timestamp, state!.timestamp,
  ));
  try {
    const results = await env.DB.batch(statements);
    return jsonResponse({ restored: results.reduce((sum, result) => sum + (result.meta?.changes || 0), 0), received: parsed.length });
  } catch {
    return errorResponse("Chưa lưu được lô này. Vui lòng thử lại.", 503);
  }
};
