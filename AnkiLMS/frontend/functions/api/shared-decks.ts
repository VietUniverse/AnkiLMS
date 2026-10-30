import { Env, authenticateRequest, errorResponse, isSameOriginRequest, jsonResponse } from "./_utils";

const MAX_DECK_BYTES = 10_000_000;
const MAX_CARDS = 10_000;
const MAX_REQUEST_BYTES = MAX_DECK_BYTES + 100_000;

type SharedDeckRow = {
  sharedId: string;
  deckId: string;
  title: string;
  description: string;
  visibility: "public" | "private";
  cardCount: number;
  cardsKey: string;
  userId: string;
  authorName: string;
  authorAvatar: string | null;
  authorBio: string | null;
};

function toRecord(row: SharedDeckRow, cards?: unknown[]) {
  return {
    sharedId: row.sharedId,
    deckId: row.deckId,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    cardCount: row.cardCount,
    ...(cards ? { cards } : {}),
    author: {
      userId: row.userId,
      name: row.authorName,
      avatar: row.authorAvatar || undefined,
      bio: row.authorBio || undefined,
    },
  };
}

const deckSelect = `SELECT d.shared_id AS sharedId, d.deck_id AS deckId, d.title, d.description, d.visibility,
  d.card_count AS cardCount, d.cards_key AS cardsKey, u.id AS userId,
  u.name AS authorName, u.avatar_url AS authorAvatar, u.bio AS authorBio
  FROM shared_decks d JOIN users u ON u.id = d.owner_id`;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const sharedId = url.searchParams.get("id");
  try {
    if (sharedId) {
      if (sharedId.length > 80) return errorResponse("Mã bộ thẻ không hợp lệ.", 400);
      const row = await env.DB.prepare(`${deckSelect} WHERE d.shared_id = ?`).bind(sharedId).first<SharedDeckRow>();
      if (!row) return errorResponse("Không tìm thấy bộ thẻ.", 404);
      const viewer = await authenticateRequest(request, env);
      if (row.visibility !== "public" && viewer?.id !== row.userId) return errorResponse("Không tìm thấy bộ thẻ.", 404);

      const object = await env.MEDIA.get(row.cardsKey);
      if (!object) return errorResponse("Dữ liệu bộ thẻ chưa sẵn sàng.", 503);
      const cards = await object.json<unknown[]>();
      return jsonResponse({ deck: toRecord(row, cards) }, 200, {
        "Cache-Control": row.visibility === "public" ? "public, max-age=60, s-maxage=60" : "private, no-store",
      });
    }

    if (url.searchParams.get("mine") === "1") {
      const viewer = await authenticateRequest(request, env);
      if (!viewer) return errorResponse("Đăng nhập để xem bộ thẻ đã lưu trên máy chủ.", 401);
      const result = await env.DB.prepare(`${deckSelect} WHERE d.owner_id = ? ORDER BY d.updated_at DESC LIMIT 200`)
        .bind(viewer.id).all<SharedDeckRow>();
      return jsonResponse({ decks: (result.results || []).map((row) => toRecord(row)) }, 200, { "Cache-Control": "private, no-store" });
    }

    const result = await env.DB.prepare(`${deckSelect} WHERE d.visibility = 'public' AND d.deck_id NOT LIKE 'catalog:%' ORDER BY d.updated_at DESC LIMIT 200`).all<SharedDeckRow>();
    return jsonResponse({ decks: (result.results || []).map((row) => toRecord(row)) }, 200, {
      "Cache-Control": "public, max-age=60, s-maxage=60",
    });
  } catch {
    return errorResponse("Không tải được thư viện bộ thẻ cộng đồng.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const user = await authenticateRequest(request, env);
  if (!user) return errorResponse("Đăng nhập để lưu bộ thẻ lên máy chủ.", 401);

  let newCardsKey: string | null = null;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) return errorResponse("Bộ thẻ vượt quá giới hạn dung lượng 10 MB.", 413);

    let body: { sharedId?: unknown; deckId?: unknown; title?: unknown; description?: unknown; visibility?: unknown; cards?: unknown };
    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch {
      return errorResponse("Dữ liệu bộ thẻ không hợp lệ.", 400);
    }
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const deckId = typeof body.deckId === "string" ? body.deckId.trim().slice(0, 160) : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const visibility = body.visibility;
    if (title.length < 2 || title.length > 120) return errorResponse("Tên bộ thẻ cần từ 2 đến 120 ký tự.");
    if (description.length > 1_000) return errorResponse("Mô tả bộ thẻ tối đa 1.000 ký tự.");
    if (visibility !== "public" && visibility !== "private") return errorResponse("Chọn quyền công khai hoặc riêng tư.");
    if (!Array.isArray(body.cards) || body.cards.length < 1 || body.cards.length > MAX_CARDS) {
      return errorResponse(`Bộ thẻ cần có từ 1 đến ${MAX_CARDS.toLocaleString("vi-VN")} thẻ.`);
    }

    const cards = body.cards.map((raw, index) => {
      const card = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      const cleanString = (key: string, max: number) => typeof card[key] === "string" ? (card[key] as string).slice(0, max) : "";
      const safeUrls = (key: string) => Array.isArray(card[key])
        ? (card[key] as unknown[]).filter((item): item is string => typeof item === "string" && /^https:\/\//i.test(item)).slice(0, 8)
        : [];
      return {
        id: Number.isSafeInteger(card.id) ? card.id : index + 1,
        noteId: Number.isSafeInteger(card.noteId) ? card.noteId : index + 1,
        deckName: title,
        frontHtml: cleanString("frontHtml", 8_000),
        backHtml: cleanString("backHtml", 12_000),
        frontText: cleanString("frontText", 4_000),
        backText: cleanString("backText", 6_000),
        fields: Array.isArray(card.fields) ? card.fields.filter((item): item is string => typeof item === "string").slice(0, 30).map((item) => item.slice(0, 8_000)) : [],
        tags: Array.isArray(card.tags) ? card.tags.filter((item): item is string => typeof item === "string").slice(0, 30).map((item) => item.slice(0, 100)) : [],
        koreanText: cleanString("koreanText", 4_000),
        vietnameseMeaning: cleanString("vietnameseMeaning", 6_000),
        exampleSentence: cleanString("exampleSentence", 8_000),
        audioUrls: safeUrls("audioUrls"),
        imageUrls: safeUrls("imageUrls"),
        mediaRefs: [],
        dueDate: 0,
        interval: 0,
        reps: 0,
        lapses: 0,
        state: "new" as const,
      };
    });

    const cardsJson = JSON.stringify(cards);
    if (new TextEncoder().encode(cardsJson).byteLength > MAX_DECK_BYTES) return errorResponse("Nội dung thẻ vượt quá giới hạn dung lượng 10 MB.", 413);

    let sharedId = typeof body.sharedId === "string" ? body.sharedId.trim().slice(0, 80) : "";
    let previous: { owner_id: string; cards_key: string; shared_id?: string } | null = null;
    if (sharedId) {
      previous = await env.DB.prepare("SELECT owner_id, cards_key FROM shared_decks WHERE shared_id = ?")
        .bind(sharedId).first<{ owner_id: string; cards_key: string }>();
      if (!previous || previous.owner_id !== user.id) return errorResponse("Bạn không có quyền sửa bộ thẻ này.", 403);
    } else {
      if (deckId) {
        previous = await env.DB.prepare("SELECT shared_id, owner_id, cards_key FROM shared_decks WHERE owner_id = ? AND deck_id = ?")
          .bind(user.id, deckId).first<{ shared_id: string; owner_id: string; cards_key: string }>();
      }
      if (previous) {
        sharedId = previous.shared_id || "";
      } else {
        sharedId = crypto.randomUUID();
      }
    }

    newCardsKey = `shared-decks/${user.id}/${sharedId}/${crypto.randomUUID()}.json`;
    await env.MEDIA.put(newCardsKey, cardsJson, { httpMetadata: { contentType: "application/json; charset=utf-8" } });

    await env.DB.prepare(
      `INSERT INTO shared_decks (shared_id, owner_id, deck_id, title, description, visibility, card_count, cards_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(shared_id) DO UPDATE SET deck_id = excluded.deck_id, title = excluded.title, description = excluded.description,
         visibility = excluded.visibility, card_count = excluded.card_count, cards_key = excluded.cards_key,
         updated_at = CURRENT_TIMESTAMP WHERE shared_decks.owner_id = excluded.owner_id`,
    ).bind(sharedId, user.id, deckId || sharedId, title, description, visibility, cards.length, newCardsKey).run();

    if (previous?.cards_key && previous.cards_key !== newCardsKey) await env.MEDIA.delete(previous.cards_key);
    return jsonResponse({ success: true, sharedId, visibility });
  } catch {
    if (newCardsKey) await env.MEDIA.delete(newCardsKey).catch(() => undefined);
    return errorResponse("Không lưu được bộ thẻ lên máy chủ.", 500);
  }
};
