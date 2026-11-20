import type { Env } from "../_utils";

export async function rateKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function recordAttempt(env: Env, key: string, windowSeconds: number): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    `INSERT INTO login_rate_limits (key, attempts, window_start) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       attempts = CASE WHEN window_start <= ? THEN 1 ELSE attempts + 1 END,
       window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END
     RETURNING attempts`,
  ).bind(key, now, now - windowSeconds, now - windowSeconds).first<{ attempts: number }>();
  return row?.attempts ?? 1;
}
