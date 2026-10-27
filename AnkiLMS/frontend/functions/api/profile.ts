import { Env, authenticateRequest, errorResponse, isSameOriginRequest, jsonResponse } from "./_utils";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userId = new URL(request.url).searchParams.get("id")?.slice(0, 100);
  if (!userId) return errorResponse("Thiếu mã hồ sơ.", 400);
  try {
    const profile = await env.DB.prepare(
      `SELECT id, name, bio, avatar_url, profile_public, streak, longest_streak, xp, level,
              active_badge, active_frame, active_background, created_at
       FROM users WHERE id = ?`,
    ).bind(userId).first<any>();
    if (!profile) return errorResponse("Không tìm thấy hồ sơ này.", 404);
    const viewer = await authenticateRequest(request, env);
    if (!profile.profile_public && viewer?.id !== profile.id) return errorResponse("Hồ sơ này đang ở chế độ riêng tư.", 404);

    const [summary, days, sessions] = await Promise.all([
      env.DB.prepare(
        `SELECT COUNT(*) AS session_count, COALESCE(SUM(cards_reviewed), 0) AS cards_reviewed,
                COALESCE(SUM(correct_count), 0) AS correct_count, COALESCE(SUM(duration_seconds), 0) AS duration_seconds
         FROM study_sessions WHERE user_id = ?`,
      ).bind(userId).first(),
      env.DB.prepare(
        `SELECT checkin_date AS day, time_spent_minutes AS minutes, cards_reviewed AS cards
         FROM checkins WHERE user_id = ? AND checkin_date >= date('now', '-27 days') ORDER BY checkin_date ASC`,
      ).bind(userId).all(),
      env.DB.prepare(
        `SELECT module, cards_reviewed, correct_count, duration_seconds, created_at
         FROM study_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 8`,
      ).bind(userId).all(),
    ]);
    return jsonResponse({ profile, summary, days: days.results || [], sessions: sessions.results || [] });
  } catch {
    return errorResponse("Không tải được hồ sơ.", 500);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const user = await authenticateRequest(request, env);
  if (!user) return errorResponse("Đăng nhập để chỉnh sửa hồ sơ.", 401);
  try {
    const body = await request.json() as { name?: unknown; bio?: unknown; profilePublic?: unknown; translationLanguage?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";
    if (name.length < 2 || name.length > 32) return errorResponse("Tên hiển thị cần từ 2 đến 32 ký tự.");
    if (bio.length > 300) return errorResponse("Tiểu sử tối đa 300 ký tự.");
    if (typeof body.profilePublic !== "boolean") return errorResponse("Cài đặt quyền riêng tư không hợp lệ.");
    if (!["vi", "en", "ja"].includes(String(body.translationLanguage))) return errorResponse("Ngôn ngữ học không hợp lệ.");

    await env.DB.prepare("UPDATE users SET name = ?, bio = ?, profile_public = ?, translation_language = ? WHERE id = ?")
      .bind(name, bio || null, body.profilePublic ? 1 : 0, body.translationLanguage, user.id).run();
    const updated = await env.DB.prepare(
      `SELECT id, email, name, bio, avatar_url, profile_public, translation_language, streak, longest_streak, xp, gems, level,
              active_badge, active_frame, active_background, role, last_checkin_date
       FROM users WHERE id = ?`,
    ).bind(user.id).first();
    return jsonResponse({ success: true, user: updated });
  } catch {
    return errorResponse("Không thể lưu thay đổi hồ sơ.", 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const user = await authenticateRequest(request, env);
  if (!user) return errorResponse("Đăng nhập để đổi ảnh đại diện.", 401);
  const contentType = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return errorResponse("Chỉ nhận ảnh JPG, PNG hoặc WebP.", 415);
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 2_000_000) return errorResponse("Ảnh đại diện tối đa 2 MB.", 413);
  try {
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 2_000_000) return errorResponse("Ảnh đại diện tối đa 2 MB.", 413);
    const data = new Uint8Array(bytes);
    const valid = contentType === "image/jpeg"
      ? data[0] === 0xff && data[1] === 0xd8 && data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9
      : contentType === "image/png"
        ? data.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => data[index] === value)
        : data.length >= 12 && String.fromCharCode(...data.slice(0, 4)) === "RIFF" && String.fromCharCode(...data.slice(8, 12)) === "WEBP";
    if (!valid) return errorResponse("Nội dung file không phải ảnh hợp lệ.", 415);
    const key = `profile-avatars/${user.id}/avatar`;
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType, cacheControl: "no-store" } });
    const avatarUrl = `/api/profile/avatar?id=${encodeURIComponent(user.id)}&v=${Date.now()}`;
    await env.DB.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").bind(avatarUrl, user.id).run();
    return jsonResponse({ success: true, user: { avatar_url: avatarUrl } });
  } catch {
    return errorResponse("Không tải được ảnh đại diện lên.", 500);
  }
};
