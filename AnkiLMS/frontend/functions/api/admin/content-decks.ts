import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";
import { onRequestPost as saveSharedDeck } from "../shared-decks";

type ContentDeckRow = {
  sharedId: string;
  deckId: string;
  title: string;
  description: string;
  visibility: "public" | "private";
  cardCount: number;
  cardsKey: string;
  updatedAt: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được quản lý bộ từ Explore.", 403);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  try {
    if (id) {
      const row = await env.DB.prepare(
        `SELECT shared_id AS sharedId, deck_id AS deckId, title, description, visibility,
          card_count AS cardCount, cards_key AS cardsKey, updated_at AS updatedAt
         FROM shared_decks WHERE shared_id = ? AND owner_id = ?`,
      ).bind(id, admin.id).first<ContentDeckRow>();
      if (!row) return errorResponse("Không tìm thấy bộ từ do tài khoản admin quản lý.", 404);
      const object = await env.MEDIA.get(row.cardsKey);
      if (!object) return errorResponse("Không đọc được dữ liệu thẻ trong kho lưu trữ.", 503);
      const { cardsKey: _cardsKey, ...deck } = row;
      return jsonResponse({ deck: { ...deck, cards: await object.json<unknown[]>() } });
    }

    const result = await env.DB.prepare(
      `SELECT shared_id AS sharedId, deck_id AS deckId, title, description, visibility,
        card_count AS cardCount, updated_at AS updatedAt
       FROM shared_decks WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 200`,
    ).bind(admin.id).all<Omit<ContentDeckRow, "cardsKey">>();
    return jsonResponse({ decks: result.results || [] });
  } catch {
    return errorResponse("Không tải được các bộ từ Explore.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được tạo hoặc sửa bộ từ Explore.", 403);
  // Reuse the shared-deck validator and R2/D1 persistence path after the
  // stricter administrator check. Admins remain the owner of their records.
  const sharedRequest = new Request(new URL("/api/shared-decks", request.url), request);
  return saveSharedDeck({ request: sharedRequest, env } as Parameters<typeof saveSharedDeck>[0]);
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được xóa bộ từ Explore.", 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 80) return errorResponse("Thiếu mã bộ thẻ hợp lệ.", 400);
  try {
    const row = await env.DB.prepare("SELECT cards_key AS cardsKey FROM shared_decks WHERE shared_id = ? AND owner_id = ?")
      .bind(id, admin.id).first<{ cardsKey: string }>();
    if (!row) return errorResponse("Không tìm thấy bộ từ do tài khoản admin quản lý.", 404);
    await env.DB.prepare("DELETE FROM shared_decks WHERE shared_id = ? AND owner_id = ?").bind(id, admin.id).run();
    await env.MEDIA.delete(row.cardsKey);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không xóa được bộ từ.", 500);
  }
};
