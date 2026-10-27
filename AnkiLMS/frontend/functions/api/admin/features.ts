import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

const FEATURE_KEYS = new Set([
  "classes", "hangul", "lessons", "flashcards", "dictionary", "topics", "dictation", "shadowing", "listen",
  "games", "aiSpeaking", "topik", "missions", "leaderboard", "achievements", "community", "chat",
  "feedback", "rewards", "referrals", "pricing", "profile", "ankiImport",
]);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const entries = await Promise.all([...FEATURE_KEYS].map(async (key) => {
      const value = await env.SESSIONS.get(`haechivn:feature:${key}`);
      return [key, value === "false" ? false : true] as const;
    }));
    return jsonResponse({ features: Object.fromEntries(entries) });
  } catch {
    return errorResponse("Không tải được cấu hình tính năng.", 500);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const body = await request.json() as { key?: unknown; enabled?: unknown };
    if (typeof body.key !== "string" || !FEATURE_KEYS.has(body.key) || typeof body.enabled !== "boolean") {
      return errorResponse("Cấu hình tính năng không hợp lệ.");
    }
    await env.SESSIONS.put(`haechivn:feature:${body.key}`, String(body.enabled));
    return jsonResponse({ success: true, key: body.key, enabled: body.enabled });
  } catch {
    return errorResponse("Không thể lưu cấu hình tính năng.", 500);
  }
};
