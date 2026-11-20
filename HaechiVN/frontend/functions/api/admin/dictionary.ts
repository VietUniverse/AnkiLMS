import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

const MAX_TEXT = 2000;
const clean = (value: unknown, max = MAX_TEXT) => typeof value === "string" ? value.trim().slice(0, max) : "";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được sửa từ điển.", 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    const hangul = clean(body.hangul, 120);
    const oldHangul = clean(body.oldHangul, 120);
    if (!hangul || !/[\uac00-\ud7a3]/u.test(hangul)) return errorResponse("Nhập từ tiếng Hàn bằng Hangul hợp lệ.");
    if (["vietnamese", "english", "japanese", "partOfSpeech", "topik", "topic"].some((key) => typeof body[key] === "string" && (body[key] as string).length > MAX_TEXT)) {
      return errorResponse("Một trường nội dung vượt quá 2.000 ký tự.");
    }
    const statements = [];
    if (oldHangul && oldHangul !== hangul) {
      statements.push(env.DB.prepare(`INSERT INTO dictionary_overrides
        (hangul,vietnamese,english,japanese,part_of_speech,topik,topic,is_deleted,updated_by,updated_at)
        VALUES (?, '', '', '', '', '', '', 1, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(hangul) DO UPDATE SET is_deleted=1,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
        .bind(oldHangul, admin.id));
    }
    statements.push(env.DB.prepare(`INSERT INTO dictionary_overrides
      (hangul,vietnamese,english,japanese,part_of_speech,topik,topic,is_deleted,updated_by,updated_at)
      VALUES (?,?,?,?,?,?,?,0,?,CURRENT_TIMESTAMP)
      ON CONFLICT(hangul) DO UPDATE SET vietnamese=excluded.vietnamese,english=excluded.english,
      japanese=excluded.japanese,part_of_speech=excluded.part_of_speech,topik=excluded.topik,
      topic=excluded.topic,is_deleted=0,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
      .bind(hangul, clean(body.vietnamese), clean(body.english), clean(body.japanese), clean(body.partOfSpeech, 100), clean(body.topik, 30), clean(body.topic, 200), admin.id));
    await env.DB.batch(statements);
    return jsonResponse({ success: true, hangul });
  } catch {
    return errorResponse("Không lưu được mục từ trên máy chủ.", 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được sửa từ điển.", 403);
  const hangul = new URL(request.url).searchParams.get("hangul")?.trim() || "";
  if (!hangul || hangul.length > 120) return errorResponse("Từ tiếng Hàn không hợp lệ.");
  try {
    await env.DB.prepare(`INSERT INTO dictionary_overrides
      (hangul,vietnamese,english,japanese,part_of_speech,topik,topic,is_deleted,updated_by,updated_at)
      VALUES (?, '', '', '', '', '', '', 1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(hangul) DO UPDATE SET is_deleted=1,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
      .bind(hangul, admin.id).run();
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không xóa được mục từ khỏi từ điển.", 500);
  }
};
