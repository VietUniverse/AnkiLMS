import { Env, jsonResponse, errorResponse, authenticateRequest, refreshUserStreaks } from "./_utils";

type PeriodKey = "day" | "week" | "month";
type Range = { from: string; to: string };

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function vnToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Khoảng ngày người xem chọn. Ưu tiên from/to; không có thì suy ra từ period cũ
 * (day/week/month) để client bản cũ vẫn chạy.
 */
function resolveRange(params: URLSearchParams): Range {
  const from = params.get("from");
  const to = params.get("to");
  if (from && to && DATE_RE.test(from) && DATE_RE.test(to) && from <= to) return { from, to };

  const today = vnToday();
  const period = params.get("period");
  if (period === "week") return { from: shiftDays(today, -6), to: today };
  if (period === "month") return { from: shiftDays(today, -29), to: today };
  return { from: today, to: today };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { env, request } = context;
    if (!await authenticateRequest(request, env)) return errorResponse("Đăng nhập để xem bảng xếp hạng.", 401);

    const { from, to } = resolveRange(new URL(request.url).searchParams);
    const isToday = from === to && to === vnToday();

    // XP kiếm trong kỳ = điểm danh + các phiên học (đã ghi nhận phía server).
    // Streak: khoảng đúng hôm nay thì dùng chuỗi hiện tại; khoảng khác đếm số ngày có hoạt động.
    const streakExpr = isToday
      ? "u.streak"
      : `(SELECT COUNT(DISTINCT day) FROM (
           SELECT date(s.created_at, '+7 hours') AS day
           FROM study_sessions s
           WHERE s.user_id = u.id AND date(s.created_at, '+7 hours') BETWEEN ? AND ?
           UNION
           SELECT c.checkin_date AS day
           FROM checkins c
           WHERE c.user_id = u.id AND c.checkin_date BETWEEN ? AND ?
         ))`;

    const topUsers = await env.DB.prepare(
      `SELECT * FROM (
         SELECT u.id, u.name, u.avatar_url, u.level,
                COALESCE((SELECT SUM(c.xp_earned) FROM checkins c WHERE c.user_id = u.id AND c.checkin_date BETWEEN ? AND ?), 0)
                + COALESCE((SELECT SUM(s.xp_earned) FROM study_sessions s WHERE s.user_id = u.id AND date(s.created_at, '+7 hours') BETWEEN ? AND ?), 0) AS xp,
                ${streakExpr} AS streak
         FROM users u
       )
       WHERE xp > 0
       ORDER BY xp DESC, name ASC
       LIMIT 20`,
    ).bind(...(isToday ? [from, to, from, to] : [from, to, from, to, from, to, from, to])).all();

    // Xếp hạng Từ vựng: số thẻ đã ôn trong kỳ và số thẻ ôn trong hôm nay.
    const vocabulary = await env.DB.prepare(
      `SELECT u.id, u.name, u.avatar_url, u.level,
              SUM(CASE WHEN cs.last_review BETWEEN ? AND ? THEN 1 ELSE 0 END) AS vocab_total,
              SUM(CASE WHEN cs.last_review = date('now', '+7 hours') THEN 1 ELSE 0 END) AS vocab_today
       FROM card_states cs
       JOIN users u ON u.id = cs.user_id
       WHERE cs.reps > 0
       GROUP BY u.id
       HAVING vocab_total > 0
       ORDER BY vocab_total DESC, vocab_today DESC, u.name ASC
       LIMIT 20`,
    ).bind(from, to).all<VocabRow>();

    const rows = topUsers.results || [];
    const vocabRows = vocabulary.results || [];
    const streaks = isToday
      ? await refreshUserStreaks(env, rows.map((row: any) => String(row.id)))
      : null;

    return jsonResponse({
      from,
      to,
      periodLabel: isToday ? PERIOD_LABEL.day : `${from} → ${to}`,
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
