import { Env, jsonResponse, errorResponse, authenticateRequest, isSameOriginRequest } from "../_utils";

interface ReviewLogRow {
  id: string;
  user_id: string;
  card_id: number;
  deck_id: string;
  rating: number;
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  last_elapsed_days: number;
  scheduled_days: number;
  review_time: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Chưa đăng nhập.", 401);

    const url = new URL(request.url);
    const targetUserId = (user.role === "admin" && url.searchParams.get("userId")) || user.id;

    const logCountRow = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM review_logs WHERE user_id = ?"
    ).bind(targetUserId).first<{ total: number }>();
    const totalLogs = Number(logCountRow?.total) || 0;

    const settings = await env.DB.prepare(
      `SELECT weights_json, desired_retention, maximum_interval, optimized_at, log_count_at_optimize
       FROM user_fsrs_settings WHERE user_id = ?`
    ).bind(targetUserId).first<{
      weights_json: string;
      desired_retention: number;
      maximum_interval: number;
      optimized_at: string | null;
      log_count_at_optimize: number;
    }>();

    let weights: number[] | null = null;
    if (settings?.weights_json) {
      try {
        weights = JSON.parse(settings.weights_json);
      } catch {
        weights = null;
      }
    }

    return jsonResponse({
      userId: targetUserId,
      totalLogs,
      minimumRequiredLogs: 1000,
      isEligible: totalLogs >= 1000,
      hasOptimized: !!settings?.optimized_at,
      optimizedAt: settings?.optimized_at || null,
      logCountAtOptimize: settings?.log_count_at_optimize || 0,
      weights,
      desiredRetention: settings?.desired_retention || 0.9,
    });
  } catch (e: any) {
    return errorResponse("Lỗi kiểm tra trạng thái FSRS: " + e.message, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Chưa đăng nhập.", 401);
    if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);

    const body = (await request.json().catch(() => ({}))) as {
      userId?: string;
      weights?: number[];
    };

    const targetUserId = (user.role === "admin" && body.userId) || user.id;

    // Nếu client hoặc background runner gửi weights đã tính toán lên
    if (Array.isArray(body.weights) && body.weights.length > 0) {
      const valid = body.weights.every((n) => typeof n === "number" && Number.isFinite(n));
      if (!valid) return errorResponse("Trọng số w không hợp lệ.");

      const logCountRow = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM review_logs WHERE user_id = ?"
      ).bind(targetUserId).first<{ total: number }>();
      const totalLogs = Number(logCountRow?.total) || 0;

      await env.DB.prepare(
        `INSERT INTO user_fsrs_settings (user_id, weights_json, optimized_at, log_count_at_optimize, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           weights_json = excluded.weights_json,
           optimized_at = CURRENT_TIMESTAMP,
           log_count_at_optimize = excluded.log_count_at_optimize,
           updated_at = CURRENT_TIMESTAMP`
      ).bind(targetUserId, JSON.stringify(body.weights), totalLogs).run();

      return jsonResponse({
        success: true,
        message: "Đã cập nhật vector trọng số FSRS tối ưu thành công!",
        weights: body.weights,
      });
    }

    return errorResponse("Vui lòng cung cấp tham số weights hoặc dùng công cụ tối ưu hóa.", 400);
  } catch (e: any) {
    return errorResponse("Lỗi xử lý tối ưu hóa FSRS: " + e.message, 500);
  }
};
