-- Bài học gần nhất (nút "Học tiếp" ở /flashcards), lưu theo user để đồng bộ giữa các thiết bị.
ALTER TABLE users ADD COLUMN last_lesson_id TEXT;
ALTER TABLE users ADD COLUMN last_lesson_title TEXT;
