CREATE TABLE IF NOT EXISTS thth_access (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'class')),
  target_id TEXT NOT NULL,
  book_number INTEGER NOT NULL CHECK (book_number IN (0, 1, 2, 3, 4)),
  lesson_prefix TEXT NOT NULL DEFAULT '',
  granted_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(target_type, target_id, book_number, lesson_prefix)
);

CREATE INDEX IF NOT EXISTS idx_thth_access_target ON thth_access(target_type, target_id);
