ALTER TABLE classrooms ADD COLUMN visibility TEXT NOT NULL DEFAULT 'secret'
  CHECK (visibility IN ('public', 'private', 'secret'));

CREATE INDEX IF NOT EXISTS idx_classrooms_visibility ON classrooms(visibility);
