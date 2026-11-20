CREATE TABLE IF NOT EXISTS daily_mission_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mission_id TEXT NOT NULL CHECK (mission_id IN ('shadowing', 'vocabulary', 'dictation')),
  mission_date TEXT NOT NULL,
  gems_awarded INTEGER NOT NULL DEFAULT 1,
  claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, mission_id, mission_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_missions_user_date
  ON daily_mission_claims(user_id, mission_date);
