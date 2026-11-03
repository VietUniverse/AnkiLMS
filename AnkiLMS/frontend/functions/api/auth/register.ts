import { Env, jsonResponse, errorResponse, hashPassword, UserRow, createSession, sessionCookie, isSameOriginRequest } from "../_utils";
import { rateKey, recordAttempt } from "./_rateLimit";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get("Origin");
  const contentType = request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") return errorResponse("Chỉ chấp nhận nội dung JSON.", 415);
  if (!origin || origin !== new URL(request.url).origin || !isSameOriginRequest(request) || request.headers.get("Sec-Fetch-Site") === "cross-site") {
    return errorResponse("Yêu cầu không hợp lệ.", 403);
  }
  if (Number(request.headers.get("Content-Length") || 0) > 8_192) return errorResponse("Nội dung gửi lên quá lớn.", 413);

  let body: { email?: string; password?: string; name?: string; referralCode?: string; translationLanguage?: string };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return errorResponse("Yêu cầu không hợp lệ.", 400);
    body = parsed as typeof body;
  } catch {
    return errorResponse("Yêu cầu không hợp lệ.", 400);
  }

  try {
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipAttempts = await recordAttempt(env, `register-ip:${await rateKey(clientIp)}`, 3600);
    if (ipAttempts > 10) return jsonResponse({ error: "Đã tạo quá nhiều yêu cầu. Vui lòng thử lại sau." }, 429, { "Retry-After": "3600" });
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email) {
      const accountAttempts = await recordAttempt(env, `register-account:${await rateKey(email)}`, 3600);
      if (accountAttempts > 3) return jsonResponse({ error: "Đã tạo quá nhiều yêu cầu. Vui lòng thử lại sau." }, 429, { "Retry-After": "3600" });
    }
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : email.split("@")[0];

    if (!email || !password) return errorResponse("Vui lòng nhập Email và Mật khẩu đầy đủ.");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse("Địa chỉ email chưa hợp lệ.");
    if (password.length < 8 || password.length > 128) return errorResponse("Mật khẩu phải có từ 8 đến 128 ký tự.");
    if (!name || name.length > 48) return errorResponse("Tên hiển thị phải có từ 1 đến 48 ký tự.");
    const translationLanguage = body.translationLanguage || "vi";
    if (!["vi", "en", "ja"].includes(translationLanguage)) return errorResponse("Ngôn ngữ học không hợp lệ.");

    const referralCode = typeof body.referralCode === "string" ? body.referralCode.trim() : "";
    const referrer = referralCode.length <= 80 && referralCode ? await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(referralCode).first<{ id: string }>() : null;

    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) return errorResponse("Không thể tạo tài khoản với thông tin này.", 400);

    const userId = `usr_${crypto.randomUUID()}`;
    const passHash = await hashPassword(password);
    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, name, translation_language, streak, longest_streak, xp, gems, level, referred_by)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, 2, 1, ?)`
    ).bind(userId, email, passHash, name, translationLanguage, referrer?.id || null).run();

    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
    if (!user) return errorResponse("Không thể tạo tài khoản. Vui lòng thử lại.", 500);
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
      },
      201,
      { "Set-Cookie": sessionCookie(token) },
    );
  } catch {
    return errorResponse("Không thể tạo tài khoản lúc này. Vui lòng thử lại.", 500);
  }
};
