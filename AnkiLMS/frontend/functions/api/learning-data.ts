import { Env, authenticateRequest, errorResponse } from "./_utils";

const PRIVATE_FILES = new Set([
  "dictionary-ko-multi.json",
  "dictionary-topic-vocab.json",
  "course-vocabulary.json",
  "seoul-1a.json",
  "thth-1.json",
]);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await authenticateRequest(request, env);
  if (!user) return errorResponse("Đăng nhập để xem học liệu.", 401);

  const name = new URL(request.url).searchParams.get("name") || "";
  if (!PRIVATE_FILES.has(name)) return errorResponse("Không tìm thấy học liệu.", 404);

  const object = await env.MEDIA.get(`private-learning-data/${name}`);
  if (!object) return errorResponse("Học liệu chưa sẵn sàng.", 503);

  return new Response(object.body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
};
