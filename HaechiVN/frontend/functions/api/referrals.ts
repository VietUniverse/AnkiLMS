import { Env, authenticateRequest, errorResponse, jsonResponse } from "./_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Đăng nhập để lấy liên kết mời bạn.", 401);
    const result = await env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE referred_by = ?").bind(user.id).first<{ total: number }>();
    const base = env.SITE_URL || new URL(request.url).origin;
    const inviteUrl = new URL("/", base);
    inviteUrl.searchParams.set("ref", user.id);
    return jsonResponse({ inviteUrl: inviteUrl.toString(), referralCount: Number(result?.total || 0) });
  } catch {
    return errorResponse("Không tải được thông tin giới thiệu.", 500);
  }
};
