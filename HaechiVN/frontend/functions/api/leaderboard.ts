import { Env, jsonResponse, errorResponse, authenticateRequest } from "./_utils";

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

    // XP kiếm trong kỳ = điểm danh + các phiên học (đã ghi nhận phía server).
    // Streak is derived from qualified check-ins below, never from the total
    // number of active days in the selected range.

    const topUsers = await env.DB.prepare(
      `SELECT * FROM (
         SELECT u.id, u.name, u.avatar_url, u.level,
                COALESCE((SELECT SUM(c.xp_earned) FROM checkins c WHERE c.user_id = u.id AND c.checkin_date BETWEEN ? AND ?), 0)
                + COALESCE((SELECT SUM(s.xp_earned) FROM study_sessions s WHERE s.user_id = u.id AND date(s.created_at, '+7 hours') BETWEEN ? AND ?), 0) AS xp,
                u.streak AS streak
         FROM users u
       )
       WHERE xp > 0
       ORDER BY xp DESC, name ASC
       LIMIT 20`,
    ).bind(from, to, from, to).all();

    // Xếp hạng Từ vựng: chỉ quét thẻ có last_review trong khoảng thời gian đã chọn để tiết kiệm row reads
    const vocabulary = await env.DB.prepare(
      `SELECT u.id, u.name, u.avatar_url, u.level,
              COUNT(*) AS vocab_total,
              SUM(CASE WHEN cs.last_review = date('now', '+7 hours') THEN 1 ELSE 0 END) AS vocab_today
       FROM card_states cs
       JOIN users u ON u.id = cs.user_id
       WHERE cs.last_review BETWEEN ? AND ? AND cs.reps > 0
       GROUP BY u.id
       ORDER BY vocab_total DESC, vocab_today DESC, u.name ASC
       LIMIT 20`,
    ).bind(from, to).all<VocabRow>();

    const rows = topUsers.results || [];
    const vocabRows = vocabulary.results || [];
    const streaks = new Map<string, number>();
    if (rows.length) {
      const ids = rows.map((row: any) => String(row.id));
      const placeholders = ids.map(() => "?").join(", ");
      const checkins = await env.DB.prepare(
        `SELECT user_id, checkin_date FROM checkins
         WHERE user_id IN (${placeholders}) AND checkin_date BETWEEN ? AND ?
         ORDER BY user_id, checkin_date`,
      ).bind(...ids, from, to).all<{ user_id: string; checkin_date: string }>();
      const previousDay = new Map<string, number>();
      const runs = new Map<string, number>();
      for (const { user_id: id, checkin_date: day } of checkins.results || []) {
        if (!DATE_RE.test(day)) continue;
        const ordinal = Date.parse(`${day}T00:00:00Z`);
        if (ordinal === previousDay.get(id)) continue;
        const run = ordinal - (previousDay.get(id) ?? -Infinity) === 86_400_000
          ? (runs.get(id) || 0) + 1 : 1;
        previousDay.set(id, ordinal);
        runs.set(id, run);
        streaks.set(id, Math.max(streaks.get(id) || 0, run));
      }
    }

    return jsonResponse({
      from,
      to,
      periodLabel: from === to && to === vnToday() ? PERIOD_LABEL.day : `${from} → ${to}`,
      leaderboard: rows.map((row: any) => ({
        ...row,
        streak: streaks.get(String(row.id)) ?? 0,
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
