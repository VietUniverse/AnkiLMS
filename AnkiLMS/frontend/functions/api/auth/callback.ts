import { Env, UserRow, createSession, sessionCookie, clearOauthStateCookie } from "../_utils";

function siteOrigin(request: Request, env: Env): string {
  const value = env.SITE_URL || new URL(request.url).origin;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("Invalid site URL");
  return url.origin;
}

function readStateCookie(request: Request): string | null {
  return (request.headers.get("Cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("haechivn_oauth_state="))
    ?.slice("haechivn_oauth_state=".length) || null;
}

function redirect(request: Request, siteUrl: string, error?: string, cookie?: string): Response {
  const target = new URL("/", siteUrl);
  if (error) target.searchParams.set("auth_error", error);
  const headers = new Headers({
    Location: target.toString(),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000",
  });
  headers.append("Set-Cookie", clearOauthStateCookie(request));
  if (cookie) headers.append("Set-Cookie", cookie);
  return new Response(null, {
    status: 302,
    headers,
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  let siteUrl = new URL(request.url).origin;
  try {
    siteUrl = siteOrigin(request, env);
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state || !env.SESSIONS) return redirect(request, siteUrl, "oauth_invalid_request");

    const stateKey = `oauth_state:${state}`;
    const validState = await env.SESSIONS.get(stateKey);
    await env.SESSIONS.delete(stateKey);
    if (!validState || readStateCookie(request) !== state) return redirect(request, siteUrl, "oauth_state_expired");
    let translationLanguage = "vi";
    try {
      const stateData = JSON.parse(validState) as { translationLanguage?: string };
      if (["vi", "en", "ja"].includes(stateData.translationLanguage || "")) translationLanguage = stateData.translationLanguage!;
    } catch { /* Older OAuth states default to Vietnamese. */ }

    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return redirect(request, siteUrl, "oauth_not_configured");

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${siteUrl}/api/auth/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) return redirect(request, siteUrl, "oauth_token_failed");
    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenData.access_token) return redirect(request, siteUrl, "oauth_token_failed");

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileResponse.ok) return redirect(request, siteUrl, "oauth_profile_failed");
    const profile = (await profileResponse.json()) as {
      id?: string;
      email?: string;
      name?: string;
      picture?: string;
      verified_email?: boolean;
    };
    if (!profile.email || !profile.verified_email) return redirect(request, siteUrl, "oauth_email_unverified");

    const email = profile.email.trim().toLowerCase();
    let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<UserRow>();
    if (!user) {
      const userId = `usr_${crypto.randomUUID()}`;
      await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, name, avatar_url, translation_language, streak, longest_streak, xp, gems, level)
         VALUES (?, ?, '', ?, ?, ?, 0, 0, 0, 100, 1)`
      ).bind(userId, email, (profile.name || email.split("@")[0]).slice(0, 48), profile.picture || null, translationLanguage).run();
      user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
    } else if (profile.picture && !user.avatar_url) {
      await env.DB.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").bind(profile.picture, user.id).run();
      user.avatar_url = profile.picture;
    }
    if (!user) return redirect(request, siteUrl, "oauth_account_failed");

    const session = await createSession(env, user);
    return redirect(request, siteUrl, undefined, sessionCookie(request, session));
  } catch {
    return redirect(request, siteUrl, "oauth_failed");
  }
};
