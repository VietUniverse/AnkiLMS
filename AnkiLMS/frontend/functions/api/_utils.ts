export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  MEDIA: R2Bucket;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  CLOVA_VOICE_CLIENT_ID?: string;
  CLOVA_VOICE_CLIENT_SECRET?: string;
  SITE_URL?: string;
}

const SESSION_COOKIE = "haechivn_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  avatar_url: string | null;
  bio?: string | null;
  profile_public?: number;
  streak: number;
  longest_streak: number;
  xp: number;
  gems: number;
  level: number;
  active_badge: string | null;
  active_frame?: string | null;
  active_background?: string | null;
  role: "student" | "teacher" | "admin";
  last_checkin_date: string | null;
  created_at: string;
}

export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": "max-age=31536000",
      ...headers,
    },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

// PBKDF2 keeps password hashes slow to crack if the database is ever exposed.
export async function hashPassword(password: string): Promise<string> {
  // Cloudflare Workers WebCrypto supports up to 100,000 PBKDF2 iterations.
  const iterations = 100_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return `pbkdf2_sha256$${iterations}$${toHex(salt)}$${toHex(new Uint8Array(hash))}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (storedHash.startsWith("pbkdf2_sha256$")) {
    const [, iterationsText, saltHex, hashHex] = storedHash.split("$");
    const iterations = Number(iterationsText);
    if (!Number.isInteger(iterations) || iterations < 50_000 || iterations > 100_000 || !/^[a-f0-9]{32}$/i.test(saltHex || "") || !/^[a-f0-9]{64}$/i.test(hashHex || "")) {
      return { valid: false, needsUpgrade: false };
    }
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const hash = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: fromHex(saltHex), iterations, hash: "SHA-256" },
      key,
      256,
    );
    return { valid: constantTimeEqual(toHex(new Uint8Array(hash)), hashHex.toLowerCase()), needsUpgrade: false };
  }

  // Upgrade accounts created with the original fixed-salt SHA-256 on next login.
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const legacy = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password + "_haechivn_salt"));
    return { valid: constantTimeEqual(toHex(new Uint8Array(legacy)), storedHash.toLowerCase()), needsUpgrade: true };
  }
  return { valid: false, needsUpgrade: false };
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string): Uint8Array {
  return new Uint8Array(value.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie") || "";
  try {
    const cookieToken = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1);
    if (cookieToken) {
      const decoded = decodeURIComponent(cookieToken);
      if (decoded.length > 0 && decoded.length <= 256) return decoded;
      return null;
    }
  } catch {
    return null;
  }

  // Accept existing browser sessions while users transition to the HttpOnly cookie.
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const bearer = authHeader.slice(7).trim();
  return bearer.length > 0 && bearer.length <= 256 ? bearer : null;
}

export function sessionCookie(request: Request, token: string, maxAge = SESSION_TTL_SECONDS): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

export function clearSessionCookie(request: Request): string {
  return sessionCookie(request, "", 0);
}

export function oauthStateCookie(request: Request, state: string): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `haechivn_oauth_state=${state}; Path=/api/auth/callback; Max-Age=600; HttpOnly; SameSite=Lax${secure}`;
}

export function clearOauthStateCookie(request: Request): string {
  return oauthStateCookie(request, "");
}

export async function createSession(env: Env, user: Pick<UserRow, "id" | "email" | "name">): Promise<string> {
  const token = `hcv_${toHex(crypto.getRandomValues(new Uint8Array(32)))}`;
  await env.SESSIONS.put(token, JSON.stringify({ userId: user.id }), { expirationTtl: SESSION_TTL_SECONDS });
  return token;
}

// Session Auth Helper
export async function authenticateRequest(request: Request, env: Env): Promise<UserRow | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  try {
    const sessionDataStr = await env.SESSIONS.get(token);
    if (!sessionDataStr) return null;
    const sessionData = JSON.parse(sessionDataStr);

    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(sessionData.userId).first<UserRow>();
    return user || null;
  } catch (e) {
    return null;
  }
}

export async function authenticateAdminRequest(request: Request, env: Env): Promise<UserRow | null> {
  const user = await authenticateRequest(request, env);
  return user?.role === "admin" ? user : null;
}
