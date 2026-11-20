# Đề bài: gọn lại giao diện trang Explore (chỉ làm đúng đề bài này)

Người làm: agy (Gemini 3.8 flash medium). Chỉ sửa **giao diện**, không đổi logic dữ liệu, API, FSRS, auth.
Trước khi đọc file: `graphify explain "ExplorePage()"` rồi chỉ đọc đúng đoạn cần (xem `graphify-out/`, thư mục `frontend/`).
Next.js bản mới, khác bản bạn biết: nếu đụng API Next thì đọc `frontend/node_modules/next/dist/docs/` trước.

## File được sửa
- `frontend/src/app/explore/page.tsx` (325 dòng) – chính
- `frontend/src/app/explore/[id]/DeckDetailClient.tsx` (443 dòng) – đợt 2, chỉ chỉnh cho khớp phong cách
- Không sửa: `curatedDecks.ts` (trừ khi cần đúng 1 trường nhỏ, ghi vào báo cáo), `globals.css` (chỉ thêm class nếu bắt buộc), `AppShell/Sidebar/Header`.

## Vấn đề hiện tại (đã đọc code)
1. Banner đầu trang quá cao: huy hiệu + nhãn Demo + h1 + đoạn mô tả 3 dòng + nút "Đến Kho Thẻ (/flashcards)". Người dùng phải cuộn mới thấy bộ thẻ.
2. Chữ lộ kiểu dev: "(/flashcards)", "Thêm vào /flashcard", "Chế độ Demo (Tự động ẩn trên Production)".
3. 8 tab danh mục xếp ngang phải cuộn, không có số lượng, tab "Tất cả bộ thẻ" dài.
4. Mỗi thẻ bộ có quá nhiều tầng: icon + 2 badge + tiêu đề + mô tả + dòng tags `#...` + footer 3 nút (Chi tiết / Đã thêm (Học ngay) / thùng rác). Khó quét bằng mắt.
5. Code chết: `previewDeckId`, `setPreviewDeckId`, khối "Xem trước thẻ mẫu" (không có nút nào bật nó), import `Eye` không dùng. Xoá hết.
6. Toast nằm góc dưới phải, che BottomNav trên điện thoại.

## Thiết kế mới (làm đúng thứ tự này, từ trên xuống)
**A. Đầu trang gọn (1 khối, tối đa ~120px cao trên desktop)**
- Dòng 1: h1 "Khám phá bộ thẻ" + dưới nó 1 câu mô tả ngắn (≤ 90 ký tự). Bên phải: link "Kho thẻ của tôi" (icon BookOpen, kiểu nút phụ, không ghi đường dẫn).
- Dòng 2: ô tìm kiếm rộng đầy chiều ngang (đặt placeholder "Tìm bộ thẻ hoặc từ vựng…").
- Bỏ gradient to và huy hiệu "Thư Viện Bộ Thẻ Mở Rộng". Nhãn Demo đổi thành một chấm nhỏ "Demo" cạnh h1, chỉ hiện khi `IS_DEMO_DECKS_ENABLED`.

**B. Bộ lọc**
- Chip danh mục dạng cuộn ngang một hàng, mỗi chip có số bộ thẻ: "Tất cả 12", "TOPIK 3"… (đếm bằng `useMemo` từ `CURATED_DECKS`). Đổi nhãn "Tất cả bộ thẻ" → "Tất cả". Ẩn chip có 0 bộ (trừ "Tất cả").
- Dưới hàng chip: một dòng nhỏ "N bộ thẻ" (kết quả sau lọc).

**C. Thẻ bộ (card) – cấu trúc cố định, dễ quét**
1. Hàng trên: icon (DeckIcon) + tiêu đề (cả thẻ là một `Link` tới `/explore/[id]`), bên phải là nhãn cấp độ (Sơ cấp…).
2. Mô tả 2 dòng (`line-clamp-2`).
3. Hàng meta một dòng, chữ nhỏ, có icon lucide: số thẻ · phút học (`estimatedMinutes`) · sao `rating`. Không hiện tags `#…`, không hiện nhãn danh mục (đã có chip lọc).
4. Một nút hành động duy nhất, rộng hết chiều ngang card:
   - chưa thêm: "Thêm vào kho thẻ" (nút xanh chính)
   - đã thêm: "Học ngay" (link `/flashcards`, màu xanh lá nhạt) + nút icon thùng rác nhỏ bên cạnh (giữ `title`, giữ `handleRemoveCurated`)
- Nút trong card phải `e.preventDefault()/stopPropagation` nếu card là Link, hoặc tách vùng Link chỉ ở khu tiêu đề+mô tả. Chọn cách thứ hai (đỡ lỗi).
- Lưới: 1 cột mobile, 2 cột `md`, 3 cột `xl` (đổi `lg` → `xl`), khoảng cách `gap-4`.

**D. Trạng thái đặc biệt**
- Rỗng sau khi lọc: giữ nội dung hiện tại nhưng thêm nút "Xoá bộ lọc" (đặt `selectedCategory="all"`, `searchQuery=""`).
- Production (`!IS_DEMO_DECKS_ENABLED`): giữ khối "đang biên soạn", rút còn icon + 1 tiêu đề + 1 câu + 1 nút; bỏ "(/flashcards)".
- Toast: chuyển lên `bottom-24 lg:bottom-6`, `left-1/2 -translate-x-1/2` trên mobile để không che BottomNav.

**E. Đợt 2 (sau khi A–D xong và Claude duyệt): `DeckDetailClient.tsx`**
- Chỉ đồng bộ phong cách: cùng bán kính, cùng kiểu nút chính/phụ, bỏ chữ "/flashcards", gom 3 badge đầu trang thành 1 hàng. Không đổi bố cục 2 cột.

## Quy ước giao diện (giữ nguyên)
- Tailwind 4, `lucide-react`, chữ tiếng Việt có dấu, hỗ trợ cả `dark:` và theme sáng (`html[data-theme="light"]`). Dùng `card-duo` như các trang khác, đừng tự thêm hệ màu mới.
- Màu chủ đạo `sky-500`; thành công `emerald`; nguy hiểm `rose`. Không thêm thư viện.
- Mọi nút bấm có `cursor-pointer`, vùng chạm ≥ 36px, focus nhìn thấy được, `aria-label` cho nút chỉ có icon.
- Không dùng emoji làm icon (commit gần đây vừa thay hết bằng lucide).

## Luật cấm
- Không viết lại cả file bằng heredoc; sửa từng đoạn bằng công cụ sửa file.
- Không xoá/nới lint, typecheck, test. Không commit "debug". Không đụng file ngoài danh sách.
- Chỉ `git add` file mình sửa; mỗi mục A–D một commit nhỏ (message `refactor(explore): …`), mục E commit riêng; push từng commit.
- Không gọi API thật, không đụng dữ liệu người dùng, không chạy app với tài khoản thật.

## Cách test (chỉ phần mình sửa; Claude sẽ tự chạy suite đầy đủ)
```
cd frontend
npx eslint src/app/explore
npx tsc --noEmit
npm run dev   # chạy nền, mở /explore
```
Chụp ảnh `/explore` ở 3 cỡ (375px, 768px, 1280px) × 2 theme (tối/sáng) bằng trình duyệt, lưu vào `out/explore/` (không commit). Kiểm tay: lọc theo chip, tìm "ăn", thêm rồi gỡ một bộ, bấm vào thẻ → sang trang chi tiết.
Lưu ý: dev mới hiện bộ thẻ demo (`IS_DEMO_DECKS_ENABLED`); đặt `NEXT_PUBLIC_ENABLE_DEMO_DECKS=true` nếu cần.

## Báo cáo
Ghi `docs/plans/2026-10-31-explore-ui-bao-cao.json`:
`{"status":"done|blocked","commits":[],"files_changed":[],"tests":{"command":"","exit":0,"log":""},"screenshots":[],"unsure":[]}`
