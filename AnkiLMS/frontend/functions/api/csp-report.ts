import type { Env } from "./_utils";
import { errorResponse } from "./_utils";
import { rateKey, recordAttempt } from "./auth/_rateLimit";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const contentType = request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/csp-report") return errorResponse("Chỉ chấp nhận báo cáo CSP.", 415);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return errorResponse("Yêu cầu không hợp lệ.", 403);

  try {
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    const attempts = await recordAttempt(env, `csp-ip:${await rateKey(clientIp)}`, 60);
    // CSP reports are fire-and-forget browser telemetry. Do not return 429:
    // browsers surface that response as a page error, which creates noise
    // without helping the user. The per-IP limiter still prevents D1 writes.
    if (attempts > 10) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    // Do not process or persist reports without the limiter. Returning 204
    // avoids browser retry noise when D1 is temporarily unavailable or over quota.
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  if (Number(request.headers.get("Content-Length") || 0) > 4096) return errorResponse("Nội dung gửi lên quá lớn.", 413);
  const reader = request.body?.getReader();
  if (!reader) return errorResponse("Báo cáo không hợp lệ.", 400);
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > 4096) {
        await reader.cancel();
        return errorResponse("Nội dung gửi lên quá lớn.", 413);
      }
      chunks.push(value);
    }
  } catch {
    return errorResponse("Báo cáo không hợp lệ.", 400);
  }
  const bodyBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const rawBody = new TextDecoder().decode(bodyBytes);

  try {
    const report = JSON.parse(rawBody) as { [key: string]: unknown };
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
