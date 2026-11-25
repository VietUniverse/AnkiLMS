// Chia bộ Explore "TOPIK I (Cấp 1~2)" thành deck con theo 30 bài của khóa "TOPIK 1-2" trong course-vocabulary.json.
// Ghi vào trường `subdeck` (không đổi deckName, vì stateKey = deckName_id: đổi là học viên mất tiến độ).
// Chạy: node scripts/add-topik1-subdecks.mjs  (ghi lại src/data/topikCuratedDecks.json và public/data/curated-decks.json)
import { readFileSync, writeFileSync } from "node:fs";

const DECK_ID = "topik-vocab-level1-2";
const FILES = ["src/data/topikCuratedDecks.json", "public/data/curated-decks.json"];

const course = JSON.parse(readFileSync("public/data/course-vocabulary.json", "utf8"))
  .decks.flatMap((d) => d.courses).find((c) => c.title === "TOPIK 1-2");
if (!course) throw new Error("Không thấy khóa TOPIK 1-2 trong course-vocabulary.json");

// Từ có ở nhiều bài thì lấy bài đầu tiên.
const unitOf = new Map();
for (const unit of course.units) for (const w of unit.words) if (!unitOf.has(w[1].trim())) unitOf.set(w[1].trim(), unit.title);

for (const file of FILES) {
  const decks = JSON.parse(readFileSync(file, "utf8"));
  const deck = decks.find((d) => d.id === DECK_ID);
  if (!deck) throw new Error(`Không thấy ${DECK_ID} trong ${file}`);
  let matched = 0;
  for (const card of deck.cards) {
    const unit = unitOf.get((card.koreanText || card.frontText || "").trim());
    if (unit) matched += 1;
    card.subdeck = unit || "Từ khác";
  }
  writeFileSync(file, JSON.stringify(decks, null, 2));
  console.log(`${file}: ${matched}/${deck.cards.length} thẻ khớp bài`);
}
