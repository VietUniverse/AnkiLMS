import { Env, jsonResponse, errorResponse, authenticateRequest, refreshUserStreak } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const user = await authenticateRequest(request, env);

    if (!user) {
      return errorResponse("Chưa đăng nhập hoặc phiên hết hạn.", 401);
    }

    const streakState = await refreshUserStreak(env, user.id);

    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        bio: user.bio || null,
        profile_public: user.profile_public ?? 1,
        translation_language: user.translation_language || "vi",
        ...streakState,
        xp: user.xp,
        gems: user.gems,
        level: user.level,
        active_badge: user.active_badge,
        active_frame: user.active_frame,
        active_background: user.active_background,
        role: user.role,
        last_checkin_date: user.last_checkin_date,
        created_at: user.created_at,
      },
    });
  } catch (e: any) {
    return errorResponse("Lỗi server: " + e.message, 500);
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return jsonResponse({}, 200);
};
