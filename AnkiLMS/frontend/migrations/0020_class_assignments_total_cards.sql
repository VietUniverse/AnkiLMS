-- Bảng class_assignments thiếu cột total_cards mà functions/api/classes.ts đã dùng
-- (SELECT/INSERT), làm mọi request /api/classes trả 500 "Không thể lưu thay đổi lớp học lúc này".
ALTER TABLE class_assignments ADD COLUMN total_cards INTEGER NOT NULL DEFAULT 0;

-- Bài cũ chưa có số thẻ thì đếm từ deck_json đã lưu.
UPDATE class_assignments
SET total_cards = json_array_length(deck_json)
WHERE total_cards = 0 AND deck_json <> '[]';
