import { authenticateRequest, Env, errorResponse, isSameOriginRequest, jsonResponse } from "../_utils";

type AnyRecord = Record<string, unknown>;

function record(value: unknown): AnyRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

async function fetchNaver(url: URL, signal: AbortSignal): Promise<AnyRecord> {
  const response = await fetch(url, {
    headers: { Referer: "https://korean.dict.naver.com/koendict/", Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error(`Naver returned ${response.status}`);
  const length = Number(response.headers.get("Content-Length") || 0);
  if (length > 2_000_000) throw new Error("Naver response too large");
  return record(await response.json()) || {};
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!isSameOriginRequest(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  if (!await authenticateRequest(request, env)) return errorResponse("Vui lòng đăng nhập để tra từ Naver.", 401);

  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  const isKoreanOrEnglish = /[가-힣]/u.test(query) || /^[a-z][a-z\s.-]*$/iu.test(query);
  if (!query || query.length > 60 || !isKoreanOrEnglish) {
    return errorResponse("Nhập từ Hangul hoặc tiếng Anh để tra Naver.", 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const searchUrl = new URL("https://korean.dict.naver.com/api3/koen/search");
    searchUrl.search = new URLSearchParams({ query, m: "mobile", range: "entrySearch" }).toString();
    const search = await fetchNaver(searchUrl, controller.signal);
    const items = record(record(record(search.searchResultMap)?.searchResultListMap)?.WORD)?.items;
    const first = Array.isArray(items) ? record(items[0]) : null;
    const entryId = text(first?.entryId);
    if (!entryId || !/^[a-f0-9]{32}$/i.test(entryId)) return jsonResponse({ source: "naver", entry: null });

    const entryUrl = new URL("https://korean.dict.naver.com/api/platform/koen/entry");
    entryUrl.searchParams.set("entryId", entryId);
    const detail = await fetchNaver(entryUrl, controller.signal);
    const entry = record(detail.entry);
    const members = Array.isArray(entry?.members) ? entry.members.map(record).filter((value): value is AnyRecord => Boolean(value)) : [];
    const headword = members[0];
    const pronunciations = Array.isArray(headword?.prons) ? headword.prons.map(record).filter((value): value is AnyRecord => Boolean(value)).map((value) => text(value.show_pron_symbol)).filter(Boolean) : [];
    const means = Array.isArray(entry?.means) ? entry.means.map(record).filter((value): value is AnyRecord => Boolean(value)) : [];
    const meanings = means.slice(0, 6).map((mean) => {
      let description: AnyRecord | null = null;
      try { description = record(JSON.parse(text(mean.description_json))); } catch { /* omit malformed optional descriptions */ }
      const examples = Array.isArray(mean.examples) ? mean.examples.map(record).filter((value): value is AnyRecord => Boolean(value)) : [];
      const part = record(mean.part);
      return {
        meaning: text(mean.show_mean),
        english: text(description?.en),
        korean: text(description?.ko),
        example: text(examples[0]?.origin_example),
        partOfSpeech: text(part?.part_ko_name),
      };
    }).filter((mean) => mean.meaning || mean.english || mean.korean);

    return jsonResponse({
      source: "naver",
      entry: {
        hangul: text(headword?.entry_name) || query,
        hanja: text(headword?.hanja) || text(headword?.origin_language),
        pronunciation: pronunciations.join(" · "),
        importance: Math.max(0, Math.min(3, Number(entry?.entry_importance) || 0)),
        topik: /2/.test(String(entry?.entry_level || "")) ? "TOPIK 2+" : /1/.test(String(entry?.entry_level || "")) ? "TOPIK 1+" : "",
        partOfSpeech: meanings[0]?.partOfSpeech || "",
        meanings,
      },
    });
  } catch {
    return errorResponse("Không lấy được kết quả Naver lúc này. Thử lại hoặc mở Naver Dictionary.", 502);
  } finally {
    clearTimeout(timeout);
  }
};
