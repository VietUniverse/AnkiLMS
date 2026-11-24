-- Migration 0026: FSRS Review Logs and User Settings
-- Lưu trữ chi tiết lịch sử ôn tập (revlog) để phục vụ huấn luyện / tối ưu hóa thuật toán FSRS

CREATE TABLE IF NOT EXISTS review_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    card_id INTEGER NOT NULL,
    deck_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4), -- 1: Again, 2: Hard, 3: Good, 4: Easy
    state INTEGER NOT NULL CHECK (state BETWEEN 0 AND 3),   -- 0: New, 1: Learning, 2: Review, 3: Relearning
    due TEXT NOT NULL,
    stability REAL NOT NULL,
    difficulty REAL NOT NULL,
    elapsed_days REAL NOT NULL DEFAULT 0,
    last_elapsed_days REAL NOT NULL DEFAULT 0,
    scheduled_days REAL NOT NULL DEFAULT 0,
    review_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_review_logs_user_review ON review_logs(user_id, review_time DESC);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_deck ON review_logs(user_id, deck_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_card ON review_logs(user_id, card_id);

CREATE TABLE IF NOT EXISTS user_fsrs_settings (
    user_id TEXT PRIMARY KEY,
    weights_json TEXT NOT NULL,
    desired_retention REAL NOT NULL DEFAULT 0.9,
    maximum_interval INTEGER NOT NULL DEFAULT 36500,
    enable_short_term INTEGER NOT NULL DEFAULT 1 CHECK (enable_short_term IN (0, 1)),
    optimized_at TEXT,
    log_count_at_optimize INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
