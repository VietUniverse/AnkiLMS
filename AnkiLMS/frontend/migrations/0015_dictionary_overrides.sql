CREATE TABLE IF NOT EXISTS dictionary_overrides (
  hangul TEXT PRIMARY KEY,
  vietnamese TEXT NOT NULL DEFAULT '',
  english TEXT NOT NULL DEFAULT '',
  japanese TEXT NOT NULL DEFAULT '',
  part_of_speech TEXT NOT NULL DEFAULT '',
  topik TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  updated_by TEXT NOT NULL REFERENCES users(id),
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dictionary_overrides_updated ON dictionary_overrides(updated_at DESC);
