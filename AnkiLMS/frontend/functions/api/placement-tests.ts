import { Env, authenticateAdminRequest, authenticateRequest, errorResponse, isSameOriginRequest, jsonResponse } from "./_utils";

const TESTS = {
  "seoul-1a": { maxQuestions: 60 },
  "thth-1": { maxQuestions: 80 },
  "thth-1-5": { maxQuestions: 50 },
} as const;

type TestSlug = keyof typeof TESTS;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const user = await authenticateRequest(request, env);
  if (!user) return errorResponse("Vui lòng đăng nhập để lưu lịch sử bài kiểm tra.", 401);

  try {
    const body = await request.json() as {
      attemptId?: string;
      testSlug?: string;
      correct?: number;
      wrong?: number;
      skipped?: number;
      total?: number;
      durationSeconds?: number;
    };
    const slug = body.testSlug as TestSlug;
    const config = TESTS[slug];
    const counts = [body.correct, body.wrong, body.skipped, body.total].map(Number);
    const [correct, wrong, skipped, total] = counts;
    const durationSeconds = Number(body.durationSeconds ?? 0);
    if (!config) return errorResponse("Bài kiểm tra không hợp lệ.");
    if (!body.attemptId || !/^[\w-]{8,80}$/.test(body.attemptId)) return errorResponse("Mã lượt làm bài không hợp lệ.");
    if (counts.some((value) => !Number.isInteger(value) || value < 0) || total < 1 || total > config.maxQuestions || correct + wrong + skipped !== total) {
      return errorResponse("Số câu trả lời không hợp lệ.");
    }
    if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 1800) return errorResponse("Thời lượng bài làm không hợp lệ.");

    const ratio = Math.max(0, correct - wrong / 3) / total;
    const scorePercent = Math.round(ratio * 100);
    const verdict = ratio >= 0.8 ? "pass" : ratio >= 0.7 ? "almost" : "fail";
    await env.DB.prepare(
      `INSERT OR IGNORE INTO placement_test_attempts
        (id, user_id, test_slug, correct_count, wrong_count, skipped_count, total_questions, score_percent, verdict, duration_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(body.attemptId, user.id, slug, correct, wrong, skipped, total, scorePercent, verdict, durationSeconds).run();

    return jsonResponse({ success: true, scorePercent, verdict });
  } catch {
    return errorResponse("Không lưu được lịch sử bài kiểm tra.", 500);
  }
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!await authenticateAdminRequest(request, env)) return errorResponse("Không tìm thấy.", 404);
  try {
    const [summary, tests, accounts, attempts] = await Promise.all([
      env.DB.prepare(
        `SELECT COUNT(*) AS attempts, COUNT(DISTINCT user_id) AS participants,
          COALESCE(SUM(CASE WHEN verdict = 'pass' THEN 1 ELSE 0 END), 0) AS passed,
          COALESCE(SUM(correct_count), 0) AS correctAnswers,
          COALESCE(SUM(total_questions), 0) AS answeredQuestions,
          COALESCE(ROUND(AVG(score_percent)), 0) AS averageScore
         FROM placement_test_attempts`,
      ).first(),
      env.DB.prepare(
        `SELECT test_slug AS testSlug, COUNT(*) AS attempts, COUNT(DISTINCT user_id) AS participants,
          COALESCE(SUM(CASE WHEN verdict = 'pass' THEN 1 ELSE 0 END), 0) AS passed,
          COALESCE(SUM(correct_count), 0) AS correctAnswers,
          COALESCE(SUM(total_questions), 0) AS answeredQuestions,
          COALESCE(ROUND(AVG(score_percent)), 0) AS averageScore,
          COALESCE(MAX(score_percent), 0) AS bestScore
         FROM placement_test_attempts GROUP BY test_slug ORDER BY test_slug`,
      ).all(),
      env.DB.prepare(
        `SELECT u.id AS userId, u.name, u.email, COUNT(a.id) AS attempts,
          COALESCE(SUM(CASE WHEN a.verdict = 'pass' THEN 1 ELSE 0 END), 0) AS passed,
          COALESCE(SUM(a.correct_count), 0) AS correctAnswers,
          COALESCE(SUM(a.total_questions), 0) AS answeredQuestions,
          COALESCE(ROUND(AVG(a.score_percent)), 0) AS averageScore,
          COALESCE(MAX(a.score_percent), 0) AS bestScore,
          MAX(a.created_at) AS lastAttemptAt,
          COALESCE(SUM(CASE WHEN a.test_slug = 'seoul-1a' THEN 1 ELSE 0 END), 0) AS seoulAttempts,
          COALESCE(SUM(CASE WHEN a.test_slug = 'seoul-1a' AND a.verdict = 'pass' THEN 1 ELSE 0 END), 0) AS seoulPassed,
          COALESCE(SUM(CASE WHEN a.test_slug = 'seoul-1a' THEN a.correct_count ELSE 0 END), 0) AS seoulCorrect,
          COALESCE(SUM(CASE WHEN a.test_slug = 'seoul-1a' THEN a.total_questions ELSE 0 END), 0) AS seoulQuestions,
          COALESCE(MAX(CASE WHEN a.test_slug = 'seoul-1a' THEN a.score_percent END), 0) AS seoulBest,
          COALESCE(ROUND(AVG(CASE WHEN a.test_slug = 'seoul-1a' THEN a.score_percent END)), 0) AS seoulAverage,
          COALESCE(SUM(CASE WHEN a.test_slug = 'thth-1' THEN 1 ELSE 0 END), 0) AS ththAttempts,
          COALESCE(SUM(CASE WHEN a.test_slug = 'thth-1' AND a.verdict = 'pass' THEN 1 ELSE 0 END), 0) AS ththPassed,
          COALESCE(SUM(CASE WHEN a.test_slug = 'thth-1' THEN a.correct_count ELSE 0 END), 0) AS ththCorrect,
          COALESCE(SUM(CASE WHEN a.test_slug = 'thth-1' THEN a.total_questions ELSE 0 END), 0) AS ththQuestions,
          COALESCE(MAX(CASE WHEN a.test_slug = 'thth-1' THEN a.score_percent END), 0) AS ththBest,
          COALESCE(ROUND(AVG(CASE WHEN a.test_slug = 'thth-1' THEN a.score_percent END)), 0) AS ththAverage
         FROM placement_test_attempts a JOIN users u ON u.id = a.user_id
         GROUP BY u.id, u.name, u.email ORDER BY lastAttemptAt DESC LIMIT 1000`,
      ).all(),
      env.DB.prepare(
        `SELECT a.id, a.test_slug AS testSlug, a.correct_count AS correct, a.wrong_count AS wrong,
          a.skipped_count AS skipped, a.total_questions AS total, a.score_percent AS scorePercent,
          a.verdict, a.duration_seconds AS durationSeconds, a.created_at AS createdAt,
          u.id AS userId, u.name, u.email
         FROM placement_test_attempts a JOIN users u ON u.id = a.user_id
         ORDER BY a.created_at DESC LIMIT 1000`,
      ).all(),
    ]);
    return jsonResponse({ summary, tests: tests.results || [], accounts: accounts.results || [], attempts: attempts.results || [] });
  } catch {
    return errorResponse("Không thể tải thống kê bài kiểm tra.", 500);
  }
};
