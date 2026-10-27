ALTER TABLE users ADD COLUMN translation_language TEXT NOT NULL DEFAULT 'vi'
  CHECK (translation_language IN ('vi', 'en', 'ja'));
