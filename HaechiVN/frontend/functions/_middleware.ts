import { Env, authenticateAdminRequest, errorResponse } from "./api/_utils";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Give visitors on the former domain time to read the move notice.
  if (url.hostname === "lms.ankivn.com") {
    // Keep the former origin available for a manual, read-only browser-data
    // export. Browser storage cannot be accessed from haechivn.com.
    if (path === "/recover-progress.html" || path === "/recover-progress") return context.next();
    const destination = new URL(path + url.search, "https://haechivn.com").toString();
    if (path === "/api/auth/callback") return context.next();
    const isPage = (request.method === "GET" || request.method === "HEAD")
      && !path.startsWith("/api/") && !path.startsWith("/_next/")
      && !/\.[a-z0-9]{1,8}$/i.test(path);
    if (!isPage) return Response.redirect(destination, 308);
    const safeDestination = destination.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
    const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="8;url=${safeDestination}"><title>HaechiVN đã chuyển tên miền</title><style>body{font-family:system-ui,sans-serif;background:#0b1733;color:#fff;min-height:100vh;display:grid;place-items:center;margin:0;padding:24px;box-sizing:border-box}main{max-width:560px;text-align:center}h1{font-size:2rem}p{line-height:1.6;color:#cbd5e1}a{display:inline-block;margin-top:16px;padding:14px 22px;border-radius:12px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700}</style></head><body><main><h1>HaechiVN đã chuyển sang haechivn.com</h1><p>Trang học hiện có địa chỉ mới. Bạn sẽ được chuyển sau 8 giây. Khi sang trang mới, vui lòng đăng nhập lại.</p><a href="${safeDestination}">Đến haechivn.com ngay</a></main></body></html>`;
    return new Response(request.method === "HEAD" ? null : html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
  }

  if ((path === "/admin" || path === "/admin.html" || path.startsWith("/admin/")) && !await authenticateAdminRequest(request, env)) {
    return errorResponse("Không tìm thấy.", 404);
  }

  // The interactive lessons are published as real static files at /sach/*.
  // Keep old links working with a redirect; never rewrite their responses at
  // the edge because that makes Next's serialized route disagree with the URL.
  if (path === "/tieng-han/sach" || path.startsWith("/tieng-han/sach/")) {
    url.pathname = path.replace(/^\/tieng-han\/sach(?=\/|$)/, "/sach");
    return Response.redirect(url.toString(), 301);
  }

  // These lessons are static HTML, not App Router pages. Returning HTML for a
  // Flight request makes Next try to hydrate a document as an RSC stream.
  const isBookPath = path === "/sach" || path.startsWith("/sach/");
  const isStaticLessonHtml = /^\/sach\/so-cap-[12]\/[^/]+/.test(path) && !path.endsWith(".txt");
  const isFlightRequest = request.headers.get("RSC") === "1"
    || request.headers.has("Next-Router-Prefetch")
    || url.searchParams.has("_rsc");
  if (isStaticLessonHtml && isFlightRequest) {
    return new Response("Static lesson pages do not provide an RSC payload.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Vary": "RSC, Next-Router-Prefetch",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const response = await context.next();
  if (!response.headers.get("Content-Type")?.toLowerCase().includes("text/html")) return response;

  // Nonce trusted inline scripts while preserving the CSP protections.
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'nonce-${nonce}' https://www.googletagmanager.com https://static.cloudflareinsights.com${isBookPath ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com https://*.googleusercontent.com https://www.google-analytics.com https://www.googletagmanager.com",
    "font-src 'self' data:",
    "connect-src 'self' https://www.youtube.com https://*.googlevideo.com https://translate.googleapis.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.doubleclick.net https://cloudflareinsights.com",
    "frame-src 'self' blob: https://www.youtube.com https://www.youtube-nocookie.com https://accounts.google.com",
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
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=(self)");
  headers.set("Cache-Control", "private, no-store");
  headers.delete("Content-Length");
  const htmlResponse = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  return new HTMLRewriter()
    .on("script", { element(element) { element.setAttribute("nonce", nonce); } })
    .transform(htmlResponse);
};
