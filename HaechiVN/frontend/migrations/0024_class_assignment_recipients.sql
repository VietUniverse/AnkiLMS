-- Danh sách học viên được giao bài tập, lưu dưới dạng JSON array.
-- NULL nghĩa là giao cho toàn bộ học viên của lớp (kể cả người vào sau).
ALTER TABLE class_assignments ADD COLUMN assigned_user_ids TEXT;
