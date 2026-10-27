import { Env, jsonResponse, errorResponse, hashPassword, UserRow, createSession, sessionCookie, isSameOriginRequest } from "../_utils";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (Number(request.headers.get("Content-Length") || 0) > 8_192) return errorResponse("Nội dung gửi lên quá lớn.", 413);

  try {
    const body = (await request.json()) as { email?: string; password?: string; name?: string; referralCode?: string };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : email.split("@")[0];

    if (!email || !password) return errorResponse("Vui lòng nhập Email và Mật khẩu đầy đủ.");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse("Địa chỉ email chưa hợp lệ.");
    if (password.length < 8 || password.length > 128) return errorResponse("Mật khẩu phải có từ 8 đến 128 ký tự.");
    if (!name || name.length > 48) return errorResponse("Tên hiển thị phải có từ 1 đến 48 ký tự.");

    const referralCode = typeof body.referralCode === "string" ? body.referralCode.trim() : "";
    const referrer = referralCode.length <= 80 && referralCode ? await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(referralCode).first<{ id: string }>() : null;

    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) return errorResponse("Email này đã được đăng ký tài khoản!", 409);

    const userId = `usr_${crypto.randomUUID()}`;
    const passHash = await hashPassword(password);
    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, name, streak, longest_streak, xp, gems, level, referred_by)
       VALUES (?, ?, ?, ?, 0, 0, 0, 100, 1, ?)`
    ).bind(userId, email, passHash, name, referrer?.id || null).run();

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
        },
      },
      201,
      { "Set-Cookie": sessionCookie(request, token) },
    );
  } catch {
    return errorResponse("Không thể tạo tài khoản lúc này. Vui lòng thử lại.", 500);
  }
};
