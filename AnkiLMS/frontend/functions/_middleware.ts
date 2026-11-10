import { Env, authenticateAdminRequest, errorResponse } from "./api/_utils";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  if ((path === "/admin" || path === "/admin.html" || path.startsWith("/admin/")) && !await authenticateAdminRequest(request, env)) {
    return errorResponse("Không tìm thấy.", 404);
  }

  const isBookPath = path.startsWith("/sach/") || path.startsWith("/tieng-han/sach/");
  const isFlightRequest = request.headers.get("RSC") === "1"
    || request.headers.has("Next-Router-Prefetch")
    || url.searchParams.has("_rsc");
  // The interactive book lessons are static HTML exports, not Next server
  // routes. Returning their HTML for a Flight request makes React read an
  // incomplete RSC stream and report minified error #412.
  if (isBookPath && isFlightRequest) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Vary": "RSC, Next-Router-Prefetch",
      },
    });
  }

  // Keep one public URL for the interactive books while the exported lesson
  // assets remain in their existing storage folder. Rewrite internally so the
  // browser address, referrer, and CSP all use /sach/...
  if (path.startsWith("/tieng-han/sach/")) {
    url.pathname = path.replace(/^\/tieng-han\/sach\//, "/sach/");
    return Response.redirect(url.toString(), 301);
  }
  const assetRequest = path.startsWith("/sach/")
    ? new Request(new URL(path.replace(/^\/sach\//, "/tieng-han/sach/") + url.search, url.origin), request)
    : request;
  const response = await context.next(assetRequest);
  if (!response.headers.get("Content-Type")?.toLowerCase().includes("text/html")) return response;

  // The original book export includes its old base path in canonical/OG tags,
  // the Next hydration payload, and a small inline bootstrap. Normalize those
  // references too, so in-page navigation and crawlers consistently use /sach/.
  let htmlBody: BodyInit | null = response.body;
  if (path.startsWith("/sach/")) {
    const html = await response.text();
    htmlBody = html
      .replaceAll("/tieng-han/sach/", "/sach/")
      .replaceAll("\\/tieng-han\\/sach", "\\/sach")
      .replaceAll("https://www.haechivn.com/sach/", `${url.origin}/sach/`)
      .replaceAll("https://www.haechivn.com/tieng-han/sach/", `${url.origin}/sach/`);
  }

  // Static Next exports contain trusted inline bootstrap scripts. Nonce only
  // those script elements while streaming the HTML response through the edge.
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  // PixiJS checks `Function()` to decide whether WebGL shader generation is
  // available. Permit eval only on the interactive book runtime, under both
  // the canonical /sach URL and the legacy asset URL used by the static files.
  const isInteractiveBook = path.startsWith("/sach/") || path.startsWith("/tieng-han/sach/");
  const policy = [
    "default-src 'self'",
    // Static Next.js exports create same-origin chunk scripts at runtime. Keep
    // nonce protection for inline scripts while allowing those local chunks;
    // strict-dynamic makes browsers ignore 'self' and can block them when a
    // cached bootstrap carries a different nonce.
    `script-src 'self' 'nonce-${nonce}'${isInteractiveBook ? " 'unsafe-eval'" : ""}`,
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
  // Explicitly use only broadly supported directives. Older browser builds
  // otherwise report warnings for experimental ad-auction policy names.
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=(self)");
  headers.set("Cache-Control", "private, no-store");
  headers.delete("Content-Length");
  if (path.startsWith("/sach/")) headers.delete("Content-Encoding");
  const htmlResponse = new Response(htmlBody, { status: response.status, statusText: response.statusText, headers });
  const rewriter = new HTMLRewriter()
    .on("script", {
      element(element) { element.setAttribute("nonce", nonce); },
    });

  if (path.startsWith("/sach/")) {
    // These book lessons are static exports and do not have the Next RSC
    // payloads needed for client-side route transitions. Let links between
    // book pages perform a normal document navigation instead of asking React
    // to consume a missing RSC stream (which surfaces as minified React #412).
    rewriter.on("head", {
      element(element) {
        // Run before the exported Next runtime chunks: they are async and can
        // otherwise register Link prefetches before the navigation guard.
        element.prepend(`<script nonce="${nonce}">
          (() => {
            // These pages are standalone HTML exports. Their visible links
            // must navigate as documents; there is no matching App Router
            // route/Flight payload at /sach/* for Next's automatic prefetch.
            // Suppress only observer-based prefetching of lesson links while
            // leaving IntersectionObserver available to the rest of the UI.
            const NativeObserver = window.IntersectionObserver;
            if (NativeObserver) {
              window.IntersectionObserver = class extends NativeObserver {
                observe(target) {
                  if (target instanceof HTMLAnchorElement) {
                    try {
                      const destination = new URL(target.href, location.href);
                      if (destination.origin === location.origin &&
                          (destination.pathname.startsWith('/sach/') || destination.pathname.startsWith('/tieng-han/sach/'))) return;
                    } catch { /* Ignore malformed hrefs and preserve observer behavior. */ }
                  }
                  return super.observe(target);
                }
              };
            }

            const isBookLink = (event) => {
              const target = event.target;
              const anchor = target instanceof Element ? target.closest('a[href]') : null;
              if (!anchor) return false;
              try {
                const destination = new URL(anchor.href, location.href);
                return destination.origin === location.origin &&
                  (destination.pathname.startsWith('/sach/') || destination.pathname.startsWith('/tieng-han/sach/'));
              } catch { return false; }
            };

            // Next Link can prefetch on hover/touch independently of click.
            // Stop those synthetic events at capture so no broken RSC request
            // reaches the React Flight client and triggers error #412.
            for (const type of ['pointerover', 'mouseover', 'touchstart']) {
              document.addEventListener(type, (event) => {
                if (isBookLink(event)) event.stopImmediatePropagation();
              }, true);
            }

            document.addEventListener('click', (event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              const target = event.target;
              const anchor = target instanceof Element ? target.closest('a[href]') : null;
              if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
              let destination;
              try { destination = new URL(anchor.href, window.location.href); } catch { return; }
              if (destination.origin !== window.location.origin || !destination.pathname.startsWith('/sach/')) return;
              if (destination.pathname === window.location.pathname) return;
              event.preventDefault();
              event.stopImmediatePropagation();
              window.location.assign(destination.href);
            }, true);
          })();
        </script>`, { html: true });
      },
    });
  }

  return rewriter.transform(htmlResponse);
};
