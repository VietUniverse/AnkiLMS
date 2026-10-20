import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await authenticateAdminRequest(request, env))) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const [result, hidden] = await Promise.all([env.DB.prepare(
      "SELECT id, title, lesson_type AS lessonType, level, description, korean_text AS koreanText, vietnamese_text AS vietnameseText, source_url AS sourceUrl, is_published AS isPublished, created_at AS createdAt FROM managed_lessons ORDER BY created_at DESC LIMIT 500",
    ).all(), env.DB.prepare("SELECT lesson_id AS id FROM lesson_visibility WHERE is_published = 0").all<{ id: string }>()]);
    return jsonResponse({ lessons: result.results || [], hiddenLessonIds: (hidden.results || []).map((row) => row.id) });
  } catch {
    return errorResponse("Không thể tải danh sách bài học.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const koreanText = typeof body.koreanText === "string" ? body.koreanText.trim() : "";
    const type = body.lessonType;
    const level = typeof body.level === "string" ? body.level.trim() : "TOPIK 1";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const vietnameseText = typeof body.vietnameseText === "string" ? body.vietnameseText.trim() : "";
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const lines = koreanText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!title || title.length > 160) return errorResponse("Tên bài học cần từ 1 đến 160 ký tự.");
    if (!['dictation', 'shadowing', 'both'].includes(String(type))) return errorResponse("Chọn loại bài Dictation, Shadowing hoặc cả hai.");
    if (!level || level.length > 40 || description.length > 1500) return errorResponse("Cấp độ hoặc mô tả không hợp lệ.");
    if (!lines.length || lines.length > 200 || lines.join("\n").length > 30000) return errorResponse("Bài cần có từ 1 đến 200 câu tiếng Hàn.");
    if (vietnameseText.split(/\r?\n/).filter(Boolean).length > 200 || vietnameseText.length > 30000) return errorResponse("Bản dịch không được vượt quá 200 dòng.");
    if (sourceUrl) {
      const url = new URL(sourceUrl);
      if (!['http:', 'https:'].includes(url.protocol)) return errorResponse("Link nguồn cần dùng HTTPS hoặc HTTP.");
    }
    const id = `ml_${crypto.randomUUID().replace(/-/g, '')}`;
    await env.DB.prepare(
      "INSERT INTO managed_lessons (id, title, lesson_type, level, description, korean_text, vietnamese_text, source_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(id, title, type, level, description, lines.join("\n"), vietnameseText, sourceUrl, admin.id).run();
    return jsonResponse({ success: true, id });
  } catch {
    return errorResponse("Không thể tạo bài học. Kiểm tra lại các trường đã nhập.", 400);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (!(await authenticateAdminRequest(request, env))) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    if (body.visibilityOnly === true) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || typeof body.isPublished !== "boolean") return errorResponse("Bài học hệ thống không hợp lệ.");
      if (body.isPublished) await env.DB.prepare("DELETE FROM lesson_visibility WHERE lesson_id = ?").bind(id).run();
      else await env.DB.prepare("INSERT INTO lesson_visibility (lesson_id, is_published) VALUES (?, 0) ON CONFLICT(lesson_id) DO UPDATE SET is_published = 0, updated_at = CURRENT_TIMESTAMP").bind(id).run();
      return jsonResponse({ success: true });
    }
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const koreanText = typeof body.koreanText === "string" ? body.koreanText.trim() : "";
    const type = body.lessonType;
    const level = typeof body.level === "string" ? body.level.trim() : "TOPIK 1";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const vietnameseText = typeof body.vietnameseText === "string" ? body.vietnameseText.trim() : "";
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const lines = koreanText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!/^ml_[a-f0-9]{32}$/i.test(id)) return errorResponse("Bài học không hợp lệ.");
    if (!title || title.length > 160) return errorResponse("Tên bài học cần từ 1 đến 160 ký tự.");
    if (!['dictation', 'shadowing', 'both'].includes(String(type))) return errorResponse("Chọn loại bài Dictation, Shadowing hoặc cả hai.");
    if (!level || level.length > 40 || description.length > 1500) return errorResponse("Cấp độ hoặc mô tả không hợp lệ.");
    if (!lines.length || lines.length > 200 || lines.join("\n").length > 30000) return errorResponse("Bài cần có từ 1 đến 200 câu tiếng Hàn.");
    if (vietnameseText.split(/\r?\n/).filter(Boolean).length > 200 || vietnameseText.length > 30000) return errorResponse("Bản dịch không được vượt quá 200 dòng.");
    if (sourceUrl) {
      const url = new URL(sourceUrl);
      if (!['http:', 'https:'].includes(url.protocol)) return errorResponse("Link nguồn cần dùng HTTPS hoặc HTTP.");
    }
    const result = await env.DB.prepare(
      "UPDATE managed_lessons SET title = ?, lesson_type = ?, level = ?, description = ?, korean_text = ?, vietnamese_text = ?, source_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(title, type, level, description, lines.join("\n"), vietnameseText, sourceUrl, id).run();
    if (!result.meta.changes) return errorResponse("Không tìm thấy bài học.", 404);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không thể cập nhật bài học. Kiểm tra lại các trường đã nhập.", 400);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (!(await authenticateAdminRequest(request, env))) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^ml_[a-f0-9]{32}$/i.test(id)) return errorResponse("Bài học không hợp lệ.");
    const result = await env.DB.prepare("DELETE FROM managed_lessons WHERE id = ?").bind(id).run();
    if (!result.meta.changes) return errorResponse("Không tìm thấy bài học.", 404);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không thể xóa bài học.", 500);
  }
};
