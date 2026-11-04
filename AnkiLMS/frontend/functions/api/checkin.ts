import { Env, UserRow, jsonResponse, errorResponse, authenticateRequest, isSameOriginRequest, refreshUserStreak } from "./_utils";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
    const user = await authenticateRequest(request, env);

    if (!user) {
      return errorResponse("Vui lòng đăng nhập để điểm danh.", 401);
    }

    // Today in GMT+7 (Vietnam Time)
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = vnTime.toISOString().split("T")[0];

    // Check if already checked in today
    const existing = await env.DB.prepare("SELECT id FROM checkins WHERE user_id = ? AND checkin_date = ?")
      .bind(user.id, todayStr)
      .first();

    if (existing) {
      const streakState = await refreshUserStreak(env, user.id);
      return jsonResponse({
        alreadyCheckedIn: true,
        message: "Bạn đã điểm danh hôm nay rồi!",
        user: {
          ...streakState,
          xp: user.xp,
          gems: user.gems,
        },
      });
    }

    const rewardXp = 1;
    const newXp = user.xp + rewardXp;
    const newGems = user.gems + 1;
    const newLevel = Math.floor(newXp / 300) + 1;

    // Record checkin
    const checkinId = "chk_" + crypto.randomUUID().substring(0, 8);
    const insertCheckin = env.DB.prepare(
      `INSERT INTO checkins (id, user_id, checkin_date, xp_earned, time_spent_minutes, cards_reviewed)
       VALUES (?, ?, ?, ?, 0, 0)`
    ).bind(checkinId, user.id, todayStr, rewardXp);

    const updateUser = env.DB.prepare(
      `UPDATE users
       SET xp = ?, gems = ?, level = ?, last_checkin_date = ?
       WHERE id = ?`
    ).bind(newXp, newGems, newLevel, todayStr, user.id);

    try {
      await env.DB.batch([insertCheckin, updateUser]);
    } catch {
      // A simultaneous request may have won the unique (user, date) checkin first.
      const duplicate = await env.DB.prepare("SELECT id FROM checkins WHERE user_id = ? AND checkin_date = ?")
        .bind(user.id, todayStr)
        .first();
      if (duplicate) {
        const streakState = await refreshUserStreak(env, user.id);
        const latestUser = await env.DB.prepare("SELECT streak, xp, gems FROM users WHERE id = ?").bind(user.id).first<UserRow>();
        return jsonResponse({
          alreadyCheckedIn: true,
          message: "Bạn đã điểm danh hôm nay rồi!",
          user: { ...streakState, xp: latestUser?.xp ?? user.xp, gems: latestUser?.gems ?? user.gems },
        });
      }
      throw new Error("checkin_transaction_failed");
    }

    const streakState = await refreshUserStreak(env, user.id);

    return jsonResponse({
      alreadyCheckedIn: false,
      message: "Điểm danh thành công! +1 XP, +1 Kim Cương 💎",
      rewardXp,
      rewardGems: 1,
      user: {
        id: user.id,
        ...streakState,
        xp: newXp,
        gems: newGems,
        level: newLevel,
        last_checkin_date: todayStr,
      },
    });
  } catch (e: any) {
    return errorResponse("Lỗi điểm danh: " + e.message, 500);
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return jsonResponse({}, 200);
};
