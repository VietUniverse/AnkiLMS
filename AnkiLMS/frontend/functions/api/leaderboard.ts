import { Env, jsonResponse, errorResponse, authenticateRequest, refreshUserStreaks } from "./_utils";

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

    const rows = topUsers.results || [];
    const streaks = await refreshUserStreaks(env, rows.map((row: any) => String(row.id)));

    return jsonResponse({
      leaderboard: rows.map((row: any) => ({ ...row, streak: streaks.get(String(row.id)) ?? 0 })),
    });
  } catch (e: any) {
    return errorResponse("Lỗi lấy bảng xếp hạng: " + e.message, 500);
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return jsonResponse({}, 200);
};
