import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

const MAX_DECK_BYTES = 10_000_000;
const MAX_CARDS = 10_000;
const MAX_REQUEST_BYTES = MAX_DECK_BYTES + 100_000;
type Row = { sharedId: string; deckId: string; title: string; description: string; visibility: "public" | "private"; cardCount: number; cardsKey: string; updatedAt: string; ownerId: string; ownerName: string; ownerEmail: string };
const SELECT = `SELECT d.shared_id AS sharedId, d.deck_id AS deckId, d.title, d.description, d.visibility, d.card_count AS cardCount,
  d.cards_key AS cardsKey, d.updated_at AS updatedAt, u.id AS ownerId, u.name AS ownerName, u.email AS ownerEmail
  FROM shared_decks d JOIN users u ON u.id=d.owner_id`;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được quản lý bộ từ Explore.", 403);
  const id = new URL(request.url).searchParams.get("id");
  try {
    if (id) {
      const row = await env.DB.prepare(`${SELECT} WHERE d.shared_id=?`).bind(id).first<Row>();
      if (!row) return errorResponse("Không tìm thấy bộ thẻ.", 404);
      const object = await env.MEDIA.get(row.cardsKey);
      if (!object) return errorResponse("Không đọc được dữ liệu thẻ trong kho lưu trữ.", 503);
      const { cardsKey: _key, ...deck } = row;
      return jsonResponse({ deck: { ...deck, cards: await object.json<unknown[]>() } });
    }
    const rows = await env.DB.prepare(`${SELECT} ORDER BY d.updated_at DESC LIMIT 1000`).all<Row>();
    return jsonResponse({ decks: (rows.results || []).map(({ cardsKey: _key, ...deck }) => deck) });
  } catch { return errorResponse("Không tải được các bộ từ Explore.", 500); }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được sửa bộ từ Explore.", 403);
  let nextKey = "";
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) return errorResponse("Bộ thẻ vượt quá giới hạn 10 MB.", 413);
    const body = JSON.parse(raw) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const deckId = typeof body.deckId === "string" ? body.deckId.trim().slice(0, 160) : "";
    const visibility = body.visibility;
    if (title.length < 2 || title.length > 120) return errorResponse("Tên bộ thẻ cần từ 2 đến 120 ký tự.");
    if (description.length > 1000) return errorResponse("Mô tả tối đa 1.000 ký tự.");
    if (visibility !== "public" && visibility !== "private") return errorResponse("Chọn quyền công khai hoặc riêng tư.");
    if (!Array.isArray(body.cards) || body.cards.length < 1 || body.cards.length > MAX_CARDS) return errorResponse(`Bộ thẻ cần có từ 1 đến ${MAX_CARDS.toLocaleString("vi-VN")} thẻ.`);
    const cards = body.cards.map((value, index) => {
      const c = value && typeof value === "object" ? value as Record<string, unknown> : {};
      const str = (key: string, max: number) => typeof c[key] === "string" ? (c[key] as string).slice(0, max) : "";
      const urls = (key: string) => Array.isArray(c[key]) ? (c[key] as unknown[]).filter((x): x is string => typeof x === "string" && /^https:\/\//i.test(x)).slice(0, 8) : [];
      return { id: Number.isSafeInteger(c.id) ? c.id : index + 1, noteId: Number.isSafeInteger(c.noteId) ? c.noteId : index + 1,
        deckName: title, frontHtml: str("frontHtml", 8000), backHtml: str("backHtml", 12000), frontText: str("frontText", 4000), backText: str("backText", 6000),
        fields: Array.isArray(c.fields) ? c.fields.filter((x): x is string => typeof x === "string").slice(0, 30).map((x) => x.slice(0, 8000)) : [],
        tags: Array.isArray(c.tags) ? c.tags.filter((x): x is string => typeof x === "string").slice(0, 30).map((x) => x.slice(0, 100)) : [],
        koreanText: str("koreanText", 4000), vietnameseMeaning: str("vietnameseMeaning", 6000), romanization: str("romanization", 1000), exampleSentence: str("exampleSentence", 8000),
        audioUrls: urls("audioUrls"), imageUrls: urls("imageUrls"), mediaRefs: [], dueDate: 0, interval: 0, reps: 0, lapses: 0, state: "new" as const };
    });
    const json = JSON.stringify(cards);
    if (new TextEncoder().encode(json).byteLength > MAX_DECK_BYTES) return errorResponse("Nội dung thẻ vượt quá giới hạn 10 MB.", 413);
    let sharedId = typeof body.sharedId === "string" ? body.sharedId.trim().slice(0, 80) : "";
    let previous: { owner_id: string; cards_key: string; shared_id: string } | null = null;
    if (sharedId) previous = await env.DB.prepare("SELECT shared_id, owner_id, cards_key FROM shared_decks WHERE shared_id=?").bind(sharedId).first<{ shared_id: string; owner_id: string; cards_key: string }>();
    else if (deckId.startsWith("catalog:")) previous = await env.DB.prepare("SELECT shared_id, owner_id, cards_key FROM shared_decks WHERE deck_id=? LIMIT 1").bind(deckId).first<{ shared_id: string; owner_id: string; cards_key: string }>();
    else if (deckId) previous = await env.DB.prepare("SELECT shared_id, owner_id, cards_key FROM shared_decks WHERE owner_id=? AND deck_id=?").bind(admin.id, deckId).first<{ shared_id: string; owner_id: string; cards_key: string }>();
    if (sharedId && !previous) return errorResponse("Không tìm thấy bộ thẻ.", 404);
    sharedId ||= previous?.shared_id || crypto.randomUUID();
    const ownerId = previous?.owner_id || admin.id;
    nextKey = `shared-decks/${ownerId}/${sharedId}/${crypto.randomUUID()}.json`;
    await env.MEDIA.put(nextKey, json, { httpMetadata: { contentType: "application/json; charset=utf-8" } });
    await env.DB.prepare(`INSERT INTO shared_decks (shared_id,owner_id,deck_id,title,description,visibility,card_count,cards_key)
      VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(shared_id) DO UPDATE SET deck_id=excluded.deck_id,title=excluded.title,description=excluded.description,
      visibility=excluded.visibility,card_count=excluded.card_count,cards_key=excluded.cards_key,updated_at=CURRENT_TIMESTAMP`)
      .bind(sharedId, ownerId, deckId || sharedId, title, description, visibility, cards.length, nextKey).run();
    if (previous?.cards_key) await env.MEDIA.delete(previous.cards_key);
    return jsonResponse({ success: true, sharedId, visibility });
  } catch {
    if (nextKey) await env.MEDIA.delete(nextKey).catch(() => undefined);
    return errorResponse("Không lưu được bộ thẻ lên máy chủ.", 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (!await authenticateAdminRequest(request, env)) return errorResponse("Chỉ quản trị viên mới được xóa bộ thẻ Explore.", 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 80) return errorResponse("Thiếu mã bộ thẻ hợp lệ.", 400);
  try {
    const row = await env.DB.prepare("SELECT cards_key AS cardsKey FROM shared_decks WHERE shared_id=?").bind(id).first<{ cardsKey: string }>();
    if (!row) return errorResponse("Không tìm thấy bộ thẻ.", 404);
    await env.DB.prepare("DELETE FROM shared_decks WHERE shared_id=?").bind(id).run();
    await env.MEDIA.delete(row.cardsKey);
    return jsonResponse({ success: true });
  } catch { return errorResponse("Không xóa được bộ thẻ.", 500); }
};
