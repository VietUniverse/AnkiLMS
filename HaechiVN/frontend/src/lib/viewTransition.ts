/**
 * Tên View Transition dùng chung giữa card ở /explore và header ở /explore/[id].
 *
 * shortcut: chỉ gắn cho view lưới ở /explore — view danh sách là hàng chữ nên morph hình khối
 * vô nghĩa; chỉ chạy trên trình duyệt hỗ trợ cross-document View Transition (Chrome/Edge 126+),
 * Firefox/Safari bỏ qua không lỗi. Nâng cấp: khi React có component <ViewTransition> thì đổi
 * sang component, CSS đã sẵn.
 */
export function deckTransitionName(id: string): string {
  return `vt-deck-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
