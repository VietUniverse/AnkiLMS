import type { Env } from "./types";

const AUDIO_HEADERS = {
  "Accept-Ranges": "bytes",
  "Cache-Control": "public, max-age=31536000, immutable",
  "Content-Type": "audio/mpeg",
  "X-Content-Type-Options": "nosniff",
};

/** Stream an allowlisted R2 audio object and support browser byte-range seeks. */
export async function serveAudio(request: Request, env: Env, key: string): Promise<Response> {
  const metadata = await env.MEDIA.head(key);
  if (!metadata) return new Response("Not found", { status: 404 });

  const headers = new Headers(AUDIO_HEADERS);
  headers.set("Content-Length", String(metadata.size));
  if (request.method === "HEAD") return new Response(null, { headers });

  const rangeHeader = request.headers.get("Range");
  if (!rangeHeader) {
    const object = await env.MEDIA.get(key);
    if (!object) return new Response("Not found", { status: 404 });
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", "audio/mpeg");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", AUDIO_HEADERS["Cache-Control"]);
    return new Response(object.body, { headers });
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2])) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${metadata.size}` } });
  }

  let start: number;
  let end: number;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${metadata.size}` } });
    }
    start = Math.max(0, metadata.size - suffixLength);
    end = metadata.size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : metadata.size - 1;
  }

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= metadata.size || end < start) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${metadata.size}` } });
  }
  end = Math.min(end, metadata.size - 1);
  const length = end - start + 1;
  const object = await env.MEDIA.get(key, { range: { offset: start, length } });
  if (!object) return new Response("Not found", { status: 404 });

  object.writeHttpMetadata(headers);
  headers.set("Content-Type", "audio/mpeg");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", AUDIO_HEADERS["Cache-Control"]);
  headers.set("Content-Length", String(length));
  headers.set("Content-Range", `bytes ${start}-${end}/${metadata.size}`);
  return new Response(object.body, { status: 206, headers });
}
