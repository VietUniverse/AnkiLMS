-- Cloudflare D1 Database Schema for HaechiVN Korean LMS

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    profile_public INTEGER NOT NULL DEFAULT 1 CHECK (profile_public IN (0, 1)),
    translation_language TEXT NOT NULL DEFAULT 'vi' CHECK (translation_language IN ('vi', 'en', 'ja')),
    streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    gems INTEGER DEFAULT 2,
    level INTEGER DEFAULT 1,
    last_checkin_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    email_verified INTEGER NOT NULL DEFAULT 1 CHECK (email_verified IN (0, 1)),
    terms_accepted_version TEXT,
    privacy_accepted_version TEXT,
    policies_accepted_at TEXT
);

-- 2. Daily Checkins / Heatmap Table
CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    checkin_date TEXT NOT NULL, -- YYYY-MM-DD
    xp_earned INTEGER DEFAULT 1,
    time_spent_minutes INTEGER DEFAULT 0,
    cards_reviewed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, checkin_date)
);

-- 3. User Decks Table (Imported Anki .apkg)
CREATE TABLE IF NOT EXISTS user_decks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    deck_name TEXT NOT NULL,
    card_count INTEGER DEFAULT 0,
    cards_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. SRS Card States (FSRS scheduler state)
CREATE TABLE IF NOT EXISTS card_states (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    deck_id TEXT NOT NULL,
    card_id INTEGER NOT NULL,
    interval INTEGER DEFAULT 1,
    ease_factor REAL DEFAULT 2.5,
    due_date TEXT NOT NULL, -- YYYY-MM-DD
    due_at TEXT, -- precise timestamp for short-term FSRS steps
    learning_steps INTEGER DEFAULT 0, -- ts-fsrs learning step index
    reps INTEGER DEFAULT 0,
    lapses INTEGER DEFAULT 0,
    state TEXT DEFAULT 'new', -- new, learning, review
    stability REAL,
    difficulty REAL,
    last_review TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, deck_id, card_id)
);

-- 5. User Achievements / Badges
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, badge_id)
);

-- 6. Study Sessions Log
CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    module TEXT NOT NULL, -- srs, dictation, shadowing, topik, hangeul
    cards_reviewed INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_card_states_due ON card_states(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_daily_missions_user_date ON daily_mission_claims(user_id, mission_date);

-- Product feature tables and the related user columns are added by
-- migrations/0002_product_features.sql after this base schema is initialized.

-- Public/private community decks. Only public rows are returned in Explore.
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

-- A published or backed-up deck may be removed from the owner's study list
-- without deleting its public listing or FSRS history.
CREATE TABLE IF NOT EXISTS hidden_study_decks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, deck_id)
);

-- 7. FSRS Review Logs
CREATE TABLE IF NOT EXISTS review_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    card_id INTEGER NOT NULL,
    deck_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
    state INTEGER NOT NULL CHECK (state BETWEEN 0 AND 3),
    due TEXT NOT NULL,
    stability REAL NOT NULL,
    difficulty REAL NOT NULL,
    elapsed_days REAL NOT NULL DEFAULT 0,
    last_elapsed_days REAL NOT NULL DEFAULT 0,
    scheduled_days REAL NOT NULL DEFAULT 0,
    review_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_review ON review_logs(user_id, review_time DESC);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_deck ON review_logs(user_id, deck_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_card ON review_logs(user_id, card_id);

-- 8. User FSRS Personalized Settings (Optimized Parameters w)
CREATE TABLE IF NOT EXISTS user_fsrs_settings (
    user_id TEXT PRIMARY KEY,
    weights_json TEXT NOT NULL,
    desired_retention REAL NOT NULL DEFAULT 0.9,
    maximum_interval INTEGER NOT NULL DEFAULT 36500,
    enable_short_term INTEGER NOT NULL DEFAULT 1 CHECK (enable_short_term IN (0, 1)),
    optimized_at TEXT,
    log_count_at_optimize INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

