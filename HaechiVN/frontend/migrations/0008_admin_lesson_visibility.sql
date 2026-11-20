CREATE TABLE IF NOT EXISTS lesson_visibility (
  lesson_id TEXT PRIMARY KEY,
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
