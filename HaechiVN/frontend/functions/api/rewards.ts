import { Env, authenticateRequest, errorResponse, isSameOriginRequest, jsonResponse } from "./_utils";

export const REWARDS = [
  { id: "study_sprout", name: "Mầm học tập", description: "Huy hiệu khởi đầu cho hành trình tiếng Hàn.", cost: 100, icon: "🌱", kind: "badge", visual: "linear-gradient(135deg,#064e3b,#34d399,#a7f3d0)" },
  { id: "hangul_star", name: "Ngôi sao Hangeul", description: "Dành cho người bền bỉ luyện chữ Hàn.", cost: 200, icon: "⭐", kind: "badge", visual: "linear-gradient(135deg,#312e81,#818cf8,#f0abfc)" },
  { id: "topik_tiger", name: "Hổ TOPIK", description: "Huy hiệu dành cho chiến binh luyện thi.", cost: 350, icon: "🐯", kind: "badge", visual: "linear-gradient(135deg,#7c2d12,#fb923c,#fde68a)" },
  { id: "badge_seoul_night", name: "Đêm Seoul", description: "Huy hiệu neon dành cho người học sau giờ làm.", cost: 500, icon: "🌃", kind: "badge", visual: "linear-gradient(135deg,#172554,#2563eb,#e879f9)" },
  { id: "badge_dokkaebi", name: "Dokkaebi huyền thoại", description: "Dấu ấn hiếm cho hành trình học bền bỉ.", cost: 900, icon: "👹", kind: "badge", visual: "linear-gradient(135deg,#4c1d95,#c026d3,#f0abfc)" },
  { id: "badge_dragon", name: "Rồng Hàn ngữ", description: "Huy hiệu bậc cao cho bậc thầy tiếng Hàn.", cost: 1500, icon: "🐉", kind: "badge", visual: "linear-gradient(135deg,#713f12,#f59e0b,#fef3c7)" },
  { id: "frame_neon", name: "Khung Neon Seoul", description: "Viền hồ sơ chuyển sắc xanh tím rực rỡ.", cost: 250, icon: "💠", kind: "frame", visual: "linear-gradient(135deg,#22d3ee,#6366f1,#e879f9)" },
  { id: "frame_hanbok", name: "Khung Hanbok", description: "Viền lụa truyền thống hồng ngọc và vàng.", cost: 450, icon: "🎎", kind: "frame", visual: "linear-gradient(135deg,#fb7185,#fbbf24,#fef3c7)" },
  { id: "frame_galaxy", name: "Khung Thiên Hà", description: "Ánh sao tím xanh bao quanh ảnh đại diện.", cost: 700, icon: "🌌", kind: "frame", visual: "linear-gradient(135deg,#312e81,#7c3aed,#22d3ee)" },
  { id: "frame_diamond", name: "Khung Kim Cương", description: "Viền băng lấp lánh dành cho thành viên kỳ cựu.", cost: 1100, icon: "💎", kind: "frame", visual: "linear-gradient(135deg,#a5f3fc,#60a5fa,#f5d0fe)" },
  { id: "frame_gold", name: "Khung Hoàng Kim", description: "Viền vàng nổi bật cho hồ sơ đẳng cấp.", cost: 1600, icon: "👑", kind: "frame", visual: "linear-gradient(135deg,#92400e,#facc15,#fff7ae)" },
  { id: "bg_seoul", name: "Seoul về đêm", description: "Nền hồ sơ ánh đèn thành phố và sắc neon.", cost: 300, icon: "🌆", kind: "background", visual: "radial-gradient(at 15% 10%,#4338ca 0,transparent 42%),radial-gradient(at 90% 20%,#c026d3 0,transparent 38%),linear-gradient(140deg,#070b22,#172554 55%,#0f172a)" },
  { id: "bg_cherry", name: "Mùa hoa anh đào", description: "Nền hồng dịu với ánh sáng mùa xuân Hàn Quốc.", cost: 450, icon: "🌸", kind: "background", visual: "radial-gradient(at 15% 15%,#f9a8d4 0,transparent 40%),radial-gradient(at 90% 25%,#fda4af 0,transparent 35%),linear-gradient(140deg,#4a173c,#831843 55%,#1f1235)" },
  { id: "bg_bukchon", name: "Bukchon hoàng hôn", description: "Sắc ngói hanok và nắng chiều ấm áp.", cost: 650, icon: "🏘️", kind: "background", visual: "radial-gradient(at 80% 0%,#fb923c 0,transparent 40%),radial-gradient(at 10% 100%,#b45309 0,transparent 45%),linear-gradient(140deg,#292018,#78350f 55%,#1c1917)" },
  { id: "bg_milkyway", name: "Dải Ngân Hà", description: "Không gian sâu thẳm với các dải sao tím xanh.", cost: 900, icon: "🌌", kind: "background", visual: "radial-gradient(at 15% 20%,#7c3aed 0,transparent 40%),radial-gradient(at 85% 65%,#0891b2 0,transparent 42%),linear-gradient(140deg,#09051c,#1e1b4b 50%,#020617)" },
  { id: "bg_palace", name: "Cung điện ánh trăng", description: "Nền cung điện Hàn Quốc phủ ánh trăng xanh bạc.", cost: 1300, icon: "🏯", kind: "background", visual: "radial-gradient(at 70% 8%,#e0f2fe 0,transparent 24%),radial-gradient(at 12% 86%,#0e7490 0,transparent 38%),linear-gradient(145deg,#061326,#164e63 48%,#0f172a)" },
  { id: "bg_aurora", name: "Cực quang Haechi", description: "Nền cực quang chuyển sắc hiếm nhất cửa hàng.", cost: 2000, icon: "🌌", kind: "background", visual: "radial-gradient(at 15% 5%,#34d399 0,transparent 36%),radial-gradient(at 80% 15%,#8b5cf6 0,transparent 40%),radial-gradient(at 50% 100%,#0891b2 0,transparent 50%),linear-gradient(150deg,#020617,#0f172a 55%,#10112a)" },
] as const;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Đăng nhập để xem cửa hàng phần thưởng.", 401);
    const result = await env.DB.prepare("SELECT reward_id, purchased_at FROM user_rewards WHERE user_id = ? ORDER BY purchased_at DESC").bind(user.id).all();
    const account = await env.DB.prepare("SELECT gems, active_badge, active_frame, active_background FROM users WHERE id = ?").bind(user.id).first<any>();
    return jsonResponse({ rewards: REWARDS, owned: result.results || [], user: account });
  } catch {
    return errorResponse("Không tải được cửa hàng phần thưởng.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Đăng nhập để đổi hoặc sử dụng huy hiệu.", 401);
    const body = (await request.json()) as { rewardId?: string; action?: string; slot?: string };
    const rewardId = typeof body.rewardId === "string" ? body.rewardId : "";

    if (body.action === "unequip") {
      const columns: Record<string, string> = { badge: "active_badge", frame: "active_frame", background: "active_background" };
      const column = columns[body.slot || ""];
      if (!column) return errorResponse("Loại vật phẩm cần bỏ trang bị không hợp lệ.");
      await env.DB.prepare(`UPDATE users SET ${column} = NULL WHERE id = ?`).bind(user.id).run();
      const account = await env.DB.prepare("SELECT gems, active_badge, active_frame, active_background FROM users WHERE id = ?").bind(user.id).first<any>();
      return jsonResponse({ success: true, user: account });
    }

    const reward = REWARDS.find((item) => item.id === rewardId);
    if (!reward) return errorResponse("Phần thưởng không hợp lệ.");

    if (body.action === "equip") {
      const owned = await env.DB.prepare("SELECT reward_id FROM user_rewards WHERE user_id = ? AND reward_id = ?").bind(user.id, reward.id).first();
      if (!owned) return errorResponse("Bạn chưa sở hữu huy hiệu này.", 404);
      const columns: Record<string, string> = { badge: "active_badge", frame: "active_frame", background: "active_background" };
      const column = columns[reward.kind];
      await env.DB.prepare(`UPDATE users SET ${column} = ? WHERE id = ?`).bind(reward.id, user.id).run();
      const account = await env.DB.prepare("SELECT gems, active_badge, active_frame, active_background FROM users WHERE id = ?").bind(user.id).first<any>();
      return jsonResponse({ success: true, user: account });
    }

    if (body.action !== "redeem") return errorResponse("Thao tác không hợp lệ.");
    const existing = await env.DB.prepare("SELECT reward_id FROM user_rewards WHERE user_id = ? AND reward_id = ?").bind(user.id, reward.id).first();
    if (existing) return errorResponse("Bạn đã sở hữu huy hiệu này rồi.", 409);
    if (user.gems < reward.cost) return errorResponse(`Bạn cần ${reward.cost - user.gems} kim cương nữa để đổi huy hiệu này.`, 409);

    const purchasedAt = new Date().toISOString();
    const insert = env.DB.prepare(
      `INSERT INTO user_rewards (user_id, reward_id, purchased_at)
       SELECT ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM users WHERE id = ? AND gems >= ?)
         AND NOT EXISTS (SELECT 1 FROM user_rewards WHERE user_id = ? AND reward_id = ?)`,
    ).bind(user.id, reward.id, purchasedAt, user.id, reward.cost, user.id, reward.id);
    const debit = env.DB.prepare(
      `UPDATE users SET gems = gems - ?
       WHERE id = ? AND gems >= ? AND EXISTS (
         SELECT 1 FROM user_rewards WHERE user_id = ? AND reward_id = ? AND purchased_at = ?
       )`,
    ).bind(reward.cost, user.id, reward.cost, user.id, reward.id, purchasedAt);
    await env.DB.batch([insert, debit]);
    const updated = await env.DB.prepare("SELECT gems, active_badge, active_frame, active_background FROM users WHERE id = ?").bind(user.id).first<{ gems: number; active_badge: string | null; active_frame: string | null; active_background: string | null }>();
    if (!updated) return errorResponse("Không thể hoàn tất giao dịch.", 500);
    if (updated.gems === user.gems) return errorResponse("Huy hiệu đã được đổi ở một phiên khác. Hãy làm mới cửa hàng.", 409);
    return jsonResponse({ success: true, message: "Đổi huy hiệu thành công.", user: updated }, 201);
  } catch {
    return errorResponse("Không thể hoàn tất giao dịch. Kim cương của bạn chưa bị trừ.", 500);
  }
};
