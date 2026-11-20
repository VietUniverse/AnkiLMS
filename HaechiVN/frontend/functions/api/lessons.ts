import { Env, errorResponse, jsonResponse } from "./_utils";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const [result, hidden] = await Promise.all([env.DB.prepare(
      "SELECT id, title, lesson_type AS lessonType, level, description, korean_text AS koreanText, vietnamese_text AS vietnameseText, source_url AS sourceUrl, created_at AS createdAt FROM managed_lessons WHERE is_published = 1 ORDER BY created_at DESC LIMIT 300",
    ).all(), env.DB.prepare("SELECT lesson_id AS id FROM lesson_visibility WHERE is_published = 0").all<{ id: string }>()]);
    return jsonResponse({ lessons: result.results || [], hiddenLessonIds: (hidden.results || []).map((row) => row.id) });
  } catch {
    return errorResponse("Không thể tải thư viện bài học.", 500);
  }
};
