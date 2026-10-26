import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
    const result = await env.DB.prepare(
      `SELECT u.id, u.email, u.name, u.role, u.xp, u.gems, u.streak, u.created_at,
              (SELECT COUNT(DISTINCT s.deck_id) FROM card_states s WHERE s.user_id = u.id) AS decks,
              (SELECT COUNT(*) FROM study_sessions s WHERE s.user_id = u.id) AS studySessions,
              (SELECT MAX(s.created_at) FROM study_sessions s WHERE s.user_id = u.id) AS lastStudied
       FROM users u
       WHERE (? = '' OR u.name LIKE ? OR u.email LIKE ?)
       ORDER BY u.created_at DESC LIMIT 500`,
    ).bind(q, `%${q}%`, `%${q}%`).all();
    return jsonResponse({ users: result.results || [] });
  } catch {
    return errorResponse("Không thể tải danh sách tài khoản.", 500);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const body = (await request.json()) as { userId?: string; role?: string };
    if (!body.userId || !["student", "teacher", "admin"].includes(body.role || "")) return errorResponse("Vai trò không hợp lệ.");
    if (body.userId === admin.id && body.role !== "admin") return errorResponse("Không thể tự gỡ quyền admin.", 409);
    const target = await env.DB.prepare("SELECT id, role FROM users WHERE id = ?").bind(body.userId).first<{ id: string; role: string }>();
    if (!target) return errorResponse("Không tìm thấy tài khoản.", 404);
    await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(body.role, body.userId).run();
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không thể cập nhật vai trò.", 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);

  const userId = new URL(request.url).searchParams.get("userId") || "";
  if (!userId || userId.length > 120) return errorResponse("Tài khoản không hợp lệ.");
  if (userId === admin.id) return errorResponse("Không thể xóa tài khoản quản trị đang đăng nhập.", 409);

  try {
    const target = await env.DB.prepare("SELECT id, role FROM users WHERE id = ?").bind(userId).first<{ id: string; role: string }>();
    if (!target) return errorResponse("Không tìm thấy tài khoản.", 404);
    if (target.role === "admin") return errorResponse("Hãy chuyển tài khoản khỏi vai trò admin trước khi xóa.", 409);

    const media = await env.DB.prepare(
      `SELECT m.assignment_id AS assignmentId, m.asset_id AS assetId
       FROM class_assignment_media m
       JOIN class_assignments a ON a.id = m.assignment_id
       LEFT JOIN classrooms c ON c.id = a.class_id
       WHERE a.created_by = ? OR c.owner_id = ?`,
    ).bind(userId, userId).all<{ assignmentId: string; assetId: string }>();

    // Batch runs atomically. Explicitly clear the non-cascading author/referral links;
    // the remaining personal and classroom records cascade from their owners.
    await env.DB.batch([
      env.DB.prepare("DELETE FROM managed_lessons WHERE created_by = ?").bind(userId),
      env.DB.prepare("DELETE FROM class_assignments WHERE created_by = ?").bind(userId),
      env.DB.prepare("DELETE FROM classrooms WHERE owner_id = ?").bind(userId),
      env.DB.prepare("UPDATE users SET referred_by = NULL WHERE referred_by = ?").bind(userId),
      env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId),
    ]);

    const assets = media.results || [];
    const cleanupResults = await Promise.allSettled(
      assets.map((asset) => env.MEDIA.delete(`class-assignments/${asset.assignmentId}/${asset.assetId}`)),
    );
    const failedMediaCleanup = cleanupResults.filter((result) => result.status === "rejected").length;
    return jsonResponse({ success: true, failedMediaCleanup });
  } catch {
    return errorResponse("Không thể xóa tài khoản và dữ liệu liên quan.", 500);
  }
};
