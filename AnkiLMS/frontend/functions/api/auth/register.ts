import { Env, jsonResponse, errorResponse, hashPassword, isSameOriginRequest } from "../_utils";
import { rateKey, recordAttempt } from "./_rateLimit";

const POLICY_VERSION = "2026-11-03-v1";

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]!);
}

async function sendVerificationEmail(env: Env, email: string, name: string, link: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error("Email service is not configured");
  const safeName = escapeHtml(name);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: "Xác minh email HaechiVN",
      text: `Xin chào ${name},\n\nBấm vào liên kết để xác minh email và kích hoạt tài khoản HaechiVN (có hiệu lực trong 24 giờ):\n${link}\n\nNếu bạn không đăng ký, hãy bỏ qua email này.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Xác minh email HaechiVN</h2><p>Xin chào ${safeName},</p><p>Bấm nút bên dưới để xác minh email và kích hoạt tài khoản. Liên kết có hiệu lực trong 24 giờ.</p><p><a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:bold">Xác minh email</a></p><p>Nếu bạn không đăng ký HaechiVN, hãy bỏ qua email này.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get("Origin");
  const contentType = request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") return errorResponse("Chỉ chấp nhận nội dung JSON.", 415);
  if (!origin || origin !== new URL(request.url).origin || !isSameOriginRequest(request) || request.headers.get("Sec-Fetch-Site") === "cross-site") {
    return errorResponse("Yêu cầu không hợp lệ.", 403);
  }
  if (Number(request.headers.get("Content-Length") || 0) > 8_192) return errorResponse("Nội dung gửi lên quá lớn.", 413);

  let body: { email?: string; password?: string; name?: string; referralCode?: string; translationLanguage?: string; acceptPolicies?: boolean };
  let pendingUserId: string | null = null;
  let stage = "rate-limit";
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
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.endsWith("@haechivn.local")) return errorResponse("Hãy nhập một địa chỉ email thật để nhận liên kết xác minh.");
    if (password.length < 8 || password.length > 128) return errorResponse("Mật khẩu phải có từ 8 đến 128 ký tự.");
    if (!name || name.length > 48) return errorResponse("Tên hiển thị phải có từ 1 đến 48 ký tự.");
    const translationLanguage = body.translationLanguage || "vi";
    if (!["vi", "en", "ja"].includes(translationLanguage)) return errorResponse("Ngôn ngữ học không hợp lệ.");
    if (body.acceptPolicies !== true) return errorResponse("Bạn cần đồng ý Điều khoản sử dụng và Chính sách quyền riêng tư.", 400);
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.SESSIONS) return errorResponse("Xác minh email chưa được cấu hình. Vui lòng thử lại sau.", 503);

    const referralCode = typeof body.referralCode === "string" ? body.referralCode.trim() : "";
    stage = "referral-lookup";
    const referrer = referralCode.length <= 80 && referralCode ? await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(referralCode).first<{ id: string }>() : null;

    stage = "existing-account-lookup";
    const existing = await env.DB.prepare("SELECT id, email_verified FROM users WHERE email = ?").bind(email).first<{ id: string; email_verified: number }>();
    if (existing?.email_verified !== 0 && existing) return errorResponse("Không thể tạo tài khoản với thông tin này.", 400);
    if (existing) await env.DB.prepare("DELETE FROM users WHERE id = ? AND email_verified = 0").bind(existing.id).run();

    const userId = `usr_${crypto.randomUUID()}`;
    stage = "password-hash";
    const passHash = await hashPassword(password);
    stage = "account-insert";
    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, name, translation_language, streak, longest_streak, xp, gems, level, referred_by,
        email_verified, terms_accepted_version, privacy_accepted_version, policies_accepted_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, 2, 1, ?, 0, ?, ?, ?)`
    ).bind(userId, email, passHash, name, translationLanguage, referrer?.id || null, POLICY_VERSION, POLICY_VERSION, new Date().toISOString()).run();
    pendingUserId = userId;

    const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    stage = "verification-token-store";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await env.SESSIONS.put(`email_verify:${tokenHash}`, userId, { expirationTtl: 86_400 });
    const siteUrl = new URL(env.SITE_URL || new URL(request.url).origin);
    const verificationLink = new URL(`/api/auth/verify-email?token=${rawToken}`, siteUrl).toString();
    try {
      stage = "verification-email";
      await sendVerificationEmail(env, email, name, verificationLink);
    } catch (error) {
      await env.SESSIONS.delete(`email_verify:${tokenHash}`);
      await env.DB.prepare("DELETE FROM users WHERE id = ? AND email_verified = 0").bind(userId).run();
      pendingUserId = null;
      console.error("Email verification delivery failed", { error: error instanceof Error ? error.message : "unknown" });
      return errorResponse("Không gửi được email xác minh. Vui lòng kiểm tra cấu hình email và thử lại.", 503);
    }
    pendingUserId = null;
    return jsonResponse({ verificationRequired: true, message: "Đã gửi email xác minh. Hãy mở hộp thư và bấm liên kết để kích hoạt tài khoản." }, 202);
  } catch (error) {
    if (pendingUserId) await env.DB.prepare("DELETE FROM users WHERE id = ? AND email_verified = 0").bind(pendingUserId).run().catch(() => undefined);
    const message = error instanceof Error ? error.message : "unknown";
    console.error("Registration failed", { stage, error: message.slice(0, 240) });
    if (/daily row read limit|exceeded D1's free tier/i.test(message)) {
      return errorResponse("Hệ thống đăng ký đang tạm quá hạn mức dữ liệu hôm nay. Vui lòng thử lại sau khi hạn mức Cloudflare được làm mới.", 503);
    }
    return errorResponse("Không thể tạo tài khoản lúc này. Vui lòng thử lại.", 500);
  }
};
