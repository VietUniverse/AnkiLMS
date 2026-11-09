import type { Env } from "../../../types";
import { serveAudio } from "../../../_media";

const ROUNDS = new Set([102, 96, 91, 83, 64, 60, 52, 47, 41, 37, 36, 35]);

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  const file = String(params.file ?? "");
  const match = /^(\d+)-(\d+)_([12])-cbr\.mp3$/.exec(file);
  if (!match || match[1] !== match[2] || !ROUNDS.has(Number(match[1]))) return new Response("Not found", { status: 404 });
  return serveAudio(request, env, `topik-archive/data/audio/${file}`);
};
