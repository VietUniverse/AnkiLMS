import { Env, authenticateAdminRequest, errorResponse, jsonResponse } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const [users, students, teachers, classes, posts, pendingFeedback] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'student'").first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'teacher'").first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM classrooms").first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM community_posts WHERE status = 'published'").first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM feedback WHERE status = 'new'").first<{ count: number }>(),
    ]);
    return jsonResponse({ users: users?.count || 0, students: students?.count || 0, teachers: teachers?.count || 0, classes: classes?.count || 0, posts: posts?.count || 0, pendingFeedback: pendingFeedback?.count || 0 });
  } catch {
    return errorResponse("Không thể tải số liệu quản trị.", 500);
  }
};
