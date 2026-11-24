# Kế hoạch: đóng 5 rule Vercel còn "KHÔNG ĐẠT" (frontend)

Bối cảnh: audit theo `vercel-react-best-practices` + `react-native-skills` (phần chuyển được sang
web/hybrid) còn 6 mục chưa đạt. `animation-gpu-properties` đã xử lý ở commit 073f005/4880758.

## Task 1 — js-hoist-intl (XS, 4 file)
Hoist `new Intl.DateTimeFormat(...)` ra module scope: FloatingCommunityChat.tsx:12,
app/chat/page.tsx:18, app/community/page.tsx:28, app/missions/page.tsx:45-51.
**AC**: không còn `new Intl.` trong thân hàm/component. **Verify**: grep + tsc.

## Task 2 — react-state-minimize (S, 1 file)
`AppContext.Provider` dựng value object inline → mọi consumer re-render khi bất kỳ state nào
của provider đổi (mở auth modal, mở importer, checkin message…). Bọc `useMemo` với deps đầy đủ
(mọi handler đã `useCallback`). Thêm `decksLoading` vào context để Task 3 dùng.
**AC**: value chỉ đổi khi field thật đổi. **Verify**: tsc + mở/đóng auth modal, đếm render
consumer bằng counter tạm hoặc giữ nguyên hành vi UI.

## Task 3 — react-state-fallback (S, 2 file)
`/explore` và `/vocabulary` đang chờ fetch 7.35 MB curated decks mà không có trạng thái tải.
Dùng `decksLoading` từ context, hiện dòng "Đang tải bộ thẻ…" thay vì lưới rỗng.
**AC**: lần đầu vào trang có chữ chờ; dữ liệu về thì thay bằng lưới. **Verify**: bsk, chặn
mạng chậm (dev đủ) và đọc text.

## Task 4 — list-performance-virtualize (S, 1-2 file)
Thêm utility `.cv-auto { content-visibility: auto; contain-intrinsic-size: auto 120px }` và áp
cho lưới/danh sách dài (explore deck grid, danh sách thẻ trong SRS, danh sách bài sách).
**AC**: element dài có content-visibility auto. **Verify**: getComputedStyle trong bsk.

## Task 5 — list-performance-item-memo (S, 1 file)
Đo trước: đếm render của item card trong lưới explore khi gõ vào ô tìm kiếm / mở panel khác.
Chỉ bọc `React.memo` cho item thật sự re-render mà props không đổi.
**AC**: item không re-render khi state không liên quan đổi. **Verify**: counter tạm (xoá sau khi đo).

## Không làm
- `list-performance-inline-objects` (83 `style={{}}`): trên web không có bridge sang native,
  object style tạo mỗi render chỉ là cấp phát rác nhỏ; sửa 83 chỗ = rủi ro cao, lợi ích ~0.
  Chỉ đụng nếu sau này profiler chỉ ra đó là điểm nóng.
