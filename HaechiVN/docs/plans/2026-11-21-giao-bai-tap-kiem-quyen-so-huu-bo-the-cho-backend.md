# Giao việc backend: kiểm quyền sở hữu bộ thẻ khi giao bài tập

Ngày: 21/11/2026 · Trạng thái: **chờ backend** · Phía frontend: không làm.

## Hiện trạng

- Giáo viên giao bài bằng cách chọn một bộ thẻ trong **kho thẻ của chính mình** (`userDecks`,
  `src/components/ClassroomModule.tsx`, `assignmentDecks`). UI đã lọc đúng — không còn
  các bộ sách dựng sẵn.
- Payload gửi lên server chứa **nguyên mảng `deckCards`** (tối đa 500 thẻ) cùng
  `deckName`, và `functions/api/classes.ts` chỉ kiểm *định dạng* thẻ (id, korean, meaning,
  độ dài, media id) — **không kiểm bộ thẻ đó có thuộc về người giao hay không**.
- Kho thẻ của người dùng hiện **không nằm trong D1**: nó lưu phía client
  (`localStorage` + đồng bộ qua `learning-data`), nên server không có nguồn nào để đối chiếu.

## Rủi ro

Một giáo viên (hoặc ai gọi thẳng API bằng session hợp lệ của mình) có thể gửi bất kỳ
`deckCards` nào — kể cả nội dung không thuộc kho thẻ của họ — rồi giao cho lớp.
Chặn ở UI chỉ ngăn đường bấm thông thường, không phải ranh giới tin cậy.

## Việc backend cần làm

1. Đưa kho thẻ người dùng lên D1 (bảng `user_decks`: `user_id`, `deck_id`, `name`,
   `card_count`, `visibility`, `updated_at`, tối thiểu là id + quyền sở hữu).
2. Khi `POST /api/classes` với `action = "assignment"` (và `update_assignment`):
   nhận `deckId` thay vì (hoặc song song với) `deckCards`, rồi
   - kiểm `user_decks.user_id = user.id`, nếu không có → `403`;
   - đọc thẻ từ server (hoặc so khớp hash/độ dài với bản đã lưu) để dựng `deck_json`.
3. Giữ giới hạn hiện có: ≤ 500 thẻ/bài, ≤ 60 MB media, thẻ phải có `korean` + `meaning`.

## Nghiệm thu

- Gọi API giao bài với `deckId` của người khác → `403`, không tạo assignment.
- Gọi API với `deckId` không tồn tại → `400`.
- Giao bài bình thường từ UI vẫn chạy, `deck_json` và tiến độ học viên không đổi.
- `assignment_progress` / `review_card` giữ nguyên hành vi (đã kiểm `assigned_user_ids`).

## Không thuộc phạm vi việc này

- Đổi UI (đã xong: picker chỉ hiện kho thẻ, có chọn học viên).
- Chuyển toàn bộ `learning-data` sang D1 — chỉ cần phần kho thẻ.
