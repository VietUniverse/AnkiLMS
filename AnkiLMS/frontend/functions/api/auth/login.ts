import { Env, jsonResponse, errorResponse, hashPassword, verifyPassword, UserRow, createSession, sessionCookie, isSameOriginRequest } from "../_utils";

const INVALID_CREDENTIALS = "Email hoặc mật khẩu không chính xác.";

async function rateKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function recordAttempt(env: Env, key: string, windowSeconds: number): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    `INSERT INTO login_rate_limits (key, attempts, window_start) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       attempts = CASE WHEN window_start <= ? THEN 1 ELSE attempts + 1 END,
       window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END
     RETURNING attempts`,
  ).bind(key, now, now - windowSeconds, now - windowSeconds).first<{ attempts: number }>();
  return row?.attempts ?? 1;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (Number(request.headers.get("Content-Length") || 0) > 8_192) return errorResponse("Nội dung gửi lên quá lớn.", 413);

  let stage = "request";
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password || email.length > 254 || password.length > 128) return errorResponse(INVALID_CREDENTIALS, 401);

    stage = "rate-limit";
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipAttempts = await recordAttempt(env, `ip:${await rateKey(clientIp)}`, 60);
    const accountAttempts = await recordAttempt(env, `account:${await rateKey(email)}`, 300);
    if (ipAttempts > 20 || accountAttempts > 5) {
      return jsonResponse({ error: "Đã thử đăng nhập quá nhiều lần. Vui lòng đợi rồi thử lại." }, 429, { "Retry-After": ipAttempts > 20 ? "60" : "300" });
    }

    stage = "lookup";
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<UserRow>();
    if (!user?.password_hash) return errorResponse(INVALID_CREDENTIALS, 401);

    stage = "password";
    const result = await verifyPassword(password, user.password_hash);
    if (!result.valid) return errorResponse(INVALID_CREDENTIALS, 401);
    if (result.needsUpgrade) {
      const upgradedHash = await hashPassword(password);
      await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(upgradedHash, user.id).run();
    }

    stage = "session";
    await env.DB.prepare("DELETE FROM login_rate_limits WHERE key = ?").bind(`account:${await rateKey(email)}`).run();
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
          created_at: user.created_at,
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
