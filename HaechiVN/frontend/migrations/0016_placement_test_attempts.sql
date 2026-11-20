CREATE TABLE IF NOT EXISTS placement_test_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_slug TEXT NOT NULL CHECK (test_slug IN ('seoul-1a', 'thth-1')),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  wrong_count INTEGER NOT NULL CHECK (wrong_count >= 0),
  skipped_count INTEGER NOT NULL CHECK (skipped_count >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  score_percent INTEGER NOT NULL CHECK (score_percent BETWEEN 0 AND 100),
  verdict TEXT NOT NULL CHECK (verdict IN ('pass', 'almost', 'fail')),
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds BETWEEN 0 AND 1800),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_placement_test_attempts_user_created
  ON placement_test_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_placement_test_attempts_test_created
  ON placement_test_attempts(test_slug, created_at DESC);
