export const onRequestPost: PagesFunction = async ({ request }) => {
  if (Number(request.headers.get("Content-Length") || 0) > 4096) return new Response(null, { status: 413 });
  try {
    const report = await request.json() as { [key: string]: unknown };
    const violation = (report["csp-report"] || report) as { [key: string]: unknown };
    console.warn("CSP violation", {
      directive: String(violation["violated-directive"] || "").slice(0, 100),
      blocked: String(violation["blocked-uri"] || "").slice(0, 200),
      document: String(violation["document-uri"] || "").slice(0, 200),
    });
  } catch {
    // Malformed browser reports do not affect page loads.
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
};
