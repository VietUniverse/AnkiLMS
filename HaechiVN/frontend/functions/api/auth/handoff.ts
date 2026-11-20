import { Env, errorResponse, isSameOriginRequest, jsonResponse, sessionCookie } from "../_utils";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (!env.SESSIONS) return errorResponse("Phiên đăng nhập không khả dụng. Vui lòng thử lại.", 503);

  let ticket = "";
  try {
    const body = await request.json() as { ticket?: unknown };
    if (typeof body.ticket !== "string" || !/^[a-f0-9]{64}$/i.test(body.ticket)) {
      return errorResponse("Mã bàn giao đăng nhập không hợp lệ.", 400);
    }
    ticket = body.ticket;
  } catch {
    return errorResponse("Yêu cầu đăng nhập không hợp lệ.", 400);
  }

  const key = `oauth_handoff:${ticket}`;
  const token = await env.SESSIONS.get(key);
  if (!token) return errorResponse("Mã đăng nhập đã hết hạn hoặc đã được dùng. Vui lòng thử lại.", 410);

  // Consume first; the ticket is short lived and must not be reusable.
  await env.SESSIONS.delete(key);
  return jsonResponse({ success: true }, 200, { "Set-Cookie": sessionCookie(token) });
};

export const onRequestOptions: PagesFunction<Env> = async () => jsonResponse({}, 200);
