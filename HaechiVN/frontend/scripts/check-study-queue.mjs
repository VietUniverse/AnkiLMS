// Self-check: `node scripts/check-study-queue.mjs` — thứ tự Review/Typing và hạn mức từ mới đếm theo từ.
import assert from "node:assert/strict";
import { buildStudyQueue, learnAheadCards, sessionProgress } from "../src/lib/studyQueue.ts";
import { buildAssignedTree, deckPathOf, filterTree, findNodeById } from "../src/lib/vocabCards.ts";

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

// Từ đã trừ suất hôm nay (đã học Review ở lượt trước, còn Typing): học tiếp dù hết hạn mức, không tốn suất.
q = buildStudyQueue([card(1), card(2)], { d_1: learned("2026-12-30") }, { ...opts, newLeft: 0, countedToday: new Set(["d_1"]) });
assert.equal(label(q), "T1");
assert.equal(q.newWords, 1);

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

// Cây bộ thẻ: tìm node theo id ở mọi tầng; lọc giữ nhánh cha khi con khớp.
const tree = [{ id: "a", title: "Quyển 1", cards: [], children: [{ id: "a1", title: "Bài 1", cards: [card(1, { word: "사과", meaning: "táo" })] }, { id: "a2", title: "Bài 2", cards: [card(2)] }] }];
assert.equal(findNodeById(tree, "a2")?.title, "Bài 2");
assert.equal(findNodeById(tree, "x"), null);
assert.deepEqual(filterTree(tree, "táo").map((n) => n.children.map((c) => c.id)), [["a1"]]);
assert.equal(filterTree(tree, "không có").length, 0);

// Learn ahead: chỉ thẻ đến hạn trong 20 phút, sắp theo giờ đến hạn, không lặp thẻ.
const at = (min) => ({ ...learned("2026-11-25"), state: "learning", dueAt: new Date(now.getTime() + min * 60_000).toISOString() });
const ahead = learnAheadCards([card(1), card(2), card(3), card(1)], { d_1: at(15), d_2: at(1), d_3: at(30) }, now);
assert.deepEqual(ahead.map((c) => c.id), [2, 1]);
assert.equal(learnAheadCards([card(1)], { d_1: learned("2026-11-30") }, now).length, 0);
// Thẻ vừa chấm (d_2, đến hạn sớm nhất) xếp cuối nếu còn thẻ khác; chỉ còn nó thì vẫn học.
assert.deepEqual(learnAheadCards([card(1), card(2)], { d_1: at(15), d_2: at(1) }, now, 20, "d_2").map((c) => c.id), [1, 2]);
assert.deepEqual(learnAheadCards([card(2)], { d_2: at(1) }, now, 20, "d_2").map((c) => c.id), [2]);

// Mở bộ: thẻ đang học còn 5 phút nữa mới đến hạn vẫn vào lượt (học trước), 30 phút thì chưa.
assert.equal(label(buildStudyQueue([card(1), card(2)], { d_1: at(5), d_1_typing: at(30), d_2: learned("2026-12-30"), d_2_typing: learned("2026-12-30") }, { ...opts, newLeft: 0 })), "R1");

// Thanh tiến độ: nối thêm 10 thẻ ở thẻ cuối (95%) thì chạy tiếp từ 95% lên, không tụt về 50%.
const seg = { index: 10, percent: sessionProgress(9, 10, { index: 0, percent: 0 }) };
assert.equal(seg.percent, 90);
assert.equal(sessionProgress(10, 20, seg), 90);
assert.equal(sessionProgress(15, 20, seg), 95);
assert.equal(sessionProgress(19, 20, seg), 99);
assert.equal(sessionProgress(20, 20, seg), 100);

// Bài tập lớp theo cấu trúc bộ thẻ gốc.
assert.deepEqual(deckPathOf("Tiếng Hàn Tổng Hợp 1 · Bài 1 (Trọn bài)"), ["Tiếng Hàn Tổng Hợp 1", "Bài 1"]);
assert.deepEqual(deckPathOf("THTH::Quyển 1::Bài 6"), ["THTH", "Quyển 1", "Bài 6"]);
assert.deepEqual(deckPathOf("Bài 4"), ["Bài 4"]);
const asgItem = (id, deckName) => ({ id, classId: "c", className: "Lớp A", title: `Tên bài tập ${id}`, deckName, totalCards: 2, reviewedCards: 0, completed: false, dueLabel: "Không hạn" });
const asgCard = (id, deckPath) => ({ id, korean: `k${id}`, meaning: `m${id}`, deckPath });
const atree = buildAssignedTree(
  [asgItem("a1", "THTH1::Bài 1"), asgItem("a2", "THTH1::Bài 2"), asgItem("a3", "Bài 4")],
  {
    a1: { id: "a1", classId: "c", title: "x", deckName: "THTH1::Bài 1", deckCards: [asgCard(1, "THTH1::Bài 1::Từ vựng"), asgCard(2, "THTH1::Bài 1::Ngữ pháp")] },
    a2: { id: "a2", classId: "c", title: "x", deckName: "THTH1::Bài 2", deckCards: [asgCard(3, "THTH1::Bài 2"), asgCard(4)] },
  },
);
const shape = (n) => `${n.title}${n.groupOnly ? "*" : ""}(${n.cards.length})${n.children?.length ? `[${n.children.map(shape).join(",")}]` : ""}`;
// Deck mẹ THTH1 gom 2 bài; bài 1 giữ 2 deck con; tên nút là tên deck, không phải tên bài tập; bài cũ không có deckPath vẫn đúng chỗ.
assert.equal(atree.map(shape).join(" "), "THTH1*(4)[Bài 1(2)[Từ vựng(1),Ngữ pháp(1)],Bài 2(2)] Bài 4(0)");
assert.equal(atree[0].children[0].id, "assignment-a1");
assert.equal(atree[0].children[0].children[0].assignment.id, "a1");

console.log("ok: study queue counts new words per word and orders Review before Typing");
