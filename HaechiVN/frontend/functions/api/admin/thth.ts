import { Env, authenticateAdminRequest, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

type ThthCard = {
  id: number | string;
  code?: string;
  word: string;
  meaning: string;
  pos?: string;
  transliteration?: string;
  explain?: string;
  image?: string;
  example?: string;
  example_translated?: string;
  collocation?: string;
  synonym?: string;
  antonym?: string;
  audio_word?: string;
  audio_meaning?: string;
  audio_example?: string;
  tag_1?: string;
  tag_2?: string;
  tag_3?: string;
  tag_4?: string;
  deckName?: string;
};

type ThthDeck = {
  id: string;
  name: string;
  book: number;
  topic: string;
  difficulty: string;
  cards: ThthCard[];
};

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

async function listAccessGrants(env: Env) {
  await ensureThthAccessTable(env);
  const rows = await env.DB.prepare(
    `SELECT a.id, a.target_type AS targetType, a.target_id AS targetId,
            a.book_number AS bookNumber, a.lesson_prefix AS lessonPrefix,
            a.created_at AS createdAt,
            u.name AS userName, u.email AS userEmail,
            c.name AS className, c.code AS classCode
     FROM thth_access a
     LEFT JOIN users u ON a.target_type = 'user' AND u.id = a.target_id
     LEFT JOIN classrooms c ON a.target_type = 'class' AND c.id = a.target_id
     ORDER BY a.created_at DESC LIMIT 500`,
  ).all();
  return rows.results || [];
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được truy cập.", 403);
  try {
    const grants = await listAccessGrants(env);
    return jsonResponse({ grants });
  } catch {
    return errorResponse("Không thể tải dữ liệu phân quyền Tiếng Hàn Tổng Hợp.", 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được tải media lên.", 403);

  const url = new URL(request.url);
  const file = (url.searchParams.get("file") || "").trim();
  if (!file || file.length > 260 || file.includes("..") || file.includes("/") || file.includes("\\")) {
    return errorResponse("Tên file media không hợp lệ.");
  }

  try {
    const contentType = (request.headers.get("Content-Type") || "application/octet-stream").split(";")[0].trim();
    const data = await request.arrayBuffer();
    if (data.byteLength < 1 || data.byteLength > 25_000_000) {
      return errorResponse("Dung lượng file media không hợp lệ (tối đa 25 MB).");
    }
    await env.MEDIA.put(`thth-media/files/${file}`, data, {
      httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
    });
    return jsonResponse({ success: true, file, url: `/api/thth-media?file=${encodeURIComponent(file)}` });
  } catch {
    return errorResponse("Không lưu được file media lên R2.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const admin = await authenticateAdminRequest(request, env);
  if (!admin) return errorResponse("Chỉ quản trị viên mới được quản lý Tiếng Hàn Tổng Hợp.", 403);

  try {
    await ensureThthAccessTable(env);
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "grant_access") {
      const targetType = body.targetType === "class" ? "class" : "user";
      let targetId = typeof body.targetId === "string" ? body.targetId.trim() : "";
      const bookNumber = Number(body.bookNumber ?? 0);
      const lessonPrefix = typeof body.lessonPrefix === "string" ? body.lessonPrefix.trim().slice(0, 120) : "";

      if (![0, 1, 2, 3, 4].includes(bookNumber)) {
        return errorResponse("Quyển sách không hợp lệ (chọn 0 cho tất cả hoặc Quyển 1–4).");
      }

      if (targetType === "user") {
        // Allow entering either user ID or user email
        const userRow = await env.DB.prepare("SELECT id FROM users WHERE id = ? OR LOWER(email) = LOWER(?) LIMIT 1")
          .bind(targetId, targetId)
          .first<{ id: string }>();
        if (!userRow) return errorResponse("Không tìm thấy học viên với ID hoặc email này.", 404);
        targetId = userRow.id;
      } else {
        // Allow entering either class ID or class code
        const classRow = await env.DB.prepare("SELECT id FROM classrooms WHERE id = ? OR UPPER(code) = UPPER(?) LIMIT 1")
          .bind(targetId, targetId)
          .first<{ id: string }>();
        if (!classRow) return errorResponse("Không tìm thấy lớp học với ID hoặc mã lớp này.", 404);
        targetId = classRow.id;
      }

      const id = `thth_acc_${crypto.randomUUID().replace(/-/g, "")}`;
      await env.DB.prepare(
        `INSERT INTO thth_access (id, target_type, target_id, book_number, lesson_prefix, granted_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(target_type, target_id, book_number, lesson_prefix) DO NOTHING`,
      ).bind(id, targetType, targetId, bookNumber, lessonPrefix, admin.id).run();

      return jsonResponse({ success: true, grants: await listAccessGrants(env) });
    }

    if (action === "revoke_access") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) return errorResponse("Mã phân quyền không hợp lệ.");
      await env.DB.prepare("DELETE FROM thth_access WHERE id = ?").bind(id).run();
      return jsonResponse({ success: true, grants: await listAccessGrants(env) });
    }

    if (action === "create_thth_class") {
      const bookNumber = Number(body.bookNumber || 1);
      if (![1, 2, 3, 4].includes(bookNumber)) return errorResponse("Chọn Quyển 1, 2, 3 hoặc 4.");
      const customName = typeof body.name === "string" && body.name.trim() ? body.name.trim() : `Lớp Tiếng Hàn Tổng Hợp - Quyển ${bookNumber}`;
      const customDesc = typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : `Lớp học chính thức giáo trình Tiếng Hàn Tổng Hợp Quyển ${bookNumber} (kèm âm thanh bản xứ và hình ảnh gốc).`;
      const autoAssignLessons = body.autoAssignLessons !== false;

      const classId = `cls_${crypto.randomUUID()}`;
      const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
      const accessId = `thth_acc_${crypto.randomUUID().replace(/-/g, "")}`;

      const statements = [
        env.DB.prepare("INSERT INTO classrooms (id, code, name, description, owner_id) VALUES (?, ?, ?, ?, ?)")
          .bind(classId, code, customName, customDesc, admin.id),
        env.DB.prepare("INSERT INTO classroom_members (class_id, user_id, role, status) VALUES (?, ?, 'owner', 'approved')")
          .bind(classId, admin.id),
        env.DB.prepare("INSERT INTO thth_access (id, target_type, target_id, book_number, lesson_prefix, granted_by) VALUES (?, 'class', ?, ?, '', ?)")
          .bind(accessId, classId, bookNumber, admin.id),
      ];

      if (autoAssignLessons) {
        const obj = await env.MEDIA.get("private-learning-data/thth-curriculum.json");
        if (obj) {
          const allDecks = await obj.json<ThthDeck[]>();
          const bookDecks = allDecks.filter((d) => Number(d.book) === bookNumber);
          // Group by Lesson (parts[2], e.g. "Bài 01")
          const lessonMap = new Map<string, ThthCard[]>();
          for (const d of bookDecks) {
            const parts = d.name.split("::");
            const lessonName = (parts[2] || d.topic || "Bài học").trim();
            const list = lessonMap.get(lessonName) || [];
            list.push(...(d.cards || []));
            lessonMap.set(lessonName, list);
          }
          let lessonIdx = 0;
          for (const [lessonTitle, cards] of lessonMap.entries()) {
            lessonIdx += 1;
            const trimmedCards = cards.slice(0, 500).map((c, idx) => ({
              id: Number.isSafeInteger(Number(c.id)) ? Number(c.id) : idx + 1,
              korean: String(c.word || "").replace(/<[^>]*>/g, "").trim(),
              meaning: String(c.meaning || "").replace(/<[^>]*>/g, "").trim(),
              word: c.word,
              pos: c.pos || "",
              transliteration: c.transliteration || "",
              explain: c.explain || "",
              image: c.image || "",
              example: c.example || "",
              example_translated: c.example_translated || "",
              collocation: c.collocation || "",
              synonym: c.synonym || "",
              antonym: c.antonym || "",
              audio_word: c.audio_word || "",
              audio_meaning: c.audio_meaning || "",
              audio_example: c.audio_example || "",
            }));
            if (trimmedCards.length === 0) continue;
            const asgId = `asg_${crypto.randomUUID().replace(/-/g, "")}`;
            const dueDate = new Date(Date.now() + (30 + lessonIdx * 3) * 86_400_000).toISOString().slice(0, 10);
            const fullTitle = `Quyển ${bookNumber} · ${lessonTitle}`;
            statements.push(
              env.DB.prepare("INSERT INTO class_assignments (id, class_id, title, deck_name, due_date, created_by, deck_json, total_cards) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                .bind(asgId, classId, fullTitle, fullTitle, dueDate, admin.id, JSON.stringify(trimmedCards), trimmedCards.length),
            );
          }
        }
      }

      await env.DB.batch(statements);
      return jsonResponse({ success: true, classId, code, grants: await listAccessGrants(env) });
    }

    if (action === "assign_to_class") {
      const classId = typeof body.classId === "string" ? body.classId.trim() : "";
      const bookNumber = Number(body.bookNumber || 1);
      const lessonPrefix = typeof body.lessonPrefix === "string" ? body.lessonPrefix.trim() : "";
      const deckId = typeof body.deckId === "string" ? body.deckId.trim() : "";
      const customTitle = typeof body.title === "string" ? body.title.trim() : "";
      const dueDate = typeof body.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)
        ? body.dueDate
        : new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

      if (!classId) return errorResponse("Vui lòng chọn lớp học.");
      const cls = await env.DB.prepare("SELECT id FROM classrooms WHERE id = ?").bind(classId).first<{ id: string }>();
      if (!cls) return errorResponse("Không tìm thấy lớp học.", 404);

      const obj = await env.MEDIA.get("private-learning-data/thth-curriculum.json");
      if (!obj) return errorResponse("Chưa có dữ liệu Tiếng Hàn Tổng Hợp trên R2.", 503);
      const allDecks = await obj.json<ThthDeck[]>();

      let matchedDecks: ThthDeck[] = [];
      if (deckId) {
        matchedDecks = allDecks.filter((d) => d.id === deckId);
      } else if (lessonPrefix) {
        matchedDecks = allDecks.filter((d) => Number(d.book) === bookNumber && (d.name.split("::")[2] || "").trim() === lessonPrefix);
      } else {
        matchedDecks = allDecks.filter((d) => Number(d.book) === bookNumber);
      }

      const rawCards = matchedDecks.flatMap((d) => d.cards || []).slice(0, 500);
      if (rawCards.length === 0) return errorResponse("Không tìm thấy thẻ nào trong mục đã chọn.");

      const seenIds = new Set<number>();
      const deckCards = rawCards.map((c, idx) => {
        let numericId = Number.isSafeInteger(Number(c.id)) ? Number(c.id) : idx + 1;
        while (seenIds.has(numericId)) numericId += 1;
        seenIds.add(numericId);
        return {
          id: numericId,
          korean: String(c.word || "").replace(/<[^>]*>/g, "").trim() || `Từ ${idx + 1}`,
          meaning: String(c.meaning || "").replace(/<[^>]*>/g, "").trim() || "Nghĩa",
          word: c.word,
          pos: c.pos || "",
          transliteration: c.transliteration || "",
          explain: c.explain || "",
          image: c.image || "",
          example: c.example || "",
          example_translated: c.example_translated || "",
          collocation: c.collocation || "",
          synonym: c.synonym || "",
          antonym: c.antonym || "",
          audio_word: c.audio_word || "",
          audio_meaning: c.audio_meaning || "",
          audio_example: c.audio_example || "",
          deckName: c.deckName || matchedDecks[0]?.name || `Tiếng Hàn Tổng Hợp ${bookNumber}`,
        };
      });

      const title = customTitle || (deckId ? matchedDecks[0]?.name.replaceAll("::", " · ") : lessonPrefix ? `Tiếng Hàn Tổng Hợp ${bookNumber} · ${lessonPrefix}` : `Tiếng Hàn Tổng Hợp · Quyển ${bookNumber}`);
      const asgId = `asg_${crypto.randomUUID().replace(/-/g, "")}`;
      await env.DB.prepare(
        "INSERT INTO class_assignments (id, class_id, title, deck_name, due_date, created_by, deck_json, total_cards) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(asgId, classId, title.slice(0, 120), title.slice(0, 160), dueDate, admin.id, JSON.stringify(deckCards), deckCards.length).run();

      return jsonResponse({ success: true, assignmentId: asgId, totalCards: deckCards.length });
    }

    if (action === "save_card") {
      const deckId = typeof body.deckId === "string" ? body.deckId.trim() : "";
      const cardData = body.card && typeof body.card === "object" ? body.card as Record<string, unknown> : null;
      if (!deckId || !cardData) return errorResponse("Thiếu thông tin bộ thẻ hoặc thẻ.");

      const obj = await env.MEDIA.get("private-learning-data/thth-curriculum.json");
      if (!obj) return errorResponse("Không tìm thấy dữ liệu Tiếng Hàn Tổng Hợp.", 404);
      const allDecks = await obj.json<ThthDeck[]>();
      const deckIndex = allDecks.findIndex((d) => d.id === deckId);
      if (deckIndex < 0) return errorResponse("Không tìm thấy chủ đề này.", 404);

      const deck = allDecks[deckIndex];
      const str = (k: string, max = 4000) => typeof cardData[k] === "string" ? (cardData[k] as string).trim().slice(0, max) : "";
      const word = str("word", 500);
      const meaning = str("meaning", 2000);
      if (!word || !meaning) return errorResponse("Từ tiếng Hàn và nghĩa tiếng Việt không được để trống.");

      const cardId = cardData.id !== undefined && cardData.id !== "" ? cardData.id as (number | string) : Date.now();
      const existingIdx = deck.cards.findIndex((c) => String(c.id) === String(cardId));

      const updatedCard: ThthCard = {
        ...(existingIdx >= 0 ? deck.cards[existingIdx] : {}),
        id: cardId,
        code: str("code", 120) || (existingIdx >= 0 ? deck.cards[existingIdx].code : `THTH-0${deck.book}-${Date.now().toString().slice(-5)}`),
        word,
        meaning,
        pos: str("pos", 200),
        transliteration: str("transliteration", 500),
        explain: str("explain", 2000),
        image: str("image", 1000),
        example: str("example", 2000),
        example_translated: str("example_translated", 2000),
        collocation: str("collocation", 1000),
        synonym: str("synonym", 1000),
        antonym: str("antonym", 1000),
        audio_word: str("audio_word", 500),
        audio_meaning: str("audio_meaning", 500),
        audio_example: str("audio_example", 500),
        deckName: deck.name,
      };

      if (existingIdx >= 0) {
        deck.cards[existingIdx] = updatedCard;
      } else {
        deck.cards.push(updatedCard);
      }

      await env.MEDIA.put("private-learning-data/thth-curriculum.json", JSON.stringify(allDecks), {
        httpMetadata: { contentType: "application/json; charset=utf-8" },
      });

      return jsonResponse({ success: true, card: updatedCard });
    }

    if (action === "delete_card") {
      const deckId = typeof body.deckId === "string" ? body.deckId.trim() : "";
      const cardId = body.cardId !== undefined ? String(body.cardId) : "";
      if (!deckId || !cardId) return errorResponse("Thiếu mã bộ thẻ hoặc mã thẻ.");

      const obj = await env.MEDIA.get("private-learning-data/thth-curriculum.json");
      if (!obj) return errorResponse("Không tìm thấy dữ liệu Tiếng Hàn Tổng Hợp.", 404);
      const allDecks = await obj.json<ThthDeck[]>();
      const deck = allDecks.find((d) => d.id === deckId);
      if (!deck) return errorResponse("Không tìm thấy chủ đề này.", 404);

      deck.cards = deck.cards.filter((c) => String(c.id) !== cardId);
      await env.MEDIA.put("private-learning-data/thth-curriculum.json", JSON.stringify(allDecks), {
        httpMetadata: { contentType: "application/json; charset=utf-8" },
      });
      return jsonResponse({ success: true });
    }

    if (action === "save_curriculum") {
      const decks = Array.isArray(body.decks) ? body.decks : null;
      if (!decks || decks.length === 0) return errorResponse("Dữ liệu giáo trình không hợp lệ.");
      await env.MEDIA.put("private-learning-data/thth-curriculum.json", JSON.stringify(decks), {
        httpMetadata: { contentType: "application/json; charset=utf-8" },
      });
      return jsonResponse({ success: true, deckCount: decks.length });
    }

    return errorResponse("Thao tác không được hỗ trợ.");
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Không thể xử lý yêu cầu.", 500);
  }
};
