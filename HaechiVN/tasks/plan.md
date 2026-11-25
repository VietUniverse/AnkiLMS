# Implementation Plan: Tách VocabularySRSModule.tsx

## Overview
`HaechiVN/frontend/src/components/VocabularySRSModule.tsx` dài khoảng 3000 dòng và chứa cả trang `/flashcards`:
- dòng 1–292: kiểu dữ liệu và hàm thuần;
- dòng 293–~1900: logic (state, effect, hàng đợi học, chấm FSRS, tải bài tập);
- dòng 1904–2055: giao diện bảng tổng quan;
- dòng 2055–~2800: giao diện màn học;
- cuối file: các hộp thoại.

Mục tiêu: tách dần ra nhiều file nhỏ, **không đổi hành vi**, mỗi task là một commit. Làm xong thì logic hàng đợi có test, và việc đồng bộ URL hay tách route study trở nên dễ.
Sau khi được duyệt, plan này được ghi vào `HaechiVN/tasks/plan.md` + `HaechiVN/tasks/todo.md` (hiện chưa có thư mục `tasks/`).

## Architecture Decisions
- **Chỉ di chuyển code, không viết lại.**
  - State dùng chung (`cardStateMap`, `dailyLimits`, `viewMode`) vẫn nằm ở module cha và truyền xuống qua props.
  - Không thêm context hay store mới.
- **Hàm thuần đặt trong `src/lib/`** để chạy được bằng script `node` thuần.
  - Theo mẫu có sẵn `frontend/scripts/check-fsrs-learning-steps.mjs` (import file `.ts` trực tiếp; máy đang dùng Node 24).
  - Repo chưa có vitest/jest nên không thêm.
- Nơi duy nhất import module này là `src/app/flashcards/page.tsx`, và chỉ import `VocabularySRSModule`. Tên export đó giữ nguyên.

## Task List

### Phase 0
- [ ] **Task 0: Commit các thay đổi hôm nay** (XS)
  - Gồm: thứ tự Review→Typing đếm theo từ, mặc định 5 từ/ngày, hộp "Từ mới mỗi ngày" thay dòng thông báo, cache bài tập, tiêu đề "Nhập số từ mới".
  - Accept: `git status` sạch.
  - Verify: typecheck qua.
  - Deps: không có.

### Phase 1: Phần thuần (rủi ro thấp)
- [ ] **Task 1: Chuyển kiểu dữ liệu và hàm thuần sang `src/lib/vocabCards.ts`** (S)
  - Nội dung (dòng 46–292):
    - kiểu: `VocabularyCard`, `DeckTreeNode`, `Assignment*`;
    - hàm: `stateKeyOf`, `cardStateFor`, `isCardAWritingCard`, `cleanTextOnly`, `stripTypingPunctuation`, `toThthMediaUrl`, `extractImageSrc/AudioSrc`, `assignmentCardsOf`, `formatNextReview`, `toSlug`, `checkWritingVariantMatch`.
  - Accept:
    - module ngắn đi khoảng 250 dòng;
    - không đổi logic;
    - `page.tsx` không phải sửa.
  - Verify: `npm run typecheck`; lint không thêm lỗi (hiện có 15 lỗi sẵn); trang `/flashcards` tải 200.
  - Files: `VocabularySRSModule.tsx`, `src/lib/vocabCards.ts`.
- [ ] **Task 2: Tách hàng đợi học thành `buildStudyQueue()` trong `src/lib/studyQueue.ts`, kèm self-check** (S)
  - Lấy đoạn xây `dueCards`/`newCards`/`newSession` trong `startStudy`. Input là cards, cardStateMap, newLeft, reviewLeft, reviewOnly. Output là `{ activeList, newWords, newWordCards, dueCount }`.
  - Accept: `startStudy` gọi hàm mới, hành vi giữ nguyên.
  - Script `scripts/check-study-queue.mjs` kiểm:
    - hạn mức đếm theo từ (2 từ thì 4 thẻ);
    - R1…Rn đứng trước T1…Tn;
    - thẻ đến hạn xếp Review trước Typing;
    - từ có Review đã thuộc mà Typing còn mới vẫn tính là 1 từ;
    - bộ writing không có thẻ Typing.
  - Verify: `node scripts/check-study-queue.mjs` exit 0; typecheck.
  - Deps: Task 1.

### Checkpoint 1
- [ ] Typecheck, lint không thêm lỗi, cả hai script self-check qua.
- [ ] Học thử trên localhost một bộ thường: mục tiêu 2 thì ra R1 R2 T1 T2.

### Phase 1.5: Sửa 15 lỗi lint có sẵn (làm trước Task 3)
Mục tiêu: `npx eslint src/components/VocabularySRSModule.tsx` còn **0 lỗi** (warning để sau), không đổi hành vi.
Sửa trước khi tách component để lúc tách không phải mang lỗi theo.
Quyết định của user:
- localStorage: viết lại bằng `useSyncExternalStore`, không tắt lint.
- Các chỗ khác: chỉ khi không có cách sửa sạch mới tắt lint, và phải ghi lý do.

- [ ] **Task L1: Bỏ `any` ở `adminThthDecks`/`adminWritingDecks`** (XS) — 2 lỗi `no-explicit-any`, dòng 58–59
  - Khai báo kiểu tối thiểu cho các trường module đang dùng, rồi đổi kiểu trả về của `loadAdminThthCurriculum`/`loadAdminWritingCurriculum` (`src/lib/privateLearningContent.ts`, hiện là `Promise<any[] | null>`).
  - Accept: hết 2 lỗi; typecheck qua.
  - Files: `VocabularySRSModule.tsx`, `privateLearningContent.ts`.
- [ ] **Task L2: Ba hàm đệ quy thành hàm thuần** (S) — 3 lỗi `immutability`
  - `findNodeById` (dòng ~695), `getAllContainerIds` (~878), `filterTree` (~894) đang là `useCallback` tự gọi lại chính nó. Chuyển sang `src/lib/vocabCards.ts` thành hàm thường, bỏ `useCallback` và dependency tương ứng.
  - Accept:
    - hết 3 lỗi;
    - ô tìm kiếm bộ thẻ, nút mở/đóng tất cả, link `?deckId=` vẫn chạy.
  - Verify: thêm vài assert cho `filterTree`/`findNodeById` vào một script self-check.
- [ ] **Task L3: Đọc localStorage bằng `useSyncExternalStore`** (S) — 3 lỗi
  - Dòng ~184: `dailyLimits`/`dailyProgress`. Dòng ~288: từ đã thuộc, danh sách ôn, bài học cuối. Dòng ~1266: độ rộng panel từ điển.
  - Theo mẫu `hydrated` (dòng 81). Lúc render phía server trả giá trị mặc định. Ghi xong thì phát sự kiện để đọc lại; `haechivn:daily-progress-updated` đã có sẵn.
  - Accept:
    - hết 3 lỗi;
    - không có cảnh báo hydration trong console;
    - đổi mục tiêu, học xong một thẻ, kéo panel từ điển rồi F5 thì giá trị vẫn đúng.
  - Files: `VocabularySRSModule.tsx`, có thể thêm `src/lib/dailyLimits.ts`.
- [ ] **Task L4: Bỏ effect chỉ dùng để reset state** (S) — 3 lỗi
  - Dòng ~69: đăng xuất thì xoá `userFsrsConfig`; dòng ~195: reset bộ thẻ admin. Đổi thành tính ra lúc render: `currentUser ? state : null`.
  - Dòng ~205: xoá ô nhập Writing khi đổi thẻ. Đổi thành reset ngay trong render khi `currentCardIndex` đổi (mẫu "prev value" đã dùng trong `DailyLimitsPanel.tsx`).
  - Accept:
    - hết 3 lỗi;
    - đăng xuất rồi đăng nhập lại thì cấu hình FSRS đúng người;
    - sang thẻ Writing mới thì ô nhập trống.
- [ ] **Task L5: Ba effect còn lại** (S) — 3 lỗi
  - Dòng ~1234: từ điển khi ô tìm rỗng. Đổi thành `results = q ? state : []`.
  - Dòng ~780: mở bộ từ link `?study=&deckId=`; dòng ~1601: `?review=true`. Hai effect này gọi `startStudy`/`startReviewAll` khi trang tải xong, đây là phản ứng với URL nên có thể không có cách sửa sạch. Thử trước: đưa phần đọc URL ra khỏi effect. Không được thì tắt lint ngay dòng đó và ghi lý do.
  - Accept: hết 3 lỗi; link `/flashcards?study=true&deckId=X`, `?assignment=`, `?review=true` vẫn vào thẳng lượt học.
- [ ] **Task L6: `renderTreeNode` thành component `<DeckTreeRow>`** (S) — 1 lỗi `refs`, dòng ~1776
  - `renderTreeNode` là hàm thường được gọi trong lúc render và chạm tới hàm có dùng ref. Đổi thành component nhận props, việc này cũng là bước đầu của Task 5.
  - Accept: hết lỗi; cây bộ thẻ hiển thị, mở/đóng, số Mới/Ôn/% giống trước.

### Checkpoint Lint
- [ ] `npx eslint src/components/VocabularySRSModule.tsx` hết lỗi (error = 0); typecheck qua; hai script self-check qua.
- [ ] Thử thủ công:
  - cây bộ thẻ: tìm kiếm, mở/đóng;
  - học một bộ thường và một bài tập;
  - link `?deckId=`, `?review=true`;
  - panel từ điển và F5;
  - đăng xuất rồi đăng nhập lại.
- [ ] Mỗi task L1–L6 là một commit riêng.

### Phase 2: Logic có state
- [ ] **Task 3: Hook `src/hooks/useAssignedDecks.ts`** (S–M)
  - Gồm: tải `/api/classes`, cache thẻ bài tập (`assignedPayloads`), `assignedStats`.
  - `openAssignedDeck` nhận `startStudy` qua tham số.
  - Accept: số Mới/Ôn/% của bài tập vẫn cập nhật sau khi chấm thẻ; mỗi bài chỉ gọi `getClassAssignment` một lần (xem tab Network).
  - Verify: typecheck; mở trang khi đã đăng nhập, học một bài tập.
  - Deps: Task 1.
- [ ] **Task 4: Tách các hộp thoại thành component riêng** (S)
  - Hộp "Nhập số từ mới" (morePrompt) → `MoreNewWordsDialog.tsx`.
  - Accept: hộp vẫn hiện "Số từ mới còn lại: x (y thẻ)", nút Thêm và Esc hoạt động như cũ.
  - Deps: Task 2.

### Checkpoint 2
- [ ] Học một bộ thường và một bài tập từ đầu đến hết.
- [ ] Hết hạn mức thì: bộ thường hiện hộp "học thêm", bài tập hiện hộp mục tiêu.

### Phase 3: Giao diện
- [ ] **Task 5: `FlashcardsDashboard.tsx`** (M)
  - Phần JSX `viewMode === "dashboard"`: cây bộ thẻ, bài tập, ô Học tiếp/Ôn tập/Mục tiêu, `limitNotice`.
  - Accept: giao diện giống hệt trước (so ảnh chụp sáng/tối); mở/đóng cây và bấm vào bộ vẫn chạy.
  - Deps: Task 3.
- [ ] **Task 6: `StudySession.tsx`** (M–L)
  - Phần JSX `viewMode === "study"`, khoảng 750 dòng.
  - Đọc kỹ sau Task 5 rồi chia nhỏ tiếp nếu lớn hơn M, ví dụ 6a ô gõ Typing, 6b thẻ Writing, 6c khung từ điển.
  - Accept: lật thẻ, gõ Typing, phím tắt, âm thanh, từ điển, thẻ Writing đều chạy như cũ.
  - Deps: Task 5.
- [ ] **Task 7: Đồng bộ URL khi học** (S)
  - Vào học thì dùng `pushState` thành `/flashcards?study=true&deckId=X`. Bấm Back thì gọi `exitStudy`, F5 thì vào lại đúng bộ.
  - Đọc link như vậy đã có sẵn ở khoảng dòng 1035–1045.
  - Deps: Task 6.

### Checkpoint: Complete
- [ ] Module cha còn dưới ~1000 dòng.
- [ ] Mọi luồng ở Checkpoint 1–2 vẫn chạy.
- [ ] Back và F5 khi đang học hoạt động đúng.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Component con cần quá nhiều props | Med | Gom props theo nhóm (`study`, `limits`); nếu hơn khoảng 25 props thì cân nhắc đưa logic xuống cùng |
| Ref/effect ngầm phụ thuộc nhau (`lastRatedCardRef`, `countedNewWordsRef`, âm thanh) | High | Ref vẫn để ở cha; Task 6 làm riêng và test kỹ phím tắt, âm thanh |
| Không có test giao diện | Med | Học thử thủ công ở mỗi checkpoint; logic thuần thì có script self-check |
| 15 lỗi lint có sẵn làm che lỗi mới | Low | Phase 1.5 sửa hết trước khi tách component |
| Đổi effect thành `useSyncExternalStore` hoặc tính lúc render làm lệch hydrate hay đổi thời điểm cập nhật | Med | Mỗi task một commit, học thử theo Checkpoint Lint, xem console có cảnh báo hydration không |

## Open Questions
- Task 1–4 có giao cho DeepSeek (quy trình giao việc qua OpenCode) không, hay Claude tự làm hết? Task 5–7 nên để Claude tự làm.
- Task 7 chỉ đồng bộ URL, hay sau đó vẫn muốn tách hẳn route `/flashcards/study`?
