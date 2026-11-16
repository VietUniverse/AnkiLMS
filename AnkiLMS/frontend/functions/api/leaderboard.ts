import { Env, jsonResponse, errorResponse, authenticateRequest, refreshUserStreaks } from "./_utils";

type PeriodKey = "day" | "week" | "month";

interface VocabRow {
  id: string;
  name: string;
  avatar_url?: string | null;
  level?: number;
  vocab_total?: number;
  vocab_today?: number;
}

const PERIOD_LABEL: Record<PeriodKey, string> = {
  day: "hôm nay",
  week: "7 ngày qua",
  month: "30 ngày qua",
};

function resolvePeriod(raw: string | null): PeriodKey {
  return raw === "week" || raw === "month" ? raw : "day";
}

function periodStart(period: PeriodKey): string {
  const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const start = new Date(vnNow);
  if (period === "week") start.setUTCDate(start.getUTCDate() - 6);
  if (period === "month") start.setUTCDate(start.getUTCDate() - 29);
  return start.toISOString().slice(0, 10);
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { env, request } = context;
    if (!await authenticateRequest(request, env)) return errorResponse("Đăng nhập để xem bảng xếp hạng.", 401);

    const period = resolvePeriod(new URL(request.url).searchParams.get("period"));
    const start = periodStart(period);

    // XP kiếm trong kỳ = điểm danh + các phiên học (đã ghi nhận phía server).
    // Streak: hôm nay dùng chuỗi hiện tại; tuần/tháng đếm số ngày có hoạt động trong kỳ.
    const streakExpr = period === "day"
      ? "u.streak"
      : `(SELECT COUNT(DISTINCT day) FROM (
           SELECT date(s.created_at, '+7 hours') AS day
           FROM study_sessions s
           WHERE s.user_id = u.id AND date(s.created_at, '+7 hours') >= ?
           UNION
           SELECT c.checkin_date AS day
           FROM checkins c
           WHERE c.user_id = u.id AND c.checkin_date >= ?
         ))`;

    const topUsers = await env.DB.prepare(
      `SELECT * FROM (
         SELECT u.id, u.name, u.avatar_url, u.level,
                COALESCE((SELECT SUM(c.xp_earned) FROM checkins c WHERE c.user_id = u.id AND c.checkin_date >= ?), 0)
                + COALESCE((SELECT SUM(s.xp_earned) FROM study_sessions s WHERE s.user_id = u.id AND date(s.created_at, '+7 hours') >= ?), 0) AS xp,
                ${streakExpr} AS streak
         FROM users u
       )
       WHERE xp > 0
       ORDER BY xp DESC, name ASC
       LIMIT 20`,
    ).bind(...(period === "day" ? [start, start] : [start, start, start, start])).all();

    // Xếp hạng Từ vựng: chỉ tính thẻ trưởng thành (Mature cards: state 'review' và interval >= 21 ngày theo chuẩn Anki).
    const vocabulary = await env.DB.prepare(
      `SELECT u.id, u.name, u.avatar_url, u.level,
              SUM(CASE WHEN cs.state = 'review' AND cs.interval >= 21 AND cs.last_review >= ? THEN 1 ELSE 0 END) AS vocab_total,
              SUM(CASE WHEN cs.state = 'review' AND cs.interval >= 21 AND cs.last_review = date('now', '+7 hours') THEN 1 ELSE 0 END) AS vocab_today
       FROM card_states cs
       JOIN users u ON u.id = cs.user_id
       WHERE cs.state = 'review' AND cs.interval >= 21
       GROUP BY u.id
       HAVING vocab_total > 0
       ORDER BY vocab_total DESC, vocab_today DESC, u.name ASC
       LIMIT 20`,
    ).bind(start).all<VocabRow>();

    const rows = topUsers.results || [];
    const vocabRows = vocabulary.results || [];
    const streaks = period === "day"
      ? await refreshUserStreaks(env, rows.map((row: any) => String(row.id)))
      : null;

    return jsonResponse({
      period,
      periodLabel: PERIOD_LABEL[period],
      leaderboard: rows.map((row: any) => ({
        ...row,
        streak: streaks ? streaks.get(String(row.id)) ?? 0 : Number(row.streak) || 0,
      })),
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
