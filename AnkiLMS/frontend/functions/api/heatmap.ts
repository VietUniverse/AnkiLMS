import { Env, jsonResponse, errorResponse, authenticateRequest } from "./_utils";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const user = await authenticateRequest(request, env);

    if (!user) {
      return jsonResponse({ checkins: [] });
    }

    // Check-ins mark attendance only. Actual study time and card counts must
    // come from recorded study sessions, never from attendance defaults.
    const rows = await env.DB.prepare(
      `WITH session_days AS (
         SELECT date(created_at, '+7 hours') AS day,
                SUM(duration_seconds) AS duration_seconds,
                SUM(cards_reviewed) AS cards_reviewed,
                SUM(xp_earned) AS session_xp
         FROM study_sessions
         WHERE user_id = ?
           AND date(created_at, '+7 hours') >= date('now', '+7 hours', '-90 days')
         GROUP BY date(created_at, '+7 hours')
       ), active_days AS (
         SELECT checkin_date AS day FROM checkins
         WHERE user_id = ? AND checkin_date >= date('now', '+7 hours', '-90 days')
         UNION
         SELECT day FROM session_days
       )
       SELECT active_days.day AS checkin_date,
              COALESCE(CAST((session_days.duration_seconds + 59) / 60 AS INTEGER), 0) AS time_spent_minutes,
              COALESCE(session_days.session_xp, 0) + CASE WHEN checkins.id IS NULL THEN 0 ELSE 1 END AS xp_earned,
              COALESCE(session_days.cards_reviewed, 0) AS cards_reviewed
       FROM active_days
       LEFT JOIN checkins ON checkins.user_id = ? AND checkins.checkin_date = active_days.day
       LEFT JOIN session_days ON session_days.day = active_days.day
       ORDER BY active_days.day DESC
       LIMIT 90`
    ).bind(user.id, user.id, user.id).all();

    return jsonResponse({
      checkins: rows.results || [],
    });
  } catch (e: any) {
    return errorResponse("Lỗi lấy dữ liệu heatmap: " + e.message, 500);
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return jsonResponse({}, 200);
};
