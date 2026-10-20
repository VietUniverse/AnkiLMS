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
