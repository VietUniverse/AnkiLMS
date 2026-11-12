import type { Env } from "../types";

type PackEntry = [packIdx: number, offset: number, size: number, contentType: string];

let cachedIndex: Record<string, PackEntry> | null = null;
let cachedIndexAt = 0;
const INDEX_TTL_MS = 10 * 60 * 1000;

async function getMediaIndex(env: Env): Promise<Record<string, PackEntry> | null> {
  const now = Date.now();
  if (cachedIndex && now - cachedIndexAt < INDEX_TTL_MS) {
    return cachedIndex;
  }
  const obj = await env.MEDIA.get("thth-media/index.json");
  if (!obj) return null;
  const parsed = await obj.json<Record<string, PackEntry>>();
  cachedIndex = parsed;
  cachedIndexAt = now;
  return parsed;
}

export function invalidateThthMediaIndexCache() {
  cachedIndex = null;
  cachedIndexAt = 0;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const url = new URL(request.url);
  const rawFile = url.searchParams.get("file") || "";
  const file = rawFile.trim();
  if (!file || file.length > 260 || file.includes("..") || file.includes("/") || file.includes("\\")) {
    return new Response("Not found", { status: 404 });
  }

  const baseHeaders = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });

  try {
    // 1. Check custom/single override file first (uploaded via Admin UI)
    const customKey = `thth-media/files/${file}`;
    const customHead = await env.MEDIA.head(customKey);
    if (customHead) {
      const contentType = customHead.httpMetadata?.contentType || "application/octet-stream";
      baseHeaders.set("Content-Type", contentType);
      baseHeaders.set("Content-Length", String(customHead.size));
      if (request.method === "HEAD") return new Response(null, { headers: baseHeaders });
      const customObj = await env.MEDIA.get(customKey);
      if (!customObj) return new Response("Not found", { status: 404 });
      return new Response(customObj.body, { headers: baseHeaders });
    }

    // 2. Look up in packed media index
    const index = await getMediaIndex(env);
    const entry = index?.[file];
    if (!entry) {
      return new Response("Not found", { status: 404 });
    }

    const [packIdx, packOffset, totalSize, contentType] = entry;
    baseHeaders.set("Content-Type", contentType || "application/octet-stream");
    baseHeaders.set("Content-Length", String(totalSize));

    if (request.method === "HEAD") {
      return new Response(null, { headers: baseHeaders });
    }

    const packKey = `thth-media/pack-${packIdx}.bin`;
    const rangeHeader = request.headers.get("Range");

    if (!rangeHeader) {
      const object = await env.MEDIA.get(packKey, { range: { offset: packOffset, length: totalSize } });
      if (!object) return new Response("Not found", { status: 404 });
      return new Response(object.body, { status: 200, headers: baseHeaders });
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match || (!match[1] && !match[2])) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${totalSize}` } });
    }

    let start: number;
    let end: number;
    if (!match[1]) {
      const suffixLength = Number(match[2]);
      if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${totalSize}` } });
      }
      start = Math.max(0, totalSize - suffixLength);
      end = totalSize - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : totalSize - 1;
    }

    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= totalSize || end < start) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${totalSize}` } });
    }
    end = Math.min(end, totalSize - 1);
    const length = end - start + 1;

    const object = await env.MEDIA.get(packKey, { range: { offset: packOffset + start, length } });
    if (!object) return new Response("Not found", { status: 404 });

    baseHeaders.set("Content-Length", String(length));
    baseHeaders.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
    return new Response(object.body, { status: 206, headers: baseHeaders });
  } catch {
    return new Response("Internal error", { status: 500 });
  }
};
