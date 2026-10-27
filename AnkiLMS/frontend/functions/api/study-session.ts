import { Env, jsonResponse, errorResponse, authenticateRequest, isSameOriginRequest } from "./_utils";

const MODULES = new Set(["srs", "dictation", "shadowing", "passive_listening", "topik", "hangeul", "speaking", "game_quiz", "game_spell", "game_match", "game_korean_shooter"]);
const MODULE_TO_MISSION: Record<string, "vocabulary" | "shadowing" | "dictation"> = {
  srs: "vocabulary",
  shadowing: "shadowing",
  dictation: "dictation",
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Chưa đăng nhập.", 401);
    const [totals, days, sessions] = await Promise.all([
      env.DB.prepare(
        `SELECT COUNT(*) AS session_count, COALESCE(SUM(cards_reviewed), 0) AS cards_reviewed,
          COALESCE(SUM(correct_count), 0) AS correct_count, COALESCE(SUM(duration_seconds), 0) AS duration_seconds
         FROM study_sessions WHERE user_id = ?`,
      ).bind(user.id).first<{ session_count: number; cards_reviewed: number; correct_count: number; duration_seconds: number }>(),
      env.DB.prepare(
        `SELECT checkin_date AS day, time_spent_minutes AS minutes, cards_reviewed AS cards
         FROM checkins WHERE user_id = ? AND checkin_date >= date('now', '-90 days') ORDER BY checkin_date ASC`,
      ).bind(user.id).all<{ day: string; minutes: number; cards: number }>(),
      env.DB.prepare(
        `SELECT module, cards_reviewed, correct_count, duration_seconds, created_at
         FROM study_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      ).bind(user.id).all<{ module: string; cards_reviewed: number; correct_count: number; duration_seconds: number; created_at: string }>(),
    ]);
    return jsonResponse({ summary: totals, days: days.results || [], sessions: sessions.results || [] });
  } catch {
    return errorResponse("Không tải được thống kê học tập.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);

  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Chưa đăng nhập.", 401);

    const body = (await request.json()) as {
      module?: string;
      cardsReviewed?: number;
      correctCount?: number;
      durationSeconds?: number;
    };
    const cardsReviewed = Number(body.cardsReviewed);
    const correctCount = Number(body.correctCount);
    const durationSeconds = Number(body.durationSeconds);
    if (!body.module || !MODULES.has(body.module)) return errorResponse("Phân hệ học không hợp lệ.");
    if (!Number.isInteger(cardsReviewed) || cardsReviewed < 1 || cardsReviewed > 500) return errorResponse("Số thẻ đã học không hợp lệ.");
    if (!Number.isInteger(correctCount) || correctCount < 0 || correctCount > cardsReviewed) return errorResponse("Kết quả trả lời không hợp lệ.");
    if (!Number.isInteger(durationSeconds) || durationSeconds < 10 || durationSeconds > 14_400) return errorResponse("Phiên học cần ít nhất 10 giây hoạt động.");

    const now = new Date();
    const todayStr = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const recentSessions = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM study_sessions WHERE user_id = ? AND created_at >= datetime('now', '-1 hour')",
    ).bind(user.id).first<{ total: number }>();
    if ((recentSessions?.total || 0) >= 12) return errorResponse("Bạn đã ghi nhận 12 lượt học trong giờ qua. Nghỉ một chút rồi tiếp tục nhé.", 429);

    // XP is derived on the server; a modified browser cannot choose its own reward.
    // Keep leaderboard rewards small and server-derived. Zero-correct submissions earn no XP.
    // A substantial session earns 2 XP; shorter valid sessions earn 1 XP. No daily XP cap.
    const xpEarned = correctCount < 1 ? 0 : cardsReviewed >= 10 && correctCount >= 5 && durationSeconds >= 120 ? 2 : 1;
    const gemsEarned = 0;
    const sessionId = `ses_${crypto.randomUUID()}`;
    const durationMinutes = Math.ceil(durationSeconds / 60);
    const insertSession = env.DB.prepare(
      `INSERT INTO study_sessions (id, user_id, module, cards_reviewed, correct_count, xp_earned, duration_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(sessionId, user.id, body.module, cardsReviewed, correctCount, xpEarned, durationSeconds);
    const updateUser = env.DB.prepare(
      `UPDATE users
       SET xp = xp + ?, gems = gems + ?, level = CAST((xp + ?) / 300 AS INTEGER) + 1
       WHERE id = ?`,
    ).bind(xpEarned, gemsEarned, xpEarned, user.id);
    const updateCheckin = env.DB.prepare(
      `UPDATE checkins
       SET time_spent_minutes = time_spent_minutes + ?,
           cards_reviewed = cards_reviewed + ?, xp_earned = xp_earned + ?
       WHERE user_id = ? AND checkin_date = ?`,
    ).bind(durationMinutes, cardsReviewed, xpEarned, user.id, todayStr);

    const missionId = MODULE_TO_MISSION[body.module as keyof typeof MODULE_TO_MISSION];
    const qualifiesForMission = Boolean(missionId) && (body.module === "srs" || correctCount >= 1);
    const missionClaimId = qualifiesForMission ? `mission_${crypto.randomUUID()}` : null;
    const missionClaim = missionClaimId && missionId
      ? env.DB.prepare(
          `INSERT OR IGNORE INTO daily_mission_claims (id, user_id, mission_id, mission_date, gems_awarded)
           VALUES (?, ?, ?, ?, 30)`,
        ).bind(missionClaimId, user.id, missionId, todayStr)
      : null;
    const missionReward = missionClaimId
      ? env.DB.prepare(
          `UPDATE users SET gems = gems + 30
           WHERE id = ? AND EXISTS (SELECT 1 FROM daily_mission_claims WHERE id = ? AND user_id = ?)`,
        ).bind(user.id, missionClaimId, user.id)
      : null;

    await env.DB.batch([insertSession, updateUser, updateCheckin, ...(missionClaim ? [missionClaim] : []), ...(missionReward ? [missionReward] : [])]);
    const missionAward = missionClaimId
      ? await env.DB.prepare("SELECT mission_id FROM daily_mission_claims WHERE id = ? AND user_id = ?").bind(missionClaimId, user.id).first<{ mission_id: string }>()
      : null;
    const updatedUser = await env.DB.prepare("SELECT xp, gems, level FROM users WHERE id = ?").bind(user.id).first<{ xp: number; gems: number; level: number }>();

    return jsonResponse({
      success: true,
      xpEarned,
      gemsEarned: gemsEarned + (missionAward ? 30 : 0),
      dailyMission: missionAward ? { id: missionAward.mission_id, gemsAwarded: 30 } : null,
      user: { id: user.id, ...updatedUser },
    });
  } catch {
    return errorResponse("Không thể lưu phiên học lúc này. Tiến độ sẽ được thử đồng bộ lại.", 500);
  }
};
