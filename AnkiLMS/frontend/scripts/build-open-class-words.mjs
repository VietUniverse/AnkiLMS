// Tạo từ vựng cho 6 lớp mở (Sơ cấp 1 → Cao cấp 2) từ phần NIKL của từ điển (CC BY-SA, xem src/data/THIRD_PARTY_DATA.md).
// Chạy lại khi từ điển đổi: node scripts/build-open-class-words.mjs
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rows = JSON.parse(readFileSync(path.join(root, "public/data/dictionary-ko-multi.json"), "utf8"));
const classes = [
  ["so-cap-1", "초급", 0], ["so-cap-2", "초급", 1],
  ["trung-cap-1", "중급", 0], ["trung-cap-2", "중급", 1],
  ["cao-cap-1", "고급", 0], ["cao-cap-2", "고급", 1],
];
const TRIAL = 20;

const full = {};
const trial = {};
for (const [key, level, part] of classes) {
  // Từ ngắn thường cơ bản hơn nên học trước; mỗi cấp chia đôi thành lớp 1 và lớp 2.
  const words = rows
    .filter((row) => row[5] === level && row[2])
    .sort((a, b) => a[0].length - b[0].length || a[0].localeCompare(b[0], "ko"))
    // Từ điển gộp các từ đồng âm nên chỉ giữ 3 nghĩa đầu cho thẻ gọn.
    .map((row) => [row[0], row[2].split(/\s*;\s*/).slice(0, 3).join("; "), row[4] || ""]);
  const half = Math.ceil(words.length / 2);
  full[key] = part === 0 ? words.slice(0, half) : words.slice(half);
  trial[key] = { count: full[key].length, words: full[key].slice(0, TRIAL) };
  assert.ok(full[key].length >= TRIAL, `${key} có quá ít từ`);
}
assert.equal(new Set(Object.values(full).flat().map((word) => word[0])).size, Object.values(full).flat().length, "một từ nằm ở hai lớp");

const header = "// Tạo bởi scripts/build-open-class-words.mjs từ dữ liệu NIKL (CC BY-SA 2.0 KR). Không sửa tay.\n";
writeFileSync(path.join(root, "src/data/openClassWords.ts"),
  `${header}export const OPEN_CLASS_WORDS: Record<string, [string, string, string][]> = ${JSON.stringify(full)};\n`);
writeFileSync(path.join(root, "src/data/openClassTrial.ts"),
  `${header}export const OPEN_CLASS_TRIAL: Record<string, { count: number; words: [string, string, string][] }> = ${JSON.stringify(trial, null, 1)};\n`);
console.log(Object.entries(full).map(([key, words]) => `${key}: ${words.length}`).join(", "));
