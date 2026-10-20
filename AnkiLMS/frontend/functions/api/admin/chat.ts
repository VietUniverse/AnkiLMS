import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await authenticateAdminRequest(request, env))) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const result = await env.DB.prepare(
      "SELECT m.id, m.body, m.created_at AS createdAt, u.id AS userId, u.name, u.email FROM community_messages m JOIN users u ON u.id = m.user_id ORDER BY m.created_at DESC LIMIT 200",
    ).all();
    return jsonResponse({ messages: result.results || [] });
  } catch {
    return errorResponse("Không thể tải tin nhắn cộng đồng.", 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (!(await authenticateAdminRequest(request, env))) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id || id.length > 100) return errorResponse("Tin nhắn không hợp lệ.");
    const result = await env.DB.prepare("DELETE FROM community_messages WHERE id = ?").bind(id).run();
    if (!result.meta.changes) return errorResponse("Không tìm thấy tin nhắn.", 404);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không thể xóa tin nhắn.", 500);
  }
};
