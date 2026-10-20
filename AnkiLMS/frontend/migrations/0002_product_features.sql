-- Bring the older production users table up to the shape used by the current API.
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN longest_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_checkin_date TEXT;
ALTER TABLE users ADD COLUMN referred_by TEXT REFERENCES users(id);
ALTER TABLE users ADD COLUMN active_badge TEXT;

-- Preserve existing streaks and anchor them to the last recorded check-in.
UPDATE users
SET longest_streak = MAX(COALESCE(longest_streak, 0), COALESCE(streak, 0)),
    last_checkin_date = COALESCE(
        last_checkin_date,
        (SELECT MAX(checkin_date) FROM checkins WHERE checkins.user_id = users.id)
    );

CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'study',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS community_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_community_messages_created ON community_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_feedback_user_created ON feedback(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_rewards (
    user_id TEXT NOT NULL,
    reward_id TEXT NOT NULL,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, reward_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
