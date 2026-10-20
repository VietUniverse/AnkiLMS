import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await authenticateAdminRequest(request, env))) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const result = await env.DB.prepare(
      `SELECT c.id, c.code, c.name, c.description, c.created_at AS createdAt,
              u.id AS ownerId, u.name AS ownerName, u.email AS ownerEmail,
              COUNT(DISTINCT CASE WHEN cm.status = 'approved' THEN cm.user_id END) AS members,
              COUNT(DISTINCT a.id) AS assignments
       FROM classrooms c JOIN users u ON u.id = c.owner_id
       LEFT JOIN classroom_members cm ON cm.class_id = c.id
       LEFT JOIN class_assignments a ON a.class_id = c.id
       GROUP BY c.id ORDER BY c.created_at DESC LIMIT 300`,
    ).all();
    return jsonResponse({ classes: result.results || [] });
  } catch {
    return errorResponse("Không thể tải danh sách lớp.", 500);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (!(await authenticateAdminRequest(request, env))) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const body = await request.json() as { id?: string; name?: string; description?: string };
    const name = body.name?.trim() || "";
    const description = body.description?.trim() || "";
    if (!body.id || !name || name.length > 120 || description.length > 1000) return errorResponse("Tên lớp hoặc mô tả không hợp lệ.");
    const result = await env.DB.prepare("UPDATE classrooms SET name = ?, description = ? WHERE id = ?").bind(name, description, body.id).run();
    if (!result.meta.changes) return errorResponse("Không tìm thấy lớp.", 404);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không thể cập nhật lớp.", 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (!(await authenticateAdminRequest(request, env))) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id || id.length > 100) return errorResponse("Lớp không hợp lệ.");
    const media = await env.DB.prepare(
      "SELECT m.assignment_id AS assignmentId, m.asset_id AS assetId FROM class_assignment_media m JOIN class_assignments a ON a.id = m.assignment_id WHERE a.class_id = ?",
    ).bind(id).all<{ assignmentId: string; assetId: string }>();
    for (const asset of media.results || []) {
      await env.MEDIA.delete(`class-assignments/${asset.assignmentId}/${asset.assetId}`);
    }
    const result = await env.DB.prepare("DELETE FROM classrooms WHERE id = ?").bind(id).run();
    if (!result.meta.changes) return errorResponse("Không tìm thấy lớp.", 404);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không thể xóa lớp. Kiểm tra các dữ liệu đang liên kết.", 500);
  }
};
