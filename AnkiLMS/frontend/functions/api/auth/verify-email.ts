import { Env } from "../_utils";

function resultPage(title: string, body: string): Response {
  return new Response(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · HaechiVN</title><body style="margin:0;background:#0b1329;color:#f8fafc;font:16px Arial,sans-serif;display:grid;min-height:100vh;place-items:center"><main style="max-width:520px;margin:24px;padding:32px;border:1px solid #29416d;border-radius:20px;background:#111c38"><h1>${title}</h1><p>${body}</p><a href="/login" style="color:#60a5fa">Quay lại đăng nhập</a></main></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer" } });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const rawToken = new URL(request.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{64}$/.test(rawToken) || !env.SESSIONS) return resultPage("Liên kết không hợp lệ", "Liên kết xác minh không hợp lệ hoặc đã hết hạn. Hãy đăng ký lại để nhận liên kết mới.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
  const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const userId = await env.SESSIONS.get(`email_verify:${tokenHash}`);
  if (!userId) return resultPage("Liên kết đã hết hạn", "Liên kết xác minh không hợp lệ hoặc đã hết hạn. Hãy đăng ký lại để nhận liên kết mới.");
  return new Response(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xác minh email · HaechiVN</title><body style="margin:0;background:#0b1329;color:#f8fafc;font:16px Arial,sans-serif;display:grid;min-height:100vh;place-items:center"><main style="max-width:520px;margin:24px;padding:32px;border:1px solid #29416d;border-radius:20px;background:#111c38"><h1>Xác minh email HaechiVN</h1><p>Bấm xác nhận để kích hoạt tài khoản.</p><form method="post" action="/api/auth/verify-email"><input type="hidden" name="token" value="${rawToken}"><button style="padding:12px 20px;border:0;border-radius:10px;background:#2563eb;color:white;font-weight:bold">Xác nhận email</button></form></main></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer" } });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() !== "application/x-www-form-urlencoded" || request.headers.get("Origin") !== new URL(request.url).origin || Number(request.headers.get("Content-Length") || 0) > 2_048) {
    return resultPage("Yêu cầu không hợp lệ", "Hãy mở lại liên kết xác minh trong email.");
  }
  const form = new URLSearchParams(await request.text());
  const rawToken = form.get("token") || "";
  if (!/^[a-f0-9]{64}$/.test(rawToken) || !env.SESSIONS) return resultPage("Liên kết không hợp lệ", "Liên kết xác minh không hợp lệ hoặc đã hết hạn.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
  const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const key = `email_verify:${tokenHash}`;
  const userId = await env.SESSIONS.get(key);
  if (!userId) return resultPage("Liên kết đã hết hạn", "Liên kết xác minh không hợp lệ hoặc đã hết hạn.");
  await env.SESSIONS.delete(key);
  await env.DB.prepare("UPDATE users SET email_verified = 1 WHERE id = ? AND email_verified = 0").bind(userId).run();
  return Response.redirect(new URL("/login?email_verified=success", new URL(request.url).origin).toString(), 302);
};
