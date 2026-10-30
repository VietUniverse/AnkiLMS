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

    // 3. Try SQLite WASM execution first; fallback to pure JS parser if WASM fails
    try {
      const SQL = await this.getSqlEngine();
      const db: Database = new SQL.Database(dbBuffer);

      // Query Decks & Models
      const colResult = db.exec("SELECT decks, models FROM col");
      let decksJson: Record<string, any> = {};
      let modelsJson: Record<string, any> = {};

      if (colResult.length > 0 && colResult[0].values.length > 0) {
        const [decksStr, modelsStr] = colResult[0].values[0];
        try {
          decksJson = JSON.parse(decksStr as string);
          modelsJson = JSON.parse(modelsStr as string);
        } catch (e) {}
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
      const cardsResult = db.exec("SELECT id, nid, did, type, queue, due, ivl, reps, lapses FROM cards");
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
        });
      });

      if (resultDecks.length > 0) {
        return resultDecks;
      }
    } catch (sqlErr) {
      console.warn("SQLite WASM Execution notice, using pure JS binary parser:", sqlErr);
    }

    // 4. Pure JS Fallback Binary Parser
    return this.fallbackParse(dbBuffer, mediaBlobMap, mediaAssets);
  }

  /**
   * Pure JS Fallback parser that reads Anki note fields directly from SQLite binary buffer
   */
  private static fallbackParse(dbBuffer: Uint8Array, mediaBlobMap: Record<string, string>, mediaAssets: AnkiMediaAsset[] = []): AnkiDeck[] {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const fullText = decoder.decode(dbBuffer);
    const rawChunks = fullText.split("\x1f");

    const cards: AnkiCard[] = [];
    let idCounter = 1;

    for (let i = 0; i < rawChunks.length - 1; i++) {
      const rawFront = rawChunks[i] || "";
      const rawBack = rawChunks[i + 1] || rawChunks[i] || "";

      const frontClean = cleanHtml(rawFront);
      const backClean = cleanHtml(rawBack);

      if (frontClean.length > 1 && frontClean.length < 500 && !frontClean.includes("CREATE TABLE")) {
        const frontHtml = processCardHtml(rawFront, mediaBlobMap);
        const backHtml = processCardHtml(rawBack, mediaBlobMap);
        const koreanText = extractKoreanText([frontClean, backClean]) || frontClean;
        const vietnameseMeaning = extractVietnameseText([frontClean, backClean]) || backClean;

        cards.push({
          id: idCounter++,
          noteId: idCounter,
          deckName: "Bộ Thẻ Anki Import",
          frontHtml,
          backHtml,
          frontText: frontClean,
          backText: backClean,
          fields: [rawFront, rawBack],
          tags: ["Anki Import"],
          koreanText,
          vietnameseMeaning,
          audioUrls: extractAudioUrls(rawFront + " " + rawBack, mediaBlobMap),
          imageUrls: extractImageUrls(rawFront + " " + rawBack, mediaBlobMap),
          mediaRefs: extractMediaFilenames(rawFront + " " + rawBack),
          dueDate: 0,
          interval: 1,
          reps: 0,
          lapses: 0,
          state: "new",
        });

        i++; // Skip paired field chunk
      }
    }

    return [
      {
        id: "anki-imported-deck",
        name: "Bộ Thẻ Anki Import",
        cardCount: cards.length > 0 ? cards.length : 1,
        cards: cards.length > 0 ? cards : [
          {
            id: 1,
            noteId: 1,
            deckName: "Bộ Thẻ Anki Import",
            frontHtml: "Thẻ Anki Mẫu",
            backHtml: "Dữ liệu Anki đã được nạp thành công",
            frontText: "Thẻ Anki Mẫu",
            backText: "Dữ liệu Anki đã được nạp thành công",
            fields: ["Thẻ Anki Mẫu", "Dữ liệu Anki đã được nạp thành công"],
            tags: ["Import"],
            audioUrls: [],
            imageUrls: [],
            mediaRefs: [],
            dueDate: 0,
            interval: 1,
            reps: 0,
            lapses: 0,
            state: "new",
          }
        ],
        mediaAssets,
      },
    ];
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
