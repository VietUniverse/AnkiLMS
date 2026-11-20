import { authenticateRequest, Env, errorResponse, isSameOriginRequest } from "../_utils";

const DAILY_TTS_LIMIT = 200;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);

  const user = await authenticateRequest(request, env);
  if (!user) return errorResponse("Vui lòng đăng nhập để dùng phát âm Naver.", 401);
  if (!env.CLOVA_VOICE_CLIENT_ID || !env.CLOVA_VOICE_CLIENT_SECRET) {
    return errorResponse("Naver CLOVA Voice chưa được cấu hình cho HaechiVN.", 503);
  }

  let text = "";
  try {
    const body = await request.json() as { text?: unknown };
    text = typeof body.text === "string" ? body.text.trim() : "";
  } catch {
    return errorResponse("Nội dung phát âm không hợp lệ.", 400);
  }
  if (!text || text.length > 500 || !/[\uac00-\ud7a3]/.test(text)) {
    return errorResponse("Hãy gửi từ hoặc câu tiếng Hàn tối đa 500 ký tự.", 400);
  }

  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  const quotaKey = `clova-tts:${user.id}:${date}`;
  let used = 0;
  try {
    used = Number(await env.SESSIONS.get(quotaKey)) || 0;
  } catch {
    return errorResponse("Không thể kiểm tra hạn mức phát âm. Hãy thử lại sau.", 503);
  }
  if (used >= DAILY_TTS_LIMIT) return errorResponse("Bạn đã dùng hết 200 lượt phát âm Naver hôm nay.", 429);

  const form = new URLSearchParams({ speaker: "nara", volume: "0", speed: "0", pitch: "0", format: "mp3", text });
  let response: Response;
  try {
    response = await fetch("https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts", {
      method: "POST",
      headers: {
        "X-NCP-APIGW-API-KEY-ID": env.CLOVA_VOICE_CLIENT_ID,
        "X-NCP-APIGW-API-KEY": env.CLOVA_VOICE_CLIENT_SECRET,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: form.toString(),
    });
  } catch {
    return errorResponse("Không kết nối được Naver CLOVA Voice.", 502);
  }
  if (!response.ok) return errorResponse("Naver CLOVA Voice chưa nhận yêu cầu. Kiểm tra khóa API và hạn mức trên Naver Cloud.", 502);

  try {
    await env.SESSIONS.put(quotaKey, String(used + 1), { expirationTtl: 60 * 60 * 48 });
  } catch {
    return errorResponse("Không thể cập nhật hạn mức phát âm.", 503);
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline; filename=naver-korean-tts.mp3",
    },
  });
};
