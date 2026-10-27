import { Env, authenticateRequest, errorResponse, isSameOriginRequest, jsonResponse } from "./_utils";

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const user = await authenticateRequest(request, env);
  if (!user) return errorResponse("Đăng nhập để lưu ngôn ngữ học.", 401);
  try {
    const body = await request.json() as { translationLanguage?: unknown };
    if (!["vi", "en", "ja"].includes(String(body.translationLanguage))) return errorResponse("Ngôn ngữ học không hợp lệ.");
    await env.DB.prepare("UPDATE users SET translation_language = ? WHERE id = ?")
      .bind(body.translationLanguage, user.id).run();
    return jsonResponse({ success: true, translation_language: body.translationLanguage });
  } catch {
    return errorResponse("Không lưu được ngôn ngữ học.", 500);
  }
};
