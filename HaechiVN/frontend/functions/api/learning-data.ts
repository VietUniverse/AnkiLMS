import { Env, authenticateRequest, errorResponse } from "./_utils";

const PRIVATE_FILES = new Set([
  "dictionary-ko-multi.json",
  "dictionary-topic-vocab.json",
  "course-vocabulary.json",
  "seoul-1a.json",
  "thth-1.json",
  "thth-curriculum.json",
  "dictation-learning-content.json",
  "cracking-topik-writing.json",
]);
// Mở cho khách: dữ liệu bài kiểm tra và từ điển NIKL (CC BY-SA, xem THIRD_PARTY_DATA.md).
// course-vocabulary.json chưa có giấy phép tái bản nên vẫn bắt đăng nhập.
const PUBLIC_FILES = new Set(["seoul-1a.json", "thth-1.json", "dictionary-ko-multi.json", "dictionary-topic-vocab.json"]);

async function ensureThthAccessTable(env: Env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS thth_access (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL CHECK (target_type IN ('user', 'class')),
      target_id TEXT NOT NULL,
      book_number INTEGER NOT NULL CHECK (book_number IN (0, 1, 2, 3, 4)),
      lesson_prefix TEXT NOT NULL DEFAULT '',
      granted_by TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(target_type, target_id, book_number, lesson_prefix)
    )`,
  ).run().catch(() => undefined);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const name = new URL(request.url).searchParams.get("name") || "";
  const user = PUBLIC_FILES.has(name) ? null : await authenticateRequest(request, env);
  // Authenticate before validating the filename so anonymous callers cannot
  // distinguish existing private learning files from arbitrary names.
  if (!user && !PUBLIC_FILES.has(name)) return errorResponse("Đăng nhập để xem học liệu.", 401);
  if (!PRIVATE_FILES.has(name)) return errorResponse("Không tìm thấy học liệu.", 404);

  // Bộ thẻ Cracking the TOPIK II Writing: bảo mật chỉ dành riêng cho Admin
  if (name === "cracking-topik-writing.json") {
    if (!user || user.role !== "admin") return errorResponse("Chỉ quản trị viên mới được xem bộ thẻ này.", 403);
    const object = await env.MEDIA.get(`private-learning-data/${name}`);
    if (!object) return errorResponse("Học liệu chưa sẵn sàng trên R2.", 503);
    return new Response(object.body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  // Tiếng Hàn Tổng Hợp collection is managed by admins and shared via admin grants / classes.
  if (name === "thth-curriculum.json") {
    if (!user) return errorResponse("Đăng nhập để xem học liệu.", 401);
    const object = await env.MEDIA.get(`private-learning-data/${name}`);
    if (!object) return errorResponse("Học liệu chưa sẵn sàng.", 503);

    if (user.role === "admin") {
      return new Response(object.body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      });
    }

    await ensureThthAccessTable(env);
    const grants = await env.DB.prepare(
      `SELECT book_number AS bookNumber, lesson_prefix AS lessonPrefix
       FROM thth_access
       WHERE (target_type = 'user' AND target_id = ?)
          OR (target_type = 'class' AND target_id IN (
                SELECT class_id FROM classroom_members WHERE user_id = ? AND status = 'approved'
              ))`,
    ).bind(user.id, user.id).all<{ bookNumber: number; lessonPrefix: string }>().catch(() => ({ results: [] as { bookNumber: number; lessonPrefix: string }[] }));

    const rules = grants.results || [];
    if (rules.length === 0) {
      return new Response("[]", {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const allDecks = await object.json<Array<{ id: string; name: string; book: number; topic: string; difficulty: string; cards: unknown[] }>>();
    const allowedDecks = allDecks.filter((deck) =>
      rules.some((rule) => {
        const bookMatch = rule.bookNumber === 0 || rule.bookNumber === Number(deck.book);
        if (!bookMatch) return false;
        if (!rule.lessonPrefix) return true;
        const lessonPart = (deck.name.split("::")[2] || "").trim();
        return lessonPart.toLowerCase().startsWith(rule.lessonPrefix.trim().toLowerCase()) || deck.name.toLowerCase().includes(rule.lessonPrefix.trim().toLowerCase());
      }),
    );

    return new Response(JSON.stringify(allowedDecks), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

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
