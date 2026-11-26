import { Env, errorResponse, hashPassword, isSameOriginRequest, jsonResponse } from "../_utils";
import { rateKey, recordAttempt } from "./_rateLimit";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return errorResponse("Chỉ chấp nhận nội dung JSON.", 415);
  if (request.headers.get("Origin") !== new URL(request.url).origin || !isSameOriginRequest(request) || request.headers.get("Sec-Fetch-Site") === "cross-site") return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (Number(request.headers.get("Content-Length") || 0) > 4096) return errorResponse("Nội dung gửi lên quá lớn.", 413);
  let token = "", password = "";
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return errorResponse("Yêu cầu không hợp lệ.", 400);
    const data = body as { token?: unknown; password?: unknown };
    token = typeof data.token === "string" ? data.token : "";
    password = typeof data.password === "string" ? data.password : "";
  } catch { return errorResponse("Yêu cầu không hợp lệ.", 400); }
  if (!/^[a-f0-9]{64}$/.test(token)) return errorResponse("Liên kết không hợp lệ hoặc đã hết hạn.", 400);
  if (password.length < 8 || password.length > 128) return errorResponse("Mật khẩu phải có từ 8 đến 128 ký tự.");
  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (await recordAttempt(env, `reset-submit:${await rateKey(ip)}`, 3600) > 20) return jsonResponse({ error: "Đã thử quá nhiều lần. Vui lòng thử lại sau." }, 429, { "Retry-After": "3600" });
    const tokenHash = await rateKey(token);
    const now = Math.floor(Date.now() / 1000);
    const newHash = await hashPassword(password);
    const claimed = await env.DB.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING user_id").bind(now, tokenHash, now).first<{ user_id: string }>();
    if (!claimed) return errorResponse("Liên kết không hợp lệ hoặc đã hết hạn.", 400);
    await env.DB.prepare("UPDATE users SET password_hash = ?, session_epoch = session_epoch + 1 WHERE id = ?").bind(newHash, claimed.user_id).run();
    await env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").bind(claimed.user_id).run();
    return jsonResponse({ message: "Đã đổi mật khẩu. Vui lòng đăng nhập lại." });
  } catch (error) {
    console.error("Password reset failed", { error: error instanceof Error ? error.message : "unknown" });
    return errorResponse("Không thể đặt lại mật khẩu lúc này.", 503);
  }
};
