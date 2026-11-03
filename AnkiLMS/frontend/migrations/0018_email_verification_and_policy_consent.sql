-- Existing accounts remain usable; new email/password registrations start unverified.
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1 CHECK (email_verified IN (0, 1));
ALTER TABLE users ADD COLUMN terms_accepted_version TEXT;
ALTER TABLE users ADD COLUMN privacy_accepted_version TEXT;
ALTER TABLE users ADD COLUMN policies_accepted_at TEXT;
