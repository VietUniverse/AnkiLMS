import { Env, errorResponse, oauthStateCookie } from "../_utils";

function configuredSiteUrl(request: Request, env: Env): string {
  const configured = env.SITE_URL || new URL(request.url).origin;
  const url = new URL(configured);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("SITE_URL phải dùng HTTPS.");
  return url.origin;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId || !env.SESSIONS) return errorResponse("Đăng nhập Google chưa được cấu hình.", 503);

  try {
    const state = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const requestedLanguage = new URL(request.url).searchParams.get("translationLanguage");
    const translationLanguage = ["vi", "en", "ja"].includes(requestedLanguage || "") ? requestedLanguage : "vi";
    await env.SESSIONS.put(`oauth_state:${state}`, JSON.stringify({ translationLanguage }), { expirationTtl: 600 });
    const siteUrl = configuredSiteUrl(request, env);
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: `${siteUrl}/api/auth/callback`,
      scope: "openid email profile",
      access_type: "online",
      prompt: "select_account",
      state,
    }).toString();

    return new Response(null, {
      status: 302,
      headers: {
        Location: authorizationUrl.toString(),
        "Set-Cookie": oauthStateCookie(request, state),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return errorResponse("Đăng nhập Google chưa được cấu hình đúng.", 503);
  }
};
