import { Env, authenticateRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const after = Number(new URL(request.url).searchParams.get("after") || 0);
    const result = await env.DB.prepare(
      `SELECT m.id, m.body, m.created_at, u.id AS author_id, u.name AS author_name
       FROM community_messages m JOIN users u ON u.id = m.user_id
       WHERE (? = 0 OR m.created_at > datetime(?, 'unixepoch'))
       ORDER BY m.created_at DESC LIMIT 80`,
    ).bind(after, after).all();
    return jsonResponse({ messages: (result.results || []).reverse() });
  } catch {
    return errorResponse("Không tải được tin nhắn.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Đăng nhập để gửi tin nhắn.", 401);
    const body = (await request.json()) as { body?: string };
    const message = typeof body.body === "string" ? body.body.trim() : "";
    if (message.length < 1 || message.length > 500) return errorResponse("Tin nhắn có thể dài tối đa 500 ký tự.");

    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM community_messages WHERE user_id = ? AND created_at >= datetime('now', '-1 minute')",
    ).bind(user.id).first<{ total: number }>();
    if (Number(recent?.total || 0) >= 8) return errorResponse("Bạn gửi tin quá nhanh. Vui lòng chờ một chút.", 429);

    const id = `msg_${crypto.randomUUID()}`;
    await env.DB.prepare("INSERT INTO community_messages (id, user_id, body) VALUES (?, ?, ?)").bind(id, user.id, message).run();
    return jsonResponse({ message: { id, body: message, author_id: user.id, author_name: user.name, created_at: new Date().toISOString() } }, 201);
  } catch {
    return errorResponse("Không gửi được tin nhắn. Vui lòng thử lại.", 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Đăng nhập để xóa tin nhắn.", 401);
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id || id.length > 100) return errorResponse("Tin nhắn không hợp lệ.");
    const result = await env.DB.prepare("DELETE FROM community_messages WHERE id = ? AND user_id = ?").bind(id, user.id).run();
    if (!result.meta.changes) return errorResponse("Không tìm thấy tin nhắn của bạn.", 404);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không xóa được tin nhắn lúc này.", 500);
  }
};
