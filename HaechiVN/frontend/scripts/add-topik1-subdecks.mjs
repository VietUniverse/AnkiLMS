// Chia bộ Explore "TOPIK I (Cấp 1~2)" thành deck con theo 30 bài của khóa "TOPIK 1-2" trong course-vocabulary.json.
// Ghi vào trường `subdeck` (không đổi deckName, vì stateKey = deckName_id: đổi là học viên mất tiến độ).
// Chạy: node scripts/add-topik1-subdecks.mjs  (ghi lại src/data/topikCuratedDecks.json và public/data/curated-decks.json)
import { readFileSync, writeFileSync } from "node:fs";

const DECK_ID = "topik-vocab-level1-2";
const FILES = ["src/data/topikCuratedDecks.json", "public/data/curated-decks.json"];
// Lượt 2: từ không có trong khóa TOPIK 1-2 thì xem nó nằm ở bài nào của các khóa khác (Sejong, KIIP, Sơ cấp…),
// rồi quy tên bài đó về số bài TOPIK 1-2 theo từ khóa. Bài kiểu "Động từ thường dùng" không phải chủ đề nên bỏ qua.
const TOPIC_KEYWORDS = [
  ["số đếm", 4], ["thứ ngày", 4], ["ngày tháng", 4], ["thời gian", 4],
  ["mua sắm", 7], ["shopping", 7], ["mua đồ", 7], ["thời trang", 7],
  ["sinh hoạt", 3], ["việc nhà", 3], ["một ngày", 5], ["công việc trong ngày", 5], ["việc phải làm", 5],
  ["quê hương", 1], ["giới thiệu", 1], ["nghề nghiệp", 1], ["quốc gia", 1], ["mở đầu", 1],
  ["thời tiết", 11], ["khí hậu", 11], ["sức khỏe", 19], ["cơ thể", 19], ["bệnh viện", 19],
  ["trường học", 2], ["học tập", 2], ["giáo dục", 2], ["văn phòng phẩm", 2],
  ["tìm đường", 15], ["giao thông", 15], ["biển báo", 15], ["kế hoạch", 29], ["giấc mơ", 29],
  ["nấu ăn", 8], ["ẩm thực", 8], ["món", 8], ["phòng tắm", 9], ["nhà cửa", 9], ["vật dụng trong gia đình", 9],
  ["phòng ngủ", 9], ["đồ vật", 9], ["gia đình", 10], ["họp mặt", 16], ["thăm hỏi", 16], ["quan hệ xã hội", 16],
  ["điện thoại", 12], ["du lịch", 26], ["nghỉ phép", 24], ["cuối tuần", 6], ["hẹn", 17], ["công cộng", 27],
  ["cuộc sống ở hàn", 30], ["chúc mừng", 13], ["sinh nhật", 13], ["phim", 23], ["thư tín", 20], ["đô thị", 28],
  ["ngoại hình", 25], ["sở thích", 14], ["thể thao", 14],
];

const courses = JSON.parse(readFileSync("public/data/course-vocabulary.json", "utf8")).decks.flatMap((d) => d.courses);
const course = courses.find((c) => c.title === "TOPIK 1-2");
if (!course) throw new Error("Không thấy khóa TOPIK 1-2 trong course-vocabulary.json");
const unitByNumber = new Map(course.units.map((u) => [u.number, u.title]));

// Lượt 1: từ có ở nhiều bài thì lấy bài đầu tiên.
const unitOf = new Map();
for (const unit of course.units) for (const w of unit.words) if (!unitOf.has(w[1].trim())) unitOf.set(w[1].trim(), unit.title);

// Lượt 2: đếm số lần mỗi từ rơi vào từng bài (đã quy đổi), lấy bài nhiều nhất, hòa thì bài số nhỏ hơn.
const votes = new Map();
for (const c of courses) {
  if (c === course) continue;
  for (const unit of c.units) {
    const name = unit.title.split(": ").slice(1).join(": ").toLowerCase() || unit.title.toLowerCase();
    const number = TOPIC_KEYWORDS.find(([kw]) => name.includes(kw))?.[1];
    if (!number) continue;
    for (const w of unit.words) {
      const word = w[1].trim();
      const counts = votes.get(word) || new Map();
      counts.set(number, (counts.get(number) || 0) + 1);
      votes.set(word, counts);
    }
  }
}
const votedUnit = (word) => {
  const counts = votes.get(word);
  if (!counts) return undefined;
  const [best] = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return unitByNumber.get(best[0]);
};

for (const file of FILES) {
  const decks = JSON.parse(readFileSync(file, "utf8"));
  const deck = decks.find((d) => d.id === DECK_ID);
  if (!deck) throw new Error(`Không thấy ${DECK_ID} trong ${file}`);
  const stats = { direct: 0, voted: 0, number: 0, other: 0 };
  for (const card of deck.cards) {
    const word = (card.koreanText || card.frontText || "").trim();
    let unit = unitOf.get(word);
    if (unit) stats.direct += 1;
    else if ((unit = votedUnit(word))) stats.voted += 1;
    else if (card.tags?.includes("Số từ")) { unit = unitByNumber.get(4); stats.number += 1; }
    else stats.other += 1;
    card.subdeck = unit || "Từ khác";
  }
  writeFileSync(file, JSON.stringify(decks, null, 2));
  console.log(`${file}: ${JSON.stringify(stats)} / ${deck.cards.length} thẻ`);
}
