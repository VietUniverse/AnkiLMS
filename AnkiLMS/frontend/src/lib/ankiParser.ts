import JSZip from "jszip";
import initSqlJs, { Database } from "sql.js";

export interface AnkiCard {
  id: number;
  noteId: number;
  deckName: string;
  frontHtml: string;
  backHtml: string;
  frontText: string;
  backText: string;
  fields: string[];
  tags: string[];
  koreanText?: string;
  vietnameseMeaning?: string;
  romanization?: string;
  exampleSentence?: string;
  audioUrls: string[];
  imageUrls: string[];
  mediaRefs: string[];
  dueDate: number;
  interval: number;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review";
  /** Original Anki scheduling fields, preserved verbatim for round-trip fidelity. */
  ankiSchedule?: AnkiScheduleMetadata;
  /** Full review log imported from Anki's revlog table. */
  reviewHistory?: AnkiReviewEvent[];
}

export interface AnkiScheduleMetadata {
  cardType: number;
  queue: number;
  due: number;
  interval: number;
  factor: number;
  reps: number;
  lapses: number;
  left: number;
  originalDue?: number;
  originalDeckId?: number;
  data?: string;
  /** Exact preset used by this card, including FSRS parameters and step settings. */
  schedulerConfig?: Record<string, unknown>;
  collectionCreatedAt?: number;
  lastReview?: string;
}

export interface AnkiReviewEvent {
  id: number;
  reviewedAt: string;
  rating: number;
  interval: number;
  previousInterval: number;
  factor: number;
  durationMs: number;
  type: number;
}

export interface AnkiDeck {
  id: string;
  name: string;
  cardCount: number;
  cards: AnkiCard[];
  mediaAssets?: AnkiMediaAsset[];
  /** Private by default; public decks are eligible for the shared Explore catalog. */
  visibility?: "public" | "private";
  sharedId?: string;
  description?: string;
  author?: {
    userId?: string;
    name: string;
    avatar?: string;
    bio?: string;
  };
  schedulerPresets?: Record<string, Record<string, unknown>>;
  schedulerMetadata?: { collectionCreatedAt?: number; schedulerVersion?: number; importedAt: string; collectionConfig?: Record<string, unknown>; fsrsEnabled?: boolean };
}

export interface AnkiMediaAsset {
  filename: string;
  contentType: string;
  blob: Blob;
}

export class AnkiParser {
  private static sqlInstance: any = null;

  /** Load the bundled SQL.js runtime and its local WASM file. */
  private static async getSqlEngine(): Promise<any> {
    if (this.sqlInstance) return this.sqlInstance;

    const initFn = typeof initSqlJs === "function" ? initSqlJs : (initSqlJs as any)?.default;
    if (typeof initFn !== "function") throw new Error("Không khởi tạo được bộ đọc SQLite Anki.");
    this.sqlInstance = await initFn({ locateFile: () => "/sql-wasm.wasm" });
    return this.sqlInstance;
  }

  /**
   * Parse an uploaded Anki .apkg File object
   */
  public static async parseApkg(file: File): Promise<AnkiDeck[]> {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Locate SQLite DB inside zip (collection.anki21 or collection.anki2)
    let dbFile = zip.file("collection.anki21") || zip.file("collection.anki2");
    if (!dbFile) {
      const matchedName = Object.keys(zip.files).find((filename) =>
        filename.endsWith(".anki21") || filename.endsWith(".anki2")
      );
      if (matchedName) {
        dbFile = zip.file(matchedName);
      }
    }

    if (!dbFile) {
      throw new Error("Không tìm thấy dữ liệu bộ thẻ (collection.anki2) trong file .apkg!");
    }

    const dbBuffer = await dbFile.async("uint8array");

    // 2. Extract Media Mapping & Blob URLs
    const mediaFile = zip.file("media");
    const mediaBlobMap: Record<string, string> = {};
    const mediaAssets: AnkiMediaAsset[] = [];

    if (mediaFile) {
      try {
        const mediaJson = await mediaFile.async("text");
        const mediaMap: Record<string, string> = JSON.parse(mediaJson);

        for (const [zipKey, realFileName] of Object.entries(mediaMap)) {
          const zipMediaEntry = zip.file(zipKey);
          if (zipMediaEntry) {
            const mediaBuffer = await zipMediaEntry.async("blob");
            const mimeType = getMediaContentType(realFileName);
            const typedBlob = new Blob([mediaBuffer], { type: mimeType });
            const objectUrl = URL.createObjectURL(typedBlob);
            mediaBlobMap[realFileName] = objectUrl;
            mediaAssets.push({ filename: realFileName, contentType: mimeType, blob: typedBlob });
          }
        }
      } catch (e) {
        console.warn("Lỗi đọc file media map từ apkg:", e);
      }
    }

    // 3. Parse the SQLite collection. Do not fall back to scanning binary bytes:
    // that cannot reliably recover card schedules or review history.
    try {
      const SQL = await this.getSqlEngine();
      const db: Database = new SQL.Database(dbBuffer);

      // Query Decks & Models
      const colColumns = new Set((db.exec("PRAGMA table_info(col)")[0]?.values || []).map((row) => String(row[1])));
      const selectCol = (name: string) => colColumns.has(name) ? name : "NULL";
      const colResult = db.exec(`SELECT ${selectCol("decks")}, ${selectCol("models")}, ${selectCol("dconf")}, ${selectCol("conf")}, ${selectCol("crt")}, ${selectCol("ver")} FROM col`);
      let decksJson: Record<string, any> = {};
      let modelsJson: Record<string, any> = {};
      let schedulerPresets: Record<string, Record<string, unknown>> = {};
      let collectionConfig: Record<string, unknown> = {};
      let collectionCreatedAt: number | undefined;
      let schedulerVersion: number | undefined;

      if (colResult.length > 0 && colResult[0].values.length > 0) {
        const [decksStr, modelsStr, dconfStr, confStr, crtValue, versionValue] = colResult[0].values[0];
        try {
          decksJson = JSON.parse(decksStr as string);
          modelsJson = JSON.parse(modelsStr as string);
          if (typeof dconfStr === "string") schedulerPresets = JSON.parse(dconfStr);
          if (typeof confStr === "string") collectionConfig = JSON.parse(confStr);
          collectionCreatedAt = Number(crtValue) || undefined;
          schedulerVersion = Number(versionValue) || undefined;
        } catch (e) { throw new Error("Không đọc được cấu hình scheduler trong collection Anki."); }
      }

      // Query Notes
      const notesResult = db.exec("SELECT id, mid, flds, tags FROM notes");
      const notesMap: Map<number, { mid: number; flds: string[]; tags: string[] }> = new Map();

      if (notesResult.length > 0) {
        for (const row of notesResult[0].values) {
          const id = row[0] as number;
          const mid = row[1] as number;
          const rawFlds = (row[2] as string) || "";
          const rawTags = (row[3] as string) || "";

          const flds = rawFlds.split("\x1f");
          const tags = rawTags.trim().split(" ").filter(Boolean);

          notesMap.set(id, { mid, flds, tags });
        }
      }

      // Query Cards
      const cardColumns = new Set((db.exec("PRAGMA table_info(cards)")[0]?.values || []).map((row) => String(row[1])));
      const optionalColumn = (name: string, fallback: string) => cardColumns.has(name) ? name : fallback;
      const cardsResult = db.exec(`SELECT id, nid, did, type, queue, due, ivl, reps, lapses, ${optionalColumn("factor", "0")}, ${optionalColumn("left", "0")}, ${optionalColumn("odue", "0")}, ${optionalColumn("odid", "0")}, ${optionalColumn("data", "''")} FROM cards`);
      const reviewHistoryByCard = new Map<number, AnkiReviewEvent[]>();
      const tableNames = new Set((db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values || []).map((row) => String(row[0])));
      if (tableNames.has("revlog")) {
        const revlogColumns = new Set((db.exec("PRAGMA table_info(revlog)")[0]?.values || []).map((row) => String(row[1])));
        if (["id", "cid", "ease", "ivl", "lastIvl", "factor", "time", "type"].every((column) => revlogColumns.has(column))) {
          const revlogResult = db.exec("SELECT id, cid, ease, ivl, lastIvl, factor, time, type FROM revlog ORDER BY id");
          for (const row of revlogResult[0]?.values || []) {
            const cardId = Number(row[1]);
            const entry: AnkiReviewEvent = {
              id: Number(row[0]),
              reviewedAt: new Date(Number(row[0])).toISOString(),
              rating: Number(row[2]), interval: Number(row[3]), previousInterval: Number(row[4]),
              factor: Number(row[5]), durationMs: Number(row[6]), type: Number(row[7]),
            };
            const history = reviewHistoryByCard.get(cardId) || [];
            history.push(entry);
            reviewHistoryByCard.set(cardId, history);
          }
        }
      }
      const deckMap: Map<string, AnkiCard[]> = new Map();

      if (cardsResult.length > 0) {
        for (const row of cardsResult[0].values) {
          const cardId = row[0] as number;
          const noteId = row[1] as number;
          const deckId = String(row[2]);
          const type = row[3] as number;
          const queue = row[4] as number;
          const due = row[5] as number;
          const ivl = row[6] as number;
          const reps = row[7] as number;
          const lapses = row[8] as number;
          const factor = Number(row[9]) || 0;
          const left = Number(row[10]) || 0;
          const originalDue = Number(row[11]) || 0;
          const originalDeckId = Number(row[12]) || 0;
          const cardData = String(row[13] || "");

          const note = notesMap.get(noteId);
          if (!note) continue;

          const deckMeta = decksJson[deckId] || { name: "Default" };
          const deckName = deckMeta.name || "Default";

          const fields = note.flds;
          const rawFront = fields[0] || "";
          const rawBack = fields[1] || fields[0] || "";

          const frontHtml = processCardHtml(rawFront, mediaBlobMap);
          const backHtml = processCardHtml(rawBack, mediaBlobMap);

          const frontText = cleanHtml(rawFront);
          const backText = cleanHtml(rawBack);

          const koreanText = extractKoreanText(fields) || frontText;
          const vietnameseMeaning = extractVietnameseText(fields) || backText;
          const exampleSentence = extractExampleSentence(fields);

          const audioUrls = extractAudioUrls(rawFront + " " + rawBack, mediaBlobMap);
          const imageUrls = extractImageUrls(rawFront + " " + rawBack, mediaBlobMap);

          let state: "new" | "learning" | "review" = "new";
          if (queue === 1 || queue === 3) state = "learning";
          else if (queue === 2) state = "review";
          const presetId = String(deckMeta.conf ?? 1);
          const schedulerConfig = schedulerPresets[presetId] || schedulerPresets[String(deckMeta.conf)] || undefined;
          const reviewHistory = reviewHistoryByCard.get(cardId) || [];

          const card: AnkiCard = {
            id: cardId,
            noteId,
            deckName,
            frontHtml,
            backHtml,
            frontText,
            backText,
            fields,
            tags: note.tags,
            koreanText,
            vietnameseMeaning,
            exampleSentence,
            audioUrls,
            imageUrls,
            mediaRefs: extractMediaFilenames(rawFront + " " + rawBack),
            dueDate: due,
            interval: ivl,
            reps,
            lapses,
            state,
            reviewHistory,
            ankiSchedule: {
              cardType: Number(type), queue: Number(queue), due: Number(due), interval: Number(ivl),
              factor, reps: Number(reps), lapses: Number(lapses), left,
              originalDue: originalDue || undefined, originalDeckId: originalDeckId || undefined,
              data: cardData || undefined, schedulerConfig, collectionCreatedAt,
              lastReview: reviewHistory[reviewHistory.length - 1]?.reviewedAt,
            },
          };

          if (!deckMap.has(deckName)) {
            deckMap.set(deckName, []);
          }
          deckMap.get(deckName)!.push(card);
        }
      }

      db.close();

      const resultDecks: AnkiDeck[] = [];
      deckMap.forEach((cards, name) => {
        resultDecks.push({
          id: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "deck",
          name,
          cardCount: cards.length,
          cards,
          mediaAssets,
          schedulerPresets,
          schedulerMetadata: { collectionCreatedAt, schedulerVersion, importedAt: new Date().toISOString(), collectionConfig, fsrsEnabled: Boolean(collectionConfig.fsrs) },
        });
      });

      if (resultDecks.length > 0) {
        return resultDecks;
      }
      throw new Error("Không tìm thấy thẻ trong dữ liệu Anki này.");
    } catch (sqlErr) {
      console.error("Could not parse Anki SQLite scheduling data", sqlErr);
      throw sqlErr instanceof Error ? sqlErr : new Error("Không đọc được dữ liệu lịch ôn từ file Anki.");
    }
  }
}

function processCardHtml(rawHtml: string, mediaBlobMap: Record<string, string>): string {
  if (!rawHtml) return "";
  let processed = rawHtml;

  // Replace [sound:filename.mp3]
  processed = processed.replace(/\[sound:(.*?)\]/gi, (_match, fileName) => {
    const trimmed = fileName.trim();
    const blobUrl = mediaBlobMap[trimmed];
    if (blobUrl) {
      return `<div class="my-2 inline-flex items-center gap-2"><audio controls src="${blobUrl}" class="h-8 max-w-[240px]"></audio></div>`;
    }
    return `<span class="text-xs text-amber-400 font-mono">🔊 ${trimmed}</span>`;
  });

  // Replace <img src="filename.png">
  processed = processed.replace(/<img[^>]+src=["'](.*?)["'][^>]*>/gi, (match, src) => {
    const fileName = src.split("/").pop() || src;
    const blobUrl = mediaBlobMap[fileName] || mediaBlobMap[src];
    if (blobUrl) {
      return match.replace(src, blobUrl);
    }
    return match;
  });

  return processed;
}

function extractAudioUrls(rawText: string, mediaBlobMap: Record<string, string>): string[] {
  const urls: string[] = [];
  const matches = rawText.match(/\[sound:(.*?)\]/gi);
  if (matches) {
    for (const match of matches) {
      const fileName = match.replace(/\[sound:/i, "").replace(/\]/, "").trim();
      if (mediaBlobMap[fileName]) {
        urls.push(mediaBlobMap[fileName]);
      }
    }
  }
  return urls;
}

function extractImageUrls(rawText: string, mediaBlobMap: Record<string, string>): string[] {
  const urls: string[] = [];
  const matches = rawText.match(/<img[^>]+src=["'](.*?)["'][^>]*>/gi);
  if (matches) {
    for (const match of matches) {
      const srcMatch = match.match(/src=["'](.*?)["']/i);
      if (srcMatch && srcMatch[1]) {
        const fileName = srcMatch[1].split("/").pop() || srcMatch[1];
        if (mediaBlobMap[fileName]) {
          urls.push(mediaBlobMap[fileName]);
        }
      }
    }
  }
  return urls;
}

function extractMediaFilenames(rawText: string): string[] {
  const refs = new Set<string>();
  for (const match of rawText.matchAll(/\[sound:([^\]]+)\]/gi)) refs.add(match[1].trim());
  for (const match of rawText.matchAll(/<img\b[^>]*\bsrc=["']?([^"'\s>]+)["']?[^>]*>/gi)) refs.add(match[1].trim());
  return [...refs];
}

function getMediaContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "ogg" || ext === "opus") return "audio/ogg";
  if (ext === "wav") return "audio/wav";
  if (ext === "m4a") return "audio/mp4";
  if (ext === "aac") return "audio/aac";
  if (ext === "flac") return "audio/flac";
  return "application/octet-stream";
}

function cleanHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKoreanText(fields: string[]): string | undefined {
  const koreanRegex = /[\uAC00-\uD7A3]+/;
  for (const field of fields) {
    const cleaned = cleanHtml(field);
    if (koreanRegex.test(cleaned)) {
      return cleaned;
    }
  }
  return undefined;
}

function extractVietnameseText(fields: string[]): string | undefined {
  for (let i = 1; i < fields.length; i++) {
    const cleaned = cleanHtml(fields[i]);
    if (cleaned && !/[\uAC00-\uD7A3]+/.test(cleaned)) {
      return cleaned;
    }
  }
  return undefined;
}

function extractExampleSentence(fields: string[]): string | undefined {
  for (const field of fields) {
    const cleaned = cleanHtml(field);
    if (cleaned.length > 20 && /[\uAC00-\uD7A3]+/.test(cleaned)) {
      return cleaned;
    }
  }
  return undefined;
}
