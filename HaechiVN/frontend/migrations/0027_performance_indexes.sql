-- Performance indexes to prevent full table scans and stay within D1 read quotas
CREATE INDEX IF NOT EXISTS idx_card_states_user_review ON card_states(user_id, last_review);
CREATE INDEX IF NOT EXISTS idx_card_states_last_review ON card_states(last_review);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(checkin_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created ON study_sessions(created_at);
