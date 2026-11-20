CREATE TABLE IF NOT EXISTS shared_decks (
  shared_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  card_count INTEGER NOT NULL DEFAULT 0,
  cards_key TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shared_decks_visibility_updated ON shared_decks(visibility, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_decks_owner_updated ON shared_decks(owner_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_decks_owner_deck ON shared_decks(owner_id, deck_id);

