import { Env, errorResponse, jsonResponse } from "../_utils";

type DictIndex = {
  version: number;
  totalEntries: number;
  uniqueHeadwords: number;
  hangulBounds: string[];
  hangulRanges: Array<[number, number, number]>;
  tokenRanges: Array<[number, number, number]>;
  browseRanges: Record<string, Array<[number, number, number]>>;
};

// PackedEntry format from build_dict_7m_packs.py:
// [0:hangul, 1:english, 2:vietnamese, 3:japanese, 4:pos, 5:level, 6:topic, 7:source, 8:romanization, 9:hanja, 10:pronunciation, 11:topik, 12:courseId, 13:url]
type PackedRow = [
  string,
  string?,
  string?,
  string?,
  string?,
  string?,
  string?,
  string?,
  string?,
  string?,
  string?,
  string?,
  string?,
  string?,
];

let cachedIndex: DictIndex | null = null;
let cachedIndexAt = 0;
const INDEX_TTL_MS = 10 * 60 * 1000;

const HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/u;
const TOKEN_RE = /[a-z0-9\u00c0-\u024f\u1e00-\u1eff\u3040-\u30ff\u4e00-\u9fff]+/gu;
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "của",
  "cho",
  "trong",
  "một",
  "những",
  "các",
  "được",
]);

function fnv1a4096(str: string): number {
  const bytes = new TextEncoder().encode(str);
  let h = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h & 4095;
}

function normalizeQuery(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\u1e00-\u1eff\u3040-\u30ff\u4e00-\u9fff가-힣]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

async function loadDictIndex(env: Env): Promise<DictIndex> {
  const now = Date.now();
  if (cachedIndex && now - cachedIndexAt < INDEX_TTL_MS) {
    return cachedIndex;
  }
  const obj = await env.MEDIA.get("dict-7m/index.json");
  if (!obj) {
    throw new Error("Chỉ mục từ điển 6.8M trên R2 chưa sẵn sàng.");
  }
  const data = (await obj.json()) as DictIndex;
  cachedIndex = data;
  cachedIndexAt = now;
  return data;
}

async function readCompressedChunk(
  env: Env,
  rangeTuple: [number, number, number],
): Promise<PackedRow[]> {
  const [packId, offset, length] = rangeTuple;
  const obj = await env.MEDIA.get(`dict-7m/pack-${packId}.bin`, {
    range: { offset, length },
  });
  if (!obj || !obj.body) return [];
  const decompressedStream = obj.body.pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(decompressedStream).text();
  return JSON.parse(text) as PackedRow[];
}

function unpackRow(row: PackedRow) {
  const srcRaw = row[7] || "nikl";
  const source = srcRaw.includes("admin")
    ? "admin"
    : srcRaw.includes("course-vocabulary")
    ? "course-vocabulary"
    : srcRaw.includes("topic-pdf") || srcRaw.includes("user-pdf")
    ? "topic-pdf"
    : "nikl";
  return {
    hangul: row[0] || "",
    english: row[1] || "",
    vietnamese: row[2] || "",
    japanese: row[3] || "",
    partOfSpeech: row[4] || "",
    level: row[5] || "",
    topic: row[6] || undefined,
    source,
    sourceDetail: srcRaw,
    romanization: row[8] || undefined,
    hanja: row[9] || undefined,
    pronunciation: row[10] || undefined,
    topik: row[11] || undefined,
    courseId: row[12] || undefined,
    url: row[13] || undefined,
  };
}

function scoreMeaningMatch(text: string, qNorm: string, qTokens: string[]): number {
  if (!text) return 0;
  const norm = normalizeQuery(text);
  if (!norm) return 0;
  if (norm === qNorm) return 960;
  if (norm.startsWith(`${qNorm} `)) return 820;

  const defs = text
    .split(/[;；/／|.]/)
    .map(normalizeQuery)
    .filter(Boolean);
  if (defs.some((d) => d === qNorm)) return 920;
  if (defs.some((d) => d.startsWith(`${qNorm} `))) return 790;

  const words = norm.split(" ");
  if (qTokens.length === 1) {
    const t = qTokens[0];
    if (words.includes(t)) return 700;
    if (words.some((w) => w.startsWith(t))) return 540;
    return 0;
  }

  // Multi-word query
  if (norm.includes(qNorm)) return 750;
  const matchedCount = qTokens.filter((qt) =>
    words.some((w) => w === qt || (qt.length >= 3 && w.startsWith(qt))),
  ).length;
  if (matchedCount === qTokens.length) return 660;
  if (matchedCount >= Math.max(1, qTokens.length - 1) && qTokens.length >= 2) return 420;
  return 0;
}

function findHangulChunkIndices(bounds: string[], prefix: string): number[] {
  let low = 0;
  let high = bounds.length - 1;
  let startIdx = 0;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (bounds[mid] <= prefix) {
      startIdx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const indices = [startIdx];
  // Check if next chunk also starts with or could contain prefix
  if (startIdx + 1 < bounds.length && bounds[startIdx + 1].startsWith(prefix)) {
    indices.push(startIdx + 1);
  }
  if (startIdx + 2 < bounds.length && bounds[startIdx + 2].startsWith(prefix)) {
    indices.push(startIdx + 2);
  }
  return indices;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "search";
  const level = url.searchParams.get("level") || "all";
  const limit = Math.min(120, Math.max(1, Number(url.searchParams.get("limit") || 40)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
  const rawQuery = (url.searchParams.get("q") || "").trim();

  try {
    const index = await loadDictIndex(env);

    if (mode === "stats") {
      return jsonResponse(
        {
          totalEntries: index.totalEntries,
          uniqueHeadwords: index.uniqueHeadwords,
        },
        200,
        { "Cache-Control": "public, max-age=3600" },
      );
    }

    // Load admin overrides from D1 (small overlay table)
    const overridesResult = await env.DB.prepare(
      "SELECT hangul, english, vietnamese, japanese, part_of_speech AS partOfSpeech, topik, topic, is_deleted AS isDeleted FROM dictionary_overrides LIMIT 500",
    )
      .all<{
        hangul: string;
        english: string;
        vietnamese: string;
        japanese: string;
        partOfSpeech: string;
        topik: string;
        topic: string;
        isDeleted: number;
      }>()
      .catch(() => ({ results: [] }));
    const overrides = overridesResult.results || [];
    const deletedHangul = new Set<string>();
    const overrideByHangul = new Map<string, PackedRow>();
    for (const item of overrides) {
      if (!item.hangul) continue;
      if (Number(item.isDeleted) === 1) {
        deletedHangul.add(item.hangul);
      } else {
        overrideByHangul.set(item.hangul, [
          item.hangul,
          item.english || "",
          item.vietnamese || "",
          item.japanese || "",
          item.partOfSpeech || "",
          "",
          item.topic || "",
          "admin",
          "",
          "",
          "",
          item.topik || "",
        ]);
      }
    }

    // BROWSE MODE (or empty query)
    if (mode === "browse" || !rawQuery) {
      const browseKey = index.browseRanges[level] ? level : "all";
      const ranges = index.browseRanges[browseKey] || [];
      const chunkIdx = Math.floor(offset / 300);
      const inChunkOffset = offset % 300;
      if (chunkIdx >= ranges.length) {
        return jsonResponse({
          entries: [],
          totalEntries: index.totalEntries,
          uniqueHeadwords: index.uniqueHeadwords,
        });
      }
      const rows = await readCompressedChunk(env, ranges[chunkIdx]);
      const filtered: ReturnType<typeof unpackRow>[] = [];
      for (let i = inChunkOffset; i < rows.length && filtered.length < limit; i++) {
        const r = rows[i];
        if (deletedHangul.has(r[0])) continue;
        const effective = overrideByHangul.get(r[0]) || r;
        filtered.push(unpackRow(effective));
      }
      return jsonResponse(
        {
          entries: filtered,
          totalEntries: index.totalEntries,
          uniqueHeadwords: index.uniqueHeadwords,
        },
        200,
        { "Cache-Control": "public, max-age=120" },
      );
    }

    // SEARCH MODE
    const qNorm = normalizeQuery(rawQuery);
    if (!qNorm) {
      return jsonResponse({
        entries: [],
        totalEntries: index.totalEntries,
        uniqueHeadwords: index.uniqueHeadwords,
      });
    }

    const candidates = new Map<string, PackedRow>();
    for (const [h, ov] of overrideByHangul.entries()) {
      candidates.set(h, ov);
    }

    const isHangul = HANGUL_RE.test(qNorm);

    if (isHangul) {
      const hangulPrefix = rawQuery.normalize("NFC").toLocaleLowerCase().trim();
      const chunkIndices = findHangulChunkIndices(index.hangulBounds, hangulPrefix);
      const chunks = await Promise.all(
        chunkIndices.map((idx) => readCompressedChunk(env, index.hangulRanges[idx])),
      );
      for (const rows of chunks) {
        for (const r of rows) {
          if (!deletedHangul.has(r[0]) && !candidates.has(r[0])) {
            candidates.set(r[0], r);
          }
        }
      }
    } else {
      const tokens = Array.from(qNorm.matchAll(TOKEN_RE), (m) => m[0]).filter(
        (t) => t.length >= 2,
      );
      const nonStop = tokens.filter((t) => !STOPWORDS.has(t));
      const lookupTokens = nonStop.length ? nonStop : tokens;
      // Pick first token and longest token to fetch up to 2 buckets in parallel
      const selectedPrefixes = new Set<string>();
      if (lookupTokens.length > 0) {
        selectedPrefixes.add(lookupTokens[0].slice(0, 3));
        const longest = [...lookupTokens].sort((a, b) => b.length - a.length)[0];
        selectedPrefixes.add(longest.slice(0, 3));
      }
      const bucketIds = Array.from(selectedPrefixes).map((p3) => fnv1a4096(p3));
      const chunks = await Promise.all(
        bucketIds.map((bId) => readCompressedChunk(env, index.tokenRanges[bId])),
      );
      for (const rows of chunks) {
        for (const r of rows) {
          if (!deletedHangul.has(r[0]) && !candidates.has(r[0])) {
            candidates.set(r[0], r);
          }
        }
      }
    }

    const qTokens = qNorm.split(" ").filter(Boolean);
    const ranked: Array<{ score: number; entry: ReturnType<typeof unpackRow> }> = [];

    for (const row of candidates.values()) {
      const topik = row[11] || "";
      if (level !== "all" && topik !== level) continue;

      const hangulNorm = (row[0] || "").normalize("NFC").toLocaleLowerCase().trim();
      let score = 0;

      if (hangulNorm === qNorm || hangulNorm === rawQuery.trim().toLocaleLowerCase()) {
        score = 1500;
      } else if (hangulNorm.startsWith(qNorm) || hangulNorm.startsWith(rawQuery.trim().toLocaleLowerCase())) {
        score = 1250;
      } else if (isHangul && hangulNorm.includes(qNorm)) {
        score = 950;
      } else {
        const viScore = scoreMeaningMatch(row[2] || "", qNorm, qTokens);
        const enScore = scoreMeaningMatch(row[1] || "", qNorm, qTokens);
        const jaScore = scoreMeaningMatch(row[3] || "", qNorm, qTokens);
        const romScore = scoreMeaningMatch(row[8] || "", qNorm, qTokens);
        score = Math.max(viScore, enScore, jaScore, romScore);
      }

      if (score <= 0) continue;

      // Boost quality sources (TOPIK, course-vocabulary, nikl, native)
      const src = row[7] || "";
      const qualityBoost =
        src.includes("admin")
          ? 80
          : src.includes("course-vocabulary") || src.includes("nikl")
          ? 55
          : src.includes("native")
          ? 35
          : src.includes("pivot")
          ? 15
          : 0;
      const topikBoost = row[11] ? 20 : 0;
      const hasViBoost = row[2] ? 15 : 0;

      ranked.push({
        score: score + qualityBoost + topikBoost + hasViBoost,
        entry: unpackRow(row),
      });
    }

    ranked.sort(
      (a, b) =>
        b.score - a.score ||
        a.entry.hangul.length - b.entry.hangul.length ||
        a.entry.hangul.localeCompare(b.entry.hangul, "ko"),
    );

    return jsonResponse(
      {
        entries: ranked.slice(0, limit).map((item) => item.entry),
        totalEntries: index.totalEntries,
        uniqueHeadwords: index.uniqueHeadwords,
      },
      200,
      { "Cache-Control": "public, max-age=120" },
    );
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Không thể tra cứu từ điển lúc này.",
      500,
    );
  }
};
