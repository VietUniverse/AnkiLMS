import { Env, jsonResponse, errorResponse, authenticateRequest, refreshUserStreaks } from "./_utils";

interface VocabRow {
  id: string;
  name: string;
  avatar_url?: string | null;
  level?: number;
  vocab_total?: number;
  vocab_today?: number;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { env, request } = context;
    if (!await authenticateRequest(request, env)) return errorResponse("Đăng nhập để xem bảng xếp hạng.", 401);

    // Fetch top 20 users by XP
    const topUsers = await env.DB.prepare(
      `SELECT id, name, avatar_url, xp, streak, level
       FROM users
       ORDER BY xp DESC
       LIMIT 20`
    ).all();

    // Xếp hạng Từ vựng: đếm số thẻ đã học (reps > 0) và số thẻ ôn trong hôm nay.
    const vocabulary = await env.DB.prepare(
      `SELECT u.id, u.name, u.avatar_url, u.level,
              SUM(CASE WHEN cs.reps > 0 THEN 1 ELSE 0 END) AS vocab_total,
              SUM(CASE WHEN cs.last_review = date('now', '+7 hours') THEN 1 ELSE 0 END) AS vocab_today
       FROM card_states cs
       JOIN users u ON u.id = cs.user_id
       GROUP BY u.id
       HAVING vocab_total > 0
       ORDER BY vocab_total DESC, vocab_today DESC, u.name ASC
       LIMIT 20`
    ).all<VocabRow>();

    const rows = topUsers.results || [];
    const vocabRows = vocabulary.results || [];
    const streaks = await refreshUserStreaks(env, rows.map((row: any) => String(row.id)));

    return jsonResponse({
      leaderboard: rows.map((row: any) => ({ ...row, streak: streaks.get(String(row.id)) ?? 0 })),
      vocabulary: vocabRows.map((row) => ({
        id: String(row.id),
        name: row.name,
        avatar_url: row.avatar_url ?? null,
        level: row.level ?? 1,
        vocab_total: Number(row.vocab_total) || 0,
        vocab_today: Number(row.vocab_today) || 0,
      })),
    });
  } catch (e: any) {
    return errorResponse("Lỗi lấy bảng xếp hạng: " + e.message, 500);
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return jsonResponse({}, 200);
};
