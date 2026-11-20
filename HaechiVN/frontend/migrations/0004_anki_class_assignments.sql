ALTER TABLE class_assignments ADD COLUMN deck_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE assignment_progress ADD COLUMN reviewed_cards INTEGER NOT NULL DEFAULT 0;
ALTER TABLE assignment_progress ADD COLUMN total_cards INTEGER NOT NULL DEFAULT 0;
ALTER TABLE assignment_progress ADD COLUMN correct_cards INTEGER NOT NULL DEFAULT 0;
ALTER TABLE assignment_progress ADD COLUMN last_studied_at TEXT;

-- Old assignments only stored a deck title and were marked complete after one card.
-- Clear that unverifiable completion so a teacher can reassign a real shared deck.
UPDATE assignment_progress
SET completed_at = NULL, reviewed_cards = 0, total_cards = 0, correct_cards = 0, last_studied_at = NULL;

CREATE TABLE IF NOT EXISTS class_assignment_card_progress (
  assignment_id TEXT NOT NULL REFERENCES class_assignments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL,
  correct INTEGER NOT NULL DEFAULT 0,
  reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (assignment_id, user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_class_assignment_card_progress_student
  ON class_assignment_card_progress(user_id, assignment_id);
