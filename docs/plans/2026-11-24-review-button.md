# Nút "Ôn tập" chỉ ôn nội dung trong /flashcards của user

## Điều được nói
- Thêm nút **Ôn tập**.
- Chỉ ôn những nội dung đã có trong `/flashcards` của user.

## Tự giả định (nói rõ để sửa nếu sai)
- "Nội dung trong /flashcards" = cây bộ thẻ ở dashboard `/flashcards` (`deckTree`: giáo trình
  Tiếng Hàn Tổng Hợp do admin phát, Từ vựng cơ bản, và bộ thẻ user tự thêm). Bảng Hangeul là
  module riêng nên không nằm trong phạm vi.
- "Ôn tập" = phiên chỉ gồm thẻ **đã học và đang đến hạn** theo FSRS, không kéo thẻ mới.

## Phases
1. `startStudy(...)` thêm `options.reviewOnly`:
   - danh sách = `dueCards` (không cộng thẻ mới);
   - không cắt theo `reviewPerDay` — hạn mức này đang bị hardcode 0 trong `loadLimits`, nếu cắt
     thì phiên luôn rỗng;
   - không hỏi "học thêm thẻ mới"; rỗng thì báo "Không còn thẻ nào đến hạn ôn hôm nay".
2. `startReviewAll()`: gom thẻ toàn `deckTree`, khử trùng theo `stateKeyOf` (cùng khoá FSRS
   dùng khi học, tránh nhân đôi thẻ typing), gọi `startStudy('review-all', 'Ôn tập thư viện', …)`.
3. Nút "Ôn tập" cạnh ô tìm kiếm / nút Khám phá ở dashboard.

## Verify
- `npx tsc --noEmit` sạch.
- Chưa có thẻ đến hạn: bấm Ôn tập → hiện "Không còn thẻ nào đến hạn ôn hôm nay. FSRS sẽ đưa thẻ
  trở lại khi tới hạn." (không mở phiên, không kéo thẻ mới).
- Bơm 1 thẻ đang đến hạn (`Từ vựng cơ bản_basic-1`) vào state FSRS của user → bấm Ôn tập → mở
  phiên đúng 1 thẻ, header "0 mới / 1 ôn", không có thẻ mới. Xong thì khôi phục localStorage
  về baseline (15 key) và kiểm `study_sessions` vẫn 168 dòng.

## Không làm
- Không đụng `reviewPerDay` toàn cục (sẽ đổi hạn mức của mọi phiên học).
- Không thêm badge đếm số thẻ đến hạn trên nút (thêm khi user thấy cần).
