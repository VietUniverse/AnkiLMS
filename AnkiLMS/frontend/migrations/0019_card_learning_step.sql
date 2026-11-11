-- Persist the ts-fsrs learning step; before this, "Good" always reset learning cards to the 10-minute step.
ALTER TABLE card_states ADD COLUMN learning_step INTEGER DEFAULT 0;
-- Cards already waiting on the second (10m) step were rated Good once; let the next Good graduate them.
UPDATE card_states SET learning_step = 1
WHERE state = 'learning' AND due_at IS NOT NULL
  AND (julianday(due_at) - julianday(updated_at)) * 1440 >= 5;
