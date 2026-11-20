// Dán vào Console của trang /admin (đã đăng nhập bằng user giả role admin), rồi bấm "Làm mới dữ liệu".
// Không cần reload; chỉ giả lập dữ liệu để xem giao diện.
(() => {
  const j = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "Content-Type": "application/json" } });
  const users = Array.from({ length: 8 }, (_, i) => ({ id: "u" + i, email: `hocvien${i}@example.com`, name: `Học viên ${i + 1}`, role: i === 0 ? "admin" : i < 3 ? "teacher" : "student", xp: 120 * i, gems: 5, streak: i, created_at: "2026-09-0" + (i + 1), decks: i, studySessions: i * 3, lastStudied: i % 2 ? "2026-10-30T10:00:00Z" : null }));
  const routes = {
    "/api/admin/overview": { users: 128, students: 110, teachers: 17, classes: 9, posts: 42, pendingFeedback: 5 },
    "/api/admin/users": { users },
    "/api/admin/decks": { decks: Array.from({ length: 4 }, (_, i) => ({ userId: "u" + i, deckId: "deck-" + i, cardCount: 40 + i, updatedAt: "2026-10-30T09:00:00Z", name: "Học viên " + i, email: `hocvien${i}@example.com` })) },
    "/api/admin/feedback": { feedback: [{ id: "f1", category: "Lỗi", message: "Nút Thêm không hoạt động.", status: "new", created_at: "2026-10-30T09:00:00Z", email: "a@example.com", name: "An" }] },
    "/api/admin/community": { posts: [{ id: "p1", title: "Mẹo học TOPIK", body: "Học mỗi ngày 20 từ.", category: "Mẹo", status: "published", created_at: "2026-10-29", name: "Bình", email: "b@example.com" }] },
    "/api/admin/lessons": { lessons: [{ id: "l1", title: "Chào hỏi cơ bản", lessonType: "both", level: "TOPIK 1", description: "Bài mở đầu", koreanText: "안녕하세요\n감사합니다", vietnameseText: "Xin chào\nCảm ơn", sourceUrl: "", isPublished: 1, createdAt: "2026-10-01" }], hiddenLessonIds: [] },
    "/api/admin/classes": { classes: [{ id: "c1", code: "KR101", name: "Lớp TOPIK 1", description: "Sáng thứ 2-4-6", createdAt: "2026-09-01", ownerName: "Cô Lan", ownerEmail: "lan@example.com", members: 24, assignments: 6 }] },
    "/api/admin/chat": { messages: [{ id: "m1", body: "Chào mọi người!", createdAt: "2026-10-30T08:00:00Z", userId: "u1", name: "Cường", email: "c@example.com" }] },
    "/api/admin/features": { features: {} },
    "/api/admin/content-decks": { decks: [{ sharedId: "s1", deckId: "admin-vocab-1", title: "Từ vựng TOPIK 1 chọn lọc", description: "100 từ thường gặp", visibility: "public", cardCount: 100, updatedAt: "2026-10-28" }] },
  };
  const orig = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.origin);
    return routes[url.pathname] && (!init || !init.method || init.method === "GET") ? Promise.resolve(j(routes[url.pathname])) : orig(input, init);
  };
  console.log("mock admin fetch ready — bấm 'Làm mới dữ liệu'");
})();
