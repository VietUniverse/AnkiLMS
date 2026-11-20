-- Persist the current FSRS learning step so "Good" can graduate cards from
-- Learning to Review instead of restarting the 10-minute step forever.
ALTER TABLE card_states ADD COLUMN learning_steps INTEGER NOT NULL DEFAULT 0;
