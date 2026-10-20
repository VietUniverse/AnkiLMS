CREATE TABLE IF NOT EXISTS managed_lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  lesson_type TEXT NOT NULL CHECK (lesson_type IN ('dictation', 'shadowing', 'both')),
  level TEXT NOT NULL DEFAULT 'TOPIK 1',
  description TEXT NOT NULL DEFAULT '',
  korean_text TEXT NOT NULL,
  vietnamese_text TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_managed_lessons_published ON managed_lessons(is_published, created_at DESC);
