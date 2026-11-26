// Self-check vocabGrowth: node scripts/check-vocab-growth.mjs
import assert from "node:assert/strict";
import { vocabGrowth } from "../src/lib/vocabGrowth.ts";
const now = Date.parse("2026-11-26T05:00:00Z");
const states = [
  { deck_id: "d", card_id: 1, interval: 30, state: "review", last_review: "2026-11-25" },
  { deck_id: "d", card_id: 2, interval: 3, state: "review", last_review: "2026-11-24" },
  { deck_id: "d", card_id: 3, interval: 0, state: "new", last_review: null },
];
const logs = [
  { deck_id: "d", card_id: 1, scheduled_days: 0, review_time: "2026-11-23T01:00:00Z" },
  { deck_id: "d", card_id: 1, scheduled_days: 10, review_time: "2026-11-25T01:00:00Z" },
];
const days = vocabGrowth(states, logs, 4, now);
assert.deepEqual(days.map((d) => d.day), ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26"]);
assert.deepEqual(days.map((d) => [d.young, d.mature]), [[1, 0], [2, 0], [1, 1], [1, 1]]);
// null: từ ngày học đầu tiên (23/11) tới hôm nay.
assert.deepEqual(vocabGrowth(states, logs, null, now).map((d) => d.day), days.map((d) => d.day));
console.log("ok");
