import { Env, jsonResponse, clearSessionCookie, getSessionToken, isSameOriginRequest, errorResponse } from "../_utils";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  try {
    const token = getSessionToken(request);
    if (token) await env.SESSIONS.delete(token);
  } catch {
    // Clear the browser cookie even if the session store is temporarily unavailable.
  }
  return jsonResponse({ success: true, message: "Đã đăng xuất" }, 200, { "Set-Cookie": clearSessionCookie(request) });
};
