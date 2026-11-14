import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await authenticateAdminRequest(request, env))) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const [deckResult, userResult, accuracyResult] = await Promise.all([
      env.DB.prepare(
        `SELECT s.user_id AS userId, s.deck_id AS deckId, COUNT(*) AS cardCount,
                MAX(s.updated_at) AS updatedAt, u.name, u.email
         FROM card_states s JOIN users u ON u.id = s.user_id
         GROUP BY s.user_id, s.deck_id ORDER BY MAX(s.updated_at) DESC LIMIT 500`,
      ).all(),
      env.DB.prepare(
        `SELECT s.user_id AS userId, COUNT(*) AS cards, COUNT(DISTINCT s.deck_id) AS decks,
                MAX(s.updated_at) AS updatedAt, u.name, u.email
         FROM card_states s JOIN users u ON u.id = s.user_id
         GROUP BY s.user_id ORDER BY MAX(s.updated_at) DESC LIMIT 500`,
      ).all(),
      env.DB.prepare(
        `SELECT user_id AS userId, SUM(cards_reviewed) AS reviewed, SUM(correct_count) AS correct
         FROM study_sessions WHERE module = 'srs' AND cards_reviewed > 0
         GROUP BY user_id`,
      ).all(),
    ]);

    const accuracy = new Map<string, { reviewed: number; correct: number }>();
    for (const row of (accuracyResult.results || []) as Array<{
      userId: string;
      reviewed: number;
      correct: number;
    }>) {
      accuracy.set(row.userId, { reviewed: Number(row.reviewed) || 0, correct: Number(row.correct) || 0 });
    }

    const users = ((userResult.results || []) as Array<{
      userId: string;
      cards: number;
      decks: number;
      updatedAt: string;
      name: string;
      email: string;
    }>).map((row) => {
      const stat = accuracy.get(row.userId);
      const reviewed = stat?.reviewed ?? 0;
      const correct = stat?.correct ?? 0;
      return {
        ...row,
        cards: Number(row.cards) || 0,
        decks: Number(row.decks) || 0,
        reviewed,
        correct,
        retention: reviewed > 0 ? Math.round((correct / reviewed) * 100) : null,
      };
    });

    return jsonResponse({ decks: deckResult.results || [], users });
  } catch {
    return errorResponse("Không thể tải bộ thẻ Anki.", 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (!(await authenticateAdminRequest(request, env))) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || "";
    const deckId = url.searchParams.get("deckId") || "";
    if (!userId || userId.length > 100 || !deckId || deckId.length > 200) return errorResponse("Bộ thẻ không hợp lệ.");
    const deck = await env.DB.prepare("SELECT COUNT(*) AS count FROM card_states WHERE user_id = ? AND deck_id = ?").bind(userId, deckId).first<{ count: number }>();
    if (!deck?.count) return errorResponse("Không tìm thấy tiến độ SRS của bộ thẻ.", 404);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM card_states WHERE user_id = ? AND deck_id = ?").bind(userId, deckId),
    ]);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không thể xóa bộ thẻ Anki.", 500);
  }
};
