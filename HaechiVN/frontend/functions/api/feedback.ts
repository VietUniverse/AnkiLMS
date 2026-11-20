import { Env, authenticateRequest, errorResponse, isSameOriginRequest, jsonResponse } from "./_utils";

const CATEGORIES = new Set(["bug", "content", "idea", "other"]);

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Đăng nhập để gửi phản hồi.", 401);
    const body = (await request.json()) as { category?: string; message?: string };
    const category = typeof body.category === "string" ? body.category : "other";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!CATEGORIES.has(category)) return errorResponse("Loại phản hồi không hợp lệ.");
    if (message.length < 10 || message.length > 3_000) return errorResponse("Phản hồi cần có từ 10 đến 3.000 ký tự.");

    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM feedback WHERE user_id = ? AND created_at >= datetime('now', '-1 hour')",
    ).bind(user.id).first<{ total: number }>();
    if (Number(recent?.total || 0) >= 5) return errorResponse("Bạn đã gửi đủ phản hồi trong giờ này. Vui lòng thử lại sau.", 429);

    const id = `fb_${crypto.randomUUID()}`;
    await env.DB.prepare("INSERT INTO feedback (id, user_id, category, message) VALUES (?, ?, ?, ?)")
      .bind(id, user.id, category, message).run();
    return jsonResponse({ success: true, message: "Cảm ơn bạn đã gửi góp ý. Đội ngũ HaechiVN đã nhận được phản hồi." }, 201);
  } catch {
    return errorResponse("Không gửi được phản hồi lúc này. Vui lòng thử lại.", 500);
  }
};
