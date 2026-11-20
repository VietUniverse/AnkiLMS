import { Env, authenticateRequest, errorResponse } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userId = new URL(request.url).searchParams.get("id")?.slice(0, 100);
  if (!userId) return errorResponse("Thiếu mã ảnh.", 400);
  try {
    const user = await env.DB.prepare("SELECT id, avatar_url, profile_public FROM users WHERE id = ?").bind(userId).first<{ id: string; avatar_url: string | null; profile_public: number }>();
    if (!user || !user.avatar_url?.startsWith("/api/profile/avatar")) return errorResponse("Không tìm thấy ảnh.", 404);
    if (!user.profile_public) {
      const viewer = await authenticateRequest(request, env);
      if (viewer?.id !== user.id) return errorResponse("Không tìm thấy ảnh.", 404);
    }
    const image = await env.MEDIA.get(`profile-avatars/${userId}/avatar`);
    if (!image) return errorResponse("Không tìm thấy ảnh.", 404);
    const contentType = image.httpMetadata?.contentType || "application/octet-stream";
    return new Response(image.body, { headers: {
      "Content-Type": contentType,
      "Content-Length": String(image.size),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch {
    return errorResponse("Không tải được ảnh đại diện.", 500);
  }
};
