-- Hạn nộp có thể là một ngày cụ thể, hoặc số ngày kể từ khi bài tập
-- được giao (học viên vào lớp sau sẽ được tính từ ngày tham gia).
ALTER TABLE class_assignments ADD COLUMN due_mode TEXT NOT NULL DEFAULT 'date';
ALTER TABLE class_assignments ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 0;
