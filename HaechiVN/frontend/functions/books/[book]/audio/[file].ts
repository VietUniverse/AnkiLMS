import type { Env } from "../../../types";
import { serveAudio } from "../../../_media";

const BOOK_PATTERN = /^[a-z0-9-]+$/;

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  const book = String(params.book ?? "");
  const file = String(params.file ?? "");
  if (!BOOK_PATTERN.test(book) || !/^[\p{L}\p{N}_. -]+\.mp3$/u.test(file) || file.includes("..")) return new Response("Not found", { status: 404 });
  return serveAudio(request, env, `books/${book}/audio/${file}`);
};
