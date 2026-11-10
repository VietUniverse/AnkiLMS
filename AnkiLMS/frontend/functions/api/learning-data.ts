import { Env, authenticateRequest, errorResponse } from "./_utils";

const PRIVATE_FILES = new Set([
  "dictionary-ko-multi.json",
  "dictionary-topic-vocab.json",
  "course-vocabulary.json",
  "seoul-1a.json",
  "thth-1.json",
  "thth-curriculum.json",
  "dictation-learning-content.json",
]);
// Mở cho khách: dữ liệu bài kiểm tra và từ điển NIKL (CC BY-SA, xem THIRD_PARTY_DATA.md).
// course-vocabulary.json chưa có giấy phép tái bản nên vẫn bắt đăng nhập.
const PUBLIC_FILES = new Set(["seoul-1a.json", "thth-1.json", "dictionary-ko-multi.json", "dictionary-topic-vocab.json"]);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const name = new URL(request.url).searchParams.get("name") || "";
  const user = PUBLIC_FILES.has(name) ? null : await authenticateRequest(request, env);
  // Authenticate before validating the filename so anonymous callers cannot
  // distinguish existing private learning files from arbitrary names.
  if (!user && !PUBLIC_FILES.has(name)) return errorResponse("Đăng nhập để xem học liệu.", 401);
  if (!PRIVATE_FILES.has(name)) return errorResponse("Không tìm thấy học liệu.", 404);

  // The two-volume Tiếng Hàn Tổng Hợp collection is reserved for admins.
  if (name === "thth-curriculum.json" && user?.role !== "admin") return errorResponse("Không tìm thấy học liệu.", 404);

  const object = await env.MEDIA.get(`private-learning-data/${name}`);
  if (!object) return errorResponse("Học liệu chưa sẵn sàng.", 503);

  return new Response(object.body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": PUBLIC_FILES.has(name) ? "public, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
};
