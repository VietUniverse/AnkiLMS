import { vocabGrowth } from "../../src/lib/vocabGrowth";
import { Env, jsonResponse, errorResponse, authenticateRequest, isSameOriginRequest } from "./_utils";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const user = await authenticateRequest(request, env);

    if (!user) return errorResponse("Chưa đăng nhập.", 401);

    const url = new URL(request.url);
    if (url.searchParams.get("growth")) {
      const [states, logs] = await Promise.all([
        env.DB.prepare("SELECT deck_id, card_id, interval, state, last_review FROM card_states WHERE user_id = ?").bind(user.id).all(),
        env.DB.prepare("SELECT deck_id, card_id, scheduled_days, review_time FROM review_logs WHERE user_id = ? ORDER BY review_time").bind(user.id).all().catch(() => ({ results: [] })),
      ]);
      return jsonResponse({ days: vocabGrowth((states.results || []) as Parameters<typeof vocabGrowth>[0], (logs.results || []) as Parameters<typeof vocabGrowth>[1], null) });
    }
    const deckId = url.searchParams.get("deckId");

    let query = "SELECT * FROM card_states WHERE user_id = ?";
    const params: any[] = [user.id];

    if (deckId) {
      query += " AND deck_id = ?";
      params.push(deckId);
    }

    const rows = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ cardStates: rows.results || [] });
  } catch (e: any) {
    return errorResponse("Lỗi lấy trạng thái thẻ: " + e.message, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const user = await authenticateRequest(request, env);

    if (!user) return errorResponse("Chưa đăng nhập.", 401);
    if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);

    const body = (await request.json()) as {
      deckId: string;
      cardId: number;
      interval: number;
      easeFactor: number;
      dueDate: string;
      dueAt?: string;
      reps: number;
      lapses: number;
      state: string;
      stability: number;
      difficulty: number;
      learningSteps?: number;
      lastReview: string | null;
      lastReviewLog?: {
        rating: number;
        state: number;
        due: string;
        stability: number;
        difficulty: number;
        elapsed_days: number;
        last_elapsed_days: number;
        scheduled_days: number;
        review: string;
      };
      reviewLog?: {
        rating: number;
        state: number;
        due: string;
        stability: number;
        difficulty: number;
        elapsed_days: number;
        last_elapsed_days: number;
        scheduled_days: number;
        review: string;
      };
    };

    if (typeof body.deckId !== "string" || body.deckId.length < 1 || body.deckId.length > 120) return errorResponse("Bộ thẻ không hợp lệ.");
    // Thẻ Typing gửi id âm (-id) để tách với thẻ Review cùng từ.
    if (!Number.isSafeInteger(body.cardId)) return errorResponse("Thẻ không hợp lệ.");
    if (!Number.isInteger(body.interval) || body.interval < 0 || body.interval > 36_500) return errorResponse("Khoảng ôn tập không hợp lệ.");
    if (!Number.isFinite(body.easeFactor) || body.easeFactor < 1.3 || body.easeFactor > 5) return errorResponse("Hệ số ôn tập không hợp lệ.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) return errorResponse("Ngày ôn tập không hợp lệ.");
    if (body.dueAt !== undefined && (typeof body.dueAt !== "string" || Number.isNaN(Date.parse(body.dueAt)))) return errorResponse("Thời điểm ôn tập không hợp lệ.");
    if (!Number.isInteger(body.reps) || body.reps < 0 || body.reps > 100_000) return errorResponse("Số lần ôn tập không hợp lệ.");
    if (!Number.isInteger(body.lapses) || body.lapses < 0 || body.lapses > 100_000) return errorResponse("Số lần quên không hợp lệ.");
    if (!["new", "learning", "review"].includes(body.state)) return errorResponse("Trạng thái thẻ không hợp lệ.");
    if (typeof body.stability !== "number" || !Number.isFinite(body.stability) || body.stability < 0 || body.stability > 36_500) return errorResponse("Độ ổn định ghi nhớ không hợp lệ.");
    if (typeof body.difficulty !== "number" || !Number.isFinite(body.difficulty) || body.difficulty < 1 || body.difficulty > 10) return errorResponse("Độ khó ghi nhớ không hợp lệ.");
    if (body.learningSteps !== undefined && (!Number.isInteger(body.learningSteps) || body.learningSteps < 0 || body.learningSteps > 50)) return errorResponse("Bước học không hợp lệ.");
    if (body.lastReview !== null && (typeof body.lastReview !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.lastReview))) return errorResponse("Ngày ôn gần nhất không hợp lệ.");

    const id = `cs_${user.id}_${body.deckId}_${body.cardId}`;

    await env.DB.prepare(
      `INSERT INTO card_states (id, user_id, deck_id, card_id, interval, ease_factor, due_date, due_at, reps, lapses, state, stability, difficulty, learning_steps, last_review, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, deck_id, card_id) DO UPDATE SET
         interval = excluded.interval,
         ease_factor = excluded.ease_factor,
         due_date = excluded.due_date,
         due_at = excluded.due_at,
         reps = excluded.reps,
         lapses = excluded.lapses,
         state = excluded.state,
         stability = excluded.stability,
         difficulty = excluded.difficulty,
         learning_steps = excluded.learning_steps,
         last_review = excluded.last_review,
         updated_at = CURRENT_TIMESTAMP`
    ).bind(
      id,
      user.id,
      body.deckId,
      body.cardId,
      body.interval,
      body.easeFactor,
      body.dueDate,
      body.dueAt || null,
      body.reps,
      body.lapses,
      body.state,
      body.stability,
      body.difficulty,
      body.learningSteps ?? 0,
      body.lastReview
    ).run();

    const log = body.lastReviewLog || body.reviewLog;
    if (log && typeof log === "object") {
      const logId = `rl_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const rating = Math.min(4, Math.max(1, Math.round(Number(log.rating) || 3)));
      const stateVal = Math.min(3, Math.max(0, Math.round(Number(log.state) || 0)));
      const dueStr = typeof log.due === "string" && log.due ? log.due : (body.dueAt || body.dueDate);
      const stab = Number.isFinite(log.stability) && log.stability >= 0 ? log.stability : body.stability;
      const diff = Number.isFinite(log.difficulty) && log.difficulty >= 1 ? log.difficulty : body.difficulty;
      const elapsed = Number.isFinite(log.elapsed_days) ? Math.max(0, log.elapsed_days) : 0;
      const lastElapsed = Number.isFinite(log.last_elapsed_days) ? Math.max(0, log.last_elapsed_days) : 0;
      const scheduled = Number.isFinite(log.scheduled_days) ? Math.max(0, log.scheduled_days) : body.interval;
      const reviewTime = typeof log.review === "string" && log.review ? log.review : new Date().toISOString();

      await env.DB.prepare(
        `INSERT INTO review_logs (id, user_id, card_id, deck_id, rating, state, due, stability, difficulty, elapsed_days, last_elapsed_days, scheduled_days, review_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        logId,
        user.id,
        body.cardId,
        body.deckId,
        rating,
        stateVal,
        dueStr,
        stab,
        diff,
        elapsed,
        lastElapsed,
        scheduled,
        reviewTime
      ).run().catch(() => {});
    }

    return jsonResponse({ success: true });
  } catch (e: any) {
    return errorResponse("Lỗi lưu trạng thái thẻ: " + e.message, 500);
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return jsonResponse({}, 200);
};

