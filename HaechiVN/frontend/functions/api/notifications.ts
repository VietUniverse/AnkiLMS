import { Env, authenticateRequest, errorResponse, jsonResponse } from "./_utils";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

async function listNotifications(env: Env, userId: string) {
  const rows = await env.DB.prepare(
    `SELECT id, kind, title, body, link, read_at AS readAt, created_at AS createdAt
     FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
  )
    .bind(userId)
    .all<NotificationRow>();
  return rows.results || [];
}

async function countUnread(env: Env, userId: string) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL")
    .bind(userId).first<{ count: number }>();
  return row?.count || 0;
}

/** GET /api/notifications — danh sách + số chưa đọc. POST — đánh dấu đã đọc ({ id } hoặc { all: true }). */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await authenticateRequest(context.request, context.env);
  if (!user) return errorResponse("Bạn cần đăng nhập.", 401);
  const [notifications, unread] = await Promise.all([listNotifications(context.env, user.id), countUnread(context.env, user.id)]);
  return jsonResponse({ notifications, unread });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = await authenticateRequest(context.request, context.env);
  if (!user) return errorResponse("Bạn cần đăng nhập.", 401);
  const body = await context.request.json().catch(() => ({})) as { id?: string; all?: boolean };
  if (body.all) {
    await context.env.DB.prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL")
      .bind(user.id)
      .run();
  } else if (typeof body.id === "string" && body.id) {
    await context.env.DB.prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?")
      .bind(body.id, user.id)
      .run();
  } else {
    return errorResponse("Thiếu thông báo cần đánh dấu.");
  }
  const [notifications, unread] = await Promise.all([listNotifications(context.env, user.id), countUnread(context.env, user.id)]);
  return jsonResponse({ success: true, notifications, unread });
};
