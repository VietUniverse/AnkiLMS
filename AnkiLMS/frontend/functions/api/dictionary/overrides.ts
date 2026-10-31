import { Env, errorResponse, jsonResponse } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const result = await env.DB.prepare(`SELECT hangul, vietnamese, english, japanese,
      part_of_speech AS partOfSpeech, topik, topic, is_deleted AS isDeleted
      FROM dictionary_overrides`).all();
    return jsonResponse({ entries: result.results || [] }, 200, { "Cache-Control": "public, max-age=60" });
  } catch {
    return errorResponse("Không tải được phần cập nhật từ điển.", 503);
  }
};
