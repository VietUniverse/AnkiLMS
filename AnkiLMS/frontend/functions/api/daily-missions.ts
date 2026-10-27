import { Env, authenticateRequest, errorResponse, jsonResponse } from "./_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Đăng nhập để lưu tiến độ nhiệm vụ hằng ngày.", 401);

    const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [activityResult, claimResult, communityResult, account] = await Promise.all([
      env.DB.prepare(
        `SELECT module, COUNT(*) AS sessions
         FROM study_sessions
         WHERE user_id = ? AND date(created_at, '+7 hours') = ?
           AND module IN ('srs', 'shadowing', 'dictation')
         GROUP BY module`,
      ).bind(user.id, today).all<{ module: string; sessions: number }>(),
      env.DB.prepare(
        "SELECT mission_id, gems_awarded FROM daily_mission_claims WHERE user_id = ? AND mission_date = ?",
      ).bind(user.id, today).all<{ mission_id: string; gems_awarded: number }>(),
      env.DB.prepare(
        `SELECT module, COUNT(DISTINCT user_id) AS learners
         FROM study_sessions WHERE created_at >= datetime('now', '-1 day')
           AND module IN ('srs', 'shadowing', 'dictation') GROUP BY module`,
      ).all<{ module: string; learners: number }>(),
      env.DB.prepare("SELECT gems FROM users WHERE id = ?").bind(user.id).first<{ gems: number }>(),
    ]);

    const activity = Object.fromEntries((activityResult.results || []).map((row) => [row.module, row.sessions]));
    const claims = Object.fromEntries((claimResult.results || []).map((row) => [row.mission_id, row.gems_awarded]));
    const community = Object.fromEntries((communityResult.results || []).map((row) => [row.module, row.learners]));
    const missions = [
      { id: "shadowing", module: "shadowing", title: "Nhại câu sau", description: "Nghe một câu tiếng Hàn, thu âm và đọc lại.", href: "/shadowing", sessions: activity.shadowing || 0, gemReward: 1 },
      { id: "vocabulary", module: "srs", title: "Ôn từ vựng", description: "Ôn ít nhất một thẻ Anki và chọn mức độ nhớ.", href: "/flashcards", sessions: activity.srs || 0, gemReward: 1 },
      { id: "dictation", module: "dictation", title: "Nghe chép chính tả", description: "Nghe và chép đúng ít nhất một câu.", href: "/dictation", sessions: activity.dictation || 0, gemReward: 1 },
    ].map((mission) => ({
      ...mission,
      completed: mission.sessions > 0,
      gemsAwarded: Number(claims[mission.id] || 0),
      learnersToday: Number(community[mission.module] || 0),
    }));

    return jsonResponse({
      date: today,
      missions,
      completedCount: missions.filter((mission) => mission.completed).length,
      gemsEarned: missions.reduce((total, mission) => total + mission.gemsAwarded, 0),
      user: { gems: account?.gems || 0 },
    });
  } catch {
    return errorResponse("Không tải được nhiệm vụ hằng ngày.", 500);
  }
};
