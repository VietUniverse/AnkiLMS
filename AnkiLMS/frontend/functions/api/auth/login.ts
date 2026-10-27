import { Env, jsonResponse, errorResponse, hashPassword, verifyPassword, UserRow, createSession, sessionCookie, isSameOriginRequest } from "../_utils";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (Number(request.headers.get("Content-Length") || 0) > 8_192) return errorResponse("Nội dung gửi lên quá lớn.", 413);

  let stage = "request";
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password || email.length > 254 || password.length > 128) return errorResponse("Email hoặc mật khẩu không chính xác.", 401);

    stage = "lookup";
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<UserRow>();
    if (!user?.password_hash) return errorResponse("Email hoặc mật khẩu không chính xác. Nếu đăng ký bằng Google, hãy tiếp tục với Google.", 401);

    stage = "password";
    const result = await verifyPassword(password, user.password_hash);
    if (!result.valid) return errorResponse("Email hoặc mật khẩu không chính xác.", 401);
    if (result.needsUpgrade) {
      const upgradedHash = await hashPassword(password);
      await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(upgradedHash, user.id).run();
    }

    stage = "session";
    const token = await createSession(env, user);
    return jsonResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          bio: user.bio || null,
          profile_public: user.profile_public ?? 1,
          translation_language: user.translation_language || "vi",
          streak: user.streak,
          longest_streak: user.longest_streak,
          xp: user.xp || 0,
          gems: user.gems || 0,
          level: user.level || Math.floor((user.xp || 0) / 300) + 1,
          active_badge: user.active_badge,
          active_frame: user.active_frame,
          active_background: user.active_background,
          role: user.role,
          last_checkin_date: user.last_checkin_date,
        },
      },
      200,
      { "Set-Cookie": sessionCookie(request, token) },
    );
  } catch (error) {
    console.error("Authentication login failed", { stage, error: error instanceof Error ? error.message : "unknown" });
    return errorResponse("Không thể đăng nhập lúc này. Vui lòng thử lại.", 500);
  }
};
