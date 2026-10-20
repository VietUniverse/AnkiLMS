import { Env, authenticateRequest, errorResponse, isSameOriginRequest, jsonResponse } from "./_utils";

const CATALOG = [
  ["streak_1","streak",1,10,0],["streak_3","streak",3,20,0],["streak_7","streak",7,40,0],["streak_14","streak",14,70,0],["streak_30","streak",30,120,0],["streak_60","streak",60,200,0],["streak_100","streak",100,350,0],["streak_180","streak",180,500,0],["streak_365","streak",365,1000,0],
  ["level_3","level",3,15,0],["level_5","level",5,30,0],["level_10","level",10,60,0],["level_15","level",15,100,0],["level_20","level",20,180,0],["level_30","level",30,300,0],["level_50","level",50,600,0],
  ["sessions_1","sessions",1,10,0],["sessions_10","sessions",10,25,0],["sessions_50","sessions",50,60,0],["sessions_100","sessions",100,120,0],["sessions_250","sessions",250,250,0],["sessions_500","sessions",500,500,0],
  ["minutes_60","minutes",60,15,0],["minutes_600","minutes",600,60,0],["minutes_3000","minutes",3000,200,0],["minutes_10000","minutes",10000,500,0],
  ["cards_100","cards",100,25,0],["cards_1000","cards",1000,100,0],["cards_5000","cards",5000,250,0],
  ["dictation_10","dictation",10,40,0],["dictation_50","dictation",50,120,0],["dictation_150","dictation",150,300,0],
  ["shadowing_10","shadowing",10,40,0],["shadowing_50","shadowing",50,120,0],["shadowing_150","shadowing",150,300,0],
  ["topik_10","topik",10,50,0],["topik_50","topik",50,180,0],
  ["accuracy_80","accuracy",80,80,100],["accuracy_95","accuracy",95,250,500],
] as const;

type Metric = "streak" | "level" | "sessions" | "minutes" | "cards" | "dictation" | "shadowing" | "topik" | "accuracy";

async function getMetrics(env: Env, userId: string) {
  const [user, sessions] = await Promise.all([
    env.DB.prepare("SELECT streak, longest_streak, level FROM users WHERE id = ?").bind(userId).first<{ streak: number; longest_streak: number; level: number }>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS sessions, COALESCE(SUM(duration_seconds), 0) AS seconds,
       COALESCE(SUM(cards_reviewed), 0) AS cards, COALESCE(SUM(correct_count), 0) AS correct,
       SUM(CASE WHEN module = 'dictation' THEN 1 ELSE 0 END) AS dictation,
       SUM(CASE WHEN module = 'shadowing' THEN 1 ELSE 0 END) AS shadowing,
       SUM(CASE WHEN module = 'topik' THEN 1 ELSE 0 END) AS topik
       FROM study_sessions WHERE user_id = ?`,
    ).bind(userId).first<{ sessions: number; seconds: number; cards: number; correct: number; dictation: number; shadowing: number; topik: number }>(),
  ]);
  const cards = sessions?.cards || 0;
  const values: Record<Metric, number> = {
    streak: Math.max(user?.streak || 0, user?.longest_streak || 0), level: user?.level || 1,
    sessions: sessions?.sessions || 0, minutes: Math.floor((sessions?.seconds || 0) / 60), cards,
    dictation: sessions?.dictation || 0, shadowing: sessions?.shadowing || 0, topik: sessions?.topik || 0,
    accuracy: cards ? Math.round(((sessions?.correct || 0) / cards) * 100) : 0,
  };
  return values;
}

function serialize(metricValues: Record<Metric, number>, claimed: Set<string>) {
  return CATALOG.map(([id, metric, target, gems, minCards]) => ({
    id, metric, target, gems, minCards, progress: Math.min(metricValues[metric], target),
    unlocked: metricValues[metric] >= target && (metric !== "accuracy" || metricValues.cards >= minCards),
    claimed: claimed.has(id),
  }));
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Đăng nhập để xem thành tích.", 401);
    const [metrics, claims, account] = await Promise.all([
      getMetrics(env, user.id),
      env.DB.prepare("SELECT badge_id FROM achievements WHERE user_id = ?").bind(user.id).all<{ badge_id: string }>(),
      env.DB.prepare("SELECT gems FROM users WHERE id = ?").bind(user.id).first<{ gems: number }>(),
    ]);
    return jsonResponse({ achievements: serialize(metrics, new Set((claims.results || []).map((row) => row.badge_id))), user: { gems: account?.gems || 0 } });
  } catch {
    return errorResponse("Không tải được thành tích.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  try {
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Đăng nhập để nhận phần thưởng thành tích.", 401);
    const body = await request.json() as { id?: string };
    const achievement = CATALOG.find((item) => item[0] === body.id);
    if (!achievement) return errorResponse("Thành tích không hợp lệ.");
    const [id, metric, target, gems, minCards] = achievement;
    const metrics = await getMetrics(env, user.id);
    if (metrics[metric] < target || (metric === "accuracy" && metrics.cards < minCards)) return errorResponse("Bạn chưa đạt điều kiện của mốc này.", 409);
    const existing = await env.DB.prepare("SELECT badge_id FROM achievements WHERE user_id = ? AND badge_id = ?").bind(user.id, id).first();
    if (existing) return errorResponse("Phần thưởng này đã được nhận rồi.", 409);

    const claimedAt = new Date().toISOString();
    const insert = env.DB.prepare(
      "INSERT OR IGNORE INTO achievements (id, user_id, badge_id, unlocked_at) SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = ? AND badge_id = ?)",
    ).bind(`ach_${crypto.randomUUID()}`, user.id, id, claimedAt, user.id, id);
    const award = env.DB.prepare(
      "UPDATE users SET gems = gems + ? WHERE id = ? AND EXISTS (SELECT 1 FROM achievements WHERE user_id = ? AND badge_id = ? AND unlocked_at = ?)",
    ).bind(gems, user.id, user.id, id, claimedAt);
    await env.DB.batch([insert, award]);
    const account = await env.DB.prepare("SELECT gems FROM users WHERE id = ?").bind(user.id).first<{ gems: number }>();
    const claims = await env.DB.prepare("SELECT badge_id FROM achievements WHERE user_id = ?").bind(user.id).all<{ badge_id: string }>();
    return jsonResponse({ success: true, gemsAwarded: gems, achievements: serialize(metrics, new Set((claims.results || []).map((row) => row.badge_id))), user: { gems: account?.gems || 0 } });
  } catch {
    return errorResponse("Không thể nhận phần thưởng thành tích lúc này.", 500);
  }
};
