CREATE TABLE IF NOT EXISTS hidden_study_decks (
  user_id TEXT NOT NULL,
  deck_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, deck_id)
);
