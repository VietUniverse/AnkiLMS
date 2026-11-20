# Đề bài: Explore tối giản, tập trung (chỉ làm đúng đề bài này)

Người làm: agy (Gemini 3.8 flash medium). Chỉ sửa giao diện. Không đổi dữ liệu, API, FSRS, auth.
Tra graphify trước khi đọc file (`graphify explain "ExplorePage()"`), chỉ đọc đúng đoạn cần.
Next.js bản mới, khác bản bạn biết: cần đụng API Next thì đọc `frontend/node_modules/next/dist/docs/`.

## Bối cảnh
Người dùng nhận xét bản card + chip trước đó chiếm nhiều chỗ, nhiều thứ gây phân tâm. Họ muốn **minimalism và focus**.
Claude đã dựng bản thử và commit local (chưa push): `refactor(explore): minimal list layout prototype`.
Bản thử ở `frontend/src/app/explore/page.tsx`: không còn banner/card, một hàng toolbar (ô tìm kiếm + select danh mục kèm số lượng), danh sách dạng hàng
(icon xám, tiêu đề, dòng phụ "cấp độ · N thẻ · ~M phút", nút chữ "Thêm" / "Học" + thùng rác / "Xem" cho bộ chia sẻ), cột giữa `max-w-3xl`.
**Giữ nguyên hướng này**, chỉ hoàn thiện theo danh sách dưới. Không quay lại card/chip.

## File được sửa
- `frontend/src/app/explore/page.tsx` (chính)
- `frontend/src/app/explore/[id]/DeckDetailClient.tsx` chỉ ở mục 5
- Không sửa file khác. Phải giữ: dùng `<a>` thay `next/link` (build static export), `deckHref`, nguồn dữ liệu `exploreDecks`, hàm `isDeckAdded/handleAddDeck/handleRemoveCurated`.

## Việc cần làm (mỗi mục một commit, KHÔNG push; Claude sẽ push)
1. **Lỗi mobile (375px)**: nút "Thêm" bị đẩy ra ngoài màn hình, tiêu đề dài bị cắt thành "…" mà nút mất. Sửa để nút luôn hiện (vd `<li>` có `min-w-0`, link tiêu đề `flex-1 min-w-0`, nút `shrink-0`; kiểm cha có `overflow` cắt nội dung). Tiêu đề cho phép xuống tối đa 2 dòng trên mobile (`line-clamp-2`), desktop 1 dòng.
2. **Gom nhóm có logic**: khi danh mục = "Tất cả" và không tìm kiếm, chia danh sách theo nhóm với nhãn nhỏ chữ hoa xám (`text-[11px] uppercase tracking-wider text-stone-400`), thứ tự: "Chủ đề" (food, conversation, drama, hanja, travel, work) → "Giáo trình & TOPIK" (còn lại: topik và các bộ khoá học). Khi có chọn danh mục hoặc có từ khoá thì hiện một danh sách phẳng, không nhãn. Tính nhóm bằng `useMemo` từ `deck.category`; không thêm trường dữ liệu.
3. **Bớt chi tiết thừa**: dòng phụ chỉ còn "N thẻ · ~M phút" (bỏ cấp độ nếu là "Mọi cấp độ"; các cấp độ khác giữ ở đầu dòng). Không thêm badge, màu, sao, tác giả.
4. **Select danh mục**: đảm bảo đọc rõ ở theme tối và sáng (option có nền/chữ tương phản; `color-scheme` đúng), vùng chạm ≥ 40px, focus thấy được. Trên desktop select không quá 220px.
5. **Trang chi tiết** (`DeckDetailClient.tsx`), chỉ khi còn thời gian và không phá bố cục: bỏ các khối trang trí không phục vụ việc quyết định thêm bộ thẻ (gradient/banner dư), giữ: tiêu đề, mô tả, nút thêm, danh sách thẻ, tác giả. Nếu không chắc, bỏ qua mục này và ghi vào `unsure`.

## Luật cấm
- Không viết lại cả file bằng heredoc; sửa từng đoạn bằng công cụ sửa file.
- Không xoá/nới lint, typecheck. Không commit "debug". Chỉ `git add` file mình sửa. Không push. Không `git stash/reset/rebase`.
- Không thêm thư viện, không thêm trạng thái dùng `localStorage`.
- Không gọi API thật. Không đụng dữ liệu người dùng.
- Không đụng `docs/`, `out/` ngoài file báo cáo.

## Cách test (chỉ phần mình sửa; Claude tự chạy suite đầy đủ)
```
cd frontend
./node_modules/.bin/eslint src/app/explore/page.tsx
./node_modules/.bin/tsc --noEmit   # lỗi ở src/lib/romanization.ts và DeckDetailClient đã có sẵn, bỏ qua
```
Server dev đã chạy sẵn ở http://localhost:3111 (đừng chạy thêm cái nữa). Trang cần đăng nhập, API local không có; vào trình duyệt, mở Console và dán:
`localStorage.setItem("haechivn_user_profile", JSON.stringify({id:"dev-admin",email:"admin@local.test",name:"admin",streak:3,xp:120,gems:10,level:2,role:"admin"})); location.href="/explore"`
Chụp `/explore` ở 375px, 768px, 1280px × theme tối/sáng, lưu vào `out/explore-minimal/` (không commit), **nhìn ảnh thật** để xác nhận: nút "Thêm" thấy ở 375px, nhóm có nhãn, chọn danh mục thì hết nhãn.

## Báo cáo
Ghi `docs/plans/2026-10-31-explore-minimal-bao-cao.json`:
`{"status":"done|blocked","commits":[],"files_changed":[],"tests":{"command":"","exit":0,"log":""},"screenshots":[],"unsure":[]}`
