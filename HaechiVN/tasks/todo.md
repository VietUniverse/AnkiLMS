# Todo: Tách VocabularySRSModule.tsx

Chi tiết từng task, tiêu chí chấp nhận và cách kiểm: xem `tasks/plan.md`.

- [x] Task 0: Commit các thay đổi hôm nay (XS)
- [x] Task 1: Kiểu dữ liệu + hàm thuần sang `src/lib/vocabCards.ts` (S) — deps: 0
- [x] Task 2: `buildStudyQueue()` trong `src/lib/studyQueue.ts` + `scripts/check-study-queue.mjs` (S) — deps: 1
- [ ] Checkpoint 1: typecheck ✓, lint không thêm lỗi ✓, 2 script self-check ✓ — còn học thử R1 R2 T1 T2 (cần đăng nhập)
- [x] Task L1: Bỏ `any` ở bộ thẻ admin (XS) — deps: 2
- [x] Task L2: findNodeById / getAllContainerIds / filterTree thành hàm thuần (S)
- [x] Task L3: localStorage đọc bằng useSyncExternalStore (S)
- [x] Task L4: Bỏ effect chỉ để reset state (S)
- [x] Task L5: Effect từ điển + link ?deckId / ?review (S)
- [x] Task L6: renderTreeNode thành <DeckTreeRow> (S)
- [ ] Checkpoint Lint: eslint 0 lỗi ✓, typecheck ✓, self-check ✓ — còn thử tay các luồng (cần đăng nhập)
- [ ] Task 3: Hook `src/hooks/useAssignedDecks.ts` (S–M) — deps: 1
- [ ] Task 4: `MoreNewWordsDialog.tsx` (S) — deps: 2
- [ ] Checkpoint 2: học hết 1 bộ thường + 1 bài tập; hộp hết hạn mức đúng loại
- [ ] Task 5: `FlashcardsDashboard.tsx` (M) — deps: 3
- [ ] Task 6: `StudySession.tsx` (M–L, chia nhỏ sau khi đọc) — deps: 5
- [ ] Task 7: Đồng bộ URL khi học (pushState, Back, F5) (S) — deps: 6
- [ ] Checkpoint: module cha < ~1000 dòng, mọi luồng chạy, Back/F5 đúng
