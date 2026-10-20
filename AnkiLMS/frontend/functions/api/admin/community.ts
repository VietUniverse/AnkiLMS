import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const result = await env.DB.prepare("SELECT p.id, p.title, p.body, p.category, p.status, p.created_at, u.name, u.email FROM community_posts p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 200").all();
    return jsonResponse({ posts: result.results || [] });
  } catch {
    return errorResponse("Không thể tải bài viết.", 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id || id.length > 100) return errorResponse("Bài viết không hợp lệ.");
    const result = await env.DB.prepare("DELETE FROM community_posts WHERE id = ?").bind(id).run();
    if (!result.meta.changes) return errorResponse("Không tìm thấy bài viết.", 404);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không thể xóa bài viết.", 500);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (!(await authenticateAdminRequest(request, env))) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const body = await request.json() as { id?: string; status?: string };
    if (!body.id || !["published", "hidden"].includes(body.status || "")) return errorResponse("Trạng thái bài viết không hợp lệ.");
    const result = await env.DB.prepare("UPDATE community_posts SET status = ? WHERE id = ?").bind(body.status, body.id).run();
    if (!result.meta.changes) return errorResponse("Không tìm thấy bài viết.", 404);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không thể cập nhật bài viết.", 500);
  }
};
