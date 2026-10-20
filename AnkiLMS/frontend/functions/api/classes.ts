import { Env, authenticateRequest, errorResponse, isSameOriginRequest, jsonResponse } from "./_utils";

type ClassRole = "owner" | "admin" | "staff" | "student";

async function getClasses(env: Env, userId: string) {
  const memberships = await env.DB.prepare(
    `SELECT c.id, c.code, c.name, c.description, c.owner_id AS ownerId, owner.name AS ownerName,
            c.created_at AS createdAt, mine.status AS myStatus, mine.role AS myRole
     FROM classroom_members mine
     JOIN classrooms c ON c.id = mine.class_id
     JOIN users owner ON owner.id = c.owner_id
     WHERE mine.user_id = ? ORDER BY c.created_at DESC LIMIT 100`,
  ).bind(userId).all<any>();

  const classes = [];
  for (const cls of memberships.results || []) {
    const [membersResult, assignmentsResult] = await Promise.all([
      env.DB.prepare(
        `SELECT u.id, u.name, u.email, cm.role, cm.status, cm.joined_at AS joinedAt,
                u.xp, u.streak, GROUP_CONCAT(CASE WHEN ap.completed_at IS NOT NULL THEN ap.assignment_id END) AS completed
         FROM classroom_members cm JOIN users u ON u.id = cm.user_id
         LEFT JOIN class_assignments ca ON ca.class_id = cm.class_id
         LEFT JOIN assignment_progress ap ON ap.assignment_id = ca.id AND ap.user_id = cm.user_id
         WHERE cm.class_id = ? GROUP BY u.id ORDER BY cm.joined_at ASC`,
      ).bind(cls.id).all<any>(),
      env.DB.prepare(
        `SELECT a.id, a.title, a.deck_name AS deckName, a.due_date AS dueDate,
                a.total_cards AS totalCards, creator.name AS assignedBy,
                p.completed_at AS completedAt, p.reviewed_cards AS reviewedCards,
                p.correct_cards AS correctCards, p.last_studied_at AS lastStudiedAt
         FROM class_assignments a JOIN users creator ON creator.id = a.created_by
         LEFT JOIN assignment_progress p ON p.assignment_id = a.id AND p.user_id = ?
         WHERE a.class_id = ? ORDER BY a.due_date ASC`,
      ).bind(userId, cls.id).all<any>(),
    ]);
    const managerProgress = ["owner", "admin", "staff"].includes(cls.myRole)
      ? await env.DB.prepare(
          `SELECT p.assignment_id AS assignmentId, u.id AS studentId, u.name AS studentName,
                  p.reviewed_cards AS reviewedCards, p.total_cards AS totalCards,
                  p.correct_cards AS correctCards, p.last_studied_at AS lastStudiedAt,
                  p.completed_at AS completedAt
           FROM assignment_progress p
           JOIN class_assignments a ON a.id = p.assignment_id
           JOIN classroom_members cm ON cm.class_id = a.class_id AND cm.user_id = p.user_id
           JOIN users u ON u.id = p.user_id
           WHERE a.class_id = ? AND cm.status = 'approved' AND cm.role = 'student'
           ORDER BY u.name COLLATE NOCASE`,
        ).bind(cls.id).all<any>()
      : { results: [] as any[] };
    const members = (membersResult.results || []).map((member: any) => ({
      id: member.id, name: member.name, email: member.email, role: member.role as ClassRole,
      status: member.status, joinedAt: member.joinedAt, xp: member.xp || 0, streak: member.streak || 0,
      completedAssignments: member.completed ? member.completed.split(",") : [],
    }));
    classes.push({
      id: cls.id, code: cls.code, name: cls.name, description: cls.description,
      ownerId: cls.ownerId, ownerName: cls.ownerName, createdAt: cls.createdAt,
      members, assignments: (assignmentsResult.results || []).map((a: any) => ({
        id: a.id, title: a.title, deckName: a.deckName, dueDate: a.dueDate,
        totalCards: a.totalCards || 0, reviewedCards: a.reviewedCards || 0,
        correctCards: a.correctCards || 0, lastStudiedAt: a.lastStudiedAt,
        assignedBy: a.assignedBy, completed: Boolean(a.completedAt),
        progress: (managerProgress.results || []).filter((item: any) => item.assignmentId === a.id).map((item: any) => ({
          studentId: item.studentId, studentName: item.studentName,
          reviewedCards: item.reviewedCards || 0, totalCards: item.totalCards || a.totalCards || 0,
          correctCards: item.correctCards || 0, lastStudiedAt: item.lastStudiedAt,
          completed: Boolean(item.completedAt),
        })),
      })),
    });
  }
  return classes;
}

async function getMembership(env: Env, classId: string, userId: string) {
  return env.DB.prepare("SELECT role, status FROM classroom_members WHERE class_id = ? AND user_id = ?")
    .bind(classId, userId).first<{ role: ClassRole; status: "approved" | "pending" }>();
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await authenticateRequest(request, env);
  if (!user) return errorResponse("Vui lòng đăng nhập để xem lớp học.", 401);
  try {
    const url = new URL(request.url);
    const mediaAssignmentId = url.searchParams.get("media");
    const assetId = url.searchParams.get("asset");
    if (mediaAssignmentId || assetId) {
      if (!mediaAssignmentId || !assetId || !/^asg_[a-f0-9]{32}$/i.test(mediaAssignmentId) || !/^[a-f0-9]{32}$/i.test(assetId)) return errorResponse("Tệp media không hợp lệ.", 400);
      const media = await env.DB.prepare(
        `SELECT m.content_type AS contentType FROM class_assignment_media m
         JOIN class_assignments a ON a.id = m.assignment_id
         JOIN classroom_members cm ON cm.class_id = a.class_id AND cm.user_id = ? AND cm.status = 'approved'
         WHERE m.assignment_id = ? AND m.asset_id = ?`,
      ).bind(user.id, mediaAssignmentId, assetId).first<{ contentType: string }>();
      if (!media) return errorResponse("Không tìm thấy tệp media hoặc bạn không thuộc lớp này.", 404);
      const object = await env.MEDIA.get(`class-assignments/${mediaAssignmentId}/${assetId}`);
      if (!object) return errorResponse("Tệp media chưa tải lên hoặc đã bị xóa.", 404);
      return new Response(object.body, { headers: {
        "Content-Type": media.contentType,
        "Content-Length": String(object.size),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      } });
    }
    return jsonResponse({ classes: await getClasses(env, user.id) });
  } catch {
    return errorResponse("Không thể tải lớp học lúc này.", 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const user = await authenticateRequest(request, env);
  if (!user) return errorResponse("Vui lòng đăng nhập để tải media lên.", 401);
  const url = new URL(request.url);
  const classId = url.searchParams.get("classId") || "";
  const assignmentId = url.searchParams.get("assignmentId") || "";
  const assetId = url.searchParams.get("assetId") || "";
  if (!classId || !/^asg_[a-f0-9]{32}$/i.test(assignmentId) || !/^[a-f0-9]{32}$/i.test(assetId)) return errorResponse("Thông tin bài tập hoặc media không hợp lệ.");
  try {
    const [membership, asset] = await Promise.all([
      getMembership(env, classId, user.id),
      env.DB.prepare("SELECT m.size_bytes AS size, m.content_type AS contentType FROM class_assignment_media m JOIN class_assignments a ON a.id = m.assignment_id WHERE m.assignment_id = ? AND m.asset_id = ? AND a.class_id = ?")
        .bind(assignmentId, assetId, classId).first<{ size: number; contentType: string }>(),
    ]);
    if (!membership || membership.status !== "approved" || !["owner", "admin", "staff"].includes(membership.role)) return errorResponse("Chỉ nhân sự được phân quyền trong lớp mới được tải media lên.", 403);
    if (!asset) return errorResponse("Media không nằm trong bài tập này.", 404);
    if (asset.size > 25_000_000) return errorResponse("Dung lượng file vượt giới hạn.", 413);
    if ((request.headers.get("Content-Type") || "").split(";")[0].trim() !== asset.contentType) return errorResponse("Loại file media không khớp.", 415);
    const data = await request.arrayBuffer();
    if (data.byteLength !== asset.size) return errorResponse("Dung lượng file không khớp.", 400);
    await env.MEDIA.put(`class-assignments/${assignmentId}/${assetId}`, data, {
      httpMetadata: { contentType: asset.contentType, cacheControl: "private, max-age=3600" },
    });
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("Không tải được file media lên Cloudflare R2.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const user = await authenticateRequest(request, env);
  if (!user) return errorResponse("Vui lòng đăng nhập để thao tác với lớp học.", 401);

  try {
    const body = await request.json() as {
      action?: string; name?: string; description?: string; code?: string; classId?: string;
      memberId?: string; role?: string; title?: string; deckName?: string; dueDate?: string;
      assignmentId?: string; xpEarned?: number; cardId?: number; correct?: boolean;
      deckCards?: { id: number; korean: string; meaning: string; example?: string; pronunciation?: string; mediaAssetIds?: string[] }[];
      mediaAssets?: { id: string; filename: string; contentType: string; size: number }[];
    };

    if (body.action === "create") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      if (name.length < 2 || name.length > 80 || description.length > 500) return errorResponse("Tên lớp hoặc mô tả không hợp lệ.");
      const id = `cls_${crypto.randomUUID()}`;
      const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO classrooms (id, code, name, description, owner_id) VALUES (?, ?, ?, ?, ?)").bind(id, code, name, description, user.id),
        env.DB.prepare("INSERT INTO classroom_members (class_id, user_id, role, status) VALUES (?, ?, 'owner', 'approved')").bind(id, user.id),
      ]);
      return jsonResponse({ success: true, classes: await getClasses(env, user.id) }, 201);
    }

    if (body.action === "join") {
      const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      if (!/^[A-F0-9]{8}$/.test(code)) return errorResponse("Mã lớp không hợp lệ.");
      const classroom = await env.DB.prepare("SELECT id FROM classrooms WHERE code = ?").bind(code).first<{ id: string }>();
      if (!classroom) return errorResponse("Không tìm thấy lớp học với mã này.", 404);
      const existing = await getMembership(env, classroom.id, user.id);
      if (existing) return errorResponse(existing.status === "approved" ? "Bạn đã tham gia lớp này." : "Yêu cầu tham gia đang chờ duyệt.", 409);
      await env.DB.prepare("INSERT INTO classroom_members (class_id, user_id, role, status) VALUES (?, ?, 'student', 'pending')").bind(classroom.id, user.id).run();
      return jsonResponse({ success: true, classes: await getClasses(env, user.id) });
    }

    const classId = typeof body.classId === "string" ? body.classId : "";
    if (!classId || classId.length > 100) return errorResponse("Lớp học không hợp lệ.");
    const classroom = await env.DB.prepare("SELECT owner_id FROM classrooms WHERE id = ?").bind(classId).first<{ owner_id: string }>();
    if (!classroom) return errorResponse("Không tìm thấy lớp học.", 404);
    const membership = await getMembership(env, classId, user.id);
    if (!membership || membership.status !== "approved") return errorResponse("Bạn không có quyền thao tác với lớp này.", 403);
    const isManager = membership.role === "owner" || membership.role === "admin" || membership.role === "staff";

    if (body.action === "get_assignment") {
      if (!body.assignmentId) return errorResponse("Bài tập không hợp lệ.");
      const row = await env.DB.prepare(
        `SELECT a.id, a.title, a.deck_name AS deckName, a.due_date AS dueDate,
                a.total_cards AS totalCards, a.deck_json AS deckJson,
                p.reviewed_cards AS reviewedCards, p.correct_cards AS correctCards,
                p.last_studied_at AS lastStudiedAt, p.completed_at AS completedAt
         FROM class_assignments a LEFT JOIN assignment_progress p ON p.assignment_id = a.id AND p.user_id = ?
         WHERE a.id = ? AND a.class_id = ?`,
      ).bind(user.id, body.assignmentId, classId).first<any>();
      if (!row) return errorResponse("Không tìm thấy bài tập.", 404);
      let deckCards = [];
      try { deckCards = JSON.parse(row.deckJson || "[]"); } catch { deckCards = []; }
      const assetRows = await env.DB.prepare("SELECT asset_id AS id, content_type AS contentType FROM class_assignment_media WHERE assignment_id = ?")
        .bind(body.assignmentId).all<{ id: string; contentType: string }>();
      const assets = new Map((assetRows.results || []).map((asset) => [asset.id, asset]));
      deckCards = deckCards.map((card: any) => ({
        ...card,
        mediaHtml: (Array.isArray(card.mediaAssetIds) ? card.mediaAssetIds : []).flatMap((assetId: string) => {
          const asset = assets.get(assetId);
          if (!asset) return [];
          const src = `/api/classes?media=${encodeURIComponent(body.assignmentId!)}&asset=${encodeURIComponent(assetId)}`;
          if (asset.contentType.startsWith("image/")) return [`<img src="${src}" alt="" loading="lazy" class="max-h-72 rounded-xl object-contain" />`];
          if (asset.contentType.startsWith("audio/")) return [`<audio controls preload="none" src="${src}" class="my-2 max-w-full"></audio>`];
          return [];
        }).join(""),
      }));
      return jsonResponse({ assignment: { id: row.id, classId, title: row.title, deckName: row.deckName, dueDate: row.dueDate, totalCards: row.totalCards || deckCards.length, reviewedCards: row.reviewedCards || 0, correctCards: row.correctCards || 0, lastStudiedAt: row.lastStudiedAt, completed: Boolean(row.completedAt), deckCards } });
    }

    if (body.action === "delete_assignment") {
      if (!isManager || !body.assignmentId) return errorResponse("Bạn không có quyền xóa bài tập này.", 403);
      const assets = await env.DB.prepare("SELECT asset_id AS id FROM class_assignment_media WHERE assignment_id = ? AND EXISTS (SELECT 1 FROM class_assignments WHERE id = ? AND class_id = ?)")
        .bind(body.assignmentId, body.assignmentId, classId).all<{ id: string }>();
      await Promise.all((assets.results || []).map((asset) => env.MEDIA.delete(`class-assignments/${body.assignmentId}/${asset.id}`)));
      await env.DB.prepare("DELETE FROM class_assignments WHERE id = ? AND class_id = ?").bind(body.assignmentId, classId).run();
      return jsonResponse({ success: true, classes: await getClasses(env, user.id) });
    }

    if (body.action === "delete") {
      if (classroom.owner_id !== user.id) return errorResponse("Chỉ chủ lớp mới được xóa lớp.", 403);
      const mediaRows = await env.DB.prepare("SELECT m.assignment_id AS assignmentId, m.asset_id AS assetId FROM class_assignment_media m JOIN class_assignments a ON a.id = m.assignment_id WHERE a.class_id = ?")
        .bind(classId).all<{ assignmentId: string; assetId: string }>();
      await Promise.all((mediaRows.results || []).map((item) => env.MEDIA.delete(`class-assignments/${item.assignmentId}/${item.assetId}`)));
      await env.DB.prepare("DELETE FROM classrooms WHERE id = ?").bind(classId).run();
    } else if (body.action === "approve" || body.action === "remove" || body.action === "role") {
      if (!isManager || !body.memberId || body.memberId === classroom.owner_id) return errorResponse("Bạn không có quyền quản lý thành viên này.", 403);
      const target = await getMembership(env, classId, body.memberId);
      if (!target) return errorResponse("Không tìm thấy thành viên.", 404);
      if (body.action === "approve") {
        await env.DB.prepare("UPDATE classroom_members SET status = 'approved' WHERE class_id = ? AND user_id = ? AND status = 'pending'").bind(classId, body.memberId).run();
      } else if (body.action === "remove") {
        if (membership.role === "staff") return errorResponse("Giáo vụ không có quyền xóa thành viên khỏi lớp.", 403);
        await env.DB.prepare("DELETE FROM classroom_members WHERE class_id = ? AND user_id = ?").bind(classId, body.memberId).run();
      } else {
        if (classroom.owner_id !== user.id || !["admin", "staff", "student"].includes(body.role || "")) return errorResponse("Chỉ giáo viên chủ lớp mới được phân quyền nhân sự.", 403);
        await env.DB.prepare("UPDATE classroom_members SET role = ? WHERE class_id = ? AND user_id = ? AND status = 'approved'").bind(body.role, classId, body.memberId).run();
      }
    } else if (body.action === "assignment") {
      if (!isManager) return errorResponse("Chỉ quản trị lớp mới được giao bài.", 403);
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const deckName = typeof body.deckName === "string" ? body.deckName.trim() : "";
      const dueDate = typeof body.dueDate === "string" ? body.dueDate : "";
      const deckCards = Array.isArray(body.deckCards) ? body.deckCards : [];
      const mediaAssets = Array.isArray(body.mediaAssets) ? body.mediaAssets : [];
      if (title.length < 3 || title.length > 120 || !deckName || deckName.length > 160 || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return errorResponse("Thông tin bài tập chưa hợp lệ.");
      if (deckCards.length < 1 || deckCards.length > 500) return errorResponse("Bộ thẻ phải có từ 1 đến 500 thẻ để giao qua lớp.");
      if (mediaAssets.length > 2000) return errorResponse("Bộ thẻ có quá nhiều file media.");
      const assetIds = new Set<string>();
      let totalMediaBytes = 0;
      for (const asset of mediaAssets) {
        if (!/^[a-f0-9]{32}$/i.test(asset.id) || assetIds.has(asset.id) || typeof asset.filename !== "string" || asset.filename.length > 250 || !/^(image|audio)\/[a-z0-9.+-]+$/i.test(asset.contentType) || !Number.isSafeInteger(asset.size) || asset.size < 1 || asset.size > 25_000_000) return errorResponse("File media có định dạng hoặc dung lượng không hợp lệ.");
        assetIds.add(asset.id);
        totalMediaBytes += asset.size;
      }
      if (totalMediaBytes > 60_000_000) return errorResponse("Tổng dung lượng hình ảnh và âm thanh tối đa 60 MB cho mỗi bài.");
      const seenCards = new Set<number>();
      for (const card of deckCards) {
        if (!Number.isSafeInteger(card.id) || card.id < 0 || seenCards.has(card.id)) return errorResponse("Bộ thẻ có mã thẻ không hợp lệ hoặc bị trùng.");
        seenCards.add(card.id);
        if (typeof card.korean !== "string" || !card.korean.trim() || card.korean.length > 2000 || typeof card.meaning !== "string" || !card.meaning.trim() || card.meaning.length > 4000 || (card.example !== undefined && (typeof card.example !== "string" || card.example.length > 4000)) || (card.pronunciation !== undefined && (typeof card.pronunciation !== "string" || card.pronunciation.length > 300)) || (card.mediaAssetIds !== undefined && (!Array.isArray(card.mediaAssetIds) || card.mediaAssetIds.some((id: string) => typeof id !== "string" || !assetIds.has(id))))) return errorResponse("Nội dung trong bộ thẻ vượt giới hạn cho phép.");
      }
      const deckJson = JSON.stringify(deckCards);
      if (new TextEncoder().encode(deckJson).length > 1_000_000) return errorResponse("Nội dung bộ thẻ quá lớn để chia sẻ.");
      const assignmentId = typeof body.assignmentId === "string" && /^asg_[a-f0-9]{32}$/i.test(body.assignmentId) ? body.assignmentId : `asg_${crypto.randomUUID().replace(/-/g, "")}`;
      await env.DB.prepare("INSERT INTO class_assignments (id, class_id, title, deck_name, due_date, created_by, deck_json, total_cards) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(assignmentId, classId, title, deckName, dueDate, user.id, deckJson, deckCards.length).run();
      try {
        for (let index = 0; index < mediaAssets.length; index += 100) {
          const chunk = mediaAssets.slice(index, index + 100);
          await env.DB.batch(chunk.map((asset) => env.DB.prepare("INSERT INTO class_assignment_media (assignment_id, asset_id, filename, content_type, size_bytes) VALUES (?, ?, ?, ?, ?)")
            .bind(assignmentId, asset.id, asset.filename, asset.contentType, asset.size)));
        }
      } catch (error) {
        await env.DB.prepare("DELETE FROM class_assignments WHERE id = ? AND class_id = ?").bind(assignmentId, classId).run();
        throw error;
      }
    } else if (body.action === "review_card") {
      if (membership.role !== "student") return errorResponse("Chỉ tài khoản học sinh mới được ghi nhận tiến độ bài tập.", 403);
      if (!body.assignmentId || !Number.isSafeInteger(body.cardId) || typeof body.correct !== "boolean") return errorResponse("Tiến độ ôn thẻ không hợp lệ.");
      const assignment = await env.DB.prepare("SELECT id, total_cards AS totalCards, deck_json AS deckJson FROM class_assignments WHERE id = ? AND class_id = ?").bind(body.assignmentId, classId).first<{ id: string; totalCards: number; deckJson: string }>();
      if (!assignment) return errorResponse("Không tìm thấy bài tập.", 404);
      let deckCards: { id: number }[];
      try { deckCards = JSON.parse(assignment.deckJson || "[]"); } catch { return errorResponse("Không thể đọc bộ thẻ của bài tập.", 500); }
      if (!deckCards.some((card) => card.id === body.cardId)) return errorResponse("Thẻ này không thuộc bài tập được giao.", 403);
      await env.DB.prepare(
        `INSERT INTO class_assignment_card_progress (assignment_id, user_id, card_id, correct, reviewed_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(assignment_id, user_id, card_id) DO UPDATE SET
           correct = MAX(class_assignment_card_progress.correct, excluded.correct), reviewed_at = CURRENT_TIMESTAMP`,
      ).bind(body.assignmentId, user.id, body.cardId, body.correct ? 1 : 0).run();
      const counts = await env.DB.prepare(
        `SELECT COUNT(*) AS reviewedCards, COALESCE(SUM(correct), 0) AS correctCards, MAX(reviewed_at) AS lastStudiedAt
         FROM class_assignment_card_progress WHERE assignment_id = ? AND user_id = ?`,
      ).bind(body.assignmentId, user.id).first<{ reviewedCards: number; correctCards: number; lastStudiedAt: string | null }>();
      await env.DB.prepare(
        `INSERT INTO assignment_progress (assignment_id, user_id, xp_earned, reviewed_cards, total_cards, correct_cards, last_studied_at, completed_at)
         VALUES (?, ?, 0, ?, ?, ?, ?, CASE WHEN ? >= ? AND ? > 0 THEN CURRENT_TIMESTAMP ELSE NULL END)
         ON CONFLICT(assignment_id, user_id) DO UPDATE SET
           reviewed_cards = excluded.reviewed_cards, total_cards = excluded.total_cards,
           correct_cards = excluded.correct_cards, last_studied_at = excluded.last_studied_at,
           completed_at = CASE WHEN excluded.reviewed_cards >= excluded.total_cards AND excluded.total_cards > 0
             THEN COALESCE(assignment_progress.completed_at, CURRENT_TIMESTAMP) ELSE NULL END`,
      ).bind(body.assignmentId, user.id, counts?.reviewedCards || 0, assignment.totalCards || deckCards.length,
        counts?.correctCards || 0, counts?.lastStudiedAt, counts?.reviewedCards || 0,
        assignment.totalCards || deckCards.length, assignment.totalCards || deckCards.length).run();
      const totalCards = assignment.totalCards || deckCards.length;
      return jsonResponse({
        success: true,
        progress: {
          reviewedCards: counts?.reviewedCards || 0, totalCards,
          correctCards: counts?.correctCards || 0, lastStudiedAt: counts?.lastStudiedAt || null,
          completed: totalCards > 0 && (counts?.reviewedCards || 0) >= totalCards,
        },
      });
    } else {
      return errorResponse("Thao tác không được hỗ trợ.");
    }

    return jsonResponse({ success: true, classes: await getClasses(env, user.id) });
  } catch {
    return errorResponse("Không thể lưu thay đổi lớp học lúc này.", 500);
  }
};
