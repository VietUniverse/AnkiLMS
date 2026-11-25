// Self-check: `node scripts/check-study-queue.mjs` — thứ tự Review/Typing và hạn mức từ mới đếm theo từ.
import assert from "node:assert/strict";
import { buildStudyQueue } from "../src/lib/studyQueue.ts";

const now = new Date("2026-11-25T07:00:00Z");
const card = (id, extra = {}) => ({ id, word: `w${id}`, meaning: `m${id}`, deckName: "d", ...extra });
const learned = (dueDate) => ({ interval: 3, reps: 2, lapses: 0, state: "review", dueDate, stability: 3, difficulty: 5, lastReview: "2026-11-20", easeFactor: 2.5 });
const label = (q) => q.activeList.map((c) => `${c.sibling ? "T" : "R"}${c.id}`).join(" ");
const opts = { now, newLeft: 2, reviewLeft: Infinity };

// Hạn mức 2 từ: 4 thẻ, hết Review của đợt rồi mới tới Typing.
let q = buildStudyQueue([card(1), card(2), card(3)], {}, opts);
assert.equal(label(q), "R1 R2 T1 T2");
assert.equal(q.newWords, 3);
assert.equal(q.newWordCards, 6);

// Review đã thuộc, Typing còn mới: vẫn là 1 từ mới, chỉ còn thẻ Typing.
q = buildStudyQueue([card(1), card(2)], { d_1: learned("2026-12-30") }, opts);
assert.equal(label(q), "R2 T1 T2");
assert.equal(q.newWords, 2);
assert.equal(q.newWordCards, 3);

// Thẻ đến hạn: Review trước Typing, đứng trước thẻ mới; reviewOnly bỏ thẻ mới.
const due = { d_1: learned("2026-11-24"), d_1_typing: learned("2026-11-24"), d_2: learned("2026-11-24"), d_2_typing: learned("2026-11-24") };
q = buildStudyQueue([card(1), card(2), card(3)], due, opts);
assert.equal(label(q), "R1 R2 T1 T2 R3 T3");
assert.equal(q.dueCount, 4);
assert.equal(label(buildStudyQueue([card(1), card(2), card(3)], due, { ...opts, reviewOnly: true })), "R1 R2 T1 T2");

// Hết hạn mức: không có thẻ mới, nhưng vẫn báo số từ còn lại.
q = buildStudyQueue([card(1)], {}, { ...opts, newLeft: 0 });
assert.equal(q.activeList.length, 0);
assert.equal(q.newWords, 1);

// Bộ writing không có thẻ Typing; thẻ bị tạm hoãn (queue -1) bị bỏ.
assert.equal(label(buildStudyQueue([card(1, { pos: "Viết" }), card(2, { pos: "Viết" })], {}, opts)), "R1 R2");
assert.equal(label(buildStudyQueue([card(1, { ankiSchedule: { queue: -1 } }), card(2)], {}, opts)), "R2 T2");

console.log("ok: study queue counts new words per word and orders Review before Typing");
