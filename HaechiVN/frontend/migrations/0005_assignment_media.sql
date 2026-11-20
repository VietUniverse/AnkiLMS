CREATE TABLE IF NOT EXISTS class_assignment_media (
  assignment_id TEXT NOT NULL REFERENCES class_assignments(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  PRIMARY KEY (assignment_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_class_assignment_media_assignment
  ON class_assignment_media(assignment_id);
