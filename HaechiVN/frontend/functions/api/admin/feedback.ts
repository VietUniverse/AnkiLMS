import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const result = await env.DB.prepare("SELECT f.id, f.category, f.message, f.status, f.created_at, u.email, u.name FROM feedback f JOIN users u ON u.id = f.user_id ORDER BY CASE f.status WHEN 'new' THEN 0 ELSE 1 END, f.created_at DESC LIMIT 200").all();
    return jsonResponse({ feedback: result.results || [] });
  } catch {
    return errorResponse("Không thể tải góp ý.", 500);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const body = (await request.json()) as { id?: string; status?: string };
    if (!body.id || !["new", "in_progress", "resolved"].includes(body.status || "")) return errorResponse("Trạng thái góp ý không hợp lệ.");
    const result = await env.DB.prepare("UPDATE feedback SET status = ? WHERE id = ?").bind(body.status, body.id).run();
    if (!result.meta.changes) return errorResponse("Không tìm thấy góp ý.", 404);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không thể cập nhật góp ý.", 500);
  }
};
