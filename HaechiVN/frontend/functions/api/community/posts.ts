import { Env, authenticateRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

const CATEGORIES = new Set(["study", "question", "resource", "conversation"]);

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const result = await env.DB.prepare(
      `SELECT p.id, p.category, p.title, p.body, p.created_at, u.id AS author_id, u.name AS author_name
       FROM community_posts p JOIN users u ON u.id = p.user_id
       WHERE p.status = 'published' ORDER BY p.created_at DESC LIMIT 60`,
    ).all();
    return jsonResponse({ posts: result.results || [] });
  } catch {
    return errorResponse("Không tải được bài viết cộng đồng.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Đăng nhập để đăng bài trong cộng đồng.", 401);
    const body = (await request.json()) as { title?: string; body?: string; category?: string };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.body === "string" ? body.body.trim() : "";
    const category = typeof body.category === "string" ? body.category : "study";
    if (title.length < 5 || title.length > 120) return errorResponse("Tiêu đề cần có từ 5 đến 120 ký tự.");
    if (content.length < 10 || content.length > 3_000) return errorResponse("Nội dung cần có từ 10 đến 3.000 ký tự.");
    if (!CATEGORIES.has(category)) return errorResponse("Chủ đề bài viết không hợp lệ.");

    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM community_posts WHERE user_id = ? AND created_at >= datetime('now', '-1 hour')",
    ).bind(user.id).first<{ total: number }>();
    if (Number(recent?.total || 0) >= 5) return errorResponse("Bạn đã đăng đủ 5 bài trong giờ qua. Vui lòng thử lại sau.", 429);

    const id = `post_${crypto.randomUUID()}`;
    await env.DB.prepare(
      "INSERT INTO community_posts (id, user_id, category, title, body) VALUES (?, ?, ?, ?, ?)",
    ).bind(id, user.id, category, title, content).run();
    return jsonResponse({ post: { id, category, title, body: content, author_id: user.id, author_name: user.name, created_at: new Date().toISOString() } }, 201);
  } catch {
    return errorResponse("Không thể đăng bài lúc này. Vui lòng thử lại.", 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Đăng nhập để xóa bài viết.", 401);
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id || id.length > 100) return errorResponse("Bài viết không hợp lệ.");
    const result = await env.DB.prepare("DELETE FROM community_posts WHERE id = ? AND user_id = ?").bind(id, user.id).run();
    if (!result.meta.changes) return errorResponse("Không tìm thấy bài viết của bạn.", 404);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không xóa được bài viết lúc này.", 500);
  }
};
