import { Env, jsonResponse, errorResponse, authenticateRequest, isSameOriginRequest } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Chưa đăng nhập.", 401);

    const url = new URL(request.url);
    const targetUserId = (user.role === "admin" && url.searchParams.get("userId")) || user.id;

    const row = await env.DB.prepare(
      `SELECT weights_json, desired_retention, maximum_interval, enable_short_term, optimized_at, log_count_at_optimize
       FROM user_fsrs_settings WHERE user_id = ?`
    ).bind(targetUserId).first<{
      weights_json: string;
      desired_retention: number;
      maximum_interval: number;
      enable_short_term: number;
      optimized_at: string | null;
      log_count_at_optimize: number;
    }>();

    let weights: number[] | null = null;
    if (row?.weights_json) {
      try {
        weights = JSON.parse(row.weights_json);
      } catch {
        weights = null;
      }
    }

    return jsonResponse({
      settings: {
        userId: targetUserId,
        weights,
        desiredRetention: row?.desired_retention ?? 0.9,
        maximumInterval: row?.maximum_interval ?? 36500,
        enableShortTerm: (row?.enable_short_term ?? 1) === 1,
        optimizedAt: row?.optimized_at ?? null,
        logCountAtOptimize: row?.log_count_at_optimize ?? 0,
      },
    });
  } catch (e: any) {
    return errorResponse("Lỗi lấy cấu hình FSRS: " + e.message, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const user = await authenticateRequest(request, env);
    if (!user) return errorResponse("Chưa đăng nhập.", 401);
    if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);

    const body = (await request.json()) as {
      userId?: string;
      weights?: number[];
      desiredRetention?: number;
      maximumInterval?: number;
      enableShortTerm?: boolean;
    };

    const targetUserId = (user.role === "admin" && body.userId) || user.id;
    const desiredRetention = Number.isFinite(body.desiredRetention)
      ? Math.min(0.99, Math.max(0.7, Number(body.desiredRetention)))
      : 0.9;
    const maximumInterval = Number.isInteger(body.maximumInterval)
      ? Math.min(36500, Math.max(7, Number(body.maximumInterval)))
      : 36500;
    const enableShortTerm = body.enableShortTerm !== false ? 1 : 0;

    let weightsJson = "[]";
    if (Array.isArray(body.weights) && body.weights.length > 0) {
      const validWeights = body.weights.every((n) => typeof n === "number" && Number.isFinite(n));
      if (!validWeights) return errorResponse("Mảng trọng số w không hợp lệ.");
      weightsJson = JSON.stringify(body.weights);
    }

    await env.DB.prepare(
      `INSERT INTO user_fsrs_settings (user_id, weights_json, desired_retention, maximum_interval, enable_short_term, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         weights_json = excluded.weights_json,
         desired_retention = excluded.desired_retention,
         maximum_interval = excluded.maximum_interval,
         enable_short_term = excluded.enable_short_term,
         updated_at = CURRENT_TIMESTAMP`
    ).bind(targetUserId, weightsJson, desiredRetention, maximumInterval, enableShortTerm).run();

    return jsonResponse({ success: true, message: "Đã lưu cài đặt FSRS." });
  } catch (e: any) {
    return errorResponse("Lỗi lưu cấu hình FSRS: " + e.message, 500);
  }
};
