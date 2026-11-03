import { Env, authenticateAdminRequest, errorResponse } from "./api/_utils";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const path = new URL(request.url).pathname;
  if ((path === "/admin" || path === "/admin.html" || path.startsWith("/admin/")) && !await authenticateAdminRequest(request, env)) {
    return errorResponse("Không tìm thấy.", 404);
  }

  const response = await context.next();
  if (!response.headers.get("Content-Type")?.toLowerCase().includes("text/html")) return response;

  // Static Next exports contain trusted inline bootstrap scripts. Nonce only
  // those script elements while streaming the HTML response through the edge.
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  const policy = [
    "default-src 'self'",
    // Static Next.js exports create same-origin chunk scripts at runtime. Keep
    // nonce protection for inline scripts while allowing those local chunks;
    // strict-dynamic makes browsers ignore 'self' and can block them when a
    // cached bootstrap carries a different nonce.
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com https://*.googleusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self' https://www.youtube.com https://*.googlevideo.com https://translate.googleapis.com",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://accounts.google.com",
    "media-src 'self' blob: https://*.googlevideo.com",
    "worker-src 'self' blob:",
    "form-action 'self' https://accounts.google.com",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
    "report-uri /api/csp-report",
  ].join("; ");
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", policy);
  headers.set("Cache-Control", "private, no-store");
  headers.delete("Content-Length");
  const htmlResponse = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  return new HTMLRewriter().on("script", {
    element(element) { element.setAttribute("nonce", nonce); },
  }).transform(htmlResponse);
};
