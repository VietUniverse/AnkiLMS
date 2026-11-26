import { Env, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";
import { rateKey, recordAttempt } from "./_rateLimit";

const GENERIC_MESSAGE = "Nếu email có tài khoản HaechiVN, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return errorResponse("Chỉ chấp nhận nội dung JSON.", 415);
  if (request.headers.get("Origin") !== new URL(request.url).origin || !isSameOriginRequest(request) || request.headers.get("Sec-Fetch-Site") === "cross-site") return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (Number(request.headers.get("Content-Length") || 0) > 4096) return errorResponse("Nội dung gửi lên quá lớn.", 413);
  let email = "";
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return errorResponse("Yêu cầu không hợp lệ.", 400);
    email = typeof (body as { email?: unknown }).email === "string" ? (body as { email: string }).email.trim().toLowerCase() : "";
  } catch { return errorResponse("Yêu cầu không hợp lệ.", 400); }
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse("Vui lòng nhập email hợp lệ.");
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.SESSIONS) return errorResponse("Chức năng này tạm thời không khả dụng.", 503);
  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipAttempts = await recordAttempt(env, `reset-ip:${await rateKey(ip)}`, 3600);
    const emailAttempts = await recordAttempt(env, `reset-email:${await rateKey(email)}`, 3600);
    if (ipAttempts > 10 || emailAttempts > 3) return jsonResponse({ error: "Đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau." }, 429, { "Retry-After": "3600" });
    const user = await env.DB.prepare("SELECT id FROM users WHERE email = ? AND email_verified = 1").bind(email).first<{ id: string }>();
    if (!user) return jsonResponse({ message: GENERIC_MESSAGE }, 202);
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const tokenHash = await rateKey(token);
    const expiresAt = Math.floor(Date.now() / 1000) + 1200;
    await env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at < ?").bind(user.id, Math.floor(Date.now() / 1000)).run();
    await env.DB.prepare("INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(tokenHash, user.id, expiresAt).run();
    const site = new URL(env.SITE_URL || new URL(request.url).origin);
    const link = new URL("/reset-password", site);
    link.hash = `token=${token}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [email], subject: "Đặt lại mật khẩu HaechiVN", text: `Bạn đã yêu cầu đặt lại mật khẩu HaechiVN. Mở liên kết sau trong 20 phút:\n${link}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`, html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Đặt lại mật khẩu HaechiVN</h2><p>Liên kết chỉ có hiệu lực trong 20 phút.</p><p><a href="${link.toString()}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2563eb;color:white">Đặt lại mật khẩu</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p></div>` }),
    });
    if (!response.ok) {
      await env.DB.prepare("DELETE FROM password_reset_tokens WHERE token_hash = ?").bind(tokenHash).run();
      console.error("Password reset email delivery failed", { status: response.status });
      return errorResponse("Không gửi được email lúc này. Vui lòng thử lại sau.", 503);
    }
    return jsonResponse({ message: GENERIC_MESSAGE }, 202);
  } catch (error) {
    console.error("Password reset request failed", { error: error instanceof Error ? error.message : "unknown" });
    return errorResponse("Không thể xử lý yêu cầu lúc này.", 503);
  }
};
