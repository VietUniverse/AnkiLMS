import { Env, errorResponse, jsonResponse } from "../_utils";

type Override = { sharedId: string; deckId: string; title: string; description: string; visibility: "public" | "private"; cardCount: number; cardsKey: string };
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const id = new URL(request.url).searchParams.get("id");
  try {
    if (id) {
      const row = await env.DB.prepare(`SELECT shared_id AS sharedId,deck_id AS deckId,title,description,visibility,card_count AS cardCount,cards_key AS cardsKey
        FROM shared_decks WHERE deck_id=? AND deck_id LIKE 'catalog:%' ORDER BY updated_at DESC LIMIT 1`).bind(`catalog:${id}`).first<Override>();
      if (!row || row.visibility !== "public") return errorResponse("Bộ thẻ Explore không khả dụng.", 404);
      const object = await env.MEDIA.get(row.cardsKey);
      if (!object) return errorResponse("Bộ thẻ chưa sẵn sàng.", 503);
      const { cardsKey: _key, ...deck } = row;
      return jsonResponse({ deck: { ...deck, cards: await object.json<unknown[]>() } }, 200, { "Cache-Control": "public, max-age=60, s-maxage=60" });
    }
    const result = await env.DB.prepare(`SELECT shared_id AS sharedId,deck_id AS deckId,title,description,visibility,card_count AS cardCount
      FROM shared_decks WHERE deck_id LIKE 'catalog:%'`).all<Omit<Override, "cardsKey">>();
    return jsonResponse({ overrides: result.results || [] }, 200, { "Cache-Control": "public, max-age=60, s-maxage=60" });
  } catch { return errorResponse("Không tải được cập nhật Explore.", 500); }
};
