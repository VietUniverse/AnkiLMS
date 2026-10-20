-- Cloudflare D1 Database Schema for HaechiVN Korean LMS

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    avatar_url TEXT,
    streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    gems INTEGER DEFAULT 100,
    level INTEGER DEFAULT 1,
    last_checkin_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Daily Checkins / Heatmap Table
CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    checkin_date TEXT NOT NULL, -- YYYY-MM-DD
    xp_earned INTEGER DEFAULT 50,
    time_spent_minutes INTEGER DEFAULT 15,
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

-- 4. SRS Card States (SM-2 Algorithm persistence)
CREATE TABLE IF NOT EXISTS card_states (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    deck_id TEXT NOT NULL,
    card_id INTEGER NOT NULL,
    interval INTEGER DEFAULT 1,
    ease_factor REAL DEFAULT 2.5,
    due_date TEXT NOT NULL, -- YYYY-MM-DD
    reps INTEGER DEFAULT 0,
    lapses INTEGER DEFAULT 0,
    state TEXT DEFAULT 'new', -- new, learning, review
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
    gems_awarded INTEGER NOT NULL DEFAULT 30,
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
