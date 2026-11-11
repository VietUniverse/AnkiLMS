import { Env, authenticateAdminRequest, errorResponse } from "./api/_utils";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

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
    `script-src 'self' 'nonce-${nonce}'${isBookPath ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com https://*.googleusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self' https://www.youtube.com https://*.googlevideo.com https://translate.googleapis.com https://stats.g.doubleclick.net",
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
