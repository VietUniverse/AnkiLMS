import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await authenticateAdminRequest(request, env))) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const url = new URL(request.url);
    const classId = (url.searchParams.get("classId") || "").trim();
    if (classId) {
      const [cls, members, assignments] = await Promise.all([
        env.DB.prepare(
          `SELECT c.id, c.code, c.name, c.description, c.created_at AS createdAt,
                  u.id AS ownerId, u.name AS ownerName, u.email AS ownerEmail
           FROM classrooms c JOIN users u ON u.id = c.owner_id
           WHERE c.id = ?`,
        ).bind(classId).first(),
        env.DB.prepare(
          `SELECT u.id, u.name, u.email, cm.role, cm.status, cm.joined_at AS joinedAt, u.xp, u.streak
           FROM classroom_members cm JOIN users u ON u.id = cm.user_id
           WHERE cm.class_id = ? ORDER BY cm.status DESC, cm.joined_at ASC`,
        ).bind(classId).all(),
        env.DB.prepare(
          `SELECT a.id, a.title, a.deck_name AS deckName, a.due_date AS dueDate,
                  a.total_cards AS totalCards, a.created_at AS createdAt,
                  u.name AS assignedBy,
                  (SELECT COUNT(*) FROM assignment_progress p WHERE p.assignment_id = a.id AND p.completed_at IS NOT NULL) AS completedCount
           FROM class_assignments a JOIN users u ON u.id = a.created_by
           WHERE a.class_id = ? ORDER BY a.due_date ASC`,
        ).bind(classId).all(),
      ]);
      if (!cls) return errorResponse("Không tìm thấy lớp học.", 404);
      return jsonResponse({
        classroom: cls,
        members: members.results || [],
        assignments: assignments.results || [],
      });
    }

    const result = await env.DB.prepare(
      `SELECT c.id, c.code, c.name, c.description, c.created_at AS createdAt,
              u.id AS ownerId, u.name AS ownerName, u.email AS ownerEmail,
              COUNT(DISTINCT CASE WHEN cm.status = 'approved' THEN cm.user_id END) AS members,
              COUNT(DISTINCT CASE WHEN cm.status = 'pending' THEN cm.user_id END) AS pendingMembers,
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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "create") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      if (name.length < 2 || name.length > 120 || description.length > 1000) {
        return errorResponse("Tên lớp (2–120 ký tự) hoặc mô tả không hợp lệ.");
      }
      const id = `cls_${crypto.randomUUID()}`;
      const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO classrooms (id, code, name, description, owner_id) VALUES (?, ?, ?, ?, ?)")
          .bind(id, code, name, description, admin.id),
        env.DB.prepare("INSERT INTO classroom_members (class_id, user_id, role, status) VALUES (?, ?, 'owner', 'approved')")
          .bind(id, admin.id),
      ]);
      return jsonResponse({ success: true, id, code }, 201);
    }

    const classId = typeof body.classId === "string" ? body.classId.trim() : "";
    if (!classId) return errorResponse("Thiếu mã lớp học.");
    const cls = await env.DB.prepare("SELECT id, owner_id FROM classrooms WHERE id = ?").bind(classId).first<{ id: string; owner_id: string }>();
    if (!cls) return errorResponse("Không tìm thấy lớp học.", 404);

    if (action === "add_member") {
      const emailOrId = typeof body.userIdentifier === "string" ? body.userIdentifier.trim() : "";
      const role = ["student", "staff", "admin"].includes(String(body.role)) ? String(body.role) : "student";
      if (!emailOrId) return errorResponse("Vui lòng nhập email hoặc ID học viên.");
      const targetUser = await env.DB.prepare("SELECT id, name, email FROM users WHERE id = ? OR LOWER(email) = LOWER(?) LIMIT 1")
        .bind(emailOrId, emailOrId)
        .first<{ id: string; name: string; email: string }>();
      if (!targetUser) return errorResponse("Không tìm thấy tài khoản với email/ID này.", 404);
      await env.DB.prepare(
        `INSERT INTO classroom_members (class_id, user_id, role, status)
         VALUES (?, ?, ?, 'approved')
         ON CONFLICT(class_id, user_id) DO UPDATE SET status = 'approved', role = excluded.role`,
      ).bind(classId, targetUser.id, targetUser.id === cls.owner_id ? "owner" : role).run();
      return jsonResponse({ success: true });
    }

    if (action === "approve_member") {
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      if (!userId) return errorResponse("Thiếu mã thành viên.");
      await env.DB.prepare("UPDATE classroom_members SET status = 'approved' WHERE class_id = ? AND user_id = ?")
        .bind(classId, userId).run();
      return jsonResponse({ success: true });
    }

    if (action === "remove_member") {
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      if (!userId || userId === cls.owner_id) return errorResponse("Không thể xóa chủ lớp.");
      await env.DB.prepare("DELETE FROM classroom_members WHERE class_id = ? AND user_id = ?")
        .bind(classId, userId).run();
      return jsonResponse({ success: true });
    }

    if (action === "change_role") {
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      const role = typeof body.role === "string" ? body.role : "";
      if (!userId || userId === cls.owner_id || !["student", "staff", "admin"].includes(role)) {
        return errorResponse("Vai trò hoặc thành viên không hợp lệ.");
      }
      await env.DB.prepare("UPDATE classroom_members SET role = ? WHERE class_id = ? AND user_id = ?")
        .bind(role, classId, userId).run();
      return jsonResponse({ success: true });
    }

    if (action === "delete_assignment") {
      const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId.trim() : "";
      if (!assignmentId) return errorResponse("Thiếu mã bài tập.");
      const assets = await env.DB.prepare("SELECT asset_id AS id FROM class_assignment_media WHERE assignment_id = ?")
        .bind(assignmentId).all<{ id: string }>();
      await Promise.all((assets.results || []).map((asset) => env.MEDIA.delete(`class-assignments/${assignmentId}/${asset.id}`)));
      await env.DB.prepare("DELETE FROM class_assignments WHERE id = ? AND class_id = ?")
        .bind(assignmentId, classId).run();
      return jsonResponse({ success: true });
    }

    return errorResponse("Thao tác không hợp lệ.");
  } catch {
    return errorResponse("Không thể lưu thay đổi lớp học.", 500);
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
